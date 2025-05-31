import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";
import './reset.css';
import './index.css';
import App from './App';

// Créer l'instance MSAL
export const msalInstance = new PublicClientApplication(msalConfig);

// Gérer les redirections de connexion
msalInstance.handleRedirectPromise().catch(error => {
    console.error("Erreur lors de la gestion de la redirection:", error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <MsalProvider instance={msalInstance}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </MsalProvider>
    </React.StrictMode>
);