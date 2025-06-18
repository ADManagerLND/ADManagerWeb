import {useCallback, useEffect, useState} from 'react';
import {message} from 'antd';
import {httpService} from '../services/api/httpService';
import {AxiosError} from 'axios';

interface UseSettingsReturnType<T> {
    settings: T | null;
    loading: boolean;
    error: string | null;
    updateSettings: (newSettings: T) => Promise<boolean>;
    resetSettings: () => Promise<boolean>;
    reload: () => void;
}

/**
 * Hook pour récupérer et mettre à jour les paramètres de configuration
 * @param settingsKey Clé du paramètre de configuration
 * @returns Objet avec les paramètres et fonctions pour les manipuler
 */
export function useSettings<T>(settingsKey: string): UseSettingsReturnType<T> {
    const [settings, setSettings] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [shouldRefresh, setShouldRefresh] = useState<boolean>(true);

    // Récupérer les paramètres depuis l'API
    const fetchSettings = useCallback(async () => {
        if (!shouldRefresh) return;

        setLoading(true);
        setError(null);

        try {
            // Correction: pour 'api', utiliser directement /api/Config
            const endpoint = settingsKey === 'api' ? '/api/Config' : `/api/Config/${settingsKey}`;
            const response = await httpService.get<T>(endpoint);
            setSettings(response.data);
            setShouldRefresh(false);
        } catch (err) {
            const axiosError = err as AxiosError;

            // Gérer les erreurs d'authentification et autres
            if (axiosError.response?.status === 401) {
                console.warn(`[useSettings] Erreur d'authentification lors de la récupération de ${settingsKey}`);
                setError("Authentification requise pour accéder à cette ressource");
            } else if (axiosError.response?.status === 404) {
                console.warn(`[useSettings] Ressource ${settingsKey} non trouvée`);
                setError(`Configuration "${settingsKey}" non trouvée`);
            } else {
                console.error(`[useSettings] Erreur lors de la récupération de ${settingsKey}:`, axiosError);
                setError(`Erreur lors de la récupération de la configuration: ${axiosError.message}`);
            }

            // En cas d'erreur, utiliser des données vides ou du cache local si disponible
            const cachedData = localStorage.getItem(`settings_${settingsKey}`);
            if (cachedData) {
                try {
                    setSettings(JSON.parse(cachedData));
                    message.warning('Utilisation des données en cache, certaines fonctionnalités pourraient être limitées');
                } catch (parseError) {
                    console.error('[useSettings] Erreur lors de la lecture du cache:', parseError);
                }
            } else {
                // Fournir des données par défaut selon le type de configuration
                setSettings(null);
            }
        } finally {
            setLoading(false);
        }
    }, [settingsKey, shouldRefresh]);

    // Mettre à jour les paramètres via l'API
    const updateSettings = async (newSettings: T): Promise<boolean> => {
        setLoading(true);

        try {
            // Correction: pour 'api', utiliser directement /api/Config
            const endpoint = settingsKey === 'api' ? '/api/Config' : `/api/Config/${settingsKey}`;
            await httpService.put(endpoint, newSettings);
            setSettings(newSettings);

            // Mettre à jour le cache local
            localStorage.setItem(`settings_${settingsKey}`, JSON.stringify(newSettings));

            message.success('Configuration mise à jour avec succès');
            return true;
        } catch (err) {
            const axiosError = err as AxiosError;
            console.error(`[useSettings] Erreur lors de la mise à jour de ${settingsKey}:`, axiosError);

            if (axiosError.response?.status === 401) {
                message.error('Authentification requise pour modifier cette configuration');
            } else {
                message.error(`Erreur lors de la mise à jour: ${axiosError.message}`);
            }

            return false;
        } finally {
            setLoading(false);
        }
    };

    // Déclencher la récupération des paramètres au chargement
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Réinitialiser les paramètres aux valeurs par défaut
    const resetSettings = async (): Promise<boolean> => {
        setLoading(true);

        try {
            // Correction: pour 'api', utiliser directement /api/Config
            const endpoint = settingsKey === 'api' ? '/api/Config/reset' : `/api/Config/${settingsKey}/reset`;
            await httpService.delete(endpoint);

            // Vider le cache local
            localStorage.removeItem(`settings_${settingsKey}`);

            // Recharger les paramètres depuis l'API
            setShouldRefresh(true);
            await fetchSettings();

            message.success('Configuration réinitialisée aux valeurs par défaut');
            return true;
        } catch (err) {
            const axiosError = err as AxiosError;
            console.error(`[useSettings] Erreur lors de la réinitialisation de ${settingsKey}:`, axiosError);

            if (axiosError.response?.status === 401) {
                message.error('Authentification requise pour réinitialiser cette configuration');
            } else {
                message.error(`Erreur lors de la réinitialisation: ${axiosError.message}`);
            }

            return false;
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour forcer le rafraîchissement des données
    const reload = useCallback(() => {
        setShouldRefresh(true);
        fetchSettings();
    }, [fetchSettings]);

    return {settings, loading, error, updateSettings, resetSettings, reload};
}

export default useSettings; 