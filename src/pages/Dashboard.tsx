import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    message,
    Row,
    Space,
    Statistic,
    Tag,
    Typography
} from 'antd';
import { userService } from '../services/api/userService';
import { signalRService } from '../services/api/signalRService';
import { API_CONFIG } from '../services/api/config';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    DashboardOutlined,
    FolderOutlined,
    LinkOutlined,
    SyncOutlined,
    UserOutlined,
    WarningOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface DashboardStats {
    importedAccounts: number;
    ouGroupsCount: number;
    averageProcessingTime: number;
    teamsCreated: number;
    teamsExpected: number;
    lastSyncTime?: string;
    errorCount: number;
    successRate: number;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        importedAccounts: 0,
        ouGroupsCount: 0,
        averageProcessingTime: 0,
        teamsCreated: 0,
        teamsExpected: 0,
        lastSyncTime: undefined,
        errorCount: 0,
        successRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setApiStatus('checking');

                setTimeout(() => {
                    setStats({
                        importedAccounts: 1248,
                        ouGroupsCount: 75,
                        averageProcessingTime: 3.5,
                        teamsCreated: 42,
                        teamsExpected: 50,
                        lastSyncTime: new Date().toISOString(),
                        errorCount: 3,
                        successRate: 97.2
                    });
                    setLoading(false);
                    setApiStatus('connected');
                }, 1000);
            } catch {
                message.error('Impossible de charger les statistiques');
                setLoading(false);
                setApiStatus('disconnected');
            }
        };

        fetchStats();
    }, []);

    useEffect(() => {
        if (!API_CONFIG.ENABLE_SIGNALR) return;

        const connectToStatsHub = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}/health`);
                if (!res.ok) return;

                await signalRService.startConnection('statsHub');
                signalRService.on('statsHub', 'ReceiveStatsUpdate', (updatedStats: DashboardStats) => {
                    setStats(updatedStats);
                });
            } catch {
                // silent fallback
            }
        };

        connectToStatsHub();

        return () => {
            if (API_CONFIG.ENABLE_SIGNALR) {
                signalRService.stopConnection('statsHub').catch(() => {});
            }
        };
    }, []);

    const handleRefreshData = async () => {
        try {
            setApiStatus('checking');
            const users = await userService.getUsers();
            message.success(`Données mises à jour (${users.length} utilisateurs)`);
            setApiStatus('connected');
        } catch {
            message.error('Impossible de récupérer les données');
            setApiStatus('disconnected');
        }
    };

    const formatLastSync = (dateString?: string) => {
        if (!dateString) return 'Jamais';
        return new Date(dateString).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderApiStatus = () => {
        switch (apiStatus) {
            case 'connected':
                return <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 500 }}>Connecté</Tag>;
            case 'disconnected':
                return <Tag color="error" icon={<WarningOutlined />} style={{ fontWeight: 500 }}>Déconnecté</Tag>;
            case 'checking':
                return <Tag color="processing" icon={<SyncOutlined spin />} style={{ fontWeight: 500 }}>Vérification...</Tag>;
        }
    };

    return (
        <div style={{ height: '100%', background: '#fafbfc' }}>
            {/* Barre de statut et actions */}
            <div style={{ 
                padding: '16px 24px', 
                background: '#fff', 
                borderBottom: '1px solid #e8e8e8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Space size="middle">
                    <Text strong>État de la connexion :</Text>
                    {renderApiStatus()}
                    <Text type="secondary">Dernière synchronisation : {formatLastSync(stats.lastSyncTime)}</Text>
                </Space>
                <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    onClick={handleRefreshData}
                    loading={apiStatus === 'checking'}
                    style={{ background: '#1e40af', borderColor: '#1e40af' }}
                >
                    Actualiser
                </Button>
            </div>


            {/* Section des statistiques principales */}
            <Row gutter={[24, 24]} style={{ padding: '24px 24px 0' }}>
                <Col xs={24} sm={12} xl={6}>
                    <Card loading={loading} style={cardStyle}>
                        <Statistic
                            title={<Text style={statTitleStyle}>Comptes importés</Text>}
                            value={stats.importedAccounts}
                            prefix={<UserOutlined style={{ color: '#0078d4' }} />}
                            valueStyle={statValueStyle}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card loading={loading} style={cardStyle}>
                        <Statistic
                            title={<Text style={statTitleStyle}>OUs / Groupes</Text>}
                            value={stats.ouGroupsCount}
                            prefix={<FolderOutlined style={{ color: '#059669' }} />}
                            valueStyle={statValueStyle}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card loading={loading} style={cardStyle}>
                        <Statistic
                            title={<Text style={statTitleStyle}>Temps moyen</Text>}
                            value={stats.averageProcessingTime}
                            suffix="min/compte"
                            precision={1}
                            prefix={<ClockCircleOutlined style={{ color: '#dc2626' }} />}
                            valueStyle={statValueStyle}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card loading={loading} style={cardStyle}>
                        <Statistic
                            title={<Text style={statTitleStyle}>Taux de succès</Text>}
                            value={stats.successRate}
                            suffix="%"
                            precision={1}
                            prefix={<CheckCircleOutlined style={{ color: '#059669' }} />}
                            valueStyle={{
                                ...statValueStyle,
                                color:
                                    stats.successRate >= 95
                                        ? '#059669'
                                        : stats.successRate >= 90
                                            ? '#d97706'
                                            : '#dc2626'
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Section des actions rapides */}
            <div style={{ padding: '0 24px 24px' }}>
                <Row gutter={[20, 20]}>
                    <Col xs={24} lg={8}>
                        <Card title={actionsTitle} style={cardStyle}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Button block size="large" style={actionBtnStyle}>
                                    <UserOutlined /> Gérer les utilisateurs
                                </Button>
                                <Button block size="large" style={actionBtnStyle}>
                                    <FolderOutlined /> Configurer les OUs
                                </Button>
                                <Button block size="large" style={actionBtnStyle}>
                                    <LinkOutlined /> Actions rapides
                                </Button>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

const cardStyle = {
    borderRadius: '12px',
    border: '1px solid #e8e8e8',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
} as const;

const statTitleStyle = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
} as const;

const statValueStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
} as const;

const actionsTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LinkOutlined style={{ color: '#0078d4' }} />
        <span>Actions rapides</span>
    </div>
);

const actionBtnStyle = {
    height: '48px',
    borderRadius: '8px',
    fontWeight: 500,
    border: '1px solid #e8e8e8',
} as const;

export default Dashboard;
