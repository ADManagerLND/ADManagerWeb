import apiConfigurationService from '../apiConfiguration';

// Configuration pour l'API et les WebSockets
const ENV = import.meta.env.VITE_APP_ENV || 'development';

// Configuration Azure AD
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || "a70e01a3-ae69-4d17-ad6d-407f168bb45e";
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || "114717d2-5cae-4569-900a-efa4e58eb3f5";

// Configuration du backend - utilise l'IP configurée ou les variables d'environnement en fallback
const getApiBaseUrl = (): string => {
    // Priorité 1: Configuration stockée localement
    const configuredUrl = apiConfigurationService.getBaseUrl();
    if (configuredUrl) {
        return configuredUrl;
    }
    
    // Priorité 2: Variables d'environnement
    const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
    const API_PORT = import.meta.env.VITE_API_PORT || '5021';
    return `http://${API_HOST}:${API_PORT}`;
};

// Configuration par environnement
const CONFIG_BY_ENV = {
    development: {
        API_BASE_URL: getApiBaseUrl(),
        WEBSOCKET_URL: `${getApiBaseUrl()}/hubs`,
        ENABLE_SIGNALR: false, // Désactivé par défaut en développement
    },
    test: {
        API_BASE_URL: 'http://test-server',
        WEBSOCKET_URL: 'http://test-server/hubs',
        ENABLE_SIGNALR: true,
    },
    production: {
        API_BASE_URL: getApiBaseUrl(),
        WEBSOCKET_URL: `${getApiBaseUrl()}/hubs`,
        ENABLE_SIGNALR: true,
    },
};

// Récupération de la configuration correspondant à l'environnement actuel
const currentConfig = CONFIG_BY_ENV[ENV as keyof typeof CONFIG_BY_ENV] || CONFIG_BY_ENV.development;

// Configuration des points de terminaison de l'API
const ENDPOINTS = {
    AUTH: '/api/auth',
    USERS: '/api/users',
    GROUPS: '/api/groups',
    OU: '/api/ou',
    CONFIG: '/api/Config',
    IMPORT: '/api/Config/import',
    IMPORT_UPLOAD: '/api/import/upload-file',
    LDAP: '/api/Config/ldap',
    ATTRIBUTES: '/api/Config/attributes',
    ALL_CONFIG: '/api/Config/all',
    IMPORT_HUBS: {
        CSV: '/hubs/csvImportHub'
    },
    TEST: '/api/test',
    ACTIVE_DIRECTORY: {
        ROOT: '/api/activedirectory/root',
        CHILDREN: '/api/activedirectory/children',
        SEARCH: '/api/activedirectory/search',
        BULK_ACTION: '/api/activedirectory/bulkAction',
        USER: '/api/activedirectory/user'
    }
};

// Constantes pour les hubs
const HUBS = {
    CSV_IMPORT: 'csvImportHub',
    NOTIFICATION: 'notificationHub'
};

// Configuration de l'authentification simplifiée
const AUTH = {
    AUTHORITY: `https://login.microsoftonline.com/${TENANT_ID}`,
    CLIENT_ID: CLIENT_ID,
    TENANT_ID: TENANT_ID,
    SCOPES: {
        // Scope principal pour l'API
        API: `${CLIENT_ID}/.default`,

        // Scopes standard Microsoft Graph
        USER_READ: 'User.Read',
        OPENID: 'openid',
        PROFILE: 'profile',
        EMAIL: 'email'
    },
    IS_AUTH_REQUIRED: true
};

// Assemblage de la configuration complète de l'API
export const API_CONFIG = {
    ...currentConfig,
    ENV,
    CLIENT_ID,
    TENANT_ID,
    BASE_URL: currentConfig.API_BASE_URL,
    WEBSOCKET_URL: currentConfig.WEBSOCKET_URL,
    ENDPOINTS,
    HUBS,
    AUTH
};

// Log de la configuration pour le débogage
console.log('🔧 Configuration API:', {
    ENV,
    BASE_URL: API_CONFIG.BASE_URL,
    CLIENT_ID: API_CONFIG.CLIENT_ID,
    TENANT_ID: API_CONFIG.TENANT_ID,
    AUTH_REQUIRED: API_CONFIG.AUTH.IS_AUTH_REQUIRED
});

export default API_CONFIG;
