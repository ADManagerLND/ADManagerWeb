// src/pages/ImportConfigsSettings.tsx
import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
    Switch,
    message,
    Typography,
    Divider,
    Alert,
    Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { configService } from '../services/api/configService';
import { ImportConfig } from '../models/ApplicationSettings';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ImportConfigsSettings: React.FC = () => {
    const [configs, setConfigs] = useState<ImportConfig[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editingConfig, setEditingConfig] = useState<ImportConfig | null>(null);
    const [form] = Form.useForm();

    // Charger les configurations au chargement de la page
    useEffect(() => {
        loadConfigs();
    }, []);

    // Charger les configurations
    const loadConfigs = async () => {
        try {
            setLoading(true);
            setError(null);
            const configs = await configService.getImportConfigs();
            setConfigs(configs);
            console.log('Configurations d\'import chargées:', configs);
        } catch (err: any) {
            console.error('Erreur lors du chargement des configurations:', err);
            setError(err);
            message.error('Erreur lors du chargement des configurations d\'import');
        } finally {
            setLoading(false);
        }
    };

    // Ouvrir le modal pour créer une nouvelle configuration
    const handleAddConfig = () => {
        setEditingConfig(null);
        form.resetFields();
        form.setFieldsValue({
            csvDelimiter: ',', // Valeur par défaut
            createMissingOUs: false, // Valeur par défaut
            headerMapping: '{}'
        });
        setModalVisible(true);
    };

    // Ouvrir le modal pour éditer une configuration existante
    const handleEditConfig = (config: ImportConfig) => {
        setEditingConfig(config);
        form.setFieldsValue({
            name: config.name,
            description: config.description,
            delimiter: config.delimiter,
            hasHeaders: config.hasHeaders,
            skipRows: config.skipRows,
            mapping: JSON.stringify(config.mapping, null, 2)
        });
        setModalVisible(true);
    };

    // Sauvegarder une configuration
    const handleSaveConfig = async (values: any) => {
        try {
            setLoading(true);
            
            // Convertir le mappage de string JSON à objet
            let mapping;
            try {
                mapping = JSON.parse(values.mapping);
            } catch (e) {
                message.error('Format JSON invalide pour le mappage des colonnes');
                setLoading(false);
                return;
            }

            const configData: ImportConfig = {
                id: editingConfig?.id || '',
                name: values.name,
                description: values.description || '',
                delimiter: values.delimiter,
                hasHeaders: values.hasHeaders,
                skipRows: values.skipRows || 0,
                mapping,
                isEnabled: true,
                createdAt: editingConfig?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (editingConfig) {
                // Mettre à jour une configuration existante
                await configService.updateCategorySettings('imports', configs.map(c => 
                    c.id === editingConfig.id ? configData : c
                ));
                message.success('Configuration mise à jour avec succès');
            } else {
                // Créer une nouvelle configuration
                await configService.createImportConfig(configData);
                message.success('Configuration créée avec succès');
            }

            setModalVisible(false);
            loadConfigs(); // Recharger les configurations
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la configuration:', error);
            message.error('Erreur lors de la sauvegarde de la configuration');
        } finally {
            setLoading(false);
        }
    };

    // Supprimer une configuration
    const handleDeleteConfig = async (config: ImportConfig) => {
        Modal.confirm({
            title: 'Confirmer la suppression',
            content: `Êtes-vous sûr de vouloir supprimer la configuration "${config.name}" ?`,
            okText: 'Supprimer',
            okType: 'danger',
            cancelText: 'Annuler',
            onOk: async () => {
                try {
                    setLoading(true);
                    await configService.deleteImportConfig(config.id);
                    message.success('Configuration supprimée avec succès');
                    loadConfigs(); // Recharger les configurations
                } catch (error) {
                    console.error('Erreur lors de la suppression de la configuration:', error);
                    message.error('Erreur lors de la suppression de la configuration');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // Colonnes pour la table des configurations
    const columns = [
        {
            title: 'Nom',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Délimiteur',
            dataIndex: 'delimiter',
            key: 'delimiter',
        },
        {
            title: 'En-têtes',
            dataIndex: 'hasHeaders',
            key: 'hasHeaders',
            render: (hasHeaders: boolean) => (
                hasHeaders ? 'Oui' : 'Non'
            )
        },
        {
            title: 'Ignorer lignes',
            dataIndex: 'skipRows',
            key: 'skipRows',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: ImportConfig) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEditConfig(record)}
                    >
                        Modifier
                    </Button>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteConfig(record)}
                    >
                        Supprimer
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <Card 
            title="Gestion des configurations d'importation CSV" 
            extra={
                <Button 
                    icon={<ReloadOutlined />} 
                    onClick={loadConfigs}
                    disabled={loading}
                >
                    Actualiser
                </Button>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4}>Configurations disponibles</Title>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddConfig}
                        disabled={loading}
                    >
                        Nouvelle configuration
                    </Button>
                </div>

                {error && (
                    <Alert
                        message="Erreur de chargement"
                        description="Impossible de charger les configurations d'import. Veuillez réessayer."
                        type="error"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Spin spinning={loading}>
                    {configs.length === 0 && !loading ? (
                        <Alert
                            message="Aucune configuration disponible"
                            description="Créez une nouvelle configuration en cliquant sur le bouton ci-dessus."
                            type="info"
                            showIcon
                        />
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={configs}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                        />
                    )}
                </Spin>
            </Space>

            {/* Modal pour créer/éditer une configuration */}
            <Modal
                title={editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveConfig}
                >
                    <Form.Item
                        name="name"
                        label="Nom"
                        rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
                    >
                        <Input placeholder="Nom de la configuration" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <TextArea rows={2} placeholder="Description de la configuration" />
                    </Form.Item>

                    <Form.Item
                        name="delimiter"
                        label="Délimiteur CSV"
                        rules={[{ required: true, message: 'Veuillez saisir un délimiteur' }]}
                    >
                        <Select placeholder="Sélectionnez un délimiteur">
                            <Option value=",">Virgule (,)</Option>
                            <Option value=";">Point-virgule (;)</Option>
                            <Option value="\t">Tabulation (\\t)</Option>
                            <Option value="|">Pipe (|)</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="hasHeaders"
                        label="Le fichier contient des en-têtes"
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        name="skipRows"
                        label="Ignorer les premières lignes"
                        initialValue={0}
                    >
                        <Input type="number" min={0} placeholder="0" />
                    </Form.Item>

                    <Divider>Mappage des colonnes</Divider>

                    <Form.Item
                        name="mapping"
                        label="Mappage des colonnes (format JSON)"
                        rules={[
                            { required: true, message: 'Veuillez saisir un mappage' },
                            {
                                validator: async (_, value) => {
                                    try {
                                        JSON.parse(value);
                                    } catch (e) {
                                        throw new Error('Format JSON invalide');
                                    }
                                }
                            }
                        ]}
                        help="Exemple: {'0': 'sAMAccountName', '1': 'mail', '2': 'displayName'}"
                    >
                        <TextArea rows={6} placeholder='{"colonne_csv": "attribut_ad", ...}' />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {editingConfig ? 'Mettre à jour' : 'Créer'}
                            </Button>
                            <Button onClick={() => setModalVisible(false)}>
                                Annuler
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ImportConfigsSettings;
