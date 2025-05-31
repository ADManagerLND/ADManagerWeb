import React from 'react';
import { Button } from 'antd';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';

const AuthButton: React.FC = () => {
    const { instance, accounts } = useMsal();

    const handleLogin = () => {
        instance.loginPopup(loginRequest).catch(e => {
            console.error("Erreur de connexion:", e);
        });
    };

    const handleLogout = () => {
        instance.logoutPopup({
            postLogoutRedirectUri: window.location.origin,
        }).catch(e => {
            console.error("Erreur de déconnexion:", e);
        });
    };

    return (
        <Button 
            type={accounts.length > 0 ? "default" : "primary"}
            onClick={accounts.length > 0 ? handleLogout : handleLogin}
        >
            {accounts.length > 0 ? "Se déconnecter" : "Se connecter"}
        </Button>
    );
};

export default AuthButton; 