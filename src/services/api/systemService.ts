import { httpService } from './httpService';

export interface DashboardStats {
    importedAccounts: number;
    ouGroupsCount: number;
    averageProcessingTime: number;
    teamsCreated: number;
    lastSyncTime: string;
    successRate: number;
    errorCount: number;
    defaultOU: string;
}

export interface SystemInfo {
    version: string;
    supportedConnectionTypes: string[];
    defaultConnectionType: string;
}

export const systemService = {
    /**
     * Récupère les statistiques du tableau de bord
     */
    async getDashboardStats(): Promise<DashboardStats> {
        console.log('[SystemService] 📊 Récupération des statistiques du tableau de bord...');
        
        try {
            const response = await httpService.get<DashboardStats>('/api/System/dashboard-stats');
            console.log('[SystemService] ✅ Statistiques récupérées:', response.data);
            return response.data;
        } catch (error) {
            console.error('[SystemService] ❌ Erreur lors de la récupération des statistiques:', error);
            
            // Valeurs par défaut en cas d'erreur
            return {
                importedAccounts: 0,
                ouGroupsCount: 0,
                averageProcessingTime: 0,
                teamsCreated: 0,
                lastSyncTime: new Date().toISOString(),
                successRate: 0,
                errorCount: 0,
                defaultOU: 'N/A'
            };
        }
    },

    /**
     * Récupère les informations système
     */
    async getSystemInfo(): Promise<SystemInfo> {
        console.log('[SystemService] ℹ️ Récupération des informations système...');
        
        try {
            const response = await httpService.get<SystemInfo>('/api/System/info');
            console.log('[SystemService] ✅ Informations système récupérées:', response.data);
            return response.data;
        } catch (error) {
            console.error('[SystemService] ❌ Erreur lors de la récupération des informations système:', error);
            
            // Valeurs par défaut en cas d'erreur
            return {
                version: '1.0.0',
                supportedConnectionTypes: ['signalr'],
                defaultConnectionType: 'signalr'
            };
        }
    },

    /**
     * Vérifie la disponibilité de SignalR
     */
    async checkSignalR(): Promise<{ available: boolean; message: string }> {
        console.log('[SystemService] 🔗 Vérification de SignalR...');
        
        try {
            const response = await httpService.get<{ available: boolean; message: string }>('/api/System/check-signalr');
            console.log('[SystemService] ✅ État SignalR:', response.data);
            return response.data;
        } catch (error) {
            console.error('[SystemService] ❌ Erreur lors de la vérification SignalR:', error);
            
            return {
                available: false,
                message: 'Erreur lors de la vérification de SignalR'
            };
        }
    }
}; 