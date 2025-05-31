import { Configuration, PublicClientApplication } from "@azure/msal-browser";
import { API_CONFIG } from "./services/api/config";

// Configuration MSAL
export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: true, // Nécessaire pour IE11/Edge
    },
    system: {
        allowRedirectInIframe: true, // Permettre la redirection dans un iframe
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case 0:
                        console.error(message);
                        return;
                    case 1:
                        console.warn(message);
                        return;
                    case 2:
                        console.info(message);
                        return;
                    case 3:
                        console.debug(message);
                        return;
                    case 4:
                        console.trace(message);
                        return;
                }
            },
            piiLoggingEnabled: false
        }
    }
};

// Configuration des scopes pour l'authentification
export const loginRequest = {
    scopes: ["User.Read", "openid", "profile", "email"]
};

// ID de l'application (GUID)
export const appId = import.meta.env.VITE_AZURE_CLIENT_ID || "114717d2-5cae-4569-900a-efa4e58eb3f5";

// Configuration des scopes pour l'API
export const apiRequest = {
    // Pour une application qui demande un token pour elle-même, utiliser directement le GUID
    scopes: [appId + "/.default"]
};

// Instance MSAL
export const msalInstance = new PublicClientApplication(msalConfig);

// Assurez-vous qu'il y a un compte connecté
msalInstance.initialize().then(() => {
    // Sélectionner le compte si disponible
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
    }
});

// Configuration des ressources protégées (votre API)
export const protectedResources = {
    api: {
        endpoint: import.meta.env.VITE_API_URL || "http://localhost:5021/api",
        scopes: [
            // Même scope que celui défini dans apiRequest
            appId + "/.default"
        ],
    },
    // Vous pouvez ajouter d'autres ressources protégées ici (ex: Microsoft Graph)
    // graphMe: {
    //   endpoint: "https://graph.microsoft.com/v1.0/me",
    //   scopes: ["User.Read"]
    // }
}; 