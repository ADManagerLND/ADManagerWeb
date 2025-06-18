import * as signalR from '@microsoft/signalr';
import {API_CONFIG} from './api/config';
import authService from './auth/authService';

/**
 * Service pour gérer les connexions SignalR
 */
class SignalRService {
    private connections: Map<string, signalR.HubConnection>;

    constructor() {
        this.connections = new Map();
    }

    /**
     * Crée ou récupère une connexion à un hub SignalR
     * @param hubName Nom du hub à connecter
     * @returns Connexion au hub
     */
    public async getConnection(hubName: string): Promise<signalR.HubConnection> {
        if (this.connections.has(hubName)) {
            return this.connections.get(hubName)!;
        }

        // Vérifier si l'utilisateur est authentifié
        if (!this.isAuthenticated()) {
            console.warn(`[SignalRService] Authentification requise pour le hub ${hubName}`);
            throw new Error('Authentification requise pour accéder au hub SignalR');
        }

        const hubUrl = `${API_CONFIG.WEBSOCKET_URL}/${hubName}`;
        console.log(`[SignalRService] Création d'une nouvelle connexion pour le hub ${hubName}`);
        console.log(`[SignalRService] URL WebSocket: ${hubUrl}`);

        // Créer la connexion avec accessTokenFactory pour authentification automatique
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: async () => {
                    try {
                        const token = await authService.getAccessToken();
                        if (!token) {
                            console.warn('[SignalRService] Aucun compte actif trouvé pour obtenir le token');
                            throw new Error('Token indisponible');
                        }
                        return token;
                    } catch (error) {
                        console.error('[SignalRService] Erreur lors de l\'obtention du token:', error);
                        throw error;
                    }
                }
            })
            .withAutomaticReconnect([0, 1000, 5000, 10000, 30000]) // Tentatives de reconnexion
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Stocker la connexion avant démarrage pour éviter les doublons
        this.connections.set(hubName, connection);

        try {
            // Démarrer la connexion
            await this.startConnection(connection);

            // Configurer les gestionnaires par défaut pour déconnexion et reconnexion
            connection.onclose((error) => {
                console.log(`[SignalRService] Connexion au hub ${hubName} fermée`, error);
                // En cas de fermeture, supprimer la connexion de la map pour permettre une nouvelle initialisation
                this.connections.delete(hubName);
            });

            connection.onreconnecting((error) => {
                console.log(`[SignalRService] Tentative de reconnexion au hub ${hubName}...`, error);
            });

            connection.onreconnected((connectionId) => {
                console.log(`[SignalRService] Reconnecté au hub ${hubName} avec l'ID: ${connectionId}`);
            });

            return connection;
        } catch (error) {
            // En cas d'échec, supprimer la connexion pour permettre une nouvelle tentative
            this.connections.delete(hubName);
            throw error;
        }
    }

    /**
     * Enregistre une méthode sur une connexion
     * @param hubName Nom du hub
     * @param methodName Nom de la méthode
     * @param callback Fonction à appeler quand la méthode est invoquée
     */
    public async registerHandler(
        hubName: string,
        methodName: string,
        callback: (...args: any[]) => void
    ): Promise<void> {
        try {
            // Vérifier si l'utilisateur est authentifié
            if (!this.isAuthenticated()) {
                console.warn(`[SignalRService] Authentification requise pour enregistrer un gestionnaire sur ${hubName}`);
                return;
            }

            const connection = await this.getConnection(hubName);
            connection.on(methodName, callback);
            console.log(`[SignalRService] Handler enregistré pour la méthode ${methodName} sur le hub ${hubName}`);
        } catch (error) {
            console.error(`[SignalRService] Impossible d'enregistrer le gestionnaire pour ${methodName}:`, error);
        }
    }

    /**
     * Envoie une méthode à un hub
     * @param hubName Nom du hub
     * @param methodName Méthode à invoquer
     * @param args Arguments à passer à la méthode
     */
    public async invokeMethod(hubName: string, methodName: string, ...args: any[]): Promise<any> {
        try {
            // Vérifier si l'utilisateur est authentifié
            if (!this.isAuthenticated()) {
                console.warn(`[SignalRService] Authentification requise pour invoquer une méthode sur ${hubName}`);
                throw new Error('Authentification requise');
            }

            // Vérifier si la connexion existe
            if (!this.connections.has(hubName)) {
                console.log(`[SignalRService] Connexion au hub ${hubName} non trouvée`);
                await this.getConnection(hubName);
            }

            const connection = this.connections.get(hubName);
            if (!connection) {
                console.error(`[SignalRService] Aucune connexion active pour le hub ${hubName}`);
                throw new Error(`Connexion au hub ${hubName} non disponible`);
            }

            console.log(`[SignalRService] Invocation de la méthode ${methodName} sur le hub ${hubName}...`);
            return await connection.invoke(methodName, ...args);
        } catch (error) {
            console.error(`[SignalRService] Erreur lors de l'invocation de ${methodName}:`, error);
            throw error;
        }
    }

    /**
     * Ferme une connexion à un hub
     * @param hubName Nom du hub à déconnecter
     */
    public async closeConnection(hubName: string): Promise<void> {
        const connection = this.connections.get(hubName);

        if (connection) {
            await connection.stop();
            this.connections.delete(hubName);
            console.log(`[SignalRService] Connexion au hub ${hubName} fermée`);
        }
    }

    /**
     * Vérifie si le serveur SignalR est disponible
     * @param hubName Nom du hub à tester
     * @returns true si le serveur est disponible
     */
    public async isHubAvailable(hubName: string): Promise<boolean> {
        try {
            const hubUrl = `${API_CONFIG.WEBSOCKET_URL}/${hubName}/negotiate`;
            const response = await fetch(hubUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            return response.status !== 404;
        } catch (error) {
            console.warn(`[SignalRService] Hub ${hubName} non disponible:`, error);
            return false;
        }
    }

    /**
     * Crée une connexion seulement si le hub est disponible
     * @param hubName Nom du hub
     * @returns Connexion au hub ou null si indisponible
     */
    public async getConnectionSafe(hubName: string): Promise<signalR.HubConnection | null> {
        try {
            // Vérifier d'abord si le hub est disponible
            const isAvailable = await this.isHubAvailable(hubName);
            if (!isAvailable) {
                console.warn(`[SignalRService] Hub ${hubName} non disponible, connexion annulée`);
                return null;
            }
            
            return await this.getConnection(hubName);
        } catch (error) {
            console.warn(`[SignalRService] Impossible de se connecter au hub ${hubName}:`, error);
            return null;
        }
    }

    /**
     * Ferme toutes les connexions
     */
    public async closeAllConnections(): Promise<void> {
        const connectionPromises = Array.from(this.connections.entries()).map(
            async ([hubName, connection]) => {
                await connection.stop();
                console.log(`[SignalRService] Connexion au hub ${hubName} fermée`);
            }
        );

        await Promise.all(connectionPromises);
        this.connections.clear();
    }

    /**
     * Vérifie si l'utilisateur est authentifié avant de tenter une connexion
     * @returns true si un utilisateur est connecté
     */
    private isAuthenticated(): boolean {
        return authService.isAuthenticated();
    }

    /**
     * Démarre une connexion avec gestion d'erreur et tentatives
     * @param connection Connexion à démarrer
     * @param retryCount Nombre de tentatives actuelles
     * @param maxRetries Nombre maximum de tentatives
     */
    private async startConnection(
        connection: signalR.HubConnection,
        retryCount = 0,
        maxRetries = 3
    ): Promise<void> {
        try {
            console.log(`[SignalRService] Tentative de connexion au hub ${connection.baseUrl || "inconnu"}...`);
            await connection.start();
            console.log('[SignalRService] Connexion SignalR établie!');
        } catch (err: any) {
            console.error('[SignalRService] Erreur lors de la connexion au hub:', err);
            console.log('[SignalRService] Message d\'erreur:', err.message);

            if (err.message && err.message.includes('Unauthorized')) {
                console.error('[SignalRService] Erreur d\'authentification 401, la connexion nécessite un token valide.');
                throw err; // Ne pas réessayer en cas d'erreur d'authentification
            }

            if (retryCount < maxRetries) {
                console.log(`[SignalRService] Nouvelle tentative dans ${Math.pow(2, retryCount) * 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                await this.startConnection(connection, retryCount + 1, maxRetries);
            } else {
                console.error('[SignalRService] Échec de connexion après plusieurs tentatives');
                throw err;
            }
        }
    }
}

// Export d'une instance singleton
const signalRService = new SignalRService();
export default signalRService; 