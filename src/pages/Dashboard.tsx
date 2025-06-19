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
import { systemService, type DashboardStats as SystemDashboardStats } from '../services/api/systemService';
import { API_CONFIG } from '../services/api/config';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
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
    lastSyncTime?: string;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        importedAccounts: 0,
        ouGroupsCount: 0,
        averageProcessingTime: 0,
        teamsCreated: 0,
        lastSyncTime: undefined
    });
    const [loading, setLoading] = useState(true);
    const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setApiStatus('checking');

                console.log('[Dashboard] 📊 Récupération des statistiques du tableau de bord...');
                
                // Récupérer les vraies statistiques du système
                const systemStats = await systemService.getDashboardStats();
                console.log('[Dashboard] ✅ Statistiques système récupérées:', systemStats);

                setStats({
                    importedAccounts: systemStats.importedAccounts,
                    ouGroupsCount: systemStats.ouGroupsCount,
                    averageProcessingTime: systemStats.averageProcessingTime,
                    teamsCreated: systemStats.teamsCreated,
                    lastSyncTime: systemStats.lastSyncTime
                });
                
                setLoading(false);
                setApiStatus('connected');
                
                console.log('[Dashboard] 🎉 Tableau de bord mis à jour avec les vraies données');
            } catch (error) {
                console.error('[Dashboard] ❌ Erreur lors du chargement des statistiques:', error);
                message.error('Impossible de charger les statistiques du système');
                setLoading(false);
                setApiStatus('disconnected');
                
                // Valeurs par défaut en cas d'erreur
                setStats({
                    importedAccounts: 0,
                    ouGroupsCount: 0,
                    averageProcessingTime: 0,
                    teamsCreated: 0,
                    lastSyncTime: undefined
                });
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
            setLoading(true);
            
            console.log('[Dashboard] 🔄 Actualisation des statistiques...');
            
            // Récupérer les nouvelles statistiques
            const systemStats = await systemService.getDashboardStats();
            console.log('[Dashboard] ✅ Nouvelles statistiques récupérées:', systemStats);

                            setStats({
                    importedAccounts: systemStats.importedAccounts,
                    ouGroupsCount: systemStats.ouGroupsCount,
                    averageProcessingTime: systemStats.averageProcessingTime,
                    teamsCreated: systemStats.teamsCreated,
                    lastSyncTime: systemStats.lastSyncTime
                });
            
            message.success(`Données actualisées: ${systemStats.importedAccounts} comptes, ${systemStats.ouGroupsCount} OUs, ${systemStats.teamsCreated} équipes Teams`);
            setApiStatus('connected');
            setLoading(false);
        } catch (error) {
            console.error('[Dashboard] ❌ Erreur lors de l\'actualisation:', error);
            message.error('Impossible d\'actualiser les données');
            setApiStatus('disconnected');
            setLoading(false);
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
        <div style={{ 
            height: '100%', 
            background: '#fafbfc',
            overflow: 'hidden'
        }}>
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

            {/* Contenu principal avec scroll */}
            <div style={{ 
                height: 'calc(100% - 86px)',
                overflow: 'auto',
                padding: '24px'
            }}>
                {/* Section des statistiques principales */}
                <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
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
                                title={<Text style={statTitleStyle}>Teams créées</Text>}
                                value={stats.teamsCreated}
                                prefix={<LinkOutlined style={{ color: '#7c3aed' }} />}
                                valueStyle={{...statValueStyle, color: '#7c3aed'}}
                            />
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



export default Dashboard;
