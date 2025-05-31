// src/services/csvImportService.ts
import { signalRService } from './api/signalRService';
import { httpService } from './api/httpService';
import { API_CONFIG } from './api/config';
import { 
    ImportConfig, 
    CsvAnalysisResult, 
    ImportResult, 
    ActionItem,
    ImportProgress,
    LogEntry,
    ActionType,
    ImportActionItem,
    ImportAnalysis
} from '../models/CsvImport';
import * as signalR from '@microsoft/signalr';

// Constantes pour le service
const HUB_NAME = 'csvImportHub';
const FILE_UPLOAD_TIMEOUT = 300000; // 5 minutes en millisecondes
const ANALYSIS_TIMEOUT = 120000; // 2 minutes en millisecondes
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
    summary: { ...DEFAULT_IMPORT_SUMMARY, errorCount: 1 },
    details: []
};

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
    _ensureBoundHandlers: function() {
        if (!this._boundReceiveProgressHandler) {
            this._boundReceiveProgressHandler = (progress: ImportProgress) => {
                console.log('[CsvImportService] Progression reçue (global handler):', progress);
                this._progressHandlers.forEach(handler => handler(progress));
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
                    summary: serverData.summary || { ...DEFAULT_IMPORT_SUMMARY },
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
    _registerGlobalEventHandlers: function() {
        this._ensureBoundHandlers();

        const eventMappings = [
            { event: 'ReceiveProgress', handler: this._boundReceiveProgressHandler },
            { event: 'ReceiveLog', handler: this._boundReceiveLogHandler },
            { event: 'ANALYSIS_COMPLETE', handler: this._boundAnalysisCompleteHandler },
            { event: 'ANALYSIS_ERROR', handler: this._boundAnalysisErrorHandler },
            { event: 'IMPORT_COMPLETE', handler: this._boundImportCompleteHandler }
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
    initialize: async function() {
        try {
            console.log('[CsvImportService] Initialisation du service avec SignalR');
            this._ensureBoundHandlers();
            
            await this._signalRService.startConnection(HUB_NAME);
            this._registerGlobalEventHandlers();
            
            console.log('[CsvImportService] Service d\'import CSV initialisé avec succès');
            return true;
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de l\'initialisation:', error);
            throw error;
        }
    },
    
    // Configuration de la reconnexion automatique
    setAutoReconnect: function(value: boolean): void {
        this._autoReconnect = value;
        console.log(`[CsvImportService] Reconnexion automatique ${value ? 'activée' : 'désactivée'}`);
    },
    
    // Déconnexion du service
    disconnect: async function(): Promise<void> {
        try {
            await this._signalRService.stopConnection(HUB_NAME);
            console.log('[CsvImportService] Déconnexion réussie');
        } catch (error: any) {
            console.error('[CsvImportService] Erreur lors de la déconnexion:', error);
            throw error;
        }
    },
    
    // Gestion des abonnements aux événements de progression
    subscribeToProgress: function(handler: (progress: ImportProgress) => void): void {
        this._progressHandlers.push(handler);
        console.log('[CsvImportService] Nouvel abonnement aux événements de progression');
    },
    
    unsubscribeFromProgress: function(handler: (progress: ImportProgress) => void): void {
        this._progressHandlers = this._progressHandlers.filter(h => h !== handler);
        console.log('[CsvImportService] Désabonnement d\'un gestionnaire de progression');
    },
    
    // Gestion des abonnements aux événements de logs
    subscribeToLogs: function(handler: (log: LogEntry) => void): void {
        this._logHandlers.push(handler);
        console.log('[CsvImportService] Nouvel abonnement aux événements de log');
    },
    
    unsubscribeFromLogs: function(handler: (log: LogEntry) => void): void {
        this._logHandlers = this._logHandlers.filter(h => h !== handler);
        console.log('[CsvImportService] Désabonnement d\'un gestionnaire de log');
    },
    
    // Récupération des configurations d'import
    getImportConfigs: async function(): Promise<ImportConfig[]> {
        try {
            const response = await httpService.get(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT}`);
            return response.data || [];
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de la récupération des configurations:', error);
            throw error;
        }
    },
    
    // Vérifier et assurer la connexion SignalR
    _ensureSignalRConnection: async function(): Promise<signalR.HubConnection> {
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

    // Télécharger et analyser un fichier CSV
    uploadAndAnalyzeCsv: async function(file: File, configId: string): Promise<CsvAnalysisResult> {
        try {
            console.log('[CsvImportService] Début du téléchargement et de l\'analyse du CSV');
            
            // Assurer que la connexion SignalR est établie
            const connection = await this._ensureSignalRConnection();
            
            this._connectionId = connection.connectionId;
            console.log(`[CsvImportService] ConnectionId pour l'upload: ${this._connectionId}`);

            if (!this._connectionId) {
                const errorMsg = 'Impossible d\'obtenir l\'ID de connexion SignalR pour le téléversement.';
                console.error(`[CsvImportService] ${errorMsg}`);
                this._progressHandlers.forEach(h => h({progress: 0, status: 'error', message: errorMsg}));
                throw new Error(errorMsg);
            }

            this._progressHandlers.forEach(handler => handler({
                progress: 5,
                status: 'analyzing',
                message: 'Préparation du téléchargement du fichier...'
            }));
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('configId', configId);
            formData.append('connectionId', this._connectionId);

            this._progressHandlers.forEach(handler => handler({
                progress: 15,
                status: 'analyzing',
                message: 'Téléchargement du fichier en cours...'
            }));
            
            console.log(`[CsvImportService] Démarrage de l'upload avec un timeout de ${FILE_UPLOAD_TIMEOUT}ms pour le fichier ${file.name} (${file.size} octets)`);
            
            await httpService.post(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT_UPLOAD}`,
                formData,
                { 
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: FILE_UPLOAD_TIMEOUT
                }
            );
            
            this._progressHandlers.forEach(handler => handler({
                progress: 30,
                status: 'analyzing',
                message: 'Fichier téléchargé, début de l\'analyse...'
            }));
            
            console.log('[CsvImportService] Démarrage de l\'analyse via SignalR, configId:', configId);
            await this._signalRService.invoke(HUB_NAME, 'StartAnalysis', configId);
            
            return this._waitForAnalysisResult();
            
        } catch (err) {
            const error = err as Error & { code?: string };
            console.error('[CsvImportService] Erreur lors du téléchargement et de l\'analyse du CSV:', error);
            
            // Vérifier si l'erreur est un timeout
            const isTimeoutError = error.message && (
                error.message.includes('timeout') || 
                error.code === 'ECONNABORTED'
            );
            
            if (isTimeoutError) {
                // Même si l'upload a expiré côté client, il est possible que le serveur l'ait reçu et continue le traitement
                this._progressHandlers.forEach(h => h({
                    progress: 30, 
                    status: 'analyzing', 
                    message: "L'upload a pris plus de temps que prévu, mais le serveur traite peut-être toujours votre fichier. Tentative de continuation..."
                }));
                
                try {
                    // Essayer d'invoquer StartAnalysis même après un timeout d'upload
                    await this._signalRService.invoke(HUB_NAME, 'StartAnalysis', configId);
                    
                    this._progressHandlers.forEach(h => h({
                        progress: 35, 
                        status: 'analyzing', 
                        message: "L'analyse du fichier a commencé, veuillez patienter..."
                    }));
                    
                    // Attendre le résultat de l'analyse
                    return this._waitForAnalysisResult();
                    
                } catch (retryError) {
                    console.error('[CsvImportService] Échec de la tentative de reprise après timeout:', retryError);
                }
            }
            
            this._progressHandlers.forEach(h => h({progress: 0, status: 'error', message: error.message || 'Erreur inconnue'}));
            throw error;
        }
    },
    
    // Attendre le résultat de l'analyse
    _waitForAnalysisResult: function(): Promise<CsvAnalysisResult> {
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
                    
                    const analysisData = progressData.analysis;
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
                } 
                else if (progressData.status === 'error') {
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
    executeImport: async function(csvData: Record<string, string>[], config: ImportConfig, actions: ActionItem[]): Promise<ImportResult> {
        try {
            console.log('[CsvImportService] Début de l\'exécution de l\'import via SignalR');
            
            // Assurer que la connexion SignalR est établie
            await this._ensureSignalRConnection();
            
            const legacyActions = actions.map(a => ({
                RowIndex: 0,
                ActionType: a.actionType.toString(),
                Data: {
                    objectName: a.objectName,
                    path: a.path,
                    message: a.message
                },
                IsValid: a.selected === undefined ? true : a.selected,
                ValidationErrors: []
            }));
            
            return new Promise<ImportResult>((resolve, reject) => {
                // Handler pour l'événement d'import terminé
                const completeHandler = (data: any) => {
                    console.log('[CsvImportService] Import terminé via SignalR:', data);
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
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    
                    resolve({ ...DEFAULT_ERROR_RESULT });
                };

                // S'abonner aux événements
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                
                // Lancer l'import
                this._signalRService.invoke(HUB_NAME, 'StartImport', { ConfigId: config.id, Actions: legacyActions })
                .catch(error => {
                    console.error('[CsvImportService] Erreur lors de l\'appel à StartImport:', error);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    resolve({ ...DEFAULT_ERROR_RESULT });
                });

                // Timeout de sécurité
                const timeoutId = setTimeout(() => {
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    resolve({ ...DEFAULT_ERROR_RESULT });
                }, IMPORT_TIMEOUT);
            });
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de l\'exécution de l\'import:', error);
            return { ...DEFAULT_ERROR_RESULT };
        }
    },
    
    // S'abonner aux événements de progression avec fonction de désabonnement
    onProgress: function(handler: (progress: ImportProgress) => void): () => void {
        this._progressHandlers.push(handler);
        
        // Retourner une fonction pour se désabonner
        return () => {
            this._progressHandlers = this._progressHandlers.filter(h => h !== handler);
        };
    },
    
    // S'abonner aux événements de log avec fonction de désabonnement
    onLog: function(handler: (log: LogEntry) => void): () => void {
        this._logHandlers.push(handler);
        
        // Retourner une fonction pour se désabonner
        return () => {
            this._logHandlers = this._logHandlers.filter(h => h !== handler);
        };
    },
    
    // Démarrer l'import
    startImport: async function(configId: string, actions: ImportActionItem[]): Promise<ImportResult> {
        try {
            console.log(`[CsvImportService] Début de l'import avec la configuration ${configId}`);
            
            // Obtenir l'ID de connexion
            let connectionId = "";
            try {
                connectionId = await this._signalRService.invoke(HUB_NAME, 'GetConnectionId');
            } catch (error) {
                console.warn('[CsvImportService] Impossible d\'obtenir l\'ID de connexion via GetConnectionId, tentative alternative');
                connectionId = Date.now().toString(); // ID temporaire comme fallback
            }
            
            return new Promise((resolve, reject) => {
                // Gestionnaire pour l'événement d'import complet
                const completeHandler = (data: any) => {
                    console.log('[CsvImportService] Import complet:', data);
                    
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    
                    resolve(data?.Data || {});
                };
                
                // Gestionnaire pour l'événement d'erreur d'import
                const errorHandler = (data: any) => {
                    console.error('[CsvImportService] Erreur d\'import:', data);
                    
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    
                    reject(new Error(data?.Data?.Error || 'Erreur inconnue lors de l\'import'));
                };
                
                // S'abonner aux événements
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                
                // Démarrer l'import
                this._signalRService.invoke(HUB_NAME, 'StartImport', {
                    ConfigId: configId,
                    Actions: actions
                })
                .catch(error => {
                    console.error('[CsvImportService] Erreur lors du démarrage de l\'import:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de l\'import:', error);
            throw error;
        }
    },

    // Exécuter et surveiller un import (méthode de transition)
    executeAndPoll: async function(configId: string, items: ImportActionItem[], onProgress: (progress: ImportProgress) => void): Promise<ImportResult> {
        return Promise.resolve({ 
            success: false, 
            summary: { ...DEFAULT_IMPORT_SUMMARY, errorCount: 1 },
            details: [],
            errorMessage: "Fonction non implémentée"
        }); 
    },

    // Exécuter un import direct à partir des données CSV
    executeDirectImport: async function(csvData: Record<string, string>[], config: ImportConfig): Promise<ImportResult> {
        try {
            console.log('[CsvImportService] Début de l\'exécution de l\'import direct via SignalR');
            
            // Assurer que la connexion SignalR est établie
            await this._ensureSignalRConnection();
            
            return new Promise<ImportResult>((resolve, reject) => {
                // Gestionnaire pour l'événement d'import terminé
                const completeHandler = (data: any) => {
                    console.log('[CsvImportService] Import terminé via SignalR:', data);
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
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    
                    resolve({ ...DEFAULT_ERROR_RESULT });
                };

                // S'abonner aux événements
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                this._signalRService.onEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                
                // Lancer l'import direct
                this._signalRService.invoke(HUB_NAME, 'StartImport', { ConfigId: config.id, Actions: [] })
                .catch(error => {
                    console.error('[CsvImportService] Erreur lors de l\'appel à StartImport (executeDirectImport):', error);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    resolve({ ...DEFAULT_ERROR_RESULT });
                });

                // Timeout de sécurité
                const timeoutId = setTimeout(() => {
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_COMPLETE', completeHandler);
                    this._signalRService.offEvent(HUB_NAME, 'IMPORT_ERROR', errorHandler);
                    resolve({ ...DEFAULT_ERROR_RESULT });
                }, IMPORT_TIMEOUT);
            });
        } catch (error) {
            console.error('[CsvImportService] Erreur lors de l\'exécution de l\'import direct:', error);
            return { ...DEFAULT_ERROR_RESULT };
        }
    },
};
