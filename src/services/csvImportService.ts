// src/services/csvImportService.ts
import {signalRService} from './api/signalRService';
import {httpService} from './api/httpService';
import {API_CONFIG} from './api/config';
import {
    ActionItem,
    CsvAnalysisResult,
    ImportActionItem,
    ImportConfig,
    ImportProgress,
    ImportResult,
    LogEntry
} from '../models/CsvImport';
import * as signalR from '@microsoft/signalr';

// Constantes pour le service
const HUB_NAME = 'csvImportHub';
const FILE_UPLOAD_TIMEOUT = 300000; // 5 minutes en millisecondes
const ANALYSIS_TIMEOUT = 240000; // 4 minutes en millisecondes (augmenté)
const IMPORT_TIMEOUT = 300000; // 5 minutes en millisecondes

// Objet de résumé d'import par défaut
const DEFAULT_IMPORT_SUMMARY = {
    totalObjects: 0,
    createCount: 0,
    updateCount: 0,
    deleteCount: 0,
    moveCount: 0,
    errorCount: 0,
    createOUCount: 0
};

// Résultat d'import par défaut en cas d'erreur
const DEFAULT_ERROR_RESULT: ImportResult = {
    success: false,
    summary: {...DEFAULT_IMPORT_SUMMARY, errorCount: 1},
    details: []
};

// Ajouter l'interface du service d'import CSV
export interface CsvImportServiceInterface {
    // Méthodes de configuration
    setAutoReconnect(enabled: boolean): void;
    disconnect(): Promise<void>;
    
    // Méthodes d'import et d'analyse
    getImportConfigs(): Promise<ImportConfig[]>;
    uploadAndAnalyzeCsv(file: File, configId: string): Promise<CsvAnalysisResult>;
    uploadAndAnalyzeCsvWithConfig(file: File, config: ImportConfig): Promise<CsvAnalysisResult>;
    executeDirectImport(csvData: any[], config: ImportConfig): Promise<ImportResult>;
    
    // Méthodes d'abonnement aux événements
    subscribeToProgress(callback: (progress: ImportProgress) => void): void;
    subscribeToLogs(callback: (log: LogEntry) => void): void;
    
    // Méthodes utilitaires
    isConnected(): boolean;
    getConnectionId(): string | null;
}

export const csvImportService = {
    _signalRService: signalRService,
    _connectionId: null as string | null,
    _progressHandlers: [] as ((progress: ImportProgress) => void)[],
    _logHandlers: [] as ((log: LogEntry) => void)[],
    _autoReconnect: true,

    // Gestionnaires liés pour les événements SignalR globaux
    _boundReceiveProgressHandler: null as ((progress: ImportProgress) => void) | null,
    _boundReceiveLogHandler: null as ((log: LogEntry) => void) | null,
    _boundAnalysisCompleteHandler: null as ((data: any) => void) | null,
    _boundAnalysisErrorHandler: null as ((data: any) => void) | null,
    _boundImportCompleteHandler: null as ((data: any) => void) | null,

    // S'assurer que les gestionnaires liés sont créés une seule fois
    _ensureBoundHandlers: function () {
        if (!this._boundReceiveProgressHandler) {
            this._boundReceiveProgressHandler = (progress: ImportProgress | any) => {
                console.log('[CsvImportService] Progression reçue (global handler):', progress);
                
                // Convertir le format AnalysisProgress vers ImportProgress standard si nécessaire
                let standardProgress: ImportProgress;
                if (progress.Progress !== undefined || progress.Status !== undefined || progress.Message !== undefined) {
                    // Format AnalysisProgress du backend
                    standardProgress = {
                        progress: progress.Progress || 0,
                        status: progress.Status || 'processing',
                        message: progress.Message || '',
                        analysis: progress.Analysis || null,
                        result: progress.Result || null
                    };
                } else {
                    // Format ImportProgress standard
                    standardProgress = progress as ImportProgress;
                }
                
                this._progressHandlers.forEach(handler => handler(standardProgress));
            };

            this._boundReceiveLogHandler = (log: LogEntry) => {
                console.log('[CsvImportService] Log reçu (global handler):', log);
                this._logHandlers.forEach(handler => handler(log));
            };

            this._boundAnalysisCompleteHandler = (signalRData: any) => {
                console.log('[CsvImportService] Événement ANALYSIS_COMPLETE reçu (global handler):', signalRData);
                // Les données d'analyse principales sont délivrées via l'événement 'ReceiveProgress'
                // lorsque son statut devient 'analyzed'. Cet événement 'ANALYSIS_COMPLETE' sert
                // de confirmation finale du serveur.

                const analysisDataFromEvent = signalRData?.Data?.Analysis || signalRData?.Data?.analysis || null;
                let logMessage = 'Confirmation de fin d\'analyse reçue du serveur.';
                if (analysisDataFromEvent && Array.isArray(analysisDataFromEvent.actions)) {
                    logMessage += ` (L\'événement ANALYSIS_COMPLETE contenait ${analysisDataFromEvent.actions.length} actions).`;
                } else {
                    logMessage += ` (L\'événement ANALYSIS_COMPLETE ne contenait pas de données d\'actions directement exploitables).`;
                }

                const logEntry: LogEntry = {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: logMessage
                };
                this._logHandlers.forEach(handler => handler(logEntry));
            };

            this._boundAnalysisErrorHandler = (data: any) => {
                console.log('[CsvImportService] Événement ANALYSIS_ERROR reçu (global handler):', data);
                const errorMessage = data?.Data?.Error || 'Erreur inconnue lors de l\'analyse.';
                const progressEvent: ImportProgress = {
                    progress: 0,
                    status: 'error',
                    message: errorMessage
                };
                this._progressHandlers.forEach(handler => handler(progressEvent));
            };

            this._boundImportCompleteHandler = (data: any) => {
                console.log('[CsvImportService] Événement IMPORT_COMPLETE reçu (global handler):', data);
                const serverData = data?.Data || {};

                const frontendResult: ImportResult = {
                    success: serverData.success || false,
                    summary: serverData.summary || {...DEFAULT_IMPORT_SUMMARY},
                    details: serverData.actionResults || serverData.details || []
                };

                const progressEvent: ImportProgress = {
                    progress: 100,
                    status: 'completed',
                    message: serverData.success
                        ? 'Import terminé avec succès.'
                        : (serverData.summary?.errorCount > 0 ? 'Import terminé avec des erreurs.' : 'Import terminé.'),
                    result: frontendResult
                };
                this._progressHandlers.forEach(handler => handler(progressEvent));
            };
        }
    },

    // Enregistrer ou réenregistrer les gestionnaires d'événements globaux
    _registerGlobalEventHandlers: function () {
        this._ensureBoundHandlers();

        const eventMappings = [
            {event: 'ReceiveProgress', handler: this._boundReceiveProgressHandler},
            {event: 'ReceiveLog', handler: this._boundReceiveLogHandler},
            {event: 'AnalysisProgress', handler: this._boundReceiveProgressHandler}, // Gestionnaire pour AnalysisProgress
            {event: 'ANALYSIS_COMPLETE', handler: this._boundAnalysisCompleteHandler},
            {event: 'ANALYSIS_ERROR', handler: this._boundAnalysisErrorHandler},
            {event: 'IMPORT_COMPLETE', handler: this._boundImportCompleteHandler}
        ];

        for (const mapping of eventMappings) {
            if (mapping.handler) {
                this._signalRService.offEvent(HUB_NAME, mapping.event, mapping.handler);
                this._signalRService.onEvent(HUB_NAME, mapping.event, mapping.handler);
            }
        }

        console.log('[CsvImportService] Gestionnaires d\'événements SignalR globaux (ré)enregistrés.');
    },

    // Initialisation du service
    initialize: async function () {
        try {
            console.log('[SpreadsheetImportService] Initialisation du service avec SignalR');
            this._ensureBoundHandlers();

            await this._signalRService.startConnection(HUB_NAME);
            this._registerGlobalEventHandlers();

            console.log('[SpreadsheetImportService] Service d\'import initialisé avec succès');
            return true;
        } catch (error) {
            console.error('[SpreadsheetImportService] Erreur lors de l\'initialisation:', error);
            throw error;
        }
    },

    // Configuration de la reconnexion automatique
    setAutoReconnect: function (value: boolean): void {
        this._autoReconnect = value;
        console.log(`[CsvImportService] Reconnexion automatique ${value ? 'activée' : 'désactivée'}`);
    },

    // Déconnexion du service
    disconnect: async function (): Promise<void> {
        try {
            await this._signalRService.stopConnection(HUB_NAME);
            console.log('[CsvImportService] Déconnexion réussie');
        } catch (error: any) {
            console.error('[CsvImportService] Erreur lors de la déconnexion:', error);
            throw error;
        }
    },

    // Gestion des abonnements aux événements de progression
    subscribeToProgress: function (handler: (progress: ImportProgress) => void): void {
        this._progressHandlers.push(handler);
        console.log('[CsvImportService] Nouvel abonnement aux événements de progression');
    },

    unsubscribeFromProgress: function (handler: (progress: ImportProgress) => void): void {
        this._progressHandlers = this._progressHandlers.filter(h => h !== handler);
        console.log('[CsvImportService] Désabonnement d\'un gestionnaire de progression');
    },

    // Gestion des abonnements aux événements de logs
    subscribeToLogs: function (handler: (log: LogEntry) => void): void {
        this._logHandlers.push(handler);
        console.log('[CsvImportService] Nouvel abonnement aux événements de log');
    },

    unsubscribeFromLogs: function (handler: (log: LogEntry) => void): void {
        this._logHandlers = this._logHandlers.filter(h => h !== handler);
        console.log('[CsvImportService] Désabonnement d\'un gestionnaire de log');
    },

    // Récupération des configurations d'import
    getImportConfigs: async function (): Promise<ImportConfig[]> {
        try {
            const response = await httpService.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT}`);
            return (response.data || []) as ImportConfig[];
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de la récupération des configurations:', error);
            return [];
        }
    },

    // Sauvegarder une configuration d'import
    saveImportConfig: async function (config: Partial<ImportConfig>): Promise<ImportConfig> {
        try {
            const endpoint = config.id 
                ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT}/${config.id}`
                : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT}`;
            
            const method = config.id ? 'put' : 'post';
            const response = await httpService[method](endpoint, config);
            return response.data as ImportConfig;
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de la sauvegarde de la configuration:', error);
            throw error;
        }
    },

    // Supprimer une configuration d'import
    deleteImportConfig: async function (configId: string): Promise<void> {
        try {
            await httpService.delete(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT}/${configId}`);
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de la suppression de la configuration:', error);
            throw error;
        }
    },

    // Dupliquer une configuration d'import
    duplicateImportConfig: async function (configId: string, newName: string): Promise<ImportConfig> {
        try {
            const response = await httpService.post(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT}/${configId}/duplicate`,
                { name: newName }
            );
            return response.data as ImportConfig;
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de la duplication de la configuration:', error);
            throw error;
        }
    },

    // Vérifier et assurer la connexion SignalR
    _ensureSignalRConnection: async function (): Promise<signalR.HubConnection> {
        let connection = this._signalRService.getHubConnection(HUB_NAME);
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            console.log('[CsvImportService] Connection SignalR non établie, tentative de reconnexion...');
            await this._signalRService.startConnection(HUB_NAME);
            this._registerGlobalEventHandlers();
            connection = this._signalRService.getHubConnection(HUB_NAME);
        }

        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            const errorMsg = 'Impossible d\'établir la connexion SignalR.';
            console.error(`[CsvImportService] ${errorMsg}`);
            this._progressHandlers.forEach(h => h({progress: 0, status: 'error', message: errorMsg}));
            throw new Error(errorMsg);
        }

        return connection;
    },

    async uploadAndAnalyzeCsv(file: File, configId: string): Promise<CsvAnalysisResult> {
        try {
            // 1) Connexion SignalR ----------------------------------------------------
            const conn = await this._ensureSignalRConnection();
            this._connectionId = conn.connectionId;

            // 2) Authentification -----------------------------------------------------
            const authService = (await import('./auth/authService')).default;
            if (!authService.isAuthenticated()) throw new Error('Utilisateur non authentifié.');

            // 3) Préparation FormData -------------------------------------------------
            const fd = new FormData();
            fd.append('file', file, file.name); // ✅ nom explicite
            fd.append('configId', configId);
            if (this._connectionId) fd.append('connectionId', this._connectionId);

            // 4) Publication sans Content‑Type manuel --------------------------------
            this._progressHandlers.forEach(h => h({
                progress: 10,
                status: 'uploading',
                message: 'Téléversement du fichier…'
            }));
            await httpService.post(`${API_CONFIG.BASE_URL}/api/import/upload-file`, fd, {timeout: FILE_UPLOAD_TIMEOUT});

            // 5) Lancer analyse -------------------------------------------------------
            this._progressHandlers.forEach(h => h({progress: 30, status: 'analyzing', message: 'Analyse en cours…'}));
            await this._signalRService.send(HUB_NAME, 'StartAnalysis', configId);

            // 6) Attendre résultat ----------------------------------------------------
            return this._waitForAnalysisResult();
        } catch (err) {
            const e = err as Error & { code?: string };
            const msg = e.message ?? 'Erreur inconnue';
            this._progressHandlers.forEach(h => h({progress: 0, status: 'error', message: msg}));
            throw e;
        }
    },

    // ✅ NOUVELLE MÉTHODE : Analyser avec une configuration complète (incluant disabledActionTypes)
    async uploadAndAnalyzeCsvWithConfig(file: File, config: ImportConfig): Promise<CsvAnalysisResult> {
        try {
            // 1) Connexion SignalR
            const conn = await this._ensureSignalRConnection();
            this._connectionId = conn.connectionId;

            // 2) Authentification
            const authService = (await import('./auth/authService')).default;
            if (!authService.isAuthenticated()) throw new Error('Utilisateur non authentifié.');

            // 3) Préparer la configuration pour l'analyse
            console.log('[CsvImportService] Configuration avec actions désactivées:', {
                id: config.id,
                name: config.name,
                disabledActionTypes: config.disabledActionTypes || []
            });

            // 4) Upload du fichier SANS analyse automatique
            this._progressHandlers.forEach(h => h({
                progress: 10,
                status: 'uploading',
                message: 'Téléversement du fichier…'
            }));
            
            // On utilise un endpoint qui upload seulement sans analyser
            const fd = new FormData();
            fd.append('file', file, file.name);
            if (this._connectionId) fd.append('connectionId', this._connectionId);
            
            // Upload du fichier sans configuration pour éviter l'analyse automatique
            await httpService.post(`${API_CONFIG.BASE_URL}/api/import/upload-file-only`, fd, {timeout: FILE_UPLOAD_TIMEOUT});

            // 5) Lancer analyse avec la configuration complète via SignalR
            this._progressHandlers.forEach(h => h({progress: 30, status: 'analyzing', message: 'Analyse en cours…'}));
            
            console.log('[CsvImportService] Envoi StartAnalysis avec:', {
                configId: config.id || '',
                hasConfig: !!config,
                disabledActionTypes: config.disabledActionTypes || []
            });
            
            // ✅ CORRECTION: Envoyer directement les chaînes de caractères de l'enum
            await this._signalRService.send(HUB_NAME, 'StartAnalysis', config.id || '', null, config.disabledActionTypes || []);

            // 6) Attendre résultat
            const result = await this._waitForAnalysisResult();
            
            return result;
        } catch (err) {
            const e = err as Error & { code?: string };
            const msg = e.message ?? 'Erreur inconnue';
            
            // Si l'endpoint upload-file-only n'existe pas, fallback vers l'ancienne méthode
            if (err && typeof err === 'object' && 'response' in err) {
                const response = (err as any).response;
                if (response?.status === 404) {
                    console.log('[CsvImportService] Fallback vers upload-file classique + StartAnalysis');
                    return await this._uploadAndAnalyzeCsvWithConfigFallback(file, config);
                }
            }
            
            this._progressHandlers.forEach(h => h({progress: 0, status: 'error', message: msg}));
            throw e;
        }
    },

    // Méthode de fallback si le nouveau endpoint n'existe pas
    async _uploadAndAnalyzeCsvWithConfigFallback(file: File, config: ImportConfig): Promise<CsvAnalysisResult> {
        // 1) Upload avec une config temporaire pour éviter l'analyse automatique avec la mauvaise config
        const fd = new FormData();
        fd.append('file', file, file.name);
        fd.append('configId', ''); // Pas de config = pas d'analyse automatique
        if (this._connectionId) fd.append('connectionId', this._connectionId);

        await httpService.post(`${API_CONFIG.BASE_URL}/api/import/upload-file`, fd, {timeout: FILE_UPLOAD_TIMEOUT});

        // 2) Lancer analyse avec la bonne configuration via SignalR
        this._progressHandlers.forEach(h => h({progress: 30, status: 'analyzing', message: 'Analyse en cours…'}));
        
        console.log('[CsvImportService] Envoi StartAnalysis avec:', {
            configId: config.id || '',
            hasConfig: !!config,
            disabledActionTypes: config.disabledActionTypes || []
        });
        
        await this._signalRService.send(HUB_NAME, 'StartAnalysis', config.id || '', config);

        // 3) Attendre résultat
        return await this._waitForAnalysisResult();
    },

    // Attendre le résultat de l'analyse
    _waitForAnalysisResult: function (): Promise<CsvAnalysisResult> {
        return new Promise<CsvAnalysisResult>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.warn('[CsvImportService] L\'analyse prend trop de temps, aucune réponse du serveur');
                this.unsubscribeFromProgress(progressHandler);
                reject(new Error("L'analyse n'a reçu aucune réponse du serveur. Veuillez vérifier l'état du serveur ou essayer à nouveau."));
            }, ANALYSIS_TIMEOUT);

            const progressHandler = (progressData: ImportProgress) => {
                console.log('[CsvImportService] Progression reçue (analyse):', progressData);

                if (progressData.status === 'analyzed') {
                    console.log('[CsvImportService] Analyse terminée via SignalR:', progressData.analysis);
                    clearTimeout(timeoutId);
                    this.unsubscribeFromProgress(progressHandler);

                    const analysisData = progressData.analysis ?? undefined;
                    const result: CsvAnalysisResult = {
                        success: true,
                        analysis: analysisData,
                        csvData: analysisData?.csvData || [],
                        summary: {
                            totalRows: analysisData?.csvData?.length || 0,
                            actionsCount: analysisData?.actions?.length || 0,
                            createCount: analysisData?.summary?.createCount || 0,
                            updateCount: analysisData?.summary?.updateCount || 0,
                            errorCount: analysisData?.summary?.errorCount || 0
                        }
                    };
                    resolve(result);
                } else if (progressData.status === 'error') {
                    console.error('[CsvImportService] Erreur d\'analyse via SignalR:', progressData.message);
                    clearTimeout(timeoutId);
                    this.unsubscribeFromProgress(progressHandler);
                    reject(new Error(progressData.message || 'Erreur inconnue lors de l\'analyse'));
                }
            };
            this.subscribeToProgress(progressHandler);
        });
    },

    // Exécuter l'import
    executeImport: async function (csvData: Record<string, string>[], config: ImportConfig, actions: ActionItem[]): Promise<ImportResult> {
        try {
            console.log('[CsvImportService] Début de l\'exécution de l\'import via SignalR');
            console.log('[CsvImportService] csvData length:', csvData.length);
            console.log('[CsvImportService] config:', config);
            console.log('[CsvImportService] actions:', actions);

            // Assurer que la connexion SignalR est établie
            await this._ensureSignalRConnection();

            const legacyActions = actions.map((a, index) => {
                const actionTypeStr = typeof a.actionType === 'string' ? a.actionType : String(a.actionType);
                console.log(`[CsvImportService] Action ${index}:`, {
                    original: a.actionType,
                    converted: actionTypeStr,
                    selected: a.selected
                });

                return {
                    RowIndex: index,
                    ActionType: actionTypeStr,
                    Data: {
                        objectName: a.objectName,
                        path: a.path,
                        message: a.message,
                        attributes: a.attributes
                    },
                    IsValid: a.selected === undefined ? true : a.selected,
                    ValidationErrors: []
                };
            });

            console.log('[CsvImportService] legacyActions:', legacyActions);

            return new Promise<ImportResult>((resolve, reject) => {
                // Timeout de sécurité
                const timeoutId = setTimeout(() => {
                    console.log('[CsvImportService] Timeout de l\'import atteint');
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    resolve({...DEFAULT_ERROR_RESULT});
                }, IMPORT_TIMEOUT);

                // Handler pour l'événement d'import terminé
                const completeHandler = (data: any) => {
                    console.log('[CsvImportService] Import terminé via SignalR:', data);
                    clearTimeout(timeoutId);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                    const result: ImportResult = {
                        success: true,
                        summary: {
                            totalObjects: data?.Data?.totalProcessed || actions.length,
                            createCount: data?.Data?.createdCount || 0,
                            updateCount: data?.Data?.updatedCount || 0,
                            deleteCount: data?.Data?.deletedCount || 0,
                            moveCount: data?.Data?.movedCount || 0,
                            errorCount: data?.Data?.errorCount || 0,
                            createOUCount: data?.Data?.createdOUCount || 0
                        },
                        details: data?.Data?.actionResults || []
                    };

                    resolve(result);
                };

                // Handler pour l'événement d'erreur d'import
                const errorHandler = (data: any) => {
                    console.error('[CsvImportService] Erreur d\'import via SignalR:', data);
                    clearTimeout(timeoutId);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                    resolve({...DEFAULT_ERROR_RESULT});
                };

                // S'abonner aux événements
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                // Préparer les données pour l'envoi
                const importData = {
                    ConfigId: config.id,
                    Actions: legacyActions
                };
                console.log('[CsvImportService] Envoi des données d\'import:', importData);

                // Lancer l'import
                this._signalRService.send(HUB_NAME, 'StartImport', importData)
                    .then(() => {
                        console.log('[CsvImportService] Commande StartImport envoyée avec succès');
                    })
                    .catch(error => {
                        console.error('[CsvImportService] Erreur lors de l\'appel à StartImport:', error);
                        clearTimeout(timeoutId);
                        this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                        this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                        resolve({...DEFAULT_ERROR_RESULT});
                    });
            });
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de l\'exécution de l\'import:', error);
            return {...DEFAULT_ERROR_RESULT};
        }
    },

    // S'abonner aux événements de progression avec fonction de désabonnement
    onProgress: function (handler: (progress: ImportProgress) => void): () => void {
        this._progressHandlers.push(handler);

        // Retourner une fonction pour se désabonner
        return () => {
            this._progressHandlers = this._progressHandlers.filter(h => h !== handler);
        };
    },

    // S'abonner aux événements de log avec fonction de désabonnement
    onLog: function (handler: (log: LogEntry) => void): () => void {
        this._logHandlers.push(handler);

        // Retourner une fonction pour se désabonner
        return () => {
            this._logHandlers = this._logHandlers.filter(h => h !== handler);
        };
    },

    // Démarrer l'import
    startImport: async function (configId: string, actions: ImportActionItem[]): Promise<ImportResult> {
        try {
            console.log(`[CsvImportService] Début de l'import avec la configuration ${configId}`);

            return new Promise((resolve, reject) => {
                // Timeout de sécurité
                const timeoutId = setTimeout(() => {
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    reject(new Error('Timeout lors de l\'import'));
                }, IMPORT_TIMEOUT);

                // Gestionnaire pour l'événement d'import complet
                const completeHandler = (data: any) => {
                    console.log('[CsvImportService] Import complet:', data);

                    clearTimeout(timeoutId);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                    resolve(data?.Data || {});
                };

                // Gestionnaire pour l'événement d'erreur d'import
                const errorHandler = (data: any) => {
                    console.error('[CsvImportService] Erreur d\'import:', data);

                    clearTimeout(timeoutId);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                    reject(new Error(data?.Data?.Error || 'Erreur inconnue lors de l\'import'));
                };

                // S'abonner aux événements
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                // Démarrer l'import - FIX: Utiliser send au lieu de invoke
                this._signalRService.send(HUB_NAME, 'StartImport', {
                    ConfigId: configId,
                    Actions: actions
                })
                    .catch(error => {
                        console.error('[CsvImportService] Erreur lors du démarrage de l\'import:', error);
                        clearTimeout(timeoutId);
                        this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                        this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                        reject(error);
                    });
            });
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de l\'import:', error);
            throw error;
        }
    },

    // Exécuter et surveiller un import (méthode de transition)
    executeAndPoll: async function (configId: string, items: ImportActionItem[], onProgress: (progress: ImportProgress) => void): Promise<ImportResult> {
        return Promise.resolve({
            success: false,
            summary: {...DEFAULT_IMPORT_SUMMARY, errorCount: 1},
            details: [],
            errorMessage: "Fonction non implémentée"
        });
    },

    // Exécuter un import direct à partir des données CSV
    executeDirectImport: async function (csvData: Record<string, string>[], config: ImportConfig): Promise<ImportResult> {
        try {
            console.log('[CsvImportService] Début de l\'exécution de l\'import direct via SignalR');

            // Assurer que la connexion SignalR est établie
            await this._ensureSignalRConnection();

            return new Promise<ImportResult>((resolve, reject) => {
                // Timeout de sécurité
                const timeoutId = setTimeout(() => {
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    resolve({...DEFAULT_ERROR_RESULT});
                }, IMPORT_TIMEOUT);

                // Gestionnaire pour l'événement d'import terminé
                const completeHandler = (data: any) => {
                    console.log('[CsvImportService] Import terminé via SignalR:', data);
                    clearTimeout(timeoutId);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                    const result: ImportResult = {
                        success: true,
                        summary: {
                            totalObjects: data?.Data?.totalProcessed || csvData.length,
                            createCount: data?.Data?.createdCount || 0,
                            updateCount: data?.Data?.updatedCount || 0,
                            deleteCount: data?.Data?.deletedCount || 0,
                            moveCount: data?.Data?.movedCount || 0,
                            errorCount: data?.Data?.errorCount || 0,
                            createOUCount: data?.Data?.createdOUCount || 0
                        },
                        details: data?.Data?.actionResults || []
                    };

                    resolve(result);
                };

                // Gestionnaire pour l'événement d'erreur d'import
                const errorHandler = (data: any) => {
                    console.error('[CsvImportService] Erreur d\'import via SignalR:', data);
                    clearTimeout(timeoutId);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                    resolve({...DEFAULT_ERROR_RESULT});
                };

                // S'abonner aux événements
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);

                // Lancer l'import direct - FIX: Utiliser send au lieu de invoke
                this._signalRService.send(HUB_NAME, 'StartImport', {ConfigId: config.id, Actions: []})
                    .catch(error => {
                        console.error('[CsvImportService] Erreur lors de l\'appel à StartImport (executeDirectImport):', error);
                        clearTimeout(timeoutId);
                        this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                        this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                        resolve({...DEFAULT_ERROR_RESULT});
                    });
            });
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de l\'exécution de l\'import direct:', error);
            return {...DEFAULT_ERROR_RESULT};
        }
    },

    // Méthodes utilitaires
    isConnected: function (): boolean {
        return this._signalRService.isConnected(HUB_NAME);
    },

    getConnectionId: function (): string | null {
        return this._connectionId;
    },
};