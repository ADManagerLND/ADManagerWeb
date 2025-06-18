import { httpService } from './httpService';
import { API_CONFIG } from './config';
import { ActionType } from '../../models/CsvImport';

// Interface pour la configuration d'import (alignée avec le backend)
export interface ImportConfig {
    // Configuration de base
    defaultOU: string;
    csvDelimiter: string;
    createMissingOUs: boolean;
    overwriteExisting: boolean;
    moveObjects: boolean;
    deleteNotInImport: boolean;
    skipErrors: boolean;
    netBiosDomainName?: string;

    // Mappages
    headerMapping: Record<string, string>;
    manualColumns: string[];
    ouColumn: string;

    // Configuration des dossiers
    Folders: {
        EnableShareProvisioning: boolean;
        TargetServerName: string;
        HomeDriveLetter: string;
        HomeDirectoryTemplate: string;
        ShareNameForUserFolders: string;
        LocalPathForUserShareOnServer: string;
        DefaultShareSubfolders: string[];
    };

    // Intégration Teams
    TeamsIntegration: {
        enabled: boolean;
        autoCreateTeamsForOUs: boolean;
        autoAddUsersToTeams: boolean;
        defaultTeacherUserId: string;
        teamNamingTemplate: string;
        teamDescriptionTemplate: string;
        ouTeacherMappings: Record<string, string>;
        folderMappings: FolderMapping[];
    };
}

export interface FolderMapping {
    folderName: string;
    description: string;
    parentFolder?: string;
    order: number;
    enabled: boolean;
    defaultPermissions: {
        canRead: boolean;
        canWrite: boolean;
        canDelete: boolean;
        canCreateSubfolders: boolean;
    };
}

// Interface correspondant exactement au backend SavedImportConfig
export interface SavedImportConfig {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
    category: string;
    isEnabled: boolean;
    configData: {
        // Propriétés de base de ImportConfig
        defaultOU: string;
        csvDelimiter: string;
        createMissingOUs: boolean;
        overwriteExisting: boolean;
        moveObjects: boolean;
        deleteNotInImport: boolean;
        skipErrors: boolean;
        headerMapping: Record<string, string>;
        manualColumns: string[];
        ouColumn: string;
        samAccountNameColumn?: string;
        disabledActionTypes?: ActionType[];
        
        // Configuration des dossiers
        Folders?: {
            HomeDirectoryTemplate: string;
            HomeDriveLetter: string;
            TargetServerName: string;
            ShareNameForUserFolders: string;
            LocalPathForUserShareOnServer: string;
            EnableShareProvisioning: boolean;
            DefaultShareSubfolders: string[];
        };
        
        // Configuration Teams
        TeamsIntegration?: {
            enabled: boolean;
            autoCreateTeamsForOUs: boolean;
            autoAddUsersToTeams: boolean;
            defaultTeacherUserId: string;
            teamNamingTemplate: string;
            teamDescriptionTemplate: string;
            folderMappings?: Array<{
                folderName: string;
                description: string;
                parentFolder?: string;
                order: number;
                enabled: boolean;
                defaultPermissions?: {
                    canRead: boolean;
                    canWrite: boolean;
                    canDelete: boolean;
                    canCreateSubfolders: boolean;
                };
            }>;
        };
        
        // Autres configurations
        NetBiosDomainName?: string;
        Mappings?: Record<string, string>;
        ClassGroupFolderCreationConfig?: any;
        TeamGroupCreationConfig?: any;
    };
}

export interface ConfigTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    isSystemTemplate: boolean;
    configData: ImportConfig;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface DuplicateConfigRequest {
    name: string;
    description?: string;
}

export interface CreateFromTemplateRequest {
    name: string;
    description?: string;
}

export interface ImportConfigService {
    getImportConfigs(): Promise<SavedImportConfig[]>;
    saveImportConfig(config: SavedImportConfig): Promise<SavedImportConfig>;
    deleteImportConfig(configId: string): Promise<void>;
    duplicateImportConfig(configId: string, newName: string): Promise<SavedImportConfig>;
    saveTemporaryConfig(config: SavedImportConfig): Promise<string>;
    deleteTemporaryConfig(configId: string): Promise<void>;
}

export class ImportConfigServiceImpl implements ImportConfigService {
    private readonly baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMPORT}`;

    async getImportConfigs(): Promise<SavedImportConfig[]> {
        try {
            const response = await httpService.get(this.baseUrl);
            const configs = Array.isArray(response.data) ? response.data : [];
            return configs.map((config: any) => this.normalizeConfig(config));
        } catch (error) {
            console.error('[ImportConfigService] Erreur lors de la récupération des configurations:', error);
            throw error;
        }
    }

    async saveImportConfig(config: SavedImportConfig): Promise<SavedImportConfig> {
        try {
            console.log('[ImportConfigService] Configuration à sauvegarder:', JSON.stringify(config, null, 2));
            const backendConfig = this.convertToBackendFormat(config);
            console.log('[ImportConfigService] Configuration après conversion:', JSON.stringify(backendConfig, null, 2));
            const response = await httpService.post(this.baseUrl, backendConfig);
            return this.normalizeConfig(response.data);
        } catch (error: any) {
            console.error('[ImportConfigService] Erreur lors de la sauvegarde:', error);
            console.error('[ImportConfigService] Status:', error.response?.status);
            console.error('[ImportConfigService] StatusText:', error.response?.statusText);
            console.error('[ImportConfigService] Data:', error.response?.data);
            console.error('[ImportConfigService] Headers:', error.response?.headers);
            throw error;
        }
    }

    async deleteImportConfig(configId: string): Promise<void> {
        try {
            await httpService.delete(`${this.baseUrl}/${configId}`);
        } catch (error) {
            console.error('[ImportConfigService] Erreur lors de la suppression:', error);
            throw error;
        }
    }

    async saveTemporaryConfig(config: SavedImportConfig): Promise<string> {
        const tempConfigData = {
            ...config,
            id: `temp_${Date.now()}`,
            name: `[TEMP] ${config.name}`,
            description: `Configuration temporaire pour import avec actions personnalisées`
        };
        
        const response = await this.saveImportConfig(tempConfigData);
        return response.id;
    }
    
    async deleteTemporaryConfig(configId: string): Promise<void> {
        if (configId.startsWith('temp_')) {
            await this.deleteImportConfig(configId);
        }
    }

    async duplicateImportConfig(configId: string, newName: string): Promise<SavedImportConfig> {
        try {
            const configs = await this.getImportConfigs();
            const originalConfig = configs.find(c => c.id === configId);
            
            if (!originalConfig) {
                throw new Error(`Configuration avec l'ID ${configId} non trouvée`);
            }
            
            const duplicatedConfig: SavedImportConfig = {
                ...originalConfig,
                id: '', // Sera généré par le backend
                name: newName,
                description: `Copie de ${originalConfig.description}`,
                createdAt: new Date().toISOString(),
                updatedAt: undefined
            };
            
            return await this.saveImportConfig(duplicatedConfig);
        } catch (error) {
            console.error('[ImportConfigService] Erreur lors de la duplication:', error);
            throw error;
        }
    }

    private convertToBackendFormat(config: SavedImportConfig): any {
        // Le backend attend maintenant le même format que le frontend - pas de conversion nécessaire
        return config;
    }

    private normalizeConfig(config: any): SavedImportConfig {
        // S'assurer que la configuration est au bon format
        if (!config.configData) {
            // Si c'est un ancien format, on le convertit au nouveau format
            return {
                id: config.id || '',
                name: config.name || 'Configuration sans nom',
                description: config.description || '',
                createdBy: config.createdBy || 'Système',
                createdAt: config.createdAt || new Date().toISOString(),
                updatedAt: config.updatedAt,
                category: config.category || 'Import',
                isEnabled: config.isEnabled ?? true,
                configData: {
                    defaultOU: config.defaultOU || '',
                    csvDelimiter: config.csvDelimiter || ';',
                    createMissingOUs: config.createMissingOUs || false,
                    overwriteExisting: config.overwriteExisting || false,
                    moveObjects: config.moveObjects || false,
                    deleteNotInImport: config.deleteNotInImport || false,
                    skipErrors: config.skipErrors || false,
                    headerMapping: config.headerMapping || {},
                    manualColumns: config.manualColumns || [],
                    ouColumn: config.ouColumn || '',
                    samAccountNameColumn: config.samAccountNameColumn,
                    Folders: config.Folders,
                    TeamsIntegration: config.TeamsIntegration,
                    NetBiosDomainName: config.NetBiosDomainName,
                    Mappings: config.Mappings || {},
                    ClassGroupFolderCreationConfig: config.ClassGroupFolderCreationConfig,
                    TeamGroupCreationConfig: config.TeamGroupCreationConfig
                }
            };
        }
        
        // Configuration déjà dans le nouveau format - normaliser la casse des propriétés
        const normalized = {
            ...config,
            configData: {
                ...config.configData,
                // Normaliser Folders : convertir camelCase vers PascalCase
                Folders: config.configData.Folders || (config.configData.folders ? {
                    EnableShareProvisioning: config.configData.folders.enableShareProvisioning || false,
                    TargetServerName: config.configData.folders.targetServerName || '',
                    HomeDriveLetter: config.configData.folders.homeDriveLetter || '',
                    HomeDirectoryTemplate: config.configData.folders.homeDirectoryTemplate || '',
                    ShareNameForUserFolders: config.configData.folders.shareNameForUserFolders || '',
                    LocalPathForUserShareOnServer: config.configData.folders.localPathForUserShareOnServer || '',
                    DefaultShareSubfolders: config.configData.folders.defaultShareSubfolders || []
                } : undefined),
                
                // Normaliser TeamsIntegration : convertir camelCase vers format frontend
                TeamsIntegration: config.configData.TeamsIntegration || (config.configData.teamsIntegration ? {
                    enabled: config.configData.teamsIntegration.enabled || false,
                    autoCreateTeamsForOUs: config.configData.teamsIntegration.autoCreateTeamsForOUs || false,
                    autoAddUsersToTeams: config.configData.teamsIntegration.autoAddUsersToTeams || false,
                    defaultTeacherUserId: config.configData.teamsIntegration.defaultTeacherUserId || '',
                    teamNamingTemplate: config.configData.teamsIntegration.teamNamingTemplate || 'Classe {OUName} - Année {Year}',
                    teamDescriptionTemplate: config.configData.teamsIntegration.teamDescriptionTemplate || 'Équipe collaborative pour la classe {OUName}',
                    folderMappings: config.configData.teamsIntegration.folderMappings || []
                } : undefined),
                
                // Supprimer les versions camelCase pour éviter la duplication
                folders: undefined,
                teamsIntegration: undefined
            }
        };
        
        console.log('Configuration normalisée:', normalized);
        return normalized as SavedImportConfig;
    }
}

// Instance singleton du service
export const importConfigService = new ImportConfigServiceImpl();

// Export par défaut
export default importConfigService;