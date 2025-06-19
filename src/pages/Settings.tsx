// pages/Settings.tsx
import React from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import {Divider, Typography} from 'antd';
import {ApiOutlined, IdcardOutlined, SettingOutlined, ToolOutlined} from '@ant-design/icons';

const {Title, Text} = Typography;

const Settings: React.FC = () => {
    const location = useLocation();
    const currentTab = location.pathname.split('/').pop() || 'api';

    // Configuration des catégories pour afficher les informations de la page actuelle
    const categories = [
        {
            key: 'api',
            label: 'Paramètres API',
            icon: <ApiOutlined/>,
            description: 'Configuration de l\'API et des services',
            color: '#1e40af'
        },
        {
            key: 'ldap',
            label: 'Configuration LDAP',
            icon: <ToolOutlined/>,
            description: 'Connexion à l\'Active Directory',
            color: '#059669'
        },
        {
            key: 'user-attributes',
            label: 'Attributs Utilisateur',
            icon: <IdcardOutlined/>,
            description: 'Gestion des champs utilisateur',
            color: '#d97706'
        },

    ];

    const currentCategory = categories.find(cat => cat.key === currentTab);

    return (
        <div style={{
            padding: 0,
            background: '#fafbfc',
            height: '100%'
        }}>
            <div style={{padding: '24px'}}>
                {/* En-tête de la section actuelle */}
                {currentCategory && (
                    <div style={{marginBottom: 24}}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                color: currentCategory.color,
                                fontSize: '20px'
                            }}>
                                {currentCategory.icon}
                            </div>
                            <Title level={2} style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: '600',
                                color: '#1f2937'
                            }}>
                                {currentCategory.label}
                            </Title>
                        </div>
                        <Text style={{
                            fontSize: '14px',
                            color: '#6b7280'
                        }}>
                            {currentCategory.description}
                        </Text>
                        <Divider style={{margin: '16px 0'}}/>
                    </div>
                )}

                {/* Contenu principal */}
                <div style={{minHeight: '500px'}}>
                    <Outlet/>
                </div>
            </div>
        </div>
    );
};

export default Settings;
