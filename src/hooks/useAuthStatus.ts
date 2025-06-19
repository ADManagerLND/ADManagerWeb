import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../services/auth/AuthContext';

export type AuthStatusType = 'initializing' | 'idle' | 'connecting' | 'verifying' | 'authenticated' | 'error' | 'logging-out';

interface AuthStatusState {
    status: AuthStatusType;
    progress: number;
    message: string;
    subMessage: string;
    canRetry: boolean;
}

interface AuthStatusActions {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    retry: () => Promise<void>;
    reset: () => void;
}

export interface UseAuthStatusReturn {
    authStatus: AuthStatusState;
    actions: AuthStatusActions;
}

export const useAuthStatus = (): UseAuthStatusReturn => {
    const { authState, login: contextLogin, logout: contextLogout } = useAuth();
    const { isLoading, isAuthenticated, error, isInitialized } = authState;

    const [authStatus, setAuthStatus] = useState<AuthStatusState>({
        status: 'initializing',
        progress: 0,
        message: 'Initialisation...',
        subMessage: 'Veuillez patienter',
        canRetry: false
    });

    // Mettre à jour le statut basé sur l'état du contexte
    useEffect(() => {
        if (!isInitialized && isLoading) {
            setAuthStatus({
                status: 'initializing',
                progress: 25,
                message: 'Initialisation de la plateforme...',
                subMessage: 'Configuration des services d\'authentification',
                canRetry: false
            });
        } else if (isAuthenticated) {
            setAuthStatus({
                status: 'authenticated',
                progress: 100,
                message: 'Authentifié avec succès',
                subMessage: 'Accès autorisé à la plateforme',
                canRetry: false
            });
        } else if (error) {
            setAuthStatus({
                status: 'error',
                progress: 0,
                message: 'Erreur d\'authentification',
                subMessage: error,
                canRetry: true
            });
        } else if (isInitialized && !isLoading) {
            setAuthStatus({
                status: 'idle',
                progress: 0,
                message: 'Prêt pour la connexion',
                subMessage: 'Cliquez pour vous connecter avec Microsoft',
                canRetry: false
            });
        }
    }, [isLoading, isAuthenticated, error, isInitialized]);

    // Action de connexion avec gestion des étapes
    const login = useCallback(async () => {
        try {
            // Étape 1: Connexion
            setAuthStatus(prev => ({
                ...prev,
                status: 'connecting',
                progress: 33,
                message: 'Connexion à Microsoft...',
                subMessage: 'Redirection vers Azure AD',
                canRetry: false
            }));

            // Délai pour UX
            await new Promise(resolve => setTimeout(resolve, 800));

            // Étape 2: Vérification
            setAuthStatus(prev => ({
                ...prev,
                status: 'verifying',
                progress: 66,
                message: 'Vérification des identifiants...',
                subMessage: 'Validation en cours'
            }));

            await new Promise(resolve => setTimeout(resolve, 800));

            // Étape 3: Finalisation
            setAuthStatus(prev => ({
                ...prev,
                progress: 90,
                message: 'Authentification réussie',
                subMessage: 'Redirection vers l\'application'
            }));

            // Appel de la fonction de connexion réelle
            await contextLogin();

        } catch (error: any) {
            setAuthStatus({
                status: 'error',
                progress: 0,
                message: 'Échec de la connexion',
                subMessage: error?.message || 'Une erreur est survenue',
                canRetry: true
            });
        }
    }, [contextLogin]);

    // Action de déconnexion
    const logout = useCallback(async () => {
        try {
            setAuthStatus({
                status: 'logging-out',
                progress: 50,
                message: 'Déconnexion en cours...',
                subMessage: 'Nettoyage de la session',
                canRetry: false
            });

            await contextLogout();

            setAuthStatus({
                status: 'idle',
                progress: 0,
                message: 'Déconnecté avec succès',
                subMessage: 'Vous pouvez vous reconnecter',
                canRetry: false
            });

        } catch (error: any) {
            setAuthStatus({
                status: 'error',
                progress: 0,
                message: 'Erreur lors de la déconnexion',
                subMessage: error?.message || 'Une erreur est survenue',
                canRetry: true
            });
        }
    }, [contextLogout]);

    // Action de réessai
    const retry = useCallback(async () => {
        if (authStatus.canRetry) {
            await login();
        }
    }, [login, authStatus.canRetry]);

    // Réinitialisation du statut
    const reset = useCallback(() => {
        setAuthStatus({
            status: 'idle',
            progress: 0,
            message: 'Prêt pour la connexion',
            subMessage: 'Cliquez pour vous connecter',
            canRetry: false
        });
    }, []);

    return {
        authStatus,
        actions: {
            login,
            logout,
            retry,
            reset
        }
    };
}; 