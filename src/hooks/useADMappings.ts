import {useCallback, useEffect, useState} from 'react';
import {message} from 'antd';
import {httpService} from '../services/api/httpService';
import {AxiosError} from 'axios';
import {
    ADMappingIntegrationUtils,
    HeaderMapping,
    SavedImportConfig,
    ValidationResult
} from '../models/ADMappingIntegration';

interface MappingState {
    configurations: SavedImportConfig[];
    activeConfiguration: SavedImportConfig | null;
    loading: boolean;
    error: string | null;
}

interface UseADMappingsReturnType extends MappingState {
    // Actions pour les configurations (utilisant le système d'imports existant)
    loadConfigurations: () => Promise<void>;
    saveConfiguration: (config: SavedImportConfig) => Promise<SavedImportConfig | null>;
    updateConfiguration: (id: string, config: SavedImportConfig) => Promise<SavedImportConfig | null>;
    deleteConfiguration: (id: string) => Promise<boolean>;

    // Actions spécifiques aux mappages
    validateHeaderMapping: (headerMapping: HeaderMapping) => Promise<ValidationResult | null>;
    convertToDisplayFormat: (headerMapping: HeaderMapping) => Promise<any[] | null>;

    // Utilitaires
    createNewConfiguration: () => SavedImportConfig;
    refreshData: () => Promise<void>;
}

/**
 * Hook pour gérer les configurations de mappages Teams intégrées avec le système d'imports existant
 */
export function useADMappings(): UseADMappingsReturnType {
    const [state, setState] = useState<MappingState>({
        configurations: [],
        activeConfiguration: null,
        loading: false,
        error: null
    });

    // Helper pour mettre à jour l'état
    const updateState = useCallback((updates: Partial<MappingState>) => {
        setState((prev: MappingState) => ({...prev, ...updates}));
    }, []);

    // Helper pour gérer les erreurs
    const handleError = useCallback((error: any, context: string) => {
        const axiosError = error as AxiosError;
        let errorMessage = `Erreur lors de ${context}`;

        if (axiosError.response?.status === 401) {
            errorMessage = 'Authentification requise';
        } else if (axiosError.response?.status === 403) {
            errorMessage = 'Accès refusé';
        } else if (axiosError.response?.status === 404) {
            errorMessage = 'Ressource non trouvée';
        } else if (axiosError.message) {
            errorMessage += `: ${axiosError.message}`;
        }

        console.error(`[useADMappings] ${context}:`, error);
        updateState({error: errorMessage, loading: false});
        message.error(errorMessage);

        return false;
    }, [updateState]);

    // Charger toutes les configurations d'import (utilisées pour les mappages Teams)
    const loadConfigurations = useCallback(async () => {
        updateState({loading: true, error: null});

        try {
            const response = await httpService.get<SavedImportConfig[]>('/api/Config/ad-mappings');
            updateState({
                configurations: response.data || [],
                loading: false
            });
        } catch (error) {
            handleError(error, 'le chargement des configurations');
        }
    }, [updateState, handleError]);

    // Sauvegarder une configuration d'import
    const saveConfiguration = useCallback(async (config: SavedImportConfig): Promise<SavedImportConfig | null> => {
        updateState({loading: true, error: null});

        try {
            const response = await httpService.post<SavedImportConfig>('/api/Config/ad-mappings', config);
            const savedConfig = response.data;

            setState((prev: MappingState) => ({
                ...prev,
                configurations: [...prev.configurations.filter((c: SavedImportConfig) => c.id !== savedConfig.id), savedConfig],
                loading: false,
                error: null
            }));

            message.success('Configuration sauvegardée avec succès');
            return savedConfig;
        } catch (error) {
            handleError(error, 'la sauvegarde de la configuration');
            return null;
        }
    }, [handleError]);

    // Mettre à jour une configuration existante
    const updateConfiguration = useCallback(async (id: string, config: SavedImportConfig): Promise<SavedImportConfig | null> => {
        updateState({loading: true, error: null});

        try {
            const response = await httpService.put<SavedImportConfig>(`/api/Config/ad-mappings/${id}`, config);
            const updatedConfig = response.data;

            setState((prev: MappingState) => ({
                ...prev,
                configurations: prev.configurations.map((c: SavedImportConfig) =>
                    c.id === id ? updatedConfig : c
                ),
                activeConfiguration: prev.activeConfiguration?.id === id ? updatedConfig : prev.activeConfiguration,
                loading: false,
                error: null
            }));

            message.success('Configuration mise à jour avec succès');
            return updatedConfig;
        } catch (error) {
            handleError(error, 'la mise à jour de la configuration');
            return null;
        }
    }, [handleError]);

    // Supprimer une configuration
    const deleteConfiguration = useCallback(async (id: string): Promise<boolean> => {
        updateState({loading: true, error: null});

        try {
            await httpService.delete(`/api/Config/ad-mappings/${id}`);

            setState((prev: MappingState) => ({
                ...prev,
                configurations: prev.configurations.filter((c: SavedImportConfig) => c.id !== id),
                activeConfiguration: prev.activeConfiguration?.id === id ? null : prev.activeConfiguration,
                loading: false,
                error: null
            }));

            message.success('Configuration supprimée avec succès');
            return true;
        } catch (error) {
            handleError(error, 'la suppression de la configuration');
            return false;
        }
    }, [handleError]);

    // Valider un headerMapping via l'API
    const validateHeaderMapping = useCallback(async (headerMapping: HeaderMapping): Promise<ValidationResult | null> => {
        try {
            const response = await httpService.post<ValidationResult>('/api/Config/ad-mappings/validate', headerMapping);
            return response.data;
        } catch (error) {
            handleError(error, 'la validation des mappings');
            return null;
        }
    }, [handleError]);

    // Convertir en format d'affichage via l'API
    const convertToDisplayFormat = useCallback(async (headerMapping: HeaderMapping): Promise<any[] | null> => {
        try {
            const response = await httpService.post<any[]>('/api/Config/ad-mappings/display-format', headerMapping);
            return response.data;
        } catch (error) {
            handleError(error, 'la conversion des mappings');
            return null;
        }
    }, [handleError]);

    // Créer une nouvelle configuration avec des valeurs par défaut
    const createNewConfiguration = useCallback((): SavedImportConfig => {
        const defaultConfig = ADMappingIntegrationUtils.createDefaultImportConfig();
        return {
            id: `temp-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...defaultConfig
        } as SavedImportConfig;
    }, []);

    // Rafraîchir toutes les données
    const refreshData = useCallback(async () => {
        await loadConfigurations();
    }, [loadConfigurations]);

    // Charger les données au montage du composant
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return {
        ...state,
        loadConfigurations,
        saveConfiguration,
        updateConfiguration,
        deleteConfiguration,
        validateHeaderMapping,
        convertToDisplayFormat,
        createNewConfiguration,
        refreshData
    };
}

export default useADMappings;