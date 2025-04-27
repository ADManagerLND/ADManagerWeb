import React from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, SettingOutlined } from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import './App.css';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const items = [
        { key: '/', icon: <DashboardOutlined />, label: 'Tableau de bord' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Paramètres' }
    ];

    return (
        <Layout style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0 }}>
            <Sider collapsible>
                <div style={{ height: 32, margin: 16, background: 'rgba(255,255,255,0.2)' }} />
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout>
                <Header style={{ background: '#fff', padding: 0 }} />
                <Content style={{ padding: '16px' }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
};

export default App;
