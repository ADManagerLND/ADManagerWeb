import React, {useEffect, useState} from 'react';
import {Alert, Button, Layout, Menu, Space, Spin} from 'antd';
import {
    ApartmentOutlined,
    CloudOutlined,
    DashboardOutlined,
    IdcardOutlined,
    LoadingOutlined,
    LockOutlined,
    SettingOutlined,
    SyncOutlined,
    UploadOutlined
} from '@ant-design/icons';
import logoImage from './assets/logo.png';
import {Navigate, Route, Routes, useLocation, useNavigate} from 'react-router-dom';
import {MsalProvider} from "@azure/msal-react";
import {IPublicClientApplication} from '@azure/msal-browser';

// Styles CSS intégrés dans index.css

// Configuration et services d'authentification
import {getMsalInstance} from './authConfig';
import authService from './services/auth/authService';
import {AuthProvider, useAuth} from './services/auth/AuthContext';

// Services de configuration API
import apiConfigurationService from './services/apiConfiguration';

// Composants d'authentification
import LoginForm from './components/auth/LoginForm';
import LogoutButton from './components/auth/LogoutButton';

// Composant de configuration API
import ApiConfigurationSetup from './components/ApiConfigurationSetup';

// Pages de l'application
import Dashboard from './pages/Dashboard';

import Settings from './pages/Settings';
import ApiSettingsPage from './pages/ApiSettings';
import LdapSettingsPage from './pages/LdapSettings';
import UserAttributesSettingsPage from './pages/UserAttributesSettings';
import EnhancedCsvImportPage from './pages/EnhancedCsvImportPage';
import EnhancedImportConfigSettings from './pages/EnhancedImportConfigSettings';
import ActiveDirectoryPage from './pages/ActiveDirectoryPage';


const {Header, Content, Sider} = Layout;

// ================================================================================================
// STYLES ET CONSTANTES
// ================================================================================================

const LOADING_SCREEN_STYLES = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        position: 'relative' as const
    },
    decorativeElement1: {
        position: 'absolute' as const,
        top: '15%',
        left: '15%',
        width: '80px',
        height: '80px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '50%',
        filter: 'blur(30px)',
        animation: 'float 4s ease-in-out infinite'
    },
    decorativeElement2: {
        position: 'absolute' as const,
        bottom: '20%',
        right: '20%',
        width: '120px',
        height: '120px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        animation: 'float 6s ease-in-out infinite reverse'
    },
    card: {
        background: 'white',
        padding: '48px 40px',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center' as const,
        maxWidth: '420px',
        minWidth: '380px',
        position: 'relative' as const,
        zIndex: 1
    },
    logo: {
        height: '56px',
        width: 'auto',
        objectFit: 'contain' as const,
        marginBottom: '24px'
    },
    title: {
        margin: '0 0 8px 0',
        color: '#1f2937',
        fontSize: '20px',
        fontWeight: '600'
    },
    subtitle: {
        fontSize: '14px',
        color: '#6b7280',
        fontWeight: '400'
    }
};

const INIT_SCREEN_STYLES = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center' as const,
        maxWidth: '400px'
    }
};

const ERROR_SCREEN_STYLES = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%'
    }
};

// ================================================================================================
// COMPOSANT PRINCIPAL
// ================================================================================================

/**
 * Composant principal de l'application avec initialisation asynchrone de MSAL
 */
const App: React.FC = () => {
    const [msalInstance, setMsalInstance] = useState<IPublicClientApplication | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        const initializeMsal = async () => {
            try {
                console.log('🚀 App: Initialisation de MSAL...');
                setIsInitializing(true);
                setInitError(null);

                // Initialiser le service d'authentification
                await authService.initialize();

                // Obtenir l'instance MSAL initialisée
                const instance = getMsalInstance();
                setMsalInstance(instance);

                console.log('✅ App: MSAL initialisé avec succès');

            } catch (error: any) {
                console.error('❌ App: Erreur lors de l\'initialisation de MSAL:', error);
                setInitError(error.message || 'Erreur d\'initialisation de MSAL');
            } finally {
                setIsInitializing(false);
            }
        };

        initializeMsal();
    }, []);

    // Écran de chargement pendant l'initialisation
    if (isInitializing) {
        return (
            <div style={INIT_SCREEN_STYLES.container}>
                <div style={INIT_SCREEN_STYLES.card}>
                    <Spin
                        size="large"
                        indicator={<LoadingOutlined style={{fontSize: 32, color: '#1e40af'}} spin/>}
                    />
                    <div style={{marginTop: 24}}>
                        <h3 style={{margin: '0 0 8px 0', color: '#1f2937'}}>AD Manager</h3>
                        <p style={{margin: 0, color: '#666'}}>
                            Initialisation de l'authentification...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Écran d'erreur en cas d'échec d'initialisation
    if (initError || !msalInstance) {
        return (
            <div style={ERROR_SCREEN_STYLES.container}>
                <div style={ERROR_SCREEN_STYLES.card}>
                    <Alert
                        message="Erreur d'initialisation"
                        description={
                            <div>
                                <p>Impossible d'initialiser le système d'authentification :</p>
                                <p><strong>{initError}</strong></p>
                                <p>Vérifiez votre configuration Azure AD et votre connexion réseau.</p>
                            </div>
                        }
                        type="error"
                        showIcon
                        style={{marginBottom: '20px'}}
                    />

                    <Button
                        type="primary"
                        onClick={() => window.location.reload()}
                        style={{width: '100%'}}
                    >
                        Recharger la page
                    </Button>
                </div>
            </div>
        );
    }

    // Rendu normal avec MSAL initialisé
    return (
        <MsalProvider instance={msalInstance}>
            <AuthProvider>
                <AppRouter/>
            </AuthProvider>
        </MsalProvider>
    );
};

// ================================================================================================
// ROUTEUR PRINCIPAL
// ================================================================================================

/**
 * Routeur principal qui gère la configuration API et l'authentification
 */
const AppRouter: React.FC = () => {
    const {authState} = useAuth();
    const {isAuthenticated, isLoading, isAuthRequired} = authState;
    const [isApiConfigured, setIsApiConfigured] = useState(false);
    const [isCheckingApiConfig, setIsCheckingApiConfig] = useState(true);

    // Vérifier la configuration API au démarrage
    useEffect(() => {
        const checkApiConfiguration = async () => {
            try {
                const configured = apiConfigurationService.isConfigured();
                setIsApiConfigured(configured);
                
                if (configured) {
                    console.log('✅ Configuration API trouvée:', apiConfigurationService.getBaseUrl());
                } else {
                    console.log('⚠️ Aucune configuration API trouvée');
                }
            } catch (error) {
                console.error('❌ Erreur lors de la vérification de la configuration API:', error);
                setIsApiConfigured(false);
            } finally {
                setIsCheckingApiConfig(false);
            }
        };

        checkApiConfiguration();
    }, []);

    // Écran de chargement pour la vérification de configuration
    if (isCheckingApiConfig) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <Spin size="large">
                    <div style={{marginTop: 16, padding: 16}}>
                        Vérification de la configuration...
                    </div>
                </Spin>
            </div>
        );
    }

    // Écran de configuration API si nécessaire
    if (!isApiConfigured) {
        return (
            <ApiConfigurationSetup 
                onConfigured={() => {
                    setIsApiConfigured(true);
                    // Forcer un rechargement de la page pour appliquer la nouvelle configuration
                    window.location.reload();
                }} 
            />
        );
    }

    // Écran de chargement pour l'authentification
    if (isLoading) {
        return (
            <div style={INIT_SCREEN_STYLES.container}>
                <div style={INIT_SCREEN_STYLES.card}>
                    <Spin
                        size="large"
                        indicator={<LoadingOutlined style={{ fontSize: 32, color: '#1e40af' }} spin />}
                    />
                    <div style={{ marginTop: 24 }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>AD Manager</h3>
                        <p style={{ margin: 0, color: '#666' }}>
                            Vérification de l'authentification...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Si l'authentification est requise mais l'utilisateur n'est pas authentifié,
    // rediriger vers la page de login
    if (isAuthRequired && !isAuthenticated) {
        return <LoginForm/>;
    }

    // Si l'authentification n'est pas requise ou l'utilisateur est authentifié,
    // afficher le contenu de l'application
    return <AppContent/>;
};

// ================================================================================================
// CONTENU PRINCIPAL DE L'APPLICATION
// ================================================================================================

/**
 * Contenu principal de l'application (accessible uniquement si authentifié)
 */
const AppContent: React.FC = () => {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    // Configuration des pages et de leurs icônes
    const getPageInfo = (path: string) => {
        const pageMap: Record<string, { title: string; icon: React.ReactElement }> = {
            '/': { title: 'Tableau de bord', icon: <DashboardOutlined /> },
            '/csv-import': { title: 'Import CSV/Excel', icon: <UploadOutlined /> },
            '/active-directory': { title: 'Configuration Active Directory', icon: <ApartmentOutlined /> },
            '/settings/api': { title: 'Paramètres API', icon: <CloudOutlined /> },
            '/settings/ldap': { title: 'Configuration LDAP', icon: <LockOutlined /> },
            '/settings/user-attributes': { title: 'Attributs Utilisateur', icon: <IdcardOutlined /> },
            '/settings/teams': { title: 'Configuration Teams', icon: <SyncOutlined /> },
            '/settings/imports': { title: 'Configurations d\'import', icon: <UploadOutlined /> },
            '/settings': { title: 'Configuration', icon: <SettingOutlined /> }
        };

        // Recherche exacte d'abord
        if (pageMap[path]) return pageMap[path];

        // Recherche par préfixe pour les sous-pages
        for (const [key, value] of Object.entries(pageMap)) {
            if (path.startsWith(key) && key !== '/') {
                return value;
            }
        }

        return { title: 'AD Manager', icon: <SettingOutlined /> };
    };

    const currentPageInfo = getPageInfo(pathname);

    // Configuration du menu de navigation
    const navigationItems = [
        {
            key: '/',
            icon: <DashboardOutlined/>,
            label: 'Tableau de bord'
        },
        {
            key: '/csv-import',
            icon: <UploadOutlined/>,
            label: 'Import CSV/Excel'
        },
        {
            key: '/active-directory',
            icon: <ApartmentOutlined/>,
            label: 'Configuration AD'
        },
        {
            key: '/settings',
            icon: <SettingOutlined/>,
            label: 'Paramètres',
            children: [
                {
                    key: '/settings/api',
                    icon: <CloudOutlined/>,
                    label: 'API'
                },
                {
                    key: '/settings/ldap',
                    icon: <LockOutlined/>,
                    label: 'LDAP'
                },
                {
                    key: '/settings/user-attributes',
                    icon: <IdcardOutlined/>,
                    label: 'Attributs Utilisateur'
                },
                {
                    key: '/settings/imports',
                    icon: <UploadOutlined/>,
                    label: 'Configurations Import'
                },
            ],
        }
    ];

    return (
        <Layout style={{height: '100vh', overflow: 'hidden'}}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    background: '#ffffff',
                    boxShadow: '2px 0 12px rgba(0, 0, 0, 0.08)',
                    zIndex: 100,
                    borderRight: '1px solid #e8e8e8'
                }}
                theme="light"
                width={260}
                collapsedWidth={70}
            >
                {/* En-tête avec logo professionnel */}
                <div style={{
                    height: '70px',
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '0' : '0 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <img
                            src={logoImage}
                            alt="Logo"
                            style={{
                                height: collapsed ? '28px' : '32px',
                                width: 'auto',
                                objectFit: 'contain',
                                transition: 'all 0.3s ease'
                            }}
                        />
                        {!collapsed && (
                            <div style={{
                                color: '#ffffff',
                                fontWeight: '600',
                                fontSize: '16px',
                                letterSpacing: '-0.025em'
                            }}>
                                AD Manager
                            </div>
                        )}
                    </div>
                </div>

                {/* Menu avec design moderne */}
                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={navigationItems}
                    onClick={({key}) => navigate(key)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '14px',
                        padding: '12px'
                    }}
                    className="professional-sidebar-menu"
                />
            </Sider>
            <Layout style={{
                marginLeft: collapsed ? 70 : 260,
                transition: 'margin-left 0.3s'
            }}>
                <Header style={{
                    background: '#ffffff',
                    padding: '0 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    width: '100%',
                    height: '70px',
                    borderBottom: '1px solid #e8e8e8',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
                }}>
                    <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1f2937',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Space>
                            {React.cloneElement(currentPageInfo.icon, { 
                                style: { color: '#1e40af', fontSize: '20px' } 
                            })}
                            <span style={{color: '#374151'}}>{currentPageInfo.title}</span>
                        </Space>
                    </div>
                    <Space>
                        <LogoutButton/>
                    </Space>
                </Header>
                <Content style={{
                    margin: 0,
                    padding: 0,
                    background: '#fafbfc',
                    overflow: 'auto',
                    height: 'calc(100vh - 70px)'
                }}>
                    <Routes>
                        <Route path="/" element={<Dashboard/>}/>

                        <Route path="/login" element={<LoginForm/>}/>
                        <Route path="/active-directory" element={<ActiveDirectoryPage/>}/>
                        <Route path="/csv-import" element={<EnhancedCsvImportPage/>}/>
                        <Route path="/settings" element={<Settings/>}>
                            <Route index element={<Navigate to="api" replace/>}/>
                            <Route path="api" element={<ApiSettingsPage/>}/>
                            <Route path="ldap" element={<LdapSettingsPage/>}/>
                            <Route path="user-attributes" element={<UserAttributesSettingsPage/>}/>

                            <Route path="imports" element={<EnhancedImportConfigSettings/>}/>
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace/>}/>
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
};

export default App;