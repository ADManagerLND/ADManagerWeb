import React from 'react';
import { Avatar, Button, Dropdown, Space, type MenuProps } from 'antd';
import {
    DownOutlined,
    LogoutOutlined,
    SettingOutlined,
    UserOutlined
} from '@ant-design/icons';

import { useAuth } from '../../services/auth/AuthContext';
import type { UserProfile } from '../../services/auth/authService';

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

    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        switch (key) {
            case 'logout':
                logout();
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
            label: (
                <Space>
                    <LogoutOutlined style={{ color: '#ff4d4f' }} />
                    <span style={{ color: '#ff4d4f' }}>Déconnexion</span>
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
        >
            <Button
                type="text"
                loading={isLoading}
                style={{
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    padding: '0 12px'
                }}
                className="user-dropdown-button"
            >
                <Space size={8}>
                    <Avatar size={24} style={{ backgroundColor: '#1890ff', fontWeight: 600 }}>
                        {getUserInitials(user)}
                    </Avatar>
                    <span>{user?.name?.split(' ')[0] || 'Mon compte'}</span>
                    <DownOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                </Space>
            </Button>
        </Dropdown>
    );
};

export default LogoutButton;
