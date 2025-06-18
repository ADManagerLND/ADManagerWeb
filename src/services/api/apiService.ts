import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import {API_CONFIG} from './config';
import authService from '../auth/authService';

/**
 * Configuration par défaut pour les requêtes API
 */
const defaultConfig: AxiosRequestConfig = {
    baseURL: API_CONFIG.BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 secondes
};

/**
 * Service API qui gère automatiquement l'ajout de tokens d'authentification
 */
class ApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create(defaultConfig);

        // Intercepteur pour ajouter automatiquement le token aux requêtes
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                // Ne pas ajouter de token pour certaines routes publiques
                const isPublicRoute = config.url?.includes('/api/test/public') || false;

                if (!isPublicRoute) {
                    try {
                        const token = await authService.getAccessToken();
                        if (token) {
                            config.headers!.Authorization = `Bearer ${token}`;
                        } else {
                            console.warn('Aucun token disponible pour la requête API');
                        }
                    } catch (error) {
                        console.error('Erreur lors de la récupération du token:', error);
                    }
                }

                return config;
            },
            (error) => Promise.reject(error)
        );

        // Intercepteur pour gérer les réponses et les erreurs
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                // Gérer les erreurs 401 (non autorisé) ici si nécessaire
                if (error.response && error.response.status === 401) {
                    console.error('Erreur d\'authentification API (401):', error);
                    // Possibilité de rediriger vers la page de connexion
                    // window.location.href = '/';
                }

                return Promise.reject(error);
            }
        );
    }

    /**
     * Effectue une requête GET
     */
    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
        return response.data;
    }

    /**
     * Effectue une requête POST
     */
    public async post<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
        return response.data;
    }

    /**
     * Effectue une requête PUT
     */
    public async put<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
        return response.data;
    }

    /**
     * Effectue une requête DELETE
     */
    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
        return response.data;
    }

    /**
     * Effectue une requête PATCH
     */
    public async patch<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data, config);
        return response.data;
    }

    /**
     * Effectue un téléchargement de fichier
     */
    public async download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
        const response = await this.axiosInstance.get(url, {
            ...config,
            responseType: 'blob',
        });
        return response.data;
    }

    /**
     * Effectue un upload de fichier
     */
    public async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.axiosInstance.post(url, formData, {
            ...config,
            headers: {
                ...config?.headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    /**
     * Teste la connexion avec le backend
     */
    public async testConnection(): Promise<boolean> {
        try {
            await this.get(API_CONFIG.ENDPOINTS.TEST);
            return true;
        } catch (error) {
            console.error('Erreur de connexion au backend:', error);
            return false;
        }
    }
}

// Export d'une instance singleton
const apiService = new ApiService();
export default apiService; 