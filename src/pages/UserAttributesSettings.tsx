// src/pages/UserAttributesSettings.tsx
import React, {useEffect, useState} from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Form,
    Input,
    List,
    message,
    Popconfirm,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {UserAttribute} from '../models/ApplicationSettings';
import {configService} from '../services/api/configService';

import {
    CheckCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    IdcardOutlined,
    LockOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    SearchOutlined
} from '@ant-design/icons';

const {Text} = Typography;
const {Option} = Select;

const UserAttributesSettingsPage: React.FC = () => {
    const [attributes, setAttributes] = useState<UserAttribute[]>([]);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const loadAttributes = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await configService.getUserAttributes();
            if (Array.isArray(data)) {
                setAttributes(data);
            } else {
                setAttributes([]);
            }
            setHasChanges(false);
        } catch (err: any) {
            setError(err);
            message.error('Erreur lors du chargement des attributs utilisateur');
            setAttributes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttributes();
    }, []);

    const addAttribute = (values: any) => {
        const newAttribute: UserAttribute = {
            id: Date.now().toString(),
            name: values.name,
            displayName: values.displayName || values.name,
            description: values.description || '',
            dataType: values.dataType || 'string',
            isRequired: values.isRequired || false,
            isEditable: values.isEditable !== false,
            isVisible: values.isVisible !== false,
            isSearchable: values.isSearchable !== false
        };

        setAttributes([...attributes, newAttribute]);
        setHasChanges(true);
        form.resetFields();
        message.success('Attribut ajouté avec succès');
    };

    const removeAttribute = (index: number) => {
        const newAttributes = attributes.filter((_, i) => i !== index);
        setAttributes(newAttributes);
        setHasChanges(true);
        message.success('Attribut supprimé');
    };

    const saveAttributes = async () => {
        try {
            setLoading(true);
            await configService.updateUserAttributes(attributes);
            message.success('Attributs utilisateur mis à jour avec succès');
            setHasChanges(false);
            loadAttributes();
        } catch (err: any) {
            message.error('Erreur lors de la mise à jour des attributs utilisateur');
        } finally {
            setLoading(false);
        }
    };

    const handleReload = () => {
        loadAttributes();
        message.info('Rechargement des attributs utilisateur...');
    };

    // Attributs par défaut génériques
    const DEFAULT_USER_ATTRIBUTES: UserAttribute[] = [
        {
            id: "sAMAccountName",
            name: "sAMAccountName",
            displayName: "Nom de compte",
            description: "Identifiant unique pour la connexion au domaine",
            dataType: "string",
            isRequired: true,
            isEditable: true,
            isVisible: true,
            isSearchable: true
        },
        {
            id: "givenName",
            name: "givenName",
            displayName: "Prénom",
            description: "Prénom de l'utilisateur",
            dataType: "string",
            isRequired: true,
            isEditable: true,
            isVisible: true,
            isSearchable: true
        },
        {
            id: "sn",
            name: "sn",
            displayName: "Nom de famille",
            description: "Nom de famille de l'utilisateur",
            dataType: "string",
            isRequired: true,
            isEditable: true,
            isVisible: true,
            isSearchable: true
        },
        {
            id: "mail",
            name: "mail",
            displayName: "Adresse email",
            description: "Adresse de messagerie de l'utilisateur",
            dataType: "string",
            isRequired: false,
            isEditable: true,
            isVisible: true,
            isSearchable: true
        },
        {
            id: "department",
            name: "department",
            displayName: "Département",
            description: "Département ou service de l'utilisateur",
            dataType: "string",
            isRequired: false,
            isEditable: true,
            isVisible: true,
            isSearchable: true
        }
    ];

    const getAttributeStats = () => {
        const total = attributes.length;
        const required = attributes.filter(attr => attr.isRequired).length;
        const searchable = attributes.filter(attr => attr.isSearchable).length;
        const editable = attributes.filter(attr => attr.isEditable).length;

        return {total, required, searchable, editable};
    };

    const stats = getAttributeStats();

    // Utilisation des attributs chargés ou des attributs par défaut
    const dataSource = Array.isArray(attributes) && attributes.length > 0
        ? attributes
        : DEFAULT_USER_ATTRIBUTES;

    const getDataTypeColor = (dataType: string) => {
        switch (dataType) {
            case 'string':
                return '#0078d4';
            case 'number':
                return '#059669';
            case 'boolean':
                return '#d97706';
            case 'date':
                return '#7c3aed';
            case 'array':
                return '#dc2626';
            default:
                return '#6b7280';
        }
    };

    return (
        <div>
            {/* Carte de statistiques */}
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
                            <IdcardOutlined style={{fontSize: '20px', color: '#d97706'}}/>
                            <div>
                                <Text strong style={{fontSize: '16px', color: '#1f2937'}}>
                                    Attributs utilisateur Active Directory
                                </Text>
                                <div style={{marginTop: 4}}>
                                    <Space size="small">
                                        <Tag color="#0078d4">{stats.total} Total</Tag>
                                        <Tag color="#dc2626">{stats.required} Requis</Tag>
                                        <Tag color="#059669">{stats.searchable} Recherchables</Tag>
                                        <Tag color="#d97706">{stats.editable} Éditables</Tag>
                                    </Space>
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <Space>
                            <Tooltip title="Charger les attributs par défaut">
                                <Button
                                    icon={<CheckCircleOutlined/>}
                                    onClick={() => {
                                        setAttributes(DEFAULT_USER_ATTRIBUTES);
                                        setHasChanges(true);
                                        message.success('Attributs par défaut chargés');
                                    }}
                                    disabled={loading}
                                    style={{
                                        background: '#059669',
                                        borderColor: '#059669',
                                        color: 'white'
                                    }}
                                >
                                    Par défaut
                                </Button>
                            </Tooltip>
                            <Button
                                icon={<ReloadOutlined/>}
                                onClick={handleReload}
                                disabled={loading}
                            >
                                Actualiser
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined/>}
                                onClick={saveAttributes}
                                loading={loading}
                                disabled={!hasChanges}
                                style={{
                                    background: hasChanges ? '#d97706' : undefined,
                                    borderColor: hasChanges ? '#d97706' : undefined
                                }}
                            >
                                {hasChanges ? 'Enregistrer' : 'Sauvegardé'}
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Alertes */}
            {error && (
                <Alert
                    message="Erreur de chargement"
                    description="Impossible de charger les attributs utilisateur. Attributs par défaut chargés."
                    type="warning"
                    showIcon
                    style={{marginBottom: 24, borderRadius: '8px'}}
                />
            )}

            {hasChanges && (
                <Alert
                    message="Modifications non sauvegardées"
                    description="N'oubliez pas d'enregistrer vos changements."
                    type="warning"
                    showIcon
                    style={{marginBottom: 24, borderRadius: '8px'}}
                />
            )}

            <Row gutter={[24, 24]}>
                {/* Formulaire d'ajout */}
                <Col xs={24} lg={8}>
                    <Card
                        title={
                            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                <PlusOutlined style={{color: '#d97706'}}/>
                                <span>Ajouter un attribut</span>
                            </div>
                        }
                        style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                        }}
                        bodyStyle={{padding: '24px'}}
                    >
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={addAttribute}
                        >
                            <Form.Item
                                label="Nom technique"
                                name="name"
                                rules={[{required: true, message: 'Nom requis'}]}
                                tooltip="Nom de l'attribut tel qu'il apparaît dans Active Directory"
                            >
                                <Input
                                    placeholder="ex: department"
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Nom d'affichage"
                                name="displayName"
                                tooltip="Nom convivial affiché dans l'interface"
                            >
                                <Input
                                    placeholder="ex: Département"
                                    size="large"
                                />
                            </Form.Item>

                            <Form.Item
                                label="Description"
                                name="description"
                                tooltip="Description détaillée de l'attribut"
                            >
                                <Input.TextArea
                                    placeholder="Description de l'attribut..."
                                    rows={3}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Type de données"
                                name="dataType"
                                initialValue="string"
                            >
                                <Select size="large">
                                    <Option value="string">Texte</Option>
                                    <Option value="number">Nombre</Option>
                                    <Option value="boolean">Booléen</Option>
                                    <Option value="date">Date</Option>
                                    <Option value="array">Tableau</Option>
                                </Select>
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Requis"
                                        name="isRequired"
                                        valuePropName="checked"
                                        tooltip="Attribut obligatoire"
                                    >
                                        <Switch/>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Éditable"
                                        name="isEditable"
                                        valuePropName="checked"
                                        initialValue={true}
                                        tooltip="Peut être modifié"
                                    >
                                        <Switch/>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Visible"
                                        name="isVisible"
                                        valuePropName="checked"
                                        initialValue={true}
                                        tooltip="Affiché dans l'interface"
                                    >
                                        <Switch/>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Recherchable"
                                        name="isSearchable"
                                        valuePropName="checked"
                                        initialValue={true}
                                        tooltip="Utilisable pour la recherche"
                                    >
                                        <Switch/>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<PlusOutlined/>}
                                    size="large"
                                    block
                                    style={{
                                        background: '#d97706',
                                        borderColor: '#d97706'
                                    }}
                                >
                                    Ajouter l'attribut
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                {/* Liste des attributs */}
                <Col xs={24} lg={16}>
                    <Card
                        title={
                            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                <IdcardOutlined style={{color: '#d97706'}}/>
                                <span>Attributs configurés</span>
                                <Badge count={dataSource.length} style={{backgroundColor: '#d97706'}}/>
                            </div>
                        }
                        style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                        }}
                        bodyStyle={{padding: 0}}
                    >
                        <Spin spinning={loading}>
                            <List
                                dataSource={dataSource}
                                renderItem={(item, index) => (
                                    <List.Item
                                        style={{
                                            padding: '20px 24px',
                                            borderBottom: index === dataSource.length - 1 ? 'none' : '1px solid #f0f0f0'
                                        }}
                                        actions={[
                                            <Tooltip title="Éditer l'attribut" key="edit">
                                                <Button
                                                    type="text"
                                                    icon={<EditOutlined/>}
                                                    disabled={!item.isEditable}
                                                />
                                            </Tooltip>,
                                            <Popconfirm
                                                title="Supprimer cet attribut ?"
                                                description="Cette action est irréversible."
                                                onConfirm={() => removeAttribute(index)}
                                                key="delete"
                                            >
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined/>}
                                                    disabled={!item.isEditable || item.isRequired}
                                                />
                                            </Popconfirm>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <Text strong style={{fontSize: '16px'}}>
                                                        {item.displayName || item.name}
                                                    </Text>
                                                    <Tag color={getDataTypeColor(item.dataType)}>
                                                        {item.dataType}
                                                    </Tag>
                                                    {item.isRequired && (
                                                        <Tag color="#dc2626">
                                                            <LockOutlined/> Requis
                                                        </Tag>
                                                    )}
                                                </div>
                                            }
                                            description={
                                                <div style={{marginTop: 8}}>
                                                    <div style={{
                                                        color: '#6b7280',
                                                        marginBottom: 8,
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {item.name}
                                                    </div>
                                                    <div style={{color: '#374151', marginBottom: 8, fontSize: '14px'}}>
                                                        {item.description}
                                                    </div>
                                                    <Space size="small" wrap>
                                                        {item.isVisible && (
                                                            <Tag color="#059669">
                                                                <EyeOutlined/> Visible
                                                            </Tag>
                                                        )}
                                                        {item.isSearchable && (
                                                            <Tag color="#0078d4">
                                                                <SearchOutlined/> Recherchable
                                                            </Tag>
                                                        )}
                                                        {item.isEditable && (
                                                            <Tag color="#7c3aed">
                                                                <EditOutlined/> Éditable
                                                            </Tag>
                                                        )}
                                                    </Space>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        </Spin>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default UserAttributesSettingsPage;
