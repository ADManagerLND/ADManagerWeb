import {API_CONFIG} from './config';
import {httpService} from './httpService';
import {ApplicationSettings, ImportConfig, LdapSettings} from '../../models/ApplicationSettings';

/**
 * Service pour gérer les configurations de l'application
 */
class ConfigService {
    private readonly BASE_URL = `${API_CONFIG.BASE_URL}/api/Config`;

    /**
     * Récupère la configuration générale
     */
    public async getConfig(): Promise<any> {
        try {
            const {data} = await httpService.get<any>(`${this.BASE_URL}`);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la récupération de la configuration générale:', error);
            throw error;
        }
    }

    /**
     * Met à jour la configuration générale
     */
    public async updateConfig(config: any): Promise<any> {
        try {
            const {data} = await httpService.put<any>(`${this.BASE_URL}`, config);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la mise à jour de la configuration générale:', error);
            throw error;
        }
    }

    /**
     * Récupère la configuration LDAP
     */
    public async getLdapConfig(): Promise<LdapSettings> {
        try {
            const {data} = await httpService.get<LdapSettings>(`${this.BASE_URL}/ldap`);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la récupération de la configuration LDAP:', error);
            throw error;
        }
    }

    /**
     * Met à jour la configuration LDAP
     */
    public async updateLdapConfig(config: LdapSettings): Promise<LdapSettings> {
        try {
            const {data} = await httpService.put<LdapSettings>(`${this.BASE_URL}/ldap`, config);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la mise à jour de la configuration LDAP:', error);
            throw error;
        }
    }

    /**
     * Récupère les configurations d'import
     */
    public async getImportConfigs(): Promise<ImportConfig[]> {
        try {
            const {data} = await httpService.get<ImportConfig[]>(`${this.BASE_URL}/import`);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la récupération des configurations d\'import:', error);
            throw error;
        }
    }

    /**
     * Crée une nouvelle configuration d'import
     */
    public async createImportConfig(config: ImportConfig): Promise<ImportConfig> {
        try {
            const {data} = await httpService.post<ImportConfig>(`${this.BASE_URL}/import`, config);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la création de la configuration d\'import:', error);
            throw error;
        }
    }

    /**
     * Supprime une configuration d'import
     */
    public async deleteImportConfig(configId: string): Promise<void> {
        try {
            await httpService.delete(`${this.BASE_URL}/import/${configId}`);
        } catch (error) {
            console.error(`[ConfigService] Erreur lors de la suppression de la configuration d'import ${configId}:`, error);
            throw error;
        }
    }

    /**
     * Récupère les attributs utilisateur
     */
    public async getUserAttributes(): Promise<any[]> {
        try {
            const {data} = await httpService.get<any[]>(`${this.BASE_URL}/attributes`);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la récupération des attributs utilisateur:', error);
            throw error;
        }
    }

    /**
     * Met à jour les attributs utilisateur
     */
    public async updateUserAttributes(attributes: any[]): Promise<any[]> {
        try {
            const {data} = await httpService.put<any[]>(`${this.BASE_URL}/attributes`, attributes);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la mise à jour des attributs utilisateur:', error);
            throw error;
        }
    }

    /**
     * Récupère toutes les configurations
     */
    public async getAllConfigs(): Promise<ApplicationSettings> {
        try {
            const {data} = await httpService.get<ApplicationSettings>(`${this.BASE_URL}/all`);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la récupération de toutes les configurations:', error);
            throw error;
        }
    }

    /**
     * Met à jour toutes les configurations
     */
    public async updateAllConfigs(configs: ApplicationSettings): Promise<ApplicationSettings> {
        try {
            const {data} = await httpService.put<ApplicationSettings>(`${this.BASE_URL}/all`, configs);
            return data;
        } catch (error) {
            console.error('[ConfigService] Erreur lors de la mise à jour de toutes les configurations:', error);
            throw error;
        }
    }

    /**
     * Fonction compatibilité avec useSettings hook - récupère les paramètres d'une catégorie
     */
    public async getCategorySettings<T = any>(categoryKey: string): Promise<T> {
        try {
            switch (categoryKey) {
                case 'api':
                    const config = await this.getConfig();
                    return config as T;
                case 'ldap':
                    const ldapConfig = await this.getLdapConfig();
                    return ldapConfig as T;
                case 'imports':
                    const importConfigs = await this.getImportConfigs();
                    return importConfigs as unknown as T;
                case 'user-attributes':
                    const attributes = await this.getUserAttributes();
                    return attributes as unknown as T;
                default:
                    throw new Error(`Catégorie de configuration inconnue: ${categoryKey}`);
            }
        } catch (error) {
            console.error(`[ConfigService] Erreur lors de la récupération des paramètres de la catégorie ${categoryKey}:`, error);
            throw error;
        }
    }

    /**
     * Fonction compatibilité avec useSettings hook - met à jour les paramètres d'une catégorie
     */
    public async updateCategorySettings<T = any>(categoryKey: string, settings: T): Promise<T> {
        try {
            switch (categoryKey) {
                case 'api':
                    const apiConfig = await this.updateConfig(settings);
                    return apiConfig as T;
                case 'ldap':
                    const ldapConfig = await this.updateLdapConfig(settings as unknown as LdapSettings);
                    return ldapConfig as unknown as T;
                case 'user-attributes':
                    const attributes = await this.updateUserAttributes(settings as unknown as any[]);
                    return attributes as unknown as T;
                default:
                    throw new Error(`Catégorie de configuration inconnue: ${categoryKey}`);
            }
        } catch (error) {
            console.error(`[ConfigService] Erreur lors de la mise à jour des paramètres de la catégorie ${categoryKey}:`, error);
            throw error;
        }
    }

    /**
     * Fonction compatibilité - réinitialisation des paramètres (non supportée, renvoie les valeurs actuelles)
     */
    public async resetCategorySettings<T = any>(categoryKey: string): Promise<T> {
        console.warn(`Réinitialisation non supportée pour la catégorie ${categoryKey}, renvoi des valeurs actuelles`);
        return this.getCategorySettings<T>(categoryKey);
    }
}

// Exporter une instance unique du service
export const configService = new ConfigService(); 