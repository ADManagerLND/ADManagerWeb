import React, { useState } from 'react';
import { Avatar, Button, Dropdown, Space, type MenuProps, Tooltip } from 'antd';
import {
    DownOutlined,
    LogoutOutlined,
    SettingOutlined,
    UserOutlined
} from '@ant-design/icons';

import { useAuth } from '../../services/auth/AuthContext';
import type { UserProfile } from '../../services/auth/authService';
import AuthStatusIndicator from './AuthStatusIndicator';

/* ---------------------  HELPERS  ---------------------------------- */

function getUserInitials(user: UserProfile | null): string {
    if (!user) return 'U';
    if (user.name) {
        return user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    return 'U';
}

/* ---------------------  COMPONENT  -------------------------------- */

const LogoutButton: React.FC = () => {
    const { authState, logout } = useAuth();
    const { isLoading, user } = authState;
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleMenuClick: MenuProps['onClick'] = async ({ key }) => {
        switch (key) {
            case 'logout':
                setIsLoggingOut(true);
                try {
                    await logout();
                } catch (error) {
                    console.error('Erreur lors de la déconnexion:', error);
                } finally {
                    setIsLoggingOut(false);
                }
                break;
            case 'profile':
                console.log('Redirection vers le profil');
                break;
            case 'settings':
                console.log('Redirection vers les paramètres');
                break;
        }
    };

    const menuItems: MenuProps['items'] = [
        {
            key: 'user-info',
            disabled: true,
            label: (
                <div style={{ padding: '12px 0', minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <Avatar
                            size={40}
                            style={{ backgroundColor: '#1890ff', marginRight: 12, fontWeight: 600 }}
                        >
                            {getUserInitials(user)}
                        </Avatar>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>
                                {user?.name || user?.email || 'Utilisateur'}
                            </div>

                            {user?.email && user?.name && (
                                <div style={{ fontSize: 12, color: '#8c8c8c' }}>{user.email}</div>
                            )}

                            {user?.roles?.length && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: '#595959',
                                        marginTop: 4,
                                        padding: '2px 6px',
                                        background: '#f5f5f5',
                                        borderRadius: 4,
                                        display: 'inline-block'
                                    }}
                                >
                                    {user.roles.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        { type: 'divider' },
        {
            key: 'profile',
            label: (
                <Space>
                    <UserOutlined />
                    Mon profil
                </Space>
            )
        },
        {
            key: 'settings',
            label: (
                <Space>
                    <SettingOutlined />
                    Paramètres
                </Space>
            )
        },
        { type: 'divider' },
        {
            key: 'logout',
            disabled: isLoggingOut,
            label: (
                <Space>
                    {isLoggingOut ? (
                        <AuthStatusIndicator status="loading" size="small" />
                    ) : (
                        <LogoutOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <span style={{ color: isLoggingOut ? '#8c8c8c' : '#ff4d4f' }}>
                        {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
                    </span>
                </Space>
            )
        }
    ];

    return (
        <Dropdown
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={['click']}
            placement="bottomRight"
            arrow
            disabled={isLoggingOut}
        >
            <Tooltip title={isLoggingOut ? "Déconnexion en cours..." : "Menu utilisateur"}>
                <Button
                    type="text"
                    loading={isLoading || isLoggingOut}
                    disabled={isLoggingOut}
                    style={{
                        height: 40,
                        borderRadius: 8,
                        border: '1px solid #d9d9d9',
                        background: '#fff',
                        padding: '0 12px',
                        opacity: isLoggingOut ? 0.7 : 1,
                        transition: 'all 0.3s ease'
                    }}
                    className="user-dropdown-button"
                >
                    <Space size={8}>
                        <div style={{ position: 'relative' }}>
                            <Avatar size={24} style={{ backgroundColor: '#1890ff', fontWeight: 600 }}>
                                {getUserInitials(user)}
                            </Avatar>
                            {isLoggingOut && (
                                <div style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: '#faad14',
                                    animation: 'pulse 1s infinite'
                                }} />
                            )}
                        </div>
                        <span style={{ 
                            color: isLoggingOut ? '#8c8c8c' : 'inherit',
                            transition: 'color 0.3s ease'
                        }}>
                            {user?.name?.split(' ')[0] || 'Mon compte'}
                        </span>
                        <DownOutlined style={{ 
                            fontSize: 10, 
                            color: '#8c8c8c',
                            transform: isLoggingOut ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }} />
                    </Space>
                </Button>
            </Tooltip>
        </Dropdown>
    );
};

export default LogoutButton;
