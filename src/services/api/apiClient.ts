import axios, {AxiosInstance} from 'axios';
import {API_CONFIG} from './config';

// Créer une instance Axios avec la configuration de base
const apiClient: AxiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL
});

// Fonction pour vérifier si le token est expiré
const isTokenExpired = (): boolean => {
    const expiration = localStorage.getItem("admanager_token_expiration");
    if (!expiration) return true;

    const expirationTime = parseInt(expiration);
    return Date.now() > expirationTime;
};

// Fonction pour obtenir le token stocké
const getStoredToken = (): string | null => {
    if (isTokenExpired()) {
        console.warn("[apiClient] Le token est expiré, une nouvelle authentification est nécessaire");
        // Nettoyer le token expiré
        localStorage.removeItem("admanager_access_token");
        localStorage.removeItem("admanager_token_expiration");
        return null;
    }

    return localStorage.getItem("admanager_access_token");
};

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(async (config) => {
    try {
        // Récupérer le token depuis localStorage
        const token = getStoredToken();

        if (!token) {
            console.error('[apiClient] Aucun token valide trouvé. Redirection vers la page de connexion...');
            throw new Error('No valid token! Please sign in before making API calls.');
        }

        // Ajouter le token à l'en-tête d'autorisation
        config.headers.Authorization = `Bearer ${token}`;
        console.debug('[apiClient] Token ajouté à la requête');

        return config;
    } catch (error) {
        // Gérer les erreurs et rediriger vers la page de connexion
        console.error('[apiClient] Erreur lors de l\'acquisition du token:', error);

        // Rediriger vers la page de connexion si nécessaire
        if (window.location.pathname !== "/") {
            window.location.href = "/";
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

            // Si non autorisé (401) ou interdit (403), le token est probablement invalide
            if (status === 401 || status === 403) {
                console.warn('[apiClient] Erreur d\'authentification (401/403). Redirection vers la page de connexion...');

                // Nettoyer les tokens
                localStorage.removeItem("admanager_access_token");
                localStorage.removeItem("admanager_token_expiration");

                // Rediriger vers la page principale
                if (window.location.pathname !== "/") {
                    window.location.href = "/";
                }
            }
        }

        // Propager l'erreur
        return Promise.reject(error);
    }
);

export default apiClient; 