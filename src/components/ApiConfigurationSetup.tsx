import React, { useState } from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    Row,
    Typography,
    Alert,
    Spin,
    Space,
    Divider
} from 'antd';
import {
    ApiOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
    SettingOutlined
} from '@ant-design/icons';
import apiConfigurationService from '../services/apiConfiguration';

const { Title, Text, Paragraph } = Typography;

interface ApiConfigurationSetupProps {
    onConfigured: () => void;
}

interface FormValues {
    host: string;
    port?: string;
}

const ApiConfigurationSetup: React.FC<ApiConfigurationSetupProps> = ({ onConfigured }) => {
    const [form] = Form.useForm<FormValues>();
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'none' | 'testing' | 'success' | 'error'>('none');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleTestConnection = async (values: FormValues) => {
        setIsLoading(true);
        setConnectionStatus('testing');
        setErrorMessage('');

        try {
            const success = await apiConfigurationService.configureApi(values.host, values.port);
            
            if (success) {
                setConnectionStatus('success');
                setTimeout(() => {
                    onConfigured();
                }, 1500);
            } else {
                setConnectionStatus('error');
                setErrorMessage('Impossible de se connecter à l\'API. Vérifiez l\'adresse IP et le port.');
            }
        } catch (error: any) {
            setConnectionStatus('error');
            setErrorMessage(error.message || 'Erreur lors de la connexion à l\'API');
        } finally {
            setIsLoading(false);
        }
    };

    const getConnectionStatusIcon = () => {
        switch (connectionStatus) {
            case 'testing':
                return <Spin size="small" />;
            case 'success':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'error':
                return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
            default:
                return <ApiOutlined style={{ color: '#1890ff' }} />;
        }
    };

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'testing':
                return 'Test de connexion en cours...';
            case 'success':
                return 'Connexion réussie !';
            case 'error':
                return 'Échec de la connexion';
            default:
                return 'En attente de configuration';
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 600,
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <SettingOutlined style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px' }} />
                    <Title level={2} style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                        Configuration Initiale
                    </Title>
                    <Text type="secondary" style={{ fontSize: '16px' }}>
                        Configurez l'adresse IP de votre serveur API
                    </Text>
                </div>

                <Divider />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleTestConnection}
                    autoComplete="off"
                    size="large"
                >
                    <Row gutter={16}>
                        <Col span={18}>
                            <Form.Item
                                label="Adresse IP du serveur API"
                                name="host"
                                rules={[
                                    { required: true, message: 'Veuillez saisir l\'adresse IP' },
                                    {
                                        pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$/,
                                        message: 'Format d\'adresse IP invalide'
                                    }
                                ]}
                                tooltip="Saisissez l'adresse IP du serveur où l'API est hébergée (ex: 192.168.1.100)"
                            >
                                <Input
                                    placeholder="192.168.1.100 ou localhost"
                                    prefix={<ApiOutlined style={{ color: '#6b7280' }} />}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item
                                label="Port"
                                name="port"
                                tooltip="Port du serveur API (par défaut: 5021)"
                            >
                                <Input
                                    placeholder="5021"
                                    type="number"
                                    min="1"
                                    max="65535"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Statut de la connexion */}
                    <Card size="small" style={{ marginBottom: '24px', backgroundColor: '#f8f9fa' }}>
                        <Space align="center">
                            {getConnectionStatusIcon()}
                            <Text strong>{getConnectionStatusText()}</Text>
                        </Space>
                        {connectionStatus === 'success' && (
                            <Paragraph style={{ margin: '8px 0 0 0', color: '#52c41a' }}>
                                ✅ Redirection vers l'application en cours...
                            </Paragraph>
                        )}
                    </Card>

                    {/* Message d'erreur */}
                    {connectionStatus === 'error' && errorMessage && (
                        <Alert
                            message="Erreur de connexion"
                            description={errorMessage}
                            type="error"
                            showIcon
                            style={{ marginBottom: '24px' }}
                            action={
                                <Button size="small" icon={<ReloadOutlined />} onClick={() => setConnectionStatus('none')}>
                                    Réessayer
                                </Button>
                            }
                        />
                    )}

                    {/* Boutons d'action */}
                    <Space style={{ width: '100%', justifyContent: 'center' }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isLoading}
                            disabled={connectionStatus === 'success'}
                            style={{ minWidth: '160px' }}
                        >
                            {isLoading ? 'Test en cours...' : 'Tester & Configurer'}
                        </Button>
                    </Space>
                </Form>

                <Divider />

                <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                        💡 Cette configuration sera sauvegardée localement
                    </Text>
                </div>
            </Card>
        </div>
    );
};

export default ApiConfigurationSetup; 