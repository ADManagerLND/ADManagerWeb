// src/pages/UserAttributesSettings.tsx
import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Checkbox, Button, Space, List, message, Spin, Alert } from 'antd';
import { UserAttribute } from '../models/ApplicationSettings';
import { configService } from '../services/api/configService';

const UserAttributesSettingsPage: React.FC = () => {
    const [attributes, setAttributes] = useState<UserAttribute[]>([]);
    const [form] = Form.useForm<{ name: string; displayName: string; description: string; dataType: string; isRequired: boolean }>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadAttributes = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await configService.getUserAttributes();
            setAttributes(data);
        } catch (err: any) {
            console.error('Erreur lors du chargement des attributs utilisateur:', err);
            setError(err);
            message.error('Erreur lors du chargement des attributs utilisateur');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttributes();
    }, []);

    const addAttribute = (values: any) => {
        const newAttribute: UserAttribute = {
            id: Date.now().toString(), // ID temporaire jusqu'à l'enregistrement
            name: values.name,
            displayName: values.displayName || values.name,
            description: values.description || '',
            dataType: values.dataType || 'string',
            isRequired: values.isRequired || false,
            isEditable: true,
            isVisible: true,
            isSearchable: true
        };
        
        setAttributes([...attributes, newAttribute]);
        form.resetFields();
    };

    const saveAttributes = async () => {
        try {
            setLoading(true);
            await configService.updateUserAttributes(attributes);
            message.success('Attributs utilisateur mis à jour avec succès');
            // Recharger les attributs pour obtenir les IDs corrects du serveur
            loadAttributes();
        } catch (err: any) {
            console.error('Erreur lors de la mise à jour des attributs utilisateur:', err);
            message.error('Erreur lors de la mise à jour des attributs utilisateur');
        } finally {
            setLoading(false);
        }
    };

    const handleReload = () => {
        loadAttributes();
        message.info('Rechargement des attributs utilisateur...');
    };

    return (
        <Card
            title="Attributs Utilisateur"
            extra={
                <Space>
                    <Button onClick={handleReload} disabled={loading}>
                        Actualiser
                    </Button>
                    <Button type="primary" onClick={saveAttributes} loading={loading}>
                        Enregistrer
                    </Button>
                </Space>
            }
        >
            {error && (
                <Alert
                    message="Erreur de chargement"
                    description="Impossible de charger les attributs utilisateur. Veuillez réessayer."
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            
            <Spin spinning={loading}>
                <Form 
                    form={form} 
                    layout="inline" 
                    onFinish={addAttribute}
                    style={{ marginBottom: 16 }}
                >
                    <Form.Item 
                        name="name" 
                        rules={[{ required: true, message: 'Nom requis' }]}
                    >
                        <Input placeholder="Nom technique (ex: mail)" />
                    </Form.Item>
                    
                    <Form.Item 
                        name="displayName"
                    >
                        <Input placeholder="Nom d'affichage (ex: Adresse email)" />
                    </Form.Item>
                    
                    <Form.Item 
                        name="description"
                    >
                        <Input placeholder="Description" />
                    </Form.Item>
                    
                    <Form.Item 
                        name="dataType"
                    >
                        <Input placeholder="Type (string, number, boolean, date, array)" />
                    </Form.Item>
                    
                    <Form.Item 
                        name="isRequired" 
                        valuePropName="checked"
                    >
                        <Checkbox>Requis</Checkbox>
                    </Form.Item>
                    
                    <Form.Item>
                        <Button type="default" htmlType="submit">
                            Ajouter
                        </Button>
                    </Form.Item>
                </Form>

                <List
                    bordered
                    dataSource={attributes}
                    renderItem={(item, idx) => (
                        <List.Item
                            actions={[
                                <Button
                                    type="link"
                                    danger
                                    onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))}
                                >
                                    Supprimer
                                </Button>,
                            ]}
                        >
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>{item.displayName || item.name}</strong>
                                    <span style={{ color: '#999' }}>
                                        {item.dataType || 'string'} 
                                        {item.isRequired && <span style={{ color: '#ff4d4f', marginLeft: 8 }}>Requis</span>}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#666' }}>{item.name}</span>
                                    <Space>
                                        {item.isSearchable && <span style={{ color: '#108ee9' }}>Recherchable</span>}
                                        {item.isEditable && <span style={{ color: '#108ee9' }}>Éditable</span>}
                                    </Space>
                                </div>
                                {item.description && <div style={{ color: '#888' }}>{item.description}</div>}
                            </Space>
                        </List.Item>
                    )}
                />
            </Spin>
        </Card>
    );
};

export default UserAttributesSettingsPage;
