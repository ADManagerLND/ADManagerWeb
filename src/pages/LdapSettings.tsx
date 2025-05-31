// src/pages/LdapSettings.tsx
import React, { useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Spin, Alert } from 'antd';
import { LdapSettings } from '../models/ApplicationSettings';
import { useSettings } from '../hooks/useSettings';
import { ReloadOutlined, LockOutlined } from '@ant-design/icons';

const LdapSettingsPage: React.FC = () => {
    const [form] = Form.useForm<LdapSettings>();
    
    // Utiliser notre hook useSettings
    const { 
        settings, 
        updateSettings,
        resetSettings,
        loading, 
        error,
        reload 
    } = useSettings<LdapSettings>('ldap');

    // Mettre à jour le formulaire quand les données sont chargées
    useEffect(() => {
        if (settings) {
            form.setFieldsValue(settings);
        }
    }, [settings, form]);

    const onFinish = async (values: LdapSettings) => {
        try {
            const success = await updateSettings(values);
            if (success) {
                message.success('Paramètres LDAP mis à jour avec succès');
            } else {
                message.error('Erreur lors de la mise à jour des paramètres');
            }
        } catch (err) {
            message.error('Erreur lors de la mise à jour des paramètres');
        }
    };

    // Gérer la réinitialisation des paramètres
    const handleReset = async () => {
        try {
            const confirmed = window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres LDAP aux valeurs par défaut ?');
            if (confirmed) {
                const success = await resetSettings();
                if (success) {
                    message.success('Paramètres LDAP réinitialisés avec succès');
                    form.resetFields();
                } else {
                    message.error('Erreur lors de la réinitialisation des paramètres');
                }
            }
        } catch (err) {
            message.error('Erreur lors de la réinitialisation des paramètres');
        }
    };

    // Gérer le rechargement des paramètres
    const handleReload = () => {
        form.resetFields();
        reload();
        message.info('Rechargement des paramètres LDAP...');
    };

    const handleTest = () => {
        message.info('Test de connexion LDAP en cours...');
        // Implémenter la logique de test LDAP
    };

    return (
        <Card 
            title="Configuration LDAP" 
            extra={
                <Button.Group>
                    <Button 
                        type="default" 
                        onClick={handleReload} 
                        disabled={loading}
                        icon={<ReloadOutlined />}
                    >
                        Actualiser
                    </Button>
                    <Button 
                        type="default" 
                        onClick={handleReset} 
                        disabled={loading}
                        danger
                    >
                        Réinitialiser
                    </Button>
                </Button.Group>
            }
        >
            {error && (
                <Alert
                    message="Erreur de chargement"
                    description="Impossible de charger les paramètres LDAP. Veuillez réessayer."
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            
            <Spin spinning={loading}>
                <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={onFinish}
                    disabled={loading}
                >
                    <Form.Item 
                        label="Serveur LDAP" 
                        name="LdapServer" 
                        rules={[{ required: true, message: 'Veuillez saisir le serveur LDAP' }]}
                        tooltip="Adresse IP ou nom d'hôte du serveur LDAP/AD"
                    >
                        <Input placeholder="ldap.example.com" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Domaine LDAP" 
                        name="LdapDomain" 
                        rules={[{ required: true, message: 'Veuillez saisir le domaine LDAP' }]}
                        tooltip="Domaine LDAP (généralement identique au serveur)"
                    >
                        <Input placeholder="ldap.example.com" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Port" 
                        name="LdapPort" 
                        rules={[{ required: true, message: 'Veuillez saisir le port LDAP' }]}
                        tooltip="Port du serveur LDAP (généralement 389 ou 636 pour LDAPS)"
                    >
                        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Base DN" 
                        name="LdapBaseDn" 
                        rules={[{ required: true, message: 'Veuillez saisir le Base DN' }]}
                        tooltip="DN de base pour les recherches LDAP"
                    >
                        <Input placeholder="DC=example,DC=com" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Nom d'utilisateur" 
                        name="LdapUsername" 
                        rules={[{ required: true, message: 'Veuillez saisir le nom d\'utilisateur' }]}
                        tooltip="Utilisateur avec droits de lecture sur le LDAP"
                    >
                        <Input placeholder="CN=admin,DC=example,DC=com" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Mot de passe" 
                        name="LdapPassword" 
                        rules={[{ required: true, message: 'Veuillez saisir le mot de passe' }]}
                        tooltip="Mot de passe de l'utilisateur LDAP"
                    >
                        <Input.Password 
                            placeholder="Mot de passe" 
                            prefix={<LockOutlined />} 
                        />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Utiliser SSL" 
                        name="LdapSsl" 
                        valuePropName="checked"
                        tooltip="Activer la connexion sécurisée SSL/TLS"
                    >
                        <Switch />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Taille de page" 
                        name="LdapPageSize" 
                        tooltip="Nombre d'entrées à récupérer par page"
                    >
                        <InputNumber min={10} max={1000} step={10} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item>
                        <Button.Group>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Enregistrer les modifications
                            </Button>
                            <Button onClick={handleTest} disabled={loading}>
                                Tester la connexion
                            </Button>
                        </Button.Group>
                    </Form.Item>
                </Form>
            </Spin>
        </Card>
    );
};

export default LdapSettingsPage;
