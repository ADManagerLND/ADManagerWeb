import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError, InteractionStatus } from "@azure/msal-browser";
import { protectedResources, apiRequest } from "../authConfig";
import { AccountInfo } from "@azure/msal-browser";

export interface AuthHook {
    getAccessToken: () => Promise<string | null>;
    getAccount: () => AccountInfo | null;
    isUserAuthenticated: () => boolean;
    login: () => Promise<void>; // Simplifié car MsalAuthenticationTemplate gère le login initial
    logout: () => Promise<void>; // Simplifié car AuthButton gère déjà cela
}

export const useAuth = (): AuthHook => {
    const { instance, accounts, inProgress } = useMsal();

    const getAccount = (): AccountInfo | null => {
        if (accounts.length > 0) {
            return accounts[0];
        }
        return null;
    };

    const isUserAuthenticated = (): boolean => {
        return accounts.length > 0 && inProgress === InteractionStatus.None;
    };

    const getAccessToken = async (): Promise<string | null> => {
        const account = getAccount();
        if (!account) {
            console.warn("Aucun compte actif trouvé pour acquérir un token.");
            return null;
        }

        const accessTokenRequest = {
            scopes: protectedResources.api.scopes,
            account: account,
        };

        try {
            const authResult = await instance.acquireTokenSilent(accessTokenRequest);
            return authResult.accessToken;
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                console.warn("Acquisition silencieuse du token échouée, tentative d'acquisition interactive...");
                try {
                    // Vous pouvez choisir loginPopup ou loginRedirect ici selon votre UX préférée
                    // loginRequest (importé de authConfig) contient les scopes User.Read et apiScope
                    const authResult = await instance.acquireTokenPopup(accessTokenRequest);
                    return authResult.accessToken;
                } catch (popupError) {
                    console.error("Erreur lors de l'acquisition interactive du token (popup):", popupError);
                    return null;
                }
            } else {
                console.error("Erreur inattendue lors de l'acquisition du token:", error);
                return null;
            }
        }
    };

    // Les fonctions login et logout sont déjà gérées par MsalAuthenticationTemplate et AuthButton
    // mais nous pouvons les exposer ici si un contrôle programmatique est nécessaire ailleurs.
    const login = async (): Promise<void> => {
        // Normalement, MsalAuthenticationTemplate gère cela. 
        // Pour un appel explicite, vous pouvez utiliser instance.loginRedirect ou instance.loginPopup
        // avec `loginRequest` de authConfig.ts
        try {
            await instance.loginRedirect({ scopes: protectedResources.api.scopes }); // ou loginRequest si vous voulez juste les scopes de base
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const logout = async (): Promise<void> => {
        const account = getAccount();
        if (account) {
            try {
                await instance.logoutRedirect({ account }); // Ou logoutPopup
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
    };

    return { getAccessToken, getAccount, isUserAuthenticated, login, logout };
}; 