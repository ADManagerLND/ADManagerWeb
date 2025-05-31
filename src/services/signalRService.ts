import * as signalR from '@microsoft/signalr';
import { API_CONFIG } from './api/config';
import { msalInstance, protectedResources } from '../authConfig';

// Type pour les callbacks d'événements
type EventCallback = (...args: any[]) => void;

// Interface pour le service SignalR
export interface ISignalRService {
    createHubConnection(hubName: string): Promise<signalR.HubConnection>;
    startConnection(hubName: string): Promise<void>;
    stopConnection(hubName: string): Promise<void>;
    on(hubName: string, eventName: string, callback: EventCallback): void;
    off(hubName: string, eventName: string, callback: EventCallback): void;
    invoke(hubName: string, methodName: string, ...args: any[]): Promise<any>;
}

// Classe pour gérer les connexions WebSocket via SignalR
class SignalRService implements ISignalRService {
    private hubConnections: Map<string, signalR.HubConnection> = new Map();
    private eventHandlers: Map<string, Map<string, EventCallback[]>> = new Map();
    private connectionStatus: Map<string, boolean> = new Map();
    
    // Méthode pour créer une connexion à un hub
    public async createHubConnection(hubName: string): Promise<signalR.HubConnection> {
        // Vérifier si la connexion existe déjà
        const existingConnection = this.hubConnections.get(hubName);
        if (existingConnection) {
            return existingConnection;
        }
        
        console.log(`[SignalRService] Création d'une nouvelle connexion pour le hub ${hubName}`);
        
        // Créer une nouvelle connexion
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_CONFIG.WEBSOCKET_URL}/${hubName}`, {
                // Options de transport
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets,
                
                // Utiliser MSAL pour obtenir le token
                accessTokenFactory: async () => {
                    try {
                        const account = msalInstance.getAllAccounts()[0];
                        if (!account) {
                            throw new Error('No active account! Please sign in before connecting to SignalR.');
                        }

                        const response = await msalInstance.acquireTokenSilent({
                            scopes: protectedResources.api.scopes,
                            account: account
                        });

                        return response.accessToken;
                    } catch (error: any) {
                        console.error('[SignalRService] Error getting token:', error);
                        
                        if (error.name === 'InteractionRequiredAuthError') {
                            try {
                                const response = await msalInstance.acquireTokenPopup({
                                    scopes: protectedResources.api.scopes
                                });
                                return response.accessToken;
                            } catch (popupError) {
                                console.error('[SignalRService] Error getting token with popup:', popupError);
                                throw popupError;
                            }
                        }
                        
                        throw error;
                    }
                }
            })
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: (retryContext) => {
                    if (retryContext.previousRetryCount === 0) {
                        return 0;
                    }
                    if (retryContext.previousRetryCount >= 5) {
                        return null;
                    }
                    return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
                }
            })
            .configureLogging(signalR.LogLevel.Information)
            .build();
        
        // Stocker la connexion
        this.hubConnections.set(hubName, connection);
        
        // Initialiser la map des gestionnaires d'événements pour ce hub
        this.eventHandlers.set(hubName, new Map<string, EventCallback[]>());
        
        // Gérer les événements de connexion
        connection.onclose((error) => {
            console.log(`[SignalRService] Connexion fermée pour le hub ${hubName}`, error);
            this.connectionStatus.set(hubName, false);
        });
        
        connection.onreconnecting((error) => {
            console.log(`[SignalRService] Tentative de reconnexion pour le hub ${hubName}`, error);
            this.connectionStatus.set(hubName, false);
        });
        
        connection.onreconnected((connectionId) => {
            console.log(`[SignalRService] Reconnecté au hub ${hubName} avec l'ID ${connectionId}`);
            this.connectionStatus.set(hubName, true);
        });
        
        return connection;
    }
    
    // Méthode pour démarrer une connexion
    public async startConnection(hubName: string): Promise<void> {
        const connection = await this.createHubConnection(hubName);
        if (!this.connectionStatus.get(hubName)) {
            try {
                await connection.start();
                console.log(`[SignalRService] Connexion établie avec le hub ${hubName}`);
                this.connectionStatus.set(hubName, true);
            } catch (error) {
                console.error(`[SignalRService] Erreur lors de la connexion au hub ${hubName}:`, error);
                this.connectionStatus.set(hubName, false);
                throw error;
            }
        }
    }
    
    // Méthode pour arrêter une connexion
    public async stopConnection(hubName: string): Promise<void> {
        const connection = this.hubConnections.get(hubName);
        if (connection) {
            try {
                await connection.stop();
                console.log(`[SignalRService] Connexion arrêtée pour le hub ${hubName}`);
                this.connectionStatus.set(hubName, false);
            } catch (error) {
                console.error(`[SignalRService] Erreur lors de l'arrêt de la connexion au hub ${hubName}:`, error);
                throw error;
            }
        }
    }
    
    // Méthode pour s'abonner à un événement
    public on(hubName: string, eventName: string, callback: EventCallback): void {
        const connection = this.hubConnections.get(hubName);
        if (!connection) {
            throw new Error(`No connection found for hub ${hubName}`);
        }
        
        const handlers = this.eventHandlers.get(hubName);
        if (!handlers) {
            throw new Error(`No event handlers found for hub ${hubName}`);
        }
        
        if (!handlers.has(eventName)) {
            handlers.set(eventName, []);
        }
        
        const callbacks = handlers.get(eventName);
        if (callbacks) {
            callbacks.push(callback);
            connection.on(eventName, callback);
        }
    }
    
    // Méthode pour se désabonner d'un événement
    public off(hubName: string, eventName: string, callback: EventCallback): void {
        const connection = this.hubConnections.get(hubName);
        const handlers = this.eventHandlers.get(hubName);
        
        if (connection && handlers) {
            const callbacks = handlers.get(eventName);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                    connection.off(eventName, callback);
                }
            }
        }
    }
    
    // Méthode pour invoquer une méthode sur le hub
    public async invoke(hubName: string, methodName: string, ...args: any[]): Promise<any> {
        const connection = this.hubConnections.get(hubName);
        if (!connection) {
            throw new Error(`No connection found for hub ${hubName}`);
        }
        
        try {
            return await connection.invoke(methodName, ...args);
        } catch (error) {
            console.error(`[SignalRService] Erreur lors de l'invocation de la méthode ${methodName} sur le hub ${hubName}:`, error);
            throw error;
        }
    }
}

// Exporter une instance unique du service
export const signalRService = new SignalRService(); 