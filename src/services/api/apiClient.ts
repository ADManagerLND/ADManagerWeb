import axios, { AxiosInstance } from 'axios';
import { msalInstance, apiRequest } from '../../authConfig';
import { API_CONFIG } from './config';

// Créer une instance Axios avec la configuration de base
const apiClient: AxiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL
});

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(async (config) => {
    try {
        const account = msalInstance.getAllAccounts()[0];
        if (!account) {
            console.error('[apiClient] Aucun compte connecté trouvé. Veuillez vous connecter.');
            throw new Error('No active account! Please sign in before making API calls.');
        }

        // Acquérir silencieusement un token pour l'API
        const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: apiRequest.scopes,
            account: account
        });

        // Ajouter le token à l'en-tête d'autorisation
        if (tokenResponse && tokenResponse.accessToken) {
            config.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;
            console.debug('[apiClient] Token ajouté à la requête');
        }

        return config;
    } catch (error) {
        // Gérer les erreurs d'acquisition de token
        console.error('[apiClient] Erreur lors de l\'acquisition du token:', error);
        
        // Si l'erreur est due à l'expiration du token, on peut essayer d'en acquérir un nouveau via popup/redirect
        if (error instanceof Error && error.message.includes('interaction_required')) {
            try {
                // Rediriger vers la page de connexion
                await msalInstance.acquireTokenRedirect({
                    scopes: apiRequest.scopes,
                    redirectStartPage: window.location.href
                });
            } catch (redirectError) {
                console.error('[apiClient] Erreur lors de la redirection pour acquérir un token:', redirectError);
            }
        }
        
        // Rejeter la promesse pour éviter que la requête ne continue sans token
        return Promise.reject(error);
    }
});

// Intercepteur pour gérer les réponses
apiClient.interceptors.response.use(
    (response) => {
        // Gérer les réponses réussies
        return response;
    },
    (error) => {
        // Gérer les erreurs d'API
        if (error.response) {
            const status = error.response.status;
            
            // Si non autorisé (401) ou interdit (403), peut-être que le token est expiré
            if (status === 401 || status === 403) {
                console.warn('[apiClient] Erreur d\'authentification, tentative de reconnexion...');
                
                // Tentative de reconnexion via popup
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    msalInstance.acquireTokenRedirect({
                        scopes: apiRequest.scopes,
                        account: accounts[0],
                        redirectStartPage: window.location.href
                    }).catch((err: any) => {
                        console.error('[apiClient] Échec de la tentative de reconnexion:', err);
                    });
                }
            }
        }
        
        // Propager l'erreur
        return Promise.reject(error);
    }
);

export default apiClient; 