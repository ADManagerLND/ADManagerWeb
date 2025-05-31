import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import apiClient from './apiClient'; // Importer notre apiClient configuré avec MSAL
// import { API_CONFIG, getConfig } from './config'; // Probablement plus nécessaire si apiClient gère baseURL

// Interface pour les options du service HTTP (peut être simplifiée ou supprimée)
interface HttpServiceOptions { 
    // Si vous avez encore besoin d'options spécifiques par instance, sinon à supprimer
}

// Classe pour gérer les requêtes HTTP
class HttpService {
    private axiosInstance: AxiosInstance;
    
    constructor() {
        this.axiosInstance = apiClient;
    }
    
    // Méthode pour effectuer une requête GET
    public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        console.log(`[HttpService] GET ${url} - début de la requête`);
        try {
            const response = await this.axiosInstance.get<T>(url, config);
            console.log(`[HttpService] GET ${url} - réponse:`, response.status);
            return response;
        } catch (error: any) {
            console.error(`[HttpService] GET ${url} - erreur:`, error.message);
            throw error;
        }
    }
    
    // Méthode pour effectuer une requête POST
    public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        console.log(`[HttpService] POST ${url} - début de la requête`);
        try {
            const response = await this.axiosInstance.post<T>(url, data, config);
            console.log(`[HttpService] POST ${url} - réponse:`, response.status);
            return response;
        } catch (error: any) {
            console.error(`[HttpService] POST ${url} - erreur:`, error.message);
            throw error;
        }
    }
    
    // Méthode pour effectuer une requête PUT
    public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        console.log(`[HttpService] PUT ${url} - début de la requête`);
        try {
            const response = await this.axiosInstance.put<T>(url, data, config);
            console.log(`[HttpService] PUT ${url} - réponse:`, response.status);
            return response;
        } catch (error: any) {
            console.error(`[HttpService] PUT ${url} - erreur:`, error.message);
            throw error;
        }
    }
    
    // Méthode pour effectuer une requête DELETE
    public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        console.log(`[HttpService] DELETE ${url} - début de la requête`);
        try {
            const response = await this.axiosInstance.delete<T>(url, config);
            console.log(`[HttpService] DELETE ${url} - réponse:`, response.status);
            return response;
        } catch (error: any) {
            console.error(`[HttpService] DELETE ${url} - erreur:`, error.message);
            throw error;
        }
    }
    
    // Méthode pour effectuer une requête PATCH
    public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        console.log(`[HttpService] PATCH ${url} - début de la requête`);
        try {
            const response = await this.axiosInstance.patch<T>(url, data, config);
            console.log(`[HttpService] PATCH ${url} - réponse:`, response.status);
            return response;
        } catch (error: any) {
            console.error(`[HttpService] PATCH ${url} - erreur:`, error.message);
            throw error;
        }
    }
}

// Créer et exporter une instance par défaut du service HTTP
export const httpService = new HttpService();

// La fonction pour créer une instance personnalisée n'est probablement plus nécessaire
// si toutes les requêtes doivent passer par l'intercepteur MSAL de apiClient.
// export const createHttpService = (options?: HttpServiceOptions) => {
//     return new HttpService(options);
// };
