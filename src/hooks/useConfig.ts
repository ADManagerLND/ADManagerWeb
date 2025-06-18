import {useCallback, useEffect, useRef, useState} from 'react';
import {getConfig} from '../services/api/config';
import {httpService} from '../services/api/httpService';

// Interface pour les options du hook useConfig
interface UseConfigOptions {
    defaultValues?: Record<string, any>;
    localStorageKey?: string;
    endpoint?: string;
}

/**
 * Hook pour gérer la configuration de l'application
 * @param key - Clé de configuration (optionnelle)
 * @param options - Options du hook
 */
export function useConfig<T = any>(key?: string, options: UseConfigOptions = {}) {
    const [configValue, setConfigValue] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    const {defaultValues = {}, localStorageKey, endpoint} = options;

    // Utiliser une référence pour éviter des rechargements inutiles
    const defaultValuesRef = useRef(defaultValues);
    const endpointRef = useRef(endpoint);
    const localStorageKeyRef = useRef(localStorageKey);

    // Fonction pour charger la configuration depuis l'API
    const loadFromApi = useCallback(async () => {
        if (!endpointRef.current) return null;

        // Éviter les appels multiples si déjà en chargement
        if (loading) return null;

        setLoading(true);
        setError(null);

        try {
            const {data} = await httpService.get<T>(endpointRef.current);

            // Sauvegarder dans localStorage si une clé est fournie
            if (localStorageKeyRef.current) {
                localStorage.setItem(localStorageKeyRef.current, JSON.stringify(data));
            }

            setConfigValue(data);
            return data;
        } catch (err: any) {
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []); // Aucune dépendance pour éviter les recréations inutiles

    // Fonction pour sauvegarder la configuration
    const saveConfig = useCallback(async (newConfig: Partial<T>) => {
        if (loading) return false;

        setLoading(true);
        setError(null);

        try {
            // Mise à jour locale
            setConfigValue(prev => ({
                ...prev,
                ...newConfig
            } as T));

            // Sauvegarder dans localStorage si une clé est fournie
            if (localStorageKeyRef.current) {
                const currentData = localStorage.getItem(localStorageKeyRef.current);
                const parsedData = currentData ? JSON.parse(currentData) : {};
                localStorage.setItem(
                    localStorageKeyRef.current,
                    JSON.stringify({...parsedData, ...newConfig})
                );
            }

            // Envoyer à l'API si un endpoint est fourni
            if (endpointRef.current) {
                await httpService.put<T>(endpointRef.current, newConfig);
            }

            return true;
        } catch (err: any) {
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    }, []); // Aucune dépendance pour éviter les recréations inutiles

    // Effet pour charger la configuration initiale (une seule fois)
    useEffect(() => {
        // Éviter les rechargements multiples
        if (isInitialized) return;

        const initConfig = async () => {
            // Si une clé spécifique est fournie, utiliser getConfig
            if (key) {
                const value = getConfig(key, defaultValuesRef.current[key]);
                setConfigValue(value as T);
                setIsInitialized(true);
                return;
            }

            // Essayer de charger depuis le localStorage si une clé est fournie
            if (localStorageKeyRef.current) {
                const storedValue = localStorage.getItem(localStorageKeyRef.current);
                if (storedValue) {
                    try {
                        const parsedValue = JSON.parse(storedValue);
                        setConfigValue(parsedValue);
                        setIsInitialized(true);
                        return;
                    } catch (e) {
                        console.error('Erreur de parsing JSON:', e);
                    }
                }
            }

            // Essayer de charger depuis l'API si un endpoint est fourni
            if (endpointRef.current) {
                await loadFromApi();
                setIsInitialized(true);
                return;
            }

            // Utiliser les valeurs par défaut si rien d'autre n'est disponible
            setConfigValue(defaultValuesRef.current as T);
            setIsInitialized(true);
        };

        initConfig();
    }, [key, loadFromApi]); // Réduire les dépendances pour éviter les rechargements inutiles

    return {
        config: configValue,
        setConfig: saveConfig,
        loading,
        error,
        reload: loadFromApi,
        isInitialized
    };
} 