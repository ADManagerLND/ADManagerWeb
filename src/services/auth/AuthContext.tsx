import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import authService, { UserProfile } from './authService';
import { API_CONFIG } from '../api/config';

/* ---------- STATE & CONTEXT TYPES ---------------------------------- */

export interface AuthState {
    isAuthenticated: boolean;
    isAuthRequired: boolean;
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;
    user: UserProfile | null;
}

interface AuthContextProps {
    authState: AuthState;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    setAuthRequired: (r: boolean) => void;
    refreshAuthState: () => Promise<void>;
}

/* ---------- CONTEXT ------------------------------------------------ */

const AuthContext = createContext<AuthContextProps>({
    authState: {
        isAuthenticated: false,
        isAuthRequired: API_CONFIG.AUTH.IS_AUTH_REQUIRED,
        isLoading: true,
        error: null,
        isInitialized: false,
        user: null
    },
    login: async () => {},
    logout: async () => {},
    setAuthRequired: () => {},
    refreshAuthState: async () => {}
});

/* ---------- PROVIDER ---------------------------------------------- */

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        isAuthRequired: API_CONFIG.AUTH.IS_AUTH_REQUIRED,
        isLoading: true,
        error: null,
        isInitialized: false,
        user: null
    });

    /* -- Helpers ------------------------------------------------------ */

    const refreshAuthState = async () => {
        try {
            const isAuthenticated = authService.isAuthenticated();
            const user = isAuthenticated ? await authService.getUser() : null;

            setAuthState(prev => ({
                ...prev,
                isAuthenticated,
                user,
                isLoading: false,
                error: null,
                isInitialized: true
            }));
        } catch (err: any) {
            setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: err?.message ?? 'Erreur d’authentification inconnue',
                isInitialized: true
            }));
        }
    };

    /* -- Mount: initialise MSAL et traite la redirection -------------- */

    useEffect(() => {
        (async () => {
            try {
                setAuthState(p => ({ ...p, isLoading: true, error: null }));

                await authService.initialize();
                await authService.handleRedirectPromise();
                await refreshAuthState();
            } catch (err: any) {
                setAuthState(p => ({
                    ...p,
                    isLoading: false,
                    error: err?.message ?? 'Erreur d’initialisation',
                    isInitialized: true
                }));
            }
        })();
    }, []);

    /* -- Navigation guard --------------------------------------------- */

    useEffect(() => {
        if (authState.isLoading || !authState.isInitialized) return;

        const onLoginPage = location.pathname === '/login';
        if (authState.isAuthRequired && !authState.isAuthenticated && !onLoginPage) {
            navigate('/login', { replace: true });
        } else if (authState.isAuthenticated && onLoginPage) {
            navigate('/', { replace: true });
        }
    }, [
        authState.isAuthenticated,
        authState.isAuthRequired,
        authState.isLoading,
        authState.isInitialized,
        location.pathname,
        navigate
    ]);

    /* -- Actions ------------------------------------------------------ */

    const login = async () => {
        setAuthState(p => ({ ...p, isLoading: true, error: null }));
        await authService.login(); // redirige
    };

    const logout = async () => {
        setAuthState(p => ({ ...p, isLoading: true, error: null }));
        await authService.logout();
        setAuthState(p => ({
            ...p,
            isAuthenticated: false,
            user: null,
            isLoading: false
        }));
    };

    const setAuthRequired = (required: boolean) => {
        setAuthState(p => ({
            ...p,
            isAuthRequired: required,
            isAuthenticated: required ? p.isAuthenticated : true
        }));
        if (!required && location.pathname === '/login') navigate('/', { replace: true });
    };

    /* -- Render ------------------------------------------------------- */

    return (
        <AuthContext.Provider
            value={{ authState, login, logout, setAuthRequired, refreshAuthState }}
        >
            {children}
        </AuthContext.Provider>
    );
};

/* ---------- HOOK --------------------------------------------------- */

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};
