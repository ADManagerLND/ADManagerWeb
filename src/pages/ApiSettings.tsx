// src/pages/ApiSettings.tsx
import React, { useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, Button, message, Spin, Alert } from 'antd';
import { ApiSettings } from '../models/ApplicationSettings';
import { useSettings } from '../hooks/useSettings';
import { ReloadOutlined } from '@ant-design/icons';

const ApiSettingsPage: React.FC = () => {
    const [form] = Form.useForm<ApiSettings>();
    
    // Utiliser notre nouveau hook useSettings
    const { 
        settings, 
        updateSettings,
        resetSettings,
        loading, 
        error,
        reload 
    } = useSettings<ApiSettings>('api');

    // Mettre à jour le formulaire quand les données sont chargées
    useEffect(() => {
        if (settings) {
            form.setFieldsValue(settings);
        }
    }, [settings, form]);

    const onFinish = async (values: ApiSettings) => {
        try {
            const success = await updateSettings(values);
            if (success) {
                message.success('Paramètres API mis à jour avec succès');
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
            const confirmed = window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres API aux valeurs par défaut ?');
            if (confirmed) {
                const success = await resetSettings();
                if (success) {
                    message.success('Paramètres API réinitialisés avec succès');
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
        message.info('Rechargement des paramètres API...');
    };

    return (
        <Card 
            title="Configuration API" 
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
                    description="Impossible de charger les paramètres API. Veuillez réessayer."
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
                        label="URL" 
                        name="apiUrl" 
                        rules={[{ required: true, message: 'Veuillez saisir l\'URL de l\'API' }]}
                        tooltip="URL de base de l'API"
                    >
                        <Input placeholder="https://api.exemple.com" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Version" 
                        name="apiVersion" 
                        rules={[{ required: true, message: 'Veuillez saisir la version de l\'API' }]}
                        tooltip="Version actuelle de l'API"
                    >
                        <Input placeholder="v1.0" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Timeout (ms)" 
                        name="apiTimeout" 
                        rules={[{ required: true, message: 'Veuillez saisir le timeout de l\'API' }]}
                        tooltip="Timeout pour les requêtes API en millisecondes"
                    >
                        <InputNumber min={1000} max={60000} step={1000} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Limite de requêtes par minute" 
                        name="apiRateLimit" 
                        rules={[{ required: true, message: 'Veuillez saisir la limite de requêtes' }]}
                        tooltip="Nombre maximal de requêtes par minute"
                    >
                        <InputNumber min={10} max={1000} step={10} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Journalisation API" 
                        name="enableLogging" 
                        valuePropName="checked"
                        tooltip="Activer la journalisation détaillée des requêtes API"
                    >
                        <Switch />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Langue par défaut" 
                        name="language" 
                        rules={[{ required: true, message: 'Veuillez sélectionner une langue' }]}
                    >
                        <Input placeholder="fr" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Thème" 
                        name="theme" 
                        rules={[{ required: true, message: 'Veuillez sélectionner un thème' }]}
                    >
                        <Input placeholder="light" />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Éléments par page" 
                        name="itemsPerPage" 
                        rules={[{ required: true, message: 'Veuillez saisir le nombre d\'éléments par page' }]}
                    >
                        <InputNumber min={5} max={100} step={5} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item 
                        label="Timeout de session (minutes)" 
                        name="sessionTimeout" 
                        rules={[{ required: true, message: 'Veuillez saisir le timeout de session' }]}
                    >
                        <InputNumber min={5} max={120} step={5} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Enregistrer les modifications
                        </Button>
                    </Form.Item>
                </Form>
            </Spin>
        </Card>
    );
};

export default ApiSettingsPage;
