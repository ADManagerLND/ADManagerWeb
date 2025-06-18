import {csvImportService} from './csvImportService';

/**
 * Utilitaire pour l'initialisation du service d'importation CSV avec SignalR
 */
export const importSystemMigrator = {
    /**
     * Mode du système (toujours SignalR)
     */
    get currentMode(): 'signalr' {
        return 'signalr';
    },

    /**
     * Initialise le service d'importation CSV avec SignalR
     */
    async initializeService(): Promise<boolean> {
        try {
            console.log('[ImportSystemMigrator] Initialisation du service en mode SignalR');
            return await csvImportService.initialize('signalr');
        } catch (error) {
            console.error('[ImportSystemMigrator] Erreur lors de l\'initialisation du service SignalR:', error);
            throw error;
        }
    }
}; 