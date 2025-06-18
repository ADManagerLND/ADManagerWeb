import {Configuration, LogLevel, PublicClientApplication} from "@azure/msal-browser";

// Configuration depuis les variables d'environnement
export const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "a70e01a3-ae69-4d17-ad6d-407f168bb45e";
export const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "114717d2-5cae-4569-900a-efa4e58eb3f5";

console.log('🔧 Configuration Azure AD:');
console.log(`   TenantId: ${tenantId}`);
console.log(`   ClientId: ${clientId}`);

// Configuration MSAL simplifiée et corrigée
export const msalConfig: Configuration = {
    auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: true,
    },
    system: {
        allowRedirectInIframe: true,
        loggerOptions: {
            loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
                if (containsPii) {
                    return;
                }
                const prefix = '🔐 MSAL:';
                switch (level) {
                    case LogLevel.Error:
                        console.error(`${prefix} ERROR:`, message);
                        break;
                    case LogLevel.Warning:
                        console.warn(`${prefix} WARNING:`, message);
                        break;
                    case LogLevel.Info:
                        console.info(`${prefix} INFO:`, message);
                        break;
                    case LogLevel.Verbose:
                        console.debug(`${prefix} VERBOSE:`, message);
                        break;
                    case LogLevel.Trace:
                        console.trace(`${prefix} TRACE:`, message);
                        break;
                }
            },
            piiLoggingEnabled: false,
            logLevel: LogLevel.Error
        }
    }
};

// Scopes pour la connexion initiale
export const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "email",
        "User.Read"
    ],
    prompt: "select_account"
};

// Scopes pour les appels API
export const apiRequest = {
    scopes: [`${clientId}/.default`]
};

// Instance MSAL singleton
export const msalInstance = new PublicClientApplication(msalConfig);

// Getter pour récupérer l'instance externe
export function getMsalInstance(): PublicClientApplication {
    return msalInstance;
}

// Initialisation explicite
export const initializeMsal = async (): Promise<void> => {
    try {
        console.log('🚀 Initialisation de MSAL...');
        await msalInstance.initialize();
        console.log('✅ MSAL initialisé avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de MSAL:', error);
        throw error;
    }
};

// Configuration des ressources protégées
export const protectedResources = {
    api: {
        endpoint: `http://localhost:5021/api`,
        scopes: [`${clientId}/.default`]
    }
};
