import React from 'react';
import { Badge, Tooltip, Avatar } from 'antd';
import { 
    CheckCircleOutlined, 
    LoadingOutlined, 
    ExclamationCircleOutlined,
    ClockCircleOutlined,
    SafetyOutlined
} from '@ant-design/icons';

interface AuthStatusIndicatorProps {
    status: 'loading' | 'authenticated' | 'error' | 'pending' | 'secure';
    message?: string;
    size?: 'small' | 'default' | 'large';
    showText?: boolean;
}

const AuthStatusIndicator: React.FC<AuthStatusIndicatorProps> = ({
    status,
    message,
    size = 'default',
    showText = false
}) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'loading':
                return {
                    color: '#1890ff',
                    icon: <LoadingOutlined spin />,
                    text: 'Authentification...',
                    badgeStatus: 'processing' as const,
                    tooltip: 'Vérification de l\'authentification en cours'
                };
            case 'authenticated':
                return {
                    color: '#52c41a',
                    icon: <CheckCircleOutlined />,
                    text: 'Authentifié',
                    badgeStatus: 'success' as const,
                    tooltip: 'Authentification réussie'
                };
            case 'error':
                return {
                    color: '#ff4d4f',
                    icon: <ExclamationCircleOutlined />,
                    text: 'Erreur',
                    badgeStatus: 'error' as const,
                    tooltip: 'Erreur d\'authentification'
                };
            case 'pending':
                return {
                    color: '#faad14',
                    icon: <ClockCircleOutlined />,
                    text: 'En attente',
                    badgeStatus: 'warning' as const,
                    tooltip: 'Authentification en attente'
                };
            case 'secure':
                return {
                    color: '#722ed1',
                    icon: <SafetyOutlined />,
                    text: 'Sécurisé',
                    badgeStatus: 'success' as const,
                    tooltip: 'Connexion sécurisée établie'
                };
            default:
                return {
                    color: '#d9d9d9',
                    icon: <ClockCircleOutlined />,
                    text: 'Inconnu',
                    badgeStatus: 'default' as const,
                    tooltip: 'Statut inconnu'
                };
        }
    };

    const config = getStatusConfig();
    const iconSize = size === 'large' ? 20 : size === 'default' ? 16 : 14;

    const statusElement = (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <Badge 
                status={config.badgeStatus}
                dot={!showText}
            />
            
            <div style={{
                color: config.color,
                fontSize: iconSize,
                display: 'flex',
                alignItems: 'center'
            }}>
                {React.cloneElement(config.icon, {
                    style: { fontSize: iconSize }
                })}
            </div>

            {showText && (
                <span style={{
                    fontSize: size === 'large' ? '16px' : size === 'default' ? '14px' : '12px',
                    color: config.color,
                    fontWeight: 500
                }}>
                    {message || config.text}
                </span>
            )}
        </div>
    );

    return (
        <Tooltip title={message || config.tooltip}>
            {statusElement}
        </Tooltip>
    );
};

export default AuthStatusIndicator; 