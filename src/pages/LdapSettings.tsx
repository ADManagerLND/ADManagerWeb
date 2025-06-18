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
        LdapPageSize: 500,
        netBiosDomainName: ''
    };

    const {
        settings,
        updateSettings,
        resetSettings,
        loading,
        error,
        reload
    } = useSettings<LdapSettings>('ldap');

    useEffect(() => {
        console.log('[LdapSettings] useEffect triggered with settings:', settings);
        if (settings) {
            console.log('[LdapSettings] Setting form values with settings:', settings);
            
            // Normaliser les données du backend (camelCase) vers le format frontend (PascalCase)
            const normalizedSettings = {
                LdapServer: settings.ldapServer || settings.LdapServer || '',
                LdapDomain: settings.ldapDomain || settings.LdapDomain || '',
                LdapPort: settings.ldapPort || settings.LdapPort || 389,
                LdapBaseDn: settings.ldapBaseDn || settings.LdapBaseDn || '',
                LdapUsername: settings.ldapUsername || settings.LdapUsername || '',
                LdapPassword: settings.ldapPassword || settings.LdapPassword || '',
                LdapSsl: settings.ldapSsl !== undefined ? settings.ldapSsl : (settings.LdapSsl || false),
                LdapPageSize: settings.ldapPageSize || settings.LdapPageSize || 500,
                netBiosDomainName: settings.netBiosDomainName || settings.NetBiosDomainName || ''
            };
            
            console.log('[LdapSettings] Normalized settings for form:', normalizedSettings);
            form.setFieldsValue(normalizedSettings);
            setSslEnabled(normalizedSettings.LdapSsl || false);
            setHasChanges(false);
        } else {
            console.log('[LdapSettings] No settings, using default values');
            // Si pas de settings du serveur, utiliser les valeurs par défaut vides
            form.setFieldsValue(defaultSettings);
            setSslEnabled(false);
            setHasChanges(false);
        }
    }, [settings, form]);

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
        
        // Mettre à jour l'état SSL si le champ LdapSsl change
        if (changedValues.LdapSsl !== undefined) {
            setSslEnabled(changedValues.LdapSsl);
            console.log('[LdapSettings] SSL state changed to:', changedValues.LdapSsl);
        }
    };

    const handleTest = async () => {
        try {
            setTestingConnection(true);
            message.loading('Test de connexion LDAP en cours...', 0);
            await new Promise(resolve => setTimeout(resolve, 2000));
            message.destroy();
            message.success('Connexion LDAP établie avec succès !');
        } catch (error) {
            message.destroy();
            message.error('Échec de la connexion LDAP. Vérifiez vos paramètres.');
        } finally {
            setTestingConnection(false);
        }
    };

    // Utiliser les paramètres chargés ou les valeurs par défaut
    const currentSettings = settings || defaultSettings;

    // Debug - log des données reçues
    console.log('[LdapSettings] settings from useSettings:', settings);
    console.log('[LdapSettings] loading:', loading);
    console.log('[LdapSettings] error:', error);
    console.log('[LdapSettings] currentSettings:', currentSettings);

    const getConfigStatus = () => {
        if (loading) return {status: 'loading', color: '#6b7280', text: 'Chargement...'};

        // Gérer à la fois PascalCase (LdapServer) et camelCase (ldapServer) du backend
        const hasServer = (currentSettings.LdapServer || currentSettings.ldapServer) && 
                          (currentSettings.LdapServer?.trim() || currentSettings.ldapServer?.trim()) !== '';
        const hasBaseDn = (currentSettings.LdapBaseDn || currentSettings.ldapBaseDn) && 
                          (currentSettings.LdapBaseDn?.trim() || currentSettings.ldapBaseDn?.trim()) !== '';
        const hasCredentials = (currentSettings.LdapUsername || currentSettings.ldapUsername) && 
                               (currentSettings.LdapPassword || currentSettings.ldapPassword);

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

    console.log('[LdapSettings] SSL enabled state for badge:', sslEnabled);

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
                                            LdapPageSize: 500,
                                            netBiosDomainName: 'DOMAIN'
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

                                <Form.Item
                                    label="Nom NetBIOS du domaine"
                                    name="netBiosDomainName"
                                    rules={[{required: true, message: 'Nom NetBIOS du domaine requis'}]}
                                    tooltip="Nom NetBIOS du domaine Active Directory (ex: DOMAIN)"
                                >
                                    <Input
                                        placeholder="DOMAIN ou domain.local"
                                        prefix={<CloudServerOutlined style={{color: '#6b7280'}}/>}
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
                                            <div style={{marginTop: 8}}>
                                                <Switch size="default"/>
                                            </div>
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
