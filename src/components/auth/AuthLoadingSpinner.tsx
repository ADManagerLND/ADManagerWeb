import React from 'react';
import { Spin, Typography } from 'antd';
import { LoadingOutlined, SafetyOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AuthLoadingSpinnerProps {
    message?: string;
    subMessage?: string;
    showSecurityInfo?: boolean;
    size?: 'small' | 'default' | 'large';
}

const AuthLoadingSpinner: React.FC<AuthLoadingSpinnerProps> = ({
    message = "Vérification de l'authentification...",
    subMessage = "Veuillez patienter",
    showSecurityInfo = false,
    size = 'large'
}) => {
    const spinnerSize = size === 'large' ? 48 : size === 'default' ? 32 : 24;
    const containerPadding = size === 'large' ? '48px' : size === 'default' ? '32px' : '24px';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: containerPadding,
            minHeight: size === 'large' ? '200px' : '120px'
        }}>
            {/* Spinner principal avec animation */}
            <div style={{ 
                position: 'relative',
                marginBottom: '24px'
            }}>
                <Spin 
                    size={size}
                    indicator={
                        <LoadingOutlined 
                            style={{ 
                                fontSize: spinnerSize,
                                color: '#1890ff'
                            }} 
                            spin 
                        />
                    }
                />
                
                {/* Cercle d'animation secondaire */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: spinnerSize + 20,
                    height: spinnerSize + 20,
                    border: '2px solid #f0f0f0',
                    borderTop: '2px solid #1890ff',
                    borderRadius: '50%',
                    animation: 'auth-spinner-outer 2s linear infinite reverse',
                    opacity: 0.3
                }} />
            </div>

            {/* Messages */}
            <div style={{ marginBottom: showSecurityInfo ? '20px' : '0' }}>
                <Text strong style={{ 
                    fontSize: size === 'large' ? '18px' : '16px',
                    color: '#262626',
                    display: 'block',
                    marginBottom: '8px'
                }}>
                    {message}
                </Text>
                <Text style={{ 
                    fontSize: '14px',
                    color: '#8c8c8c'
                }}>
                    {subMessage}
                </Text>
            </div>

            {/* Info de sécurité optionnelle */}
            {showSecurityInfo && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #b7eb8f',
                    maxWidth: '300px'
                }}>
                    <SafetyOutlined style={{ 
                        color: '#52c41a',
                        marginRight: '8px',
                        fontSize: '16px'
                    }} />
                    <Text style={{ 
                        fontSize: '12px',
                        color: '#389e0d'
                    }}>
                        Connexion sécurisée via Azure AD
                    </Text>
                </div>
            )}

            <style>{`
                @keyframes auth-spinner-outer {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AuthLoadingSpinner; 