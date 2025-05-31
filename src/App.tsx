import React, { useEffect } from 'react';
import { Layout, Menu, Space, message } from 'antd';
import {
    DashboardOutlined,
    SettingOutlined,
    UserOutlined,
    LockOutlined,
    CloudOutlined,
    ToolOutlined,
    IdcardOutlined,
    UploadOutlined,
    ApiOutlined
} from '@ant-design/icons';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MsalAuthenticationTemplate, useMsal } from "@azure/msal-react";
import { InteractionType } from "@azure/msal-browser";
import { loginRequest } from "./authConfig";
import AuthButton from './components/AuthButton';

import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';
import SecuritySettings from './pages/SecuritySettings';
import ApiSettingsPage from './pages/ApiSettings';
import LdapSettingsPage from './pages/LdapSettings';
import UserAttributesSettingsPage from './pages/UserAttributesSettings';
import ImportConfigsSettingsPage from './pages/ImportConfigsSettings';
import CsvImportPage from './pages/CsvImportPage';
import ApiTest from './components/ApiTest';

const { Header, Content, Sider } = Layout;

const App: React.FC = () => {
    return (
        <MsalAuthenticationTemplate 
            interactionType={InteractionType.Redirect}
            authenticationRequest={loginRequest}
        >
            <AppContent />
        </MsalAuthenticationTemplate>
    );
};

const AppContent: React.FC = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { instance } = useMsal();

    useEffect(() => {
        // Vérifier si l'utilisateur est authentifié
        const accounts = instance.getAllAccounts();
        if (accounts.length === 0) {
            // Rediriger vers la page de connexion si non authentifié
            instance.loginRedirect(loginRequest);
        }
    }, [instance]);

    const items = [
        { key: '/', icon: <DashboardOutlined />, label: 'Tableau de bord' },
        { key: '/csv-import', icon: <UploadOutlined />, label: 'Import CSV' },
        {
            key: '/api-test',
            icon: <ApiOutlined />,
            label: 'Test API',
        },
        {
            key: '/settings',
            icon: <SettingOutlined />,
            label: 'Paramètres',
            children: [
                { key: '/settings/profile', icon: <UserOutlined />, label: 'Profil' },
                { key: '/settings/security', icon: <LockOutlined />, label: 'Sécurité' },
                { key: '/settings/api', icon: <CloudOutlined />, label: 'API' },
                { key: '/settings/ldap', icon: <ToolOutlined />, label: 'LDAP' },
                { key: '/settings/user-attributes', icon: <IdcardOutlined />, label: 'Attributs' },
                { key: '/settings/imports', icon: <UploadOutlined />, label: 'Imports' },
            ],
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible>
                <div className="logo" />
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout>
                <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                        <AuthButton />
                    </Space>
                </Header>
                <Content style={{ margin: '16px' }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/csv-import" element={<CsvImportPage />} />
                        <Route path="/api-test" element={<ApiTest />} />
                        <Route path="/settings" element={<Settings />}>
                            <Route index element={<Navigate to="profile" replace />} />
                            <Route path="profile" element={<ProfileSettings />} />
                            <Route path="security" element={<SecuritySettings />} />
                            <Route path="api" element={<ApiSettingsPage />} />
                            <Route path="ldap" element={<LdapSettingsPage />} />
                            <Route path="user-attributes" element={<UserAttributesSettingsPage />} />
                            <Route path="imports" element={<ImportConfigsSettingsPage />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
};

export default App;
