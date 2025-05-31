// Configuration pour l'API et les WebSockets
const ENV = import.meta.env.VITE_APP_ENV || 'development';

// ID de l'application (GUID)
const APP_ID = import.meta.env.VITE_AZURE_CLIENT_ID;

// Détection de l'adresse IP du backend via les variables d'environnement ou utilisation des valeurs par défaut
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '5021';

// Configuration par environnement
const CONFIG_BY_ENV = {
    development: {
        API_BASE_URL: `http://${API_HOST}:${API_PORT}`,
        WEBSOCKET_URL: `http://${API_HOST}:${API_PORT}/hubs`,
    },
    test: {
        API_BASE_URL: 'http://test-server',
        WEBSOCKET_URL: 'http://test-server/hubs',
    },
    production: {
        API_BASE_URL: 'https://api.admanager.com',
        WEBSOCKET_URL: 'https://api.admanager.com/hubs',
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
    }
};

// Constantes pour les hubs
const HUBS = {
    CSV_IMPORT: 'csvImportHub'
};

// Exportation de la configuration de l'API
export const API_CONFIG = {
    ...currentConfig,
    ENV,
    APP_ID,
    BASE_URL: currentConfig.API_BASE_URL,
    ENDPOINTS,
    HUBS
};

export default API_CONFIG;
