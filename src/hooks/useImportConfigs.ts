import {useEffect, useState} from 'react';
import {message} from 'antd';
import importConfigService, {
    ConfigTemplate,
    CreateFromTemplateRequest,
    DuplicateConfigRequest,
    SavedImportConfig,
    ValidationResult
} from '../services/api/importConfigService';

export interface UseImportConfigsReturn {
    // States
    configs: SavedImportConfig[];
    templates: ConfigTemplate[];
    loading: boolean;

    // Actions
    loadConfigs: () => Promise<void>;
    loadTemplates: () => Promise<void>;
    saveConfig: (config: Partial<SavedImportConfig>) => Promise<SavedImportConfig | null>;
    deleteConfig: (id: string) => Promise<boolean>;
    duplicateConfig: (id: string, request: DuplicateConfigRequest) => Promise<SavedImportConfig | null>;
    createFromTemplate: (templateId: string, request: CreateFromTemplateRequest) => Promise<SavedImportConfig | null>;
    validateConfig: (config: SavedImportConfig) => Promise<ValidationResult | null>;
    loadLyceeOptimizedConfig: () => Promise<boolean>;
}

export const useImportConfigs = (): UseImportConfigsReturn => {
    const [configs, setConfigs] = useState<SavedImportConfig[]>([]);
    const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
    const [loading, setLoading] = useState(false);

    const loadConfigs = async (): Promise<void> => {
        try {
            setLoading(true);
            const data = await importConfigService.getConfigs();
            setConfigs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur lors du chargement des configurations:', error);
            message.error('Erreur lors du chargement des configurations');
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async (): Promise<void> => {
        try {
            const data = await importConfigService.getTemplates();
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur lors du chargement des templates:', error);
            message.error('Erreur lors du chargement des templates');
            setTemplates([]);
        }
    };

    const saveConfig = async (config: Partial<SavedImportConfig>): Promise<SavedImportConfig | null> => {
        try {
            setLoading(true);
            const savedConfig = await importConfigService.saveConfig(config);
            message.success('Configuration sauvegardée avec succès');
            await loadConfigs(); // Recharger la liste
            return savedConfig;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.message || 'Erreur inconnue';
            message.error(`Erreur lors de la sauvegarde: ${errorMsg}`);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const deleteConfig = async (id: string): Promise<boolean> => {
        try {
            await importConfigService.deleteConfig(id);
            message.success('Configuration supprimée');
            await loadConfigs();
            return true;
        } catch (error) {
            message.error('Erreur lors de la suppression');
            return false;
        }
    };

    const duplicateConfig = async (id: string, request: DuplicateConfigRequest): Promise<SavedImportConfig | null> => {
        try {
            const duplicatedConfig = await importConfigService.duplicateConfig(id, request);
            message.success('Configuration dupliquée avec succès');
            await loadConfigs();
            return duplicatedConfig;
        } catch (error) {
            message.error('Erreur lors de la duplication');
            return null;
        }
    };

    const createFromTemplate = async (templateId: string, request: CreateFromTemplateRequest): Promise<SavedImportConfig | null> => {
        try {
            setLoading(true);
            const newConfig = await importConfigService.createFromTemplate(templateId, request);
            message.success('Configuration créée depuis le template');
            await loadConfigs();
            return newConfig;
        } catch (error) {
            message.error('Erreur lors de la création depuis le template');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const validateConfig = async (config: SavedImportConfig): Promise<ValidationResult | null> => {
        try {
            const result = await importConfigService.validateConfig(config);
            return result;
        } catch (error: any) {
            console.error('Erreur lors de la validation:', error);
            return {
                isValid: false,
                errors: ['Erreur lors de la validation'],
                warnings: ['Impossible de valider la configuration']
            };
        }
    };

    const loadLyceeOptimizedConfig = async (): Promise<boolean> => {
        try {
            const result = await importConfigService.loadLyceeOptimizedConfig();
            message.success(result.message);
            await loadConfigs();
            return true;
        } catch (error: any) {
            if (error.response?.status === 404) {
                message.warning('Configuration optimisée non disponible');
            } else {
                message.error('Erreur lors du chargement de la configuration');
            }
            return false;
        }
    };

    // Charger les données au montage du composant
    useEffect(() => {
        loadConfigs();
        loadTemplates();
    }, []);

    return {
        configs,
        templates,
        loading,
        loadConfigs,
        loadTemplates,
        saveConfig,
        deleteConfig,
        duplicateConfig,
        createFromTemplate,
        validateConfig,
        loadLyceeOptimizedConfig
    };
};