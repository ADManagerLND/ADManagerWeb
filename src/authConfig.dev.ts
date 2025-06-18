import {Configuration, LogLevel, PublicClientApplication} from "@azure/msal-browser";

// Configuration Azure AD pour développement local (contournement crypto)
export const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || "a70e01a3-ae69-4d17-ad6d-407f168bb45e";
export const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || "114717d2-5cae-4569-900a-efa4e58eb3f5";

console.log('🔧 Configuration Azure AD (Mode Développement):');
console.log(`   TenantId: ${tenantId}`);
console.log(`   ClientId: ${clientId}`);
console.log(`   Protocol: ${window.location.protocol}`);
console.log(`   Host: ${window.location.host}`);

// Détection si HTTPS est disponible
const isHttpsAvailable = window.location.protocol === 'https:' || 
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';

console.log(`   HTTPS disponible: ${isHttpsAvailable}`);

// Configuration MSAL adaptée pour le développement
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
                const prefix = '🔐 MSAL-DEV:';
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
            logLevel: LogLevel.Warning
        }
    }
};

// Polyfill pour crypto si nécessaire
if (!isHttpsAvailable && !window.crypto) {
    console.warn('⚠️  Crypto API non disponible, utilisation d\'un polyfill simple');
    (window as any).crypto = {
        getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
        },
        subtle: undefined // Pas de crypto.subtle en HTTP
    };
}

// Scopes pour la connexion initiale
export const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "email",
        "User.Read"
    ],
    prompt: "select_account" as const
};

// Scopes pour les appels API
export const apiRequest = {
    scopes: [`${clientId}/.default`]
};

// Instance MSAL singleton avec gestion d'erreur
let msalInstanceCache: PublicClientApplication | null = null;

export const getMsalInstance = (): PublicClientApplication => {
    if (!msalInstanceCache) {
        try {
            msalInstanceCache = new PublicClientApplication(msalConfig);
        } catch (error) {
            console.error('❌ Erreur lors de la création de l\'instance MSAL:', error);
            
            // Configuration fallback sans crypto
            const fallbackConfig = {
                ...msalConfig,
                system: {
                    ...msalConfig.system,
                    cryptoOptions: undefined
                }
            };
            
            try {
                msalInstanceCache = new PublicClientApplication(fallbackConfig);
                console.warn('⚠️  Instance MSAL créée avec configuration fallback');
            } catch (fallbackError) {
                console.error('❌ Impossible de créer l\'instance MSAL même avec fallback:', fallbackError);
                throw fallbackError;
            }
        }
    }
    return msalInstanceCache;
};

// Initialisation sécurisée
export const initializeMsal = async (): Promise<void> => {
    try {
        console.log('🚀 Initialisation de MSAL (Mode Développement)...');
        
        if (!isHttpsAvailable) {
            console.warn('⚠️  Mode HTTP détecté - Fonctionnalités de sécurité limitées');
        }
        
        const instance = getMsalInstance();
        await instance.initialize();
        console.log('✅ MSAL initialisé avec succès');
        
        // Vérifier les comptes existants
        const accounts = instance.getAllAccounts();
        console.log(`📊 Comptes trouvés: ${accounts.length}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de MSAL:', error);
        
        // Afficher un message d'aide à l'utilisateur
        if (error instanceof Error && error.message.includes('crypto')) {
            console.warn('💡 Solution: Utilisez HTTPS ou configurez un certificat SSL');
            console.warn('💡 Alternative: Exécutez le script configure-https-iis.ps1');
        }
        
        throw error;
    }
};

// Configuration des ressources protégées
export const protectedResources = {
    api: {
        endpoint: `${window.location.protocol}//${window.location.hostname}:5021/api`,
        scopes: [`${clientId}/.default`]
    }
};

// Instance exportée (legacy)
export const msalInstance = getMsalInstance(); 