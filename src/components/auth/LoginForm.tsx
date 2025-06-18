import React, {useEffect, useState} from 'react';
import {Alert, Button, Card, Space, Spin, Typography} from 'antd';
import {LoadingOutlined, SafetyOutlined, WindowsOutlined} from '@ant-design/icons';
import {useAuth} from '../../services/auth/AuthContext';
import {useNavigate} from 'react-router-dom';
import logoImage from '../../assets/logo.png';

const {Title, Text, Paragraph} = Typography;

/**
 * Formulaire de connexion professionnel pour l'application AD Manager
 */
const LoginForm: React.FC = () => {
    const {authState, login} = useAuth();
    const {isLoading, isAuthenticated, error, isInitialized} = authState;
    const navigate = useNavigate();
    const [localLoading, setLocalLoading] = useState<boolean>(false);

    // Rediriger vers la page principale si déjà authentifié
    useEffect(() => {
        if (isAuthenticated && isInitialized) {
            console.log('✅ Utilisateur authentifié, redirection...');
            navigate('/', {replace: true});
        }
    }, [isAuthenticated, isInitialized, navigate]);

    // Gérer le clic sur le bouton de connexion Microsoft
    const handleMicrosoftLogin = async () => {
        try {
            setLocalLoading(true);
            console.log('🔑 Tentative de connexion Microsoft...');
            await login();
        } catch (error) {
            console.error('❌ Erreur lors de la connexion avec Microsoft:', error);
        } finally {
            setLocalLoading(false);
        }
    };

    // Afficher un spinner pendant l'initialisation
    if (isLoading && !isInitialized) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <img
                        src={logoImage}
                        alt="Logo"
                        style={{
                            height: '48px',
                            width: 'auto',
                            objectFit: 'contain',
                            marginBottom: '24px'
                        }}
                    />
                    <Spin
                        size="large"
                        indicator={<LoadingOutlined style={{fontSize: 32, color: '#1e40af'}} spin/>}
                    />
                    <div style={{marginTop: 24}}>
                        <h3 style={{margin: '0 0 8px 0', color: '#1f2937'}}>AD Manager</h3>
                        <Text style={{color: '#666'}}>
                            Initialisation de la plateforme...
                        </Text>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '20px',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            position: 'relative'
        }}>
            {/* Éléments décoratifs en arrière-plan */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(40px)'
            }}/>
            <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '15%',
                width: '150px',
                height: '150px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '50%',
                filter: 'blur(60px)'
            }}/>

            <Card
                style={{
                    width: '100%',
                    maxWidth: 480,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    borderRadius: '20px',
                    border: 'none',
                    overflow: 'hidden'
                }}
                bodyStyle={{padding: '48px 40px'}}
            >
                {/* En-tête avec logo */}
                <div style={{textAlign: 'center', marginBottom: 40}}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: '24px'
                    }}>
                        <img
                            src={logoImage}
                            alt="Logo AD Manager"
                            style={{
                                height: '56px',
                                width: 'auto',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <Title level={1} style={{
                        marginBottom: 8,
                        color: '#1f2937',
                        fontSize: '32px',
                        fontWeight: '700'
                    }}>
                        AD Manager
                    </Title>
                    <Text style={{
                        fontSize: 18,
                        color: '#6b7280',
                        fontWeight: '400'
                    }}>
                        Plateforme de gestion Active Directory
                    </Text>
                </div>

                {/* Alertes d'erreur */}
                {error && (
                    <Alert
                        message="Erreur d'authentification"
                        description={
                            <div>
                                <Paragraph style={{marginBottom: 8, color: '#dc2626'}}>
                                    {error}
                                </Paragraph>
                                <Text style={{fontSize: 13, color: '#6b7280'}}>
                                    Vérifiez votre connexion et réessayez. Si le problème persiste,
                                    contactez votre administrateur système.
                                </Text>
                            </div>
                        }
                        type="error"
                        showIcon
                        style={{
                            marginBottom: 32,
                            borderRadius: '12px',
                            border: 'none'
                        }}
                    />
                )}

                <Space direction="vertical" size="large" style={{width: '100%'}}>
                    {/* Bouton de connexion Microsoft */}
                    <Button
                        onClick={handleMicrosoftLogin}
                        icon={localLoading ? <LoadingOutlined spin/> : <WindowsOutlined/>}
                        size="large"
                        loading={localLoading}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            height: '56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#0078d4',
                            borderColor: '#0078d4',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '16px',
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            if (!localLoading && !isLoading) {
                                e.currentTarget.style.background = '#106ebe';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 120, 212, 0.4)';
                            }
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = '#0078d4';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 120, 212, 0.3)';
                        }}
                    >
                        {localLoading ? 'Connexion en cours...' : 'Se connecter avec Microsoft'}
                    </Button>
                </Space>

                {/* Section sécurité */}
                <div style={{
                    marginTop: 40,
                    padding: '24px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                        <SafetyOutlined style={{
                            fontSize: 20,
                            color: '#059669',
                            marginRight: 12
                        }}/>
                        <Text strong style={{fontSize: 16, color: '#374151'}}>
                            Connexion sécurisée
                        </Text>
                    </div>
                    <div style={{marginLeft: 32}}>
                        <Text style={{fontSize: 14, color: '#6b7280', lineHeight: '1.6'}}>
                            • Authentification via Azure Active Directory<br/>
                            • Chiffrement de bout en bout<br/>
                            • Accès basé sur les rôles et permissions<br/>
                            • Conformité aux standards de sécurité entreprise
                        </Text>
                    </div>
                </div>

                {/* Support */}
                <div style={{
                    marginTop: 32,
                    textAlign: 'center',
                    paddingTop: 24,
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <Text style={{fontSize: 13, color: '#9ca3af'}}>
                        Besoin d'aide ? Contactez votre administrateur système
                    </Text>
                </div>
            </Card>
        </div>
    );
};

export default LoginForm;
