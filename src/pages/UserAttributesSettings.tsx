// src/pages/UserAttributesSettings.tsx
import React, {useEffect, useState} from 'react';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Form,
    Input,
    List,
    message,
    Modal,
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

// Conversion du modèle Frontend (TS) vers Backend (C#)
const toApiAttribute = (attr: UserAttribute) => ({
    name: attr.name,
    description: attr.description,
    syntax: attr.dataType === 'array' ? 'String[]' : attr.dataType,
    isRequired: attr.isRequired,
});

// Conversion du modèle Backend (C#) vers Frontend (TS)
const fromApiAttribute = (apiAttr: any): UserAttribute => ({
    id: apiAttr.name,
    name: apiAttr.name,
    displayName: apiAttr.displayName || apiAttr.name,
    description: apiAttr.description,
    dataType: apiAttr.syntax === 'String[]' ? 'array' : apiAttr.syntax,
    isRequired: apiAttr.isRequired,
    isEditable: apiAttr.isEditable !== false,
    isVisible: apiAttr.isVisible !== false,
    isSearchable: apiAttr.isSearchable !== false,
});

const UserAttributesSettingsPage: React.FC = () => {
    const [attributes, setAttributes] = useState<UserAttribute[]>([]);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<UserAttribute | null>(null);

    const loadAttributes = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await configService.getUserAttributes();
            if (Array.isArray(data)) {
                setAttributes(data.map(fromApiAttribute));
            } else {
                setAttributes([]);
            }
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

    const saveAllAttributes = async (updatedAttributes: UserAttribute[]) => {
        try {
            setLoading(true);
            const apiAttributes = updatedAttributes.map(toApiAttribute);
            await configService.updateUserAttributes(apiAttributes);
            message.success('Attributs mis à jour avec succès');
            // Recharger pour être sûr d'avoir l'état du serveur
            await loadAttributes();
        } catch (err: any) {
            message.error('Erreur lors de la mise à jour des attributs');
        } finally {
            setLoading(false);
        }
    };
    
    const addAttribute = async (values: any) => {
        const newAttribute: UserAttribute = {
            id: values.name,
            name: values.name,
            displayName: values.displayName || values.name,
            description: values.description || '',
            dataType: values.dataType || 'string',
            isRequired: values.isRequired || false,
            isEditable: values.isEditable !== false,
            isVisible: values.isVisible !== false,
            isSearchable: values.isSearchable !== false,
        };

        const updatedAttributes = [...attributes, newAttribute];
        setAttributes(updatedAttributes);
        await saveAllAttributes(updatedAttributes);
        form.resetFields();
    };

    const removeAttribute = async (id: string) => {
        const updatedAttributes = attributes.filter(attr => attr.id !== id);
        setAttributes(updatedAttributes);
        await saveAllAttributes(updatedAttributes);
    };

    const showEditModal = (attribute: UserAttribute) => {
        setEditingAttribute(attribute);
        form.setFieldsValue(attribute);
        setIsEditModalVisible(true);
    };

    const handleUpdate = async (values: any) => {
        if (!editingAttribute) return;

        const updatedAttribute: UserAttribute = {
            ...editingAttribute,
            ...values,
        };

        const updatedList = attributes.map(attr =>
            attr.id === editingAttribute.id ? updatedAttribute : attr
        );

        setAttributes(updatedList);
        await saveAllAttributes(updatedList);

        setIsEditModalVisible(false);
        setEditingAttribute(null);
        form.resetFields();
    };

    const handleCancel = () => {
        setIsEditModalVisible(false);
        setEditingAttribute(null);
        form.resetFields();
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
                                        saveAllAttributes(DEFAULT_USER_ATTRIBUTES);
                                        message.success('Attributs par défaut chargés et sauvegardés');
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
                        </Space>
                    </Col>
                </Row>
            </Card>

            {error && (
                <Alert
                    message="Erreur"
                    description={error.message}
                    type="error"
                    showIcon
                    style={{marginBottom: '1rem'}}
                />
            )}

            <Row gutter={[24, 24]}>
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
                                                    onClick={() => showEditModal(item)}
                                                    disabled={!item.isEditable}
                                                />
                                            </Tooltip>,
                                            <Popconfirm
                                                title="Supprimer cet attribut ?"
                                                description="Cette action est irréversible."
                                                onConfirm={() => removeAttribute(item.id)}
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
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        </Spin>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card
                        title={
                            <Space>
                                <PlusOutlined/>
                                Ajouter un nouvel attribut
                            </Space>
                        }
                    >
                        <Form form={form} layout="vertical" onFinish={addAttribute}>
                            <Form.Item
                                name="name"
                                label="Nom de l'attribut (LDAP)"
                                rules={[{required: true, message: 'Le nom LDAP est requis'}]}
                            >
                                <Input placeholder="ex: sAMAccountName"/>
                            </Form.Item>
                            <Form.Item name="displayName" label="Nom d'affichage">
                                <Input placeholder="ex: Nom de compte"/>
                            </Form.Item>
                            <Form.Item name="description" label="Description">
                                <Input.TextArea rows={2} placeholder="Description de l'attribut"/>
                            </Form.Item>
                            <Form.Item name="dataType" label="Type de donnée" initialValue="string">
                                <Select>
                                    <Option value="string">Texte (String)</Option>
                                    <Option value="number">Nombre (Number)</Option>
                                    <Option value="boolean">Booléen (Boolean)</Option>
                                    <Option value="date">Date</Option>
                                    <Option value="array">Tableau (Array)</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item>
                                <Space direction="vertical">
                                    <Form.Item name="isRequired" valuePropName="checked" noStyle>
                                        <Switch/>
                                    </Form.Item>
                                    <Text>Est requis pour la création d'un utilisateur</Text>
                                </Space>
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" block loading={loading}>
                                    Ajouter et Sauvegarder
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Modifier l'attribut"
                visible={isEditModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdate}
                    initialValues={editingAttribute || {}}
                >
                    <Form.Item
                        name="name"
                        label="Nom de l'attribut (LDAP)"
                        rules={[{required: true, message: 'Le nom LDAP est requis'}]}
                    >
                        <Input placeholder="ex: sAMAccountName" disabled/>
                    </Form.Item>
                    <Form.Item name="displayName" label="Nom d'affichage">
                        <Input placeholder="ex: Nom de compte"/>
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Description de l'attribut"/>
                    </Form.Item>
                    <Form.Item name="dataType" label="Type de donnée">
                        <Select>
                            <Option value="string">Texte (String)</Option>
                            <Option value="number">Nombre (Number)</Option>
                            <Option value="boolean">Booléen (Boolean)</Option>
                            <Option value="date">Date</Option>
                            <Option value="array">Tableau (Array)</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical">
                            <Form.Item name="isRequired" valuePropName="checked" noStyle>
                                <Switch/>
                            </Form.Item>
                            <Text>Est requis pour la création d'un utilisateur</Text>
                        </Space>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Enregistrer les modifications
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserAttributesSettingsPage;
