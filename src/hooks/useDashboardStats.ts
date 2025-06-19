import { useState, useEffect, useCallback } from 'react';
import { systemService, type DashboardStats as SystemDashboardStats } from '../services/api/systemService';
import { message } from 'antd';

interface DashboardStatsHook {
    stats: SystemDashboardStats | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isConnected: boolean;
}

export const useDashboardStats = (): DashboardStatsHook => {
    const [stats, setStats] = useState<SystemDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('[useDashboardStats] 📊 Récupération des statistiques...');
            
            const systemStats = await systemService.getDashboardStats();
            console.log('[useDashboardStats] ✅ Statistiques récupérées:', systemStats);
            
            setStats(systemStats);
            setIsConnected(true);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
            console.error('[useDashboardStats] ❌ Erreur:', errorMessage);
            
            setError(errorMessage);
            setIsConnected(false);
            
            // Valeurs par défaut en cas d'erreur
            setStats({
                importedAccounts: 0,
                ouGroupsCount: 0,
                averageProcessingTime: 0,
                teamsCreated: 0,
                lastSyncTime: new Date().toISOString(),
                successRate: 0,
                errorCount: 0,
                defaultOU: 'N/A'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        console.log('[useDashboardStats] 🔄 Actualisation des statistiques...');
        await fetchStats();
        
        if (stats && !error) {
            message.success(`Données actualisées: ${stats.importedAccounts} comptes, ${stats.ouGroupsCount} OUs`);
        }
    }, [fetchStats, stats, error]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        loading,
        error,
        refresh,
        isConnected
    };
}; 