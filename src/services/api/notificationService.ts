import {signalRService} from './signalRService';
import {API_CONFIG} from './config';

// Interface pour les notifications
export interface Notification {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
    isRead: boolean;
    // Ajoutez d'autres propriétés selon vos besoins
}

// Type pour les callbacks de notification
type NotificationCallback = (notification: Notification) => void;

// Service pour gérer les notifications en temps réel
class NotificationService {
    private readonly HUB_NAME = API_CONFIG.HUBS.NOTIFICATIONS;
    private notificationCallbacks: NotificationCallback[] = [];

    // Méthode pour initialiser la connexion au hub de notifications
    public async initialize(): Promise<void> {
        try {
            // Créer et démarrer la connexion
            await signalRService.startConnection(this.HUB_NAME);

            // S'abonner à l'événement de réception de notification
            signalRService.on(this.HUB_NAME, 'ReceiveNotification', (notification: Notification) => {
                console.log('Notification reçue:', notification);

                // Appeler tous les callbacks enregistrés
                this.notifyCallbacks(notification);
            });

            console.log('Service de notifications initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du service de notifications:', error);

            // Ne pas propager l'erreur pour permettre à l'application de fonctionner
            console.warn('Service de notifications désactivé - les notifications en temps réel ne seront pas disponibles');

            // Nous pouvons quand même notifier l'interface utilisateur que les notifications 
            // ne fonctionneront pas, via les callbacks s'il y en a
            if (this.notificationCallbacks.length > 0) {
                const errorNotification: Notification = {
                    id: -1,
                    message: 'Service de notifications indisponible. Connexion au serveur impossible.',
                    type: 'warning',
                    timestamp: new Date().toISOString(),
                    isRead: false
                };
                this.notifyCallbacks(errorNotification);
            }
        }
    }

    // Méthode pour s'abonner aux notifications
    public subscribeToNotifications(callback: NotificationCallback): void {
        this.notificationCallbacks.push(callback);
    }

    // Méthode pour se désabonner des notifications
    public unsubscribeFromNotifications(callback: NotificationCallback): void {
        const index = this.notificationCallbacks.indexOf(callback);

        if (index !== -1) {
            this.notificationCallbacks.splice(index, 1);
        }
    }

    // Méthode pour marquer une notification comme lue
    public async markAsRead(notificationId: number): Promise<void> {
        try {
            await signalRService.invoke(this.HUB_NAME, 'MarkNotificationAsRead', notificationId);
        } catch (error) {
            console.error('Erreur lors du marquage de la notification comme lue:', error);
            throw error;
        }
    }

    // Méthode pour marquer toutes les notifications comme lues
    public async markAllAsRead(): Promise<void> {
        try {
            await signalRService.invoke(this.HUB_NAME, 'MarkAllNotificationsAsRead');
        } catch (error) {
            console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
            throw error;
        }
    }

    // Méthode pour arrêter la connexion
    public async disconnect(): Promise<void> {
        try {
            await signalRService.stopConnection(this.HUB_NAME);
            this.notificationCallbacks = [];
        } catch (error) {
            console.error('Erreur lors de la déconnexion du service de notifications:', error);
            throw error;
        }
    }

    // Méthode privée pour notifier tous les callbacks
    private notifyCallbacks(notification: Notification): void {
        this.notificationCallbacks.forEach(callback => {
            try {
                callback(notification);
            } catch (error) {
                console.error('Erreur dans un callback de notification:', error);
            }
        });
    }
}

// Exporter une instance unique du service de notifications
export const notificationService = new NotificationService();
