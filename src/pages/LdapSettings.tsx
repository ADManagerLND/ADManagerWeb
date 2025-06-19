// src/pages/LdapSettings.tsx
import React, {useEffect, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    message,
    Row,
    Space,
    Spin,
    Switch,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {LdapSettings} from '../models/ApplicationSettings';
import {useSettings} from '../hooks/useSettings';
import activeDirectoryService from '../services/api/activeDirectoryService';

import {
    CheckCircleOutlined,
    CloudServerOutlined,
    DatabaseOutlined,
    LinkOutlined,
    LockOutlined,
    ReloadOutlined,
    SafetyOutlined,
    SaveOutlined,
    ToolOutlined,
    UndoOutlined,
    UserOutlined,
    WarningOutlined
} from '@ant-design/icons';

const {Text} = Typography;

const LdapSettingsPage: React.FC = () => {
    const [form] = Form.useForm<LdapSettings>();
    const [hasChanges, setHasChanges] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [sslEnabled, setSslEnabled] = useState(false);

    // Valeurs par défaut génériques complètes
    const defaultSettings: LdapSettings = {
        LdapServer: '',
        LdapDomain: '',
        LdapPort: 389,
        LdapBaseDn: '',
        LdapUsername: '',
        LdapPassword: '',
        LdapSsl: false,
        LdapPageSize: 500
    };

    const {
        settings,
        updateSettings,
        resetSettings,
        loading,
        error,
        reload
    } = useSettings<any>('ldap');

    useEffect(() => {
        if (settings) {
            // Le backend peut retourner en camelCase ou PascalCase, normaliser vers PascalCase pour le frontend
            const normalizedSettings: LdapSettings = {
                LdapServer: settings.ldapServer || settings.LdapServer || '',
                LdapDomain: settings.ldapDomain || settings.LdapDomain || '',
                LdapPort: settings.ldapPort || settings.LdapPort || 389,
                LdapBaseDn: settings.ldapBaseDn || settings.LdapBaseDn || '',
                LdapUsername: settings.ldapUsername || settings.LdapUsername || '',
                LdapPassword: settings.ldapPassword || settings.LdapPassword || '',
                LdapSsl: Boolean(settings.ldapSsl !== undefined ? settings.ldapSsl : settings.LdapSsl),
                LdapPageSize: settings.ldapPageSize || settings.LdapPageSize || 500
            };
            
            form.setFieldsValue(normalizedSettings);
            setSslEnabled(normalizedSettings.LdapSsl);
            setHasChanges(false);
        } else {
            form.setFieldsValue(defaultSettings);
            setSslEnabled(false);
            setHasChanges(false);
        }
    }, [settings, form]);

    // Surveiller les changements des valeurs du formulaire pour s'assurer que le Switch se met à jour
    useEffect(() => {
        const currentValues = form.getFieldsValue();
        if (currentValues.LdapSsl !== sslEnabled) {
            setSslEnabled(currentValues.LdapSsl);
        }
    }, [form, sslEnabled]);

    const onFinish = async (values: LdapSettings) => {
        try {
            const success = await updateSettings(values);
            if (success) {
                message.success('Paramètres LDAP mis à jour avec succès');
                setHasChanges(false);
            } else {
                message.error('Erreur lors de la mise à jour des paramètres');
            }
        } catch (err) {
            message.error('Erreur lors de la mise à jour des paramètres');
        }
    };

    const handleReset = async () => {
        try {
            const confirmed = window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres LDAP aux valeurs par défaut ?');
            if (confirmed) {
                const success = await resetSettings();
                if (success) {
                    message.success('Paramètres LDAP réinitialisés avec succès');
                    form.resetFields();
                    setHasChanges(false);
                }
            }
        } catch (err) {
            message.error('Erreur lors de la réinitialisation des paramètres');
        }
    };

    const handleReload = () => {
        form.resetFields();
        reload();
        setHasChanges(false);
        message.info('Rechargement des paramètres LDAP...');
    };

    const handleFormChange = (changedValues: any, allValues: any) => {
        setHasChanges(true);
        
        // Mettre à jour l'état SSL basé sur la valeur actuelle du formulaire
        if (changedValues.LdapSsl !== undefined) {
            setSslEnabled(changedValues.LdapSsl);
        } else if (allValues.LdapSsl !== undefined) {
            // S'assurer que l'état SSL reste synchronisé même si ce n'est pas LdapSsl qui a changé
            setSslEnabled(allValues.LdapSsl);
        }
    };

    const handleTest = async () => {
        try {
            setTestingConnection(true);
            message.loading('Test de connexion LDAP en cours...', 0);
            
            const result = await activeDirectoryService.testConnection();
            message.destroy();
            
            if (result.isHealthy) {
                message.success('Connexion LDAP établie avec succès !');
                if (result.details) {
                    console.log('Détails de la connexion LDAP:', result.details);
                }
            } else {
                message.error('Échec de la connexion LDAP. Vérifiez vos paramètres.');
                if (result.details) {
                    console.error('Détails de l\'erreur LDAP:', result.details);
                }
            }
        } catch (error) {
            message.destroy();
            message.error('Erreur lors du test de connexion LDAP.');
            console.error('Erreur test LDAP:', error);
        } finally {
            setTestingConnection(false);
        }
    };

    // Utiliser les paramètres chargés ou les valeurs par défaut
    const currentSettings = settings || defaultSettings;

    // Debug - log des données reçues


    const getConfigStatus = () => {
        if (loading) return {status: 'loading', color: '#6b7280', text: 'Chargement...'};

        if (!settings) return {status: 'incomplete', color: '#dc2626', text: 'Configuration incomplète'};

        // Gérer à la fois PascalCase et camelCase du backend
        const hasServer = (settings.LdapServer || settings.ldapServer) && 
                          (settings.LdapServer?.trim() || settings.ldapServer?.trim()) !== '';
        const hasBaseDn = (settings.LdapBaseDn || settings.ldapBaseDn) && 
                          (settings.LdapBaseDn?.trim() || settings.ldapBaseDn?.trim()) !== '';
        const hasCredentials = (settings.LdapUsername || settings.ldapUsername) && 
                               (settings.LdapPassword || settings.ldapPassword);

        const completedFields = [hasServer, hasBaseDn, hasCredentials].filter(Boolean).length;

        if (completedFields === 3) {
            return {status: 'complete', color: '#059669', text: 'Configuration complète'};
        } else if (completedFields > 0) {
            return {status: 'partial', color: '#d97706', text: `Configuration partielle (${completedFields}/3)`};
        } else {
            return {status: 'incomplete', color: '#dc2626', text: 'Configuration incomplète'};
        }
    };

    const configStatus = getConfigStatus();



    return (
        <div>
            {/* Carte de statut */}
            <Card
                style={{
                    borderRadius: '12px',
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                    marginBottom: 24
                }}
                bodyStyle={{padding: '20px'}}
            >
                <Row gutter={[24, 16]} align="middle">
                    <Col flex="auto">
                        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                            <ToolOutlined style={{fontSize: '20px', color: '#059669'}}/>
                            <div>
                                <Text strong style={{fontSize: '16px', color: '#1f2937'}}>
                                    État de la configuration LDAP
                                </Text>
                                <div style={{marginTop: 4}}>
                                    <Tag color={configStatus.color} style={{fontWeight: 500}}>
                                        {configStatus.status === 'complete' && <CheckCircleOutlined/>}
                                        {configStatus.status === 'partial' && <WarningOutlined/>}
                                        {configStatus.status === 'incomplete' && <WarningOutlined/>}
                                        {' '}{configStatus.text}
                                    </Tag>
                                    {sslEnabled && (
                                        <Tag color="#7c3aed" style={{marginLeft: 8}}>
                                            <SafetyOutlined/> SSL Activé
                                        </Tag>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <Space>
                            <Tooltip title="Charger des valeurs d'exemple">
                                <Button
                                    icon={<CheckCircleOutlined/>}
                                    onClick={() => {
                                        const exampleSettings = {
                                            LdapServer: '192.168.1.100',
                                            LdapDomain: 'domain.local',
                                            LdapPort: 389,
                                            LdapBaseDn: 'DC=domain,DC=local',
                                            LdapUsername: 'admin',
                                            LdapPassword: 'password123',
                                            LdapSsl: false,
                                            LdapPageSize: 500
                                        };
                                        form.setFieldsValue(exampleSettings);
                                        setSslEnabled(exampleSettings.LdapSsl);
                                        setHasChanges(true);
                                        message.success('Valeurs d\'exemple chargées');
                                    }}
                                    disabled={loading}
                                    style={{
                                        background: '#0078d4',
                                        borderColor: '#0078d4',
                                        color: 'white'
                                    }}
                                >
                                    Exemple
                                </Button>
                            </Tooltip>
                            <Tooltip title="Tester la connexion LDAP">
                                <Button
                                    icon={<LinkOutlined/>}
                                    onClick={handleTest}
                                    disabled={loading || testingConnection}
                                    loading={testingConnection}
                                    type="primary"
                                    ghost
                                >
                                    Tester
                                </Button>
                            </Tooltip>
                            <Tooltip title="Actualiser la configuration">
                                <Button
                                    icon={<ReloadOutlined/>}
                                    onClick={handleReload}
                                    disabled={loading}
                                >
                                    Actualiser
                                </Button>
                            </Tooltip>

                            <Tooltip title="Remettre aux valeurs par défaut">
                                <Button
                                    icon={<UndoOutlined/>}
                                    onClick={handleReset}
                                    disabled={loading}
                                    danger
                                >
                                    Réinitialiser
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Alertes */}
            {error && (
                <Alert
                    message="Erreur de chargement"
                    description="Impossible de charger les paramètres LDAP. Utilisation des valeurs par défaut."
                    type="warning"
                    showIcon
                    style={{marginBottom: 24, borderRadius: '8px'}}
                />
            )}

            {hasChanges && (
                <Alert
                    message="Modifications non sauvegardées"
                    description="Vous avez des modifications non sauvegardées. N'oubliez pas d'enregistrer vos changements."
                    type="warning"
                    showIcon
                    style={{marginBottom: 24, borderRadius: '8px'}}
                />
            )}

            <Spin spinning={loading}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    onValuesChange={handleFormChange}
                    disabled={loading}
                    initialValues={defaultSettings}
                >
                    <Row gutter={[24, 0]}>
                        {/* Configuration du serveur */}
                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                        <CloudServerOutlined style={{color: '#059669'}}/>
                                        <span>Configuration du serveur</span>
                                    </div>
                                }
                                style={{
                                    borderRadius: '12px',
                                    border: '1px solid #e8e8e8',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                                    marginBottom: 24
                                }}
                                bodyStyle={{padding: '24px'}}
                            >
                                <Form.Item
                                    label="Serveur LDAP"
                                    name="LdapServer"
                                    rules={[{required: true, message: 'Veuillez saisir le serveur LDAP'}]}
                                    tooltip="Adresse IP ou nom d'hôte du serveur LDAP/Active Directory"
                                >
                                    <Input
                                        placeholder="192.168.1.100 ou domain.local"
                                        prefix={<CloudServerOutlined style={{color: '#6b7280'}}/>}
                                        size="large"
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Domaine LDAP"
                                    name="LdapDomain"
                                    rules={[{required: true, message: 'Veuillez saisir le domaine LDAP'}]}
                                    tooltip="Domaine LDAP"
                                >
                                    <Input
                                        placeholder="domain.local ou exemple.com"
                                        prefix={<DatabaseOutlined style={{color: '#6b7280'}}/>}
                                        size="large"
                                    />
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={16}>
                                        <Form.Item
                                            label="Port LDAP"
                                            name="LdapPort"
                                            rules={[{required: true, message: 'Veuillez saisir le port LDAP'}]}
                                            tooltip="Port du serveur LDAP (389 standard, 636 pour LDAPS)"
                                        >
                                            <InputNumber
                                                min={1}
                                                max={65535}
                                                style={{width: '100%'}}
                                                size="large"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label="SSL/TLS"
                                            name="LdapSsl"
                                            valuePropName="checked"
                                            tooltip="Activer SSL/TLS"
                                        >
                                            <Switch 
                                                size="default"
                                                checked={sslEnabled}
                                                onChange={(checked) => {
                                                    form.setFieldValue('LdapSsl', checked);
                                                    setSslEnabled(checked);
                                                }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item
                                    label="Base DN"
                                    name="LdapBaseDn"
                                    rules={[{required: true, message: 'Veuillez saisir le Base DN'}]}
                                    tooltip="DN de base pour les recherches LDAP"
                                >
                                    <Input
                                        placeholder="DC=domain,DC=local"
                                        prefix={<DatabaseOutlined style={{color: '#6b7280'}}/>}
                                        size="large"
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Taille de page"
                                    name="LdapPageSize"
                                    tooltip="Nombre d'entrées par page"
                                >
                                    <InputNumber
                                        min={10}
                                        max={1000}
                                        step={50}
                                        style={{width: '100%'}}
                                        size="large"
                                    />
                                </Form.Item>
                            </Card>
                        </Col>

                        {/* Authentification */}
                        <Col xs={24} lg={12}>
                            <Card
                                title={
                                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                        <UserOutlined style={{color: '#0078d4'}}/>
                                        <span>Authentification</span>
                                    </div>
                                }
                                style={{
                                    borderRadius: '12px',
                                    border: '1px solid #e8e8e8',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                                    marginBottom: 24
                                }}
                                bodyStyle={{padding: '24px'}}
                            >
                                <Form.Item
                                    label="Nom d'utilisateur"
                                    name="LdapUsername"
                                    rules={[{required: true, message: 'Veuillez saisir le nom d\'utilisateur'}]}
                                    tooltip="Utilisateur avec droits de lecture sur le LDAP"
                                >
                                    <Input
                                        placeholder="admin ou domain\admin"
                                        prefix={<UserOutlined style={{color: '#6b7280'}}/>}
                                        size="large"
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Mot de passe"
                                    name="LdapPassword"
                                    rules={[{required: true, message: 'Veuillez saisir le mot de passe'}]}
                                    tooltip="Mot de passe du compte LDAP"
                                >
                                    <Input.Password
                                        placeholder="Mot de passe"
                                        prefix={<LockOutlined style={{color: '#6b7280'}}/>}
                                        size="large"
                                    />
                                </Form.Item>
                            </Card>
                        </Col>
                    </Row>

                    {/* Actions */}
                    <Card
                        style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                        }}
                        bodyStyle={{padding: '24px'}}
                    >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                                <Text strong style={{fontSize: '16px', color: '#1f2937'}}>
                                    Enregistrer les modifications
                                </Text>
                                <div style={{marginTop: 4}}>
                                    <Text style={{color: '#6b7280', fontSize: '14px'}}>
                                        Les modifications prendront effet immédiatement
                                    </Text>
                                </div>
                            </div>
                            <Space>
                                <Button
                                    icon={<LinkOutlined/>}
                                    onClick={handleTest}
                                    disabled={loading || testingConnection}
                                    loading={testingConnection}
                                    size="large"
                                >
                                    Tester
                                </Button>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    icon={<SaveOutlined/>}
                                    size="large"
                                    style={{
                                        background: hasChanges ? '#059669' : undefined,
                                        borderColor: hasChanges ? '#059669' : undefined
                                    }}
                                    disabled={!hasChanges}
                                >
                                    {hasChanges ? 'Enregistrer' : 'Aucune modification'}
                                </Button>
                            </Space>
                        </div>
                    </Card>
                </Form>
            </Spin>
        </div>
    );
};

export default LdapSettingsPage;
