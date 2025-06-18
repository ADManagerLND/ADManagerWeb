// src/pages/ApiSettings.tsx
import React, {useEffect, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Form,
    Input,
    message,
    Row,
    Space,
    Tag,
    Typography
} from 'antd';
import apiConfigurationService from '../services/apiConfiguration';
import {
    ApiOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    SettingOutlined,
    UndoOutlined,
    WifiOutlined
} from '@ant-design/icons';

const {Text} = Typography;

const ApiSettingsPage: React.FC = () => {
    const [apiConfigForm] = Form.useForm();
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'none' | 'testing' | 'success' | 'error'>('none');
    const [currentApiUrl, setCurrentApiUrl] = useState<string | null>(null);

    // Charger la configuration API actuelle
    useEffect(() => {
        const currentUrl = apiConfigurationService.getBaseUrl();
        setCurrentApiUrl(currentUrl);
        if (currentUrl) {
            // Extraire l'host et le port de l'URL
            try {
                const url = new URL(currentUrl);
                const host = url.hostname;
                const port = url.port || '5021';
                apiConfigForm.setFieldsValue({ host, port });
            } catch (error) {
                console.error('Erreur lors du parsing de l\'URL API:', error);
            }
        }
    }, [apiConfigForm]);

    // Tester et configurer l'API
    const handleConfigureApi = async (values: { host: string; port?: string }) => {
        setIsTestingConnection(true);
        setConnectionStatus('testing');

        try {
            const success = await apiConfigurationService.configureApi(values.host, values.port);
            
            if (success) {
                setConnectionStatus('success');
                const newUrl = apiConfigurationService.getBaseUrl();
                setCurrentApiUrl(newUrl);
                message.success('Configuration API mise à jour avec succès !');
                
                // Demander si l'utilisateur veut recharger la page
                setTimeout(() => {
                    const shouldReload = window.confirm(
                        'La configuration API a été mise à jour. Voulez-vous recharger la page pour appliquer les changements ?'
                    );
                    if (shouldReload) {
                        window.location.reload();
                    }
                }, 1000);
            } else {
                setConnectionStatus('error');
                message.error('Impossible de se connecter à l\'API avec ces paramètres');
            }
        } catch (error: any) {
            setConnectionStatus('error');
            message.error(error.message || 'Erreur lors de la configuration de l\'API');
        } finally {
            setIsTestingConnection(false);
        }
    };

    // Réinitialiser la configuration API
    const handleResetApiConfig = () => {
        const confirmed = window.confirm(
            'Êtes-vous sûr de vouloir réinitialiser la configuration API ? Vous devrez reconfigurer l\'adresse IP.'
        );
        
        if (confirmed) {
            apiConfigurationService.resetConfiguration();
            setCurrentApiUrl(null);
            apiConfigForm.resetFields();
            message.info('Configuration API réinitialisée. Rechargement de la page...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    };



    return (
        <div>
            {/* En-tête de la page */}
            <Card
                style={{
                    borderRadius: '12px',
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                    marginBottom: 24
                }}
                bodyStyle={{padding: '20px'}}
            >
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <ApiOutlined style={{fontSize: '20px', color: '#0078d4'}}/>
                    <div>
                        <Text strong style={{fontSize: '16px', color: '#1f2937'}}>
                            Configuration du Serveur API
                        </Text>
                        <div style={{marginTop: 4}}>
                            <Tag color={currentApiUrl ? 'green' : 'orange'} style={{fontWeight: 500}}>
                                {currentApiUrl ? '✅ Configuré' : '⚠️ Configuration requise'}
                            </Tag>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Configuration IP de l'API */}
            <Card
                title={
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <WifiOutlined style={{color: '#0078d4'}}/>
                        <span>Configuration du Serveur API</span>
                    </div>
                }
                extra={
                    <Space>
                        <Tag color={currentApiUrl ? 'green' : 'orange'}>
                            {currentApiUrl ? 'Configuré' : 'Non configuré'}
                        </Tag>
                        {currentApiUrl && (
                            <Button 
                                size="small" 
                                danger 
                                onClick={handleResetApiConfig}
                                icon={<UndoOutlined/>}
                            >
                                Réinitialiser
                            </Button>
                        )}
                    </Space>
                }
                style={{
                    borderRadius: '12px',
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                    marginBottom: 24
                }}
                bodyStyle={{padding: '24px'}}
            >
                {currentApiUrl && (
                    <Alert
                        message="Serveur API configuré"
                        description={`URL actuelle: ${currentApiUrl}`}
                        type="success"
                        showIcon
                        style={{marginBottom: 16}}
                    />
                )}

                <Form
                    form={apiConfigForm}
                    layout="vertical"
                    onFinish={handleConfigureApi}
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
                                tooltip="Adresse IP du serveur où l'API est hébergée"
                            >
                                <Input
                                    placeholder="192.168.1.100 ou localhost"
                                    prefix={<SettingOutlined style={{ color: '#6b7280' }} />}
                                    size="large"
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
                                    size="large"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row>
                        <Col span={24}>
                            <Space>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={isTestingConnection}
                                    disabled={connectionStatus === 'success'}
                                    icon={connectionStatus === 'success' ? <CheckCircleOutlined/> : <WifiOutlined/>}
                                >
                                    {isTestingConnection ? 'Test en cours...' : 
                                     connectionStatus === 'success' ? 'Connexion réussie' : 
                                     'Tester & Configurer'}
                                </Button>
                                
                                {connectionStatus === 'error' && (
                                    <Button 
                                        onClick={() => setConnectionStatus('none')}
                                        icon={<ReloadOutlined/>}
                                    >
                                        Réessayer
                                    </Button>
                                )}
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </Card>


        </div>
    );
};

export default ApiSettingsPage;
