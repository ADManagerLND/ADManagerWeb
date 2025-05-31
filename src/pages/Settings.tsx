// pages/Settings.tsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Tabs } from 'antd';
import { 
    UserOutlined, 
    LockOutlined, 
    ApiOutlined, 
    CloudOutlined,
    IdcardOutlined,
    UploadOutlined
} from '@ant-design/icons';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentTab = location.pathname.split('/').pop() || 'profile';

    // Catégories de paramètres statiques
    const categories = [
        { key: 'profile', label: 'Profil', icon: <UserOutlined />, isEnabled: true },
        { key: 'security', label: 'Sécurité', icon: <LockOutlined />, isEnabled: true },
        { key: 'api', label: 'API', icon: <ApiOutlined />, isEnabled: true },
        { key: 'ldap', label: 'LDAP', icon: <CloudOutlined />, isEnabled: true },
        { key: 'user-attributes', label: 'Attributs Utilisateur', icon: <IdcardOutlined />, isEnabled: true },
        { key: 'imports', label: 'Imports', icon: <UploadOutlined />, isEnabled: true },
    ];

    const handleTabChange = (key: string) => {
        navigate(`/settings/${key}`);
    };

    // Générer les items pour les onglets
    const items = categories
        .filter(category => category.isEnabled)
        .map(category => ({
            key: category.key,
            label: (
                <span>
                    {category.icon}
                    {' '}
                    {category.label}
                </span>
            ),
            disabled: !category.isEnabled
        }));

    return (
        <div>
            <h2>Paramètres</h2>
            
            <Tabs
                activeKey={currentTab}
                items={items}
                onChange={handleTabChange}
            />
            <div style={{ marginTop: 16 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default Settings;
