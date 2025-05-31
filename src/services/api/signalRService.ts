import * as signalR from '@microsoft/signalr';
import { API_CONFIG } from './config';
import { msalInstance, protectedResources, apiRequest } from '../../authConfig';

// Type pour les callbacks d'événements
type EventCallback = (...args: any[]) => void;

// Interface définissant le contrat du service SignalR
export interface ISignalRService {
    startConnection(hubName: string): Promise<void>;
    stopConnection(hubName: string): Promise<void>;
    isConnected(hubName: string): boolean;
    getConnectionState(hubName: string): signalR.HubConnectionState;
    onEvent(hubName: string, eventName: string, callback: EventCallback): void;
    offEvent(hubName: string, eventName: string, callback: EventCallback): void;
    invoke<T = any>(hubName: string, methodName: string, ...args: any[]): Promise<T>;
    send(hubName: string, methodName: string, ...args: any[]): Promise<void>;
    on(hubName: string, eventName: string, callback: EventCallback): void;
    off(hubName: string, eventName: string, callback?: EventCallback): void;
    getHubConnection(hubName: string): signalR.HubConnection | undefined;
}

// Classe pour gérer les connexions WebSocket via SignalR
class SignalRService implements ISignalRService {
    private hubConnections: Map<string, signalR.HubConnection> = new Map();
    private eventHandlers: Map<string, Map<string, EventCallback[]>> = new Map();
    private connectionStatus: Map<string, boolean> = new Map();
    
    // Méthode pour créer une connexion à un hub
    public createHubConnection(hubName: string): signalR.HubConnection {
        // Vérifier si la connexion existe déjà
        if (this.hubConnections.has(hubName)) {
            return this.hubConnections.get(hubName)!;
        }
        
        console.log(`[SignalRService] Création d'une nouvelle connexion pour le hub ${hubName}`);
        
        // Construire le chemin correct selon le nom du hub (selon le mappage dans Program.cs)
        let hubUrl;
        if (hubName === 'csvImportHub') {
            hubUrl = `${API_CONFIG.WEBSOCKET_URL}/csvImportHub`;
        } else {
            hubUrl = `${API_CONFIG.WEBSOCKET_URL}/${hubName}`;
        }
        
        console.log(`[SignalRService] URL WebSocket: ${hubUrl}`);
        
        // Créer une nouvelle connexion
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                // Options de transport
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets,
                
                // Utiliser MSAL pour obtenir le token d'authentification
                accessTokenFactory: async () => {
                    try {
                        const account = msalInstance.getAllAccounts()[0];
                        if (!account) {
                            console.error('[SignalRService] Aucun compte actif trouvé pour obtenir le token');
                            return '';
                        }
                        
                        const response = await msalInstance.acquireTokenSilent({
                            scopes: apiRequest.scopes, // Utiliser les scopes spécifiques à l'API
                            account: account
                        });
                        
                        console.log('[SignalRService] Token acquis pour SignalR');
                        return response.accessToken;
                    } catch (error: any) {
                        console.error('[SignalRService] Erreur lors de l\'obtention du token:', error);
                        
                        // Essayer d'obtenir un token via popup si l'acquisition silencieuse échoue
                        if (error.name === 'InteractionRequiredAuthError') {
                            try {
                                const response = await msalInstance.acquireTokenPopup({
                                    scopes: apiRequest.scopes // Utiliser les scopes spécifiques à l'API
                                });
                                return response.accessToken;
                            } catch (popupError) {
                                console.error('[SignalRService] Erreur lors de l\'obtention du token via popup:', popupError);
                                return '';
                            }
                        }
                        
                        return '';
                    }
                },
                
                // Timeout pour la connexion (15 secondes)
                timeout: 15000
            })
            // Configuration de la reconnexion automatique
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: (retryContext) => {
                    // Stratégie de backoff exponentiel avec un maximum de 30 secondes
                    if (retryContext.previousRetryCount === 0) {
                        return 0; // Première tentative immédiate
                    }
                    
                    // Limiter à 5 tentatives pour éviter les boucles infinies
                    if (retryContext.previousRetryCount >= 5) {
                        return null; // Arrêter les tentatives après 5 échecs
                    }
                    
                    const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
                    console.log(`[SignalRService] Tentative de reconnexion au hub ${hubName} dans ${delay}ms (essai ${retryContext.previousRetryCount})`);
                    return delay;
                }
            })
            // Niveau de journalisation
            .configureLogging(signalR.LogLevel.Information)
            .build();
        
        // Stocker la connexion
        this.hubConnections.set(hubName, connection);
        
        // Initialiser la map des gestionnaires d'événements pour ce hub
        this.eventHandlers.set(hubName, new Map<string, EventCallback[]>());
        
        // Configurer les gestionnaires d'événements de connexion
        connection.onreconnecting((error) => {
            console.log(`[SignalRService] Reconnexion au hub ${hubName}...`, error);
            this.connectionStatus.set(hubName, false);
            
            // Déclencher un événement spécial de reconnexion
            const callbacks = this.eventHandlers.get(hubName)?.get('__reconnecting') || [];
            callbacks.forEach(cb => cb(error));
        });
        
        connection.onreconnected((connectionId) => {
            console.log(`[SignalRService] Reconnecté au hub ${hubName} avec l'ID: ${connectionId}`);
            this.connectionStatus.set(hubName, true);
            
            // Déclencher un événement spécial de reconnexion réussie
            const callbacks = this.eventHandlers.get(hubName)?.get('__reconnected') || [];
            callbacks.forEach(cb => cb(connectionId));
        });
        
        connection.onclose((error) => {
            console.log(`[SignalRService] Connexion au hub ${hubName} fermée`, error);
            this.connectionStatus.set(hubName, false);
            
            // Supprimer la connexion de la map pour permettre une recréation ultérieure
            this.hubConnections.delete(hubName);
            
            // Déclencher un événement spécial de fermeture
            const callbacks = this.eventHandlers.get(hubName)?.get('__closed') || [];
            callbacks.forEach(cb => cb(error));
        });
        
        return connection;
    }
    
    // Méthode pour démarrer une connexion
    public async startConnection(hubName: string): Promise<void> {
        const connection = this.getOrCreateHubConnection(hubName);
        
        // Vérifier l'état actuel de la connexion
        if (connection.state !== signalR.HubConnectionState.Disconnected) {
            console.log(`[SignalRService] La connexion au hub ${hubName} est déjà en cours (état: ${connection.state})`);
            return; // Ne pas essayer de démarrer si la connexion n'est pas en état Disconnected
        }
        
        try {
            console.log(`[SignalRService] Tentative de connexion au hub ${hubName}...`);
            await connection.start();
            console.log(`[SignalRService] Connexion au hub ${hubName} établie avec succès`);
            this.connectionStatus.set(hubName, true);
        } catch (error: any) {
            console.error(`[SignalRService] Erreur lors de la connexion au hub ${hubName}:`, error);
            console.error(`[SignalRService] Message d'erreur: ${error.message}`);
            this.connectionStatus.set(hubName, false);
            
            // Nettoyer la connexion en cas d'échec
            this.hubConnections.delete(hubName);
            
            // Renvoyer l'erreur pour que les appelants puissent la gérer
            throw error;
        }
    }
    
    // Méthode pour vérifier si une connexion est active
    public isConnected(hubName: string): boolean {
        const connection = this.hubConnections.get(hubName);
        if (!connection) return false;
        return connection.state === signalR.HubConnectionState.Connected;
    }
    
    // Méthode pour obtenir l'état de la connexion
    public getConnectionState(hubName: string): signalR.HubConnectionState {
        const connection = this.hubConnections.get(hubName);
        if (!connection) return signalR.HubConnectionState.Disconnected;
        return connection.state;
    }
    
    // Méthode pour arrêter une connexion
    public async stopConnection(hubName: string): Promise<void> {
        const connection = this.hubConnections.get(hubName);
        
        if (!connection) {
            console.log(`[SignalRService] Aucune connexion active pour le hub ${hubName}`);
            return;
        }
        
        // Ne pas arrêter une connexion déjà déconnectée
        if (connection.state === signalR.HubConnectionState.Disconnected) {
            console.log(`[SignalRService] La connexion au hub ${hubName} est déjà déconnectée`);
            return;
        }
        
        try {
            await connection.stop();
            console.log(`[SignalRService] Connexion au hub ${hubName} arrêtée`);
            this.connectionStatus.set(hubName, false);
        } catch (error: any) {
            console.error(`[SignalRService] Erreur lors de l'arrêt de la connexion au hub ${hubName}:`, error);
            
            // Nettoyer la connexion même en cas d'erreur
            this.hubConnections.delete(hubName);
            
            throw error;
        }
    }
    
    // Méthode pour s'abonner à un événement
    public on(hubName: string, eventName: string, callback: EventCallback): void {
        const connection = this.getOrCreateHubConnection(hubName);
        
        // Ne pas normaliser le nom de l'événement, utiliser exactement le même nom que le serveur
        console.log(`[SignalRService] Abonnement à l'événement ${eventName} sur le hub ${hubName}`);
        
        // Ajouter le callback à la liste des gestionnaires pour cet événement
        const hubEventHandlers = this.eventHandlers.get(hubName)!;
        if (!hubEventHandlers.has(eventName)) {
            hubEventHandlers.set(eventName, []);
            
            // Configurer le gestionnaire d'événements sur la connexion
            connection.on(eventName, (...args: any[]) => {
                console.log(`[SignalRService] Événement ${eventName} reçu du hub ${hubName}`, args);
                const callbacks = hubEventHandlers.get(eventName) || [];
                callbacks.forEach(cb => cb(...args));
            });
        }
        
        hubEventHandlers.get(eventName)!.push(callback);
    }
    
    // Nouvelle méthode d'abonnement compatible avec la nouvelle interface
    public onEvent(hubName: string, eventName: string, callback: EventCallback): void {
        this.on(hubName, eventName, callback);
    }
    
    // Méthode pour se désabonner d'un événement
    public off(hubName: string, eventName: string, callback?: EventCallback): void {
        // Ne pas normaliser le nom d'événement, utiliser exactement le même nom que le serveur
        
        const hubEventHandlers = this.eventHandlers.get(hubName);
        
        if (hubEventHandlers && hubEventHandlers.has(eventName)) {
            if (callback) {
                // Supprimer uniquement le callback spécifié
                const callbacks = hubEventHandlers.get(eventName)!;
                const index = callbacks.indexOf(callback);
                
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
                
                if (callbacks.length === 0) {
                    // Si plus aucun callback, supprimer l'événement
                    hubEventHandlers.delete(eventName);
                    this.hubConnections.get(hubName)?.off(eventName);
                }
            } else {
                // Supprimer tous les callbacks pour cet événement
                hubEventHandlers.delete(eventName);
                this.hubConnections.get(hubName)?.off(eventName);
            }
        }
    }
    
    // Méthode compatible avec la nouvelle interface
    public offEvent(hubName: string, eventName: string, callback: EventCallback): void {
        this.off(hubName, eventName, callback);
    }
    
    // Méthode pour appeler une méthode du hub et attendre une réponse
    public async invoke<T = any>(hubName: string, methodName: string, ...args: any[]): Promise<T> {
        const connection = this.getOrCreateHubConnection(hubName);
        
        if (connection.state !== signalR.HubConnectionState.Connected) {
            console.warn(`[SignalRService] Tentative d'appel de ${methodName} alors que la connexion n'est pas établie`);
            
            try {
                await this.startConnection(hubName);
            } catch (error: any) {
                console.error(`[SignalRService] Échec de la connexion automatique au hub ${hubName}`);
                throw new Error(`La connexion au hub ${hubName} n'est pas établie et ne peut pas être démarrée automatiquement`);
            }
        }
        
        try {
            console.log(`[SignalRService] Appel de la méthode ${methodName} sur le hub ${hubName}`, args);
            const result = await connection.invoke<T>(methodName, ...args);
            console.log(`[SignalRService] Résultat de la méthode ${methodName}:`, result);
            return result;
        } catch (error: any) {
            console.error(`[SignalRService] Erreur lors de l'appel de la méthode ${methodName} sur le hub ${hubName}:`, error);
            throw error;
        }
    }
    
    // Méthode pour envoyer une méthode au serveur (sans attendre de réponse)
    public async send(hubName: string, methodName: string, ...args: any[]): Promise<void> {
        const connection = this.getOrCreateHubConnection(hubName);
        
        if (connection.state !== signalR.HubConnectionState.Connected) {
            console.warn(`[SignalRService] Tentative d'envoi de ${methodName} alors que la connexion n'est pas établie`);
            
            // Essayer de démarrer la connexion si elle est déconnectée
            if (connection.state === signalR.HubConnectionState.Disconnected) {
                try {
                    await this.startConnection(hubName);
                } catch (error: any) {
                    console.error(`[SignalRService] Échec de la connexion automatique au hub ${hubName}`);
                    throw new Error(`La connexion au hub ${hubName} n'est pas établie et ne peut pas être démarrée automatiquement`);
                }
            } else {
                throw new Error(`La connexion au hub ${hubName} n'est pas dans un état permettant l'envoi (${connection.state})`);
            }
        }
        
        try {
            console.log(`[SignalRService] Envoi de la méthode ${methodName} au hub ${hubName}`, args);
            await connection.send(methodName, ...args);
            console.log(`[SignalRService] Méthode ${methodName} envoyée avec succès`);
        } catch (error: any) {
            console.error(`[SignalRService] Erreur lors de l'envoi de la méthode ${methodName} au hub ${hubName}:`, error);
            throw error;
        }
    }
    
    // Méthode pour obtenir ou créer une connexion
    private getOrCreateHubConnection(hubName: string): signalR.HubConnection {
        if (!this.hubConnections.has(hubName)) {
            return this.createHubConnection(hubName);
        }
        return this.hubConnections.get(hubName)!;
    }
    
    // Méthode pour obtenir une connexion existante
    public getHubConnection(hubName: string): signalR.HubConnection | undefined {
        return this.hubConnections.get(hubName);
    }
}

// Exporter une instance unique du service
export const signalRService = new SignalRService();
