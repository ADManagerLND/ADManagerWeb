/**
 * Service de gestion de la configuration de l'API
 * Gère le stockage local de l'IP de l'API et la validation de connectivité
 */

const API_CONFIG_STORAGE_KEY = 'admanager_api_config';

export interface ApiConfiguration {
    baseUrl: string;
    isConfigured: boolean;
}

class ApiConfigurationService {
    private static instance: ApiConfigurationService;
    private configuration: ApiConfiguration | null = null;

    private constructor() {
        this.loadConfiguration();
    }

    public static getInstance(): ApiConfigurationService {
        if (!ApiConfigurationService.instance) {
            ApiConfigurationService.instance = new ApiConfigurationService();
        }
        return ApiConfigurationService.instance;
    }

    /**
     * Charge la configuration depuis le localStorage
     */
    private loadConfiguration(): void {
        try {
            const stored = localStorage.getItem(API_CONFIG_STORAGE_KEY);
            if (stored) {
                this.configuration = JSON.parse(stored);
                console.log('📋 Configuration API chargée:', this.configuration);
            } else {
                console.log('📋 Aucune configuration API trouvée');
                this.configuration = null;
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement de la configuration API:', error);
            this.configuration = null;
        }
    }

    /**
     * Sauvegarde la configuration dans le localStorage
     */
    private saveConfiguration(): void {
        try {
            if (this.configuration) {
                localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(this.configuration));
                console.log('💾 Configuration API sauvegardée:', this.configuration);
            }
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de la configuration API:', error);
        }
    }

    /**
     * Vérifie si l'API est configurée
     */
    public isConfigured(): boolean {
        return this.configuration?.isConfigured === true && !!this.configuration?.baseUrl;
    }

    /**
     * Obtient l'URL de base de l'API
     */
    public getBaseUrl(): string | null {
        return this.configuration?.baseUrl || null;
    }

    /**
     * Configure l'API avec une nouvelle URL
     */
    public async configureApi(host: string, port?: string): Promise<boolean> {
        try {
            // Nettoyer l'host (enlever http:// ou https:// si présent)
            const cleanHost = host.replace(/^https?:\/\//, '');
            
            // Construire l'URL complète
            const baseUrl = port ? `http://${cleanHost}:${port}` : `http://${cleanHost}`;
            
            // Tester la connectivité
            const isConnected = await this.testConnection(baseUrl);
            
            if (isConnected) {
                this.configuration = {
                    baseUrl,
                    isConfigured: true
                };
                this.saveConfiguration();
                console.log('✅ API configurée avec succès:', baseUrl);
                return true;
            } else {
                console.error('❌ Impossible de se connecter à l\'API:', baseUrl);
                return false;
            }
        } catch (error) {
            console.error('❌ Erreur lors de la configuration de l\'API:', error);
            return false;
        }
    }

    /**
     * Teste la connectivité avec l'API
     */
    public async testConnection(baseUrl?: string): Promise<boolean> {
        const urlToTest = baseUrl || this.getBaseUrl();
        
        if (!urlToTest) {
            return false;
        }

        try {
            const response = await fetch(`${urlToTest}/api/auth/ping`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(5000) // Timeout de 5 secondes
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Erreur de connectivité API:', error);
            return false;
        }
    }

    /**
     * Réinitialise la configuration
     */
    public resetConfiguration(): void {
        this.configuration = null;
        localStorage.removeItem(API_CONFIG_STORAGE_KEY);
        console.log('🔄 Configuration API réinitialisée');
    }

    /**
     * Met à jour l'URL de base de l'API
     */
    public updateBaseUrl(baseUrl: string): void {
        if (this.configuration) {
            this.configuration.baseUrl = baseUrl;
            this.saveConfiguration();
        }
    }
}

export const apiConfigurationService = ApiConfigurationService.getInstance();
export default apiConfigurationService; 