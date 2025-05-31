import { useState, useEffect } from 'react';
import { httpService } from '../services/api/httpService';
import { API_CONFIG } from '../services/api/config';

/**
 * Hook personnalisé pour gérer les paramètres de l'application
 * @param settingType Type de paramètres à gérer ('api', 'ldap', 'attributes', 'all', etc.)
 */
export function useSettings<T>(settingType: string) {
    const [settings, setSettings] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const endpoint = `${API_CONFIG.ENDPOINTS.CONFIG}/${settingType}`;
            const { data } = await httpService.get<T>(endpoint);
            setSettings(data);
            setError(null);
        } catch (err) {
            console.error('Erreur lors du chargement des paramètres:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [settingType]);

    const updateSettings = async (newSettings: T): Promise<boolean> => {
        setLoading(true);
        try {
            // Vérifier si le mot de passe est vide et le remplacer par une chaîne vide pour éviter des problèmes
            if (settingType === 'ldap' && typeof newSettings === 'object') {
                const ldapSettings = newSettings as any;
                if (ldapSettings.LdapPassword === undefined) {
                    ldapSettings.LdapPassword = '';
                }
            }
            
            const endpoint = `${API_CONFIG.ENDPOINTS.CONFIG}/${settingType}`;
            await httpService.put(endpoint, newSettings);
            setSettings(newSettings);
            setError(null);
            return true;
        } catch (err) {
            console.error('Erreur lors de la mise à jour des paramètres:', err);
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const resetSettings = async (): Promise<boolean> => {
        setLoading(true);
        try {
            // Pour réinitialiser, on envoie une demande PUT avec les valeurs par défaut
            // Idéalement, le backend devrait avoir un endpoint dédié pour la réinitialisation
            const endpoint = `${API_CONFIG.ENDPOINTS.CONFIG}/${settingType}/default`;
            const { data } = await httpService.get<T>(endpoint);
            
            if (data) {
                const updateEndpoint = `${API_CONFIG.ENDPOINTS.CONFIG}/${settingType}`;
                await httpService.put(updateEndpoint, data);
                setSettings(data);
                setError(null);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Erreur lors de la réinitialisation des paramètres:', err);
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const reload = () => {
        fetchSettings();
    };

    return {
        settings,
        loading,
        error,
        updateSettings,
        resetSettings,
        reload
    };
} 