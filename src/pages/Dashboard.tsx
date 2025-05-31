import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, message, Typography, Tag } from 'antd';
import { userService } from '../services/api/userService';
import { signalRService } from '../services/api/signalRService';
import { UserOutlined, TeamOutlined, ClockCircleOutlined, FolderOutlined, LinkOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface DashboardStats {
    importedAccounts: number;
    ouGroupsCount: number;
    averageProcessingTime: number;
    teamsCreated: number;
    teamsExpected: number;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        importedAccounts: 0,
        ouGroupsCount: 0,
        averageProcessingTime: 0,
        teamsCreated: 0,
        teamsExpected: 0
    });
    const [loading, setLoading] = useState(true);
    const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

    // Charger les statistiques initiales
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setApiStatus('checking');

                // Remplacer par l'appel API réel
                setTimeout(() => {
                    setStats({
                        importedAccounts: 1248,
                        ouGroupsCount: 75,
                        averageProcessingTime: 3.5,
                        teamsCreated: 42,
                        teamsExpected: 50
                    });
                    setLoading(false);
                    setApiStatus('connected');
                }, 1000);
            } catch (error) {
                console.error('Erreur lors du chargement des statistiques:', error);
                message.error('Impossible de charger les statistiques');
                setLoading(false);
                setApiStatus('disconnected');
            }
        };

        fetchStats();
    }, []);

    // Connexion WebSocket pour les mises à jour en temps réel
    useEffect(() => {
        const connectToStatsHub = async () => {
            try {
                await signalRService.startConnection('statsHub');
                signalRService.on('statsHub', 'ReceiveStatsUpdate', (updatedStats: DashboardStats) => {
                    console.log('Mise à jour des statistiques reçue:', updatedStats);
                    setStats(updatedStats);
                });

                console.log('Connecté au hub de statistiques');
            } catch (error) {
                console.error('Erreur lors de la connexion au hub de statistiques:', error);
            }
        };

        connectToStatsHub();

        return () => {
            signalRService.stopConnection('statsHub').catch(error => {
                console.error('Erreur lors de la déconnexion du hub de statistiques:', error);
            });
        };
    }, []);

    // Exemple de fonction pour tester l'envoi d'une requête au serveur
    const handleTestApiCall = async () => {
        try {
            setApiStatus('checking');
            const users = await userService.getUsers();
            console.log('Utilisateurs récupérés:', users);
            message.success(`${users.length} utilisateurs récupérés`);
            setApiStatus('connected');
        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            message.error('Impossible de récupérer les utilisateurs');
            setApiStatus('disconnected');
        }
    };

    // Rendu des badges d'état de l'API
    const renderApiStatus = () => {
        switch (apiStatus) {
            case 'connected':
                return <Tag color="success" icon={<LinkOutlined />}>API Connectée</Tag>;
            case 'disconnected':
                return <Tag color="error" icon={<LinkOutlined />}>API Déconnectée</Tag>;
            case 'checking':
                return <Tag color="processing" icon={<LinkOutlined />}>Vérification de la connexion...</Tag>;
            default:
                return null;
        }
    };

    return (
        <div style={{ padding: 16, margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2}>Vue d'ensemble ADManager</Title>
                {renderApiStatus()}
            </div>
            
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic 
                            title="Comptes importés" 
                            value={stats.importedAccounts}
                            prefix={<UserOutlined />} 
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic 
                            title="OUs / Groupes" 
                            value={stats.ouGroupsCount} 
                            prefix={<FolderOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic 
                            title="Durée moyenne" 
                            value={stats.averageProcessingTime} 
                            suffix="min/compte" 
                            precision={1}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card loading={loading}>
                        <Statistic 
                            title="Teams créées" 
                            value={stats.teamsCreated}
                            prefix={<TeamOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Row style={{ marginTop: 24 }}>
                <Col span={24}>
                    <Card title="Actions">
                        <Button type="primary" onClick={handleTestApiCall} loading={apiStatus === 'checking'}>
                            Rafraîchir les données
                        </Button>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
