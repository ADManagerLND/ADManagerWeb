import {
    AccountInfo,
    AuthenticationResult,
    BrowserAuthError,
    InteractionRequiredAuthError,
    IPublicClientApplication,
    SilentRequest
} from '@azure/msal-browser';

import { apiRequest, initializeMsal, loginRequest, msalInstance } from '../../authConfig';

/** Profil utilisateur minimal partagé dans toute l’app */
export interface UserProfile {
    name?: string;
    email?: string;
    roles?: string[];
    avatarUrl?: string;
}

/**
 * Service d'authentification centralisé (singleton).
 */
class AuthService {
    private msalInstance: IPublicClientApplication | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    /** Initialise MSAL une seule fois */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.performInitialization();
        return this.initPromise;
    }

    /** Vérifie s'il existe déjà un compte connecté */
    public isAuthenticated(): boolean {
        if (!this.msalInstance || !this.isInitialized) return false;
        return this.msalInstance.getAllAccounts().length > 0;
    }

    /** Renvoie le compte MSAL actif (ou null) */
    public getActiveAccount(): AccountInfo | null {
        if (!this.msalInstance || !this.isInitialized) return null;

        const active = this.msalInstance.getActiveAccount();
        if (active) return active;

        const accounts = this.msalInstance.getAllAccounts();
        return accounts[0] ?? null;
    }

    /** Construit le profil utilisateur à partir du compte ou du token */
    public async getUser(): Promise<UserProfile | null> {
        const account = this.getActiveAccount();
        if (!account) return null;

        // Ex : décodage ID-Token ou appel /me.
        const { name, username: email } = account;
        // Ajoutez ici l’extraction de rôles si dispo dans votre ID-token (claim "roles")
        const roles: string[] | undefined = (account.idTokenClaims?.roles as string[]) ?? undefined;

        return { name, email, roles };
    }

    /** Déconnexion + nettoyage complet du cache */
    public async logout(): Promise<void> {
        if (!this.msalInstance || !this.isInitialized) return;

        const account = this.getActiveAccount();
        if (!account) return;

        // Purge sélective ou totale selon vos besoins
        this.forceFullCacheClear();

        await this.msalInstance.logoutRedirect({
            account,
            postLogoutRedirectUri: window.location.origin
        });
    }

    /** Délivre un access-token (silencieux d’abord) */
    public async getAccessToken(): Promise<string | null> {
        if (!this.isInitialized) await this.initialize();
        if (!this.msalInstance) return null;

        const account = this.getActiveAccount();
        if (!account) return null;

        try {
            const tokenRequest: SilentRequest = {
                scopes: apiRequest.scopes,
                account
            };

            const { accessToken } = await this.msalInstance.acquireTokenSilent(tokenRequest);
            return accessToken;
        } catch (err) {
            if (err instanceof InteractionRequiredAuthError) {
                await this.login();
            }
            return null;
        }
    }

    /** Lance une connexion via redirect */
    public async login(): Promise<void> {
        if (!this.isInitialized) await this.initialize();
        if (!this.msalInstance) throw new Error('MSAL non initialisé');

        await this.msalInstance.loginRedirect({
            ...loginRequest,
            redirectStartPage: window.location.href,
            prompt: 'select_account'
        });
    }

    /** À appeler sur la page de redirection */
    public async handleRedirectPromise(): Promise<AuthenticationResult | null> {
        if (!this.isInitialized) await this.initialize();
        if (!this.msalInstance) return null;

        try {
            const result = await this.msalInstance.handleRedirectPromise();
            if (result?.account) this.msalInstance.setActiveAccount(result.account);
            return result;
        } catch (err) {
            if (
                err instanceof BrowserAuthError &&
                err.errorCode === 'interaction_in_progress'
            ) {
                this.clearBrowserCache();
                window.location.reload();
            }
            return null;
        }
    }

    /* ------------------------------------------------------------------ */
    /* ---------------------  MÉTHODES PRIVÉES  -------------------------- */
    /* ------------------------------------------------------------------ */

    private async performInitialization(): Promise<void> {
        await initializeMsal();
        this.msalInstance = msalInstance;
        if (this.msalInstance.getAllAccounts().length && !this.msalInstance.getActiveAccount()) {
            this.msalInstance.setActiveAccount(this.msalInstance.getAllAccounts()[0]);
        }
        this.isInitialized = true;
    }

    /** Cache soft-clear (clé d’état uniquement) */
    private clearBrowserCache(): void {
        const keys = [
            'msal.interaction.status',
            'msal.request.state',
            'msal.error.description',
            'msal.error.code'
        ];
        keys.forEach(k => sessionStorage.removeItem(k));
        keys.forEach(k => localStorage.removeItem(k));
    }

    /** Purge totale : à n’utiliser qu’en cas de souci majeur */
    private forceFullCacheClear(): void {
        const allKeys = [...Object.keys(sessionStorage), ...Object.keys(localStorage)];
        allKeys
            .filter(k => k.includes('msal') || k.includes('login.windows') || k.includes('authority'))
            .forEach(k => {
                try {
                    sessionStorage.removeItem(k);
                    localStorage.removeItem(k);
                } catch {
                    /* noop */
                }
            });
    }
}

/* -------------------------------------------------------------------- */
/* -----------------------  EXPORT SINGLETON  ------------------------- */
/* -------------------------------------------------------------------- */

const authService = new AuthService();
export default authService;
