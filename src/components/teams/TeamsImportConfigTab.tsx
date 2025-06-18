import React, { useState, useEffect } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    Row,
    Select,
    Switch,
    Tag,
    Typography,
    Space,
    Tooltip,
    message
} from 'antd';
import {
    InfoCircleOutlined,
    SaveOutlined,
    TeamOutlined,
    UploadOutlined,
    WarningOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface TeamsImportConfigTabProps {
    teamsEnabled: boolean;
}

const TeamsImportConfigTab: React.FC<TeamsImportConfigTabProps> = ({ teamsEnabled }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Configuration par défaut pour l'intégration Teams dans les imports
    const defaultTeamsImportConfig = {
        enabled: false,
        autoCreateTeamsForOUs: false,
        autoAddUsersToTeams: false,
        defaultTeacherUserId: '',
        teamNamingTemplate: 'Classe {OUName} - Année {Year}',
        teamDescriptionTemplate: 'Équipe collaborative pour la classe {OUName}',
        ouTeacherMappings: {},
        teamSettings: {
            isPublic: false,
            allowMemberCreateUpdateChannels: true,
            allowMemberCreateUpdateApps: true,
            allowMemberDeleteMessages: false,
            allowOwnerDeleteMessages: true,
            allowTeamMentions: true,
            allowChannelMentions: true
        }
    };

    useEffect(() => {
        // Charger la configuration existante
        form.setFieldsValue({
            TeamsIntegration: defaultTeamsImportConfig
        });
    }, [form]);

    const handleSave = async (values: any) => {
        try {
            setLoading(true);
            console.log('Configuration Teams Import sauvegardée:', values);
            message.success('Configuration d\'import Teams mise à jour avec succès');
            setHasChanges(false);
        } catch (error) {
            message.error('Erreur lors de la sauvegarde');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = () => {
        setHasChanges(true);
    };

    const handleReset = () => {
        form.setFieldsValue({
            TeamsIntegration: defaultTeamsImportConfig
        });
        setHasChanges(true);
        message.success('Configuration remise aux valeurs par défaut');
    };

    if (!teamsEnabled) {
        return (
            <Card style={{ borderRadius: '12px' }}>
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <TeamOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
                    <Title level={4} style={{ color: '#999' }}>
                        Intégration Teams désactivée
                    </Title>
                    <Text type="secondary">
                        Activez l'intégration Teams dans l'onglet "Configuration de base" pour accéder à ces paramètres.
                    </Text>
                </div>
            </Card>
        );
    }

    return (
        <div>
            <Alert
                message="Configuration d'import Teams"
                description="Ces paramètres définissent comment Teams sera intégré lors des imports CSV d'utilisateurs."
                type="info"
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 24, borderRadius: '8px' }}
            />

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                onValuesChange={handleFormChange}
                disabled={loading}
            >
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TeamOutlined style={{ color: '#059669' }} />
                            <span>Paramètres d'intégration Teams</span>
                        </div>
                    }
                    style={{ borderRadius: '12px', marginBottom: 24 }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Activer l'intégration lors des imports"
                                name={['TeamsIntegration', 'enabled']}
                                valuePropName="checked"
                                extra="Active automatiquement la création d'équipes Teams lors des imports CSV"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Créer automatiquement les équipes"
                                name={['TeamsIntegration', 'autoCreateTeamsForOUs']}
                                valuePropName="checked"
                                extra="Crée une équipe Teams pour chaque OU détectée"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Ajouter automatiquement les utilisateurs"
                                name={['TeamsIntegration', 'autoAddUsersToTeams']}
                                valuePropName="checked"
                                extra="Ajoute automatiquement les utilisateurs importés aux équipes correspondantes"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="ID enseignant par défaut"
                                name={['TeamsIntegration', 'defaultTeacherUserId']}
                                extra="ID Azure AD de l'enseignant qui sera propriétaire des équipes"
                            >
                                <Input placeholder="fbc8fa70-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UploadOutlined style={{ color: '#1890ff' }} />
                            <span>Templates de nommage</span>
                        </div>
                    }
                    style={{ borderRadius: '12px', marginBottom: 24 }}
                >
                    <Form.Item
                        label="Template nom d'équipe"
                        name={['TeamsIntegration', 'teamNamingTemplate']}
                        extra={
                            <div>
                                Variables disponibles : <Tag>{'{OUName}'}</Tag>, <Tag>{'{Year}'}</Tag>, <Tag>{'{SchoolName}'}</Tag>
                            </div>
                        }
                    >
                        <Input placeholder="Classe {OUName} - Année {Year}" />
                    </Form.Item>

                    <Form.Item
                        label="Template description d'équipe"
                        name={['TeamsIntegration', 'teamDescriptionTemplate']}
                        extra="Description qui sera appliquée aux équipes créées automatiquement"
                    >
                        <TextArea
                            rows={2}
                            placeholder="Équipe collaborative pour la classe {OUName}"
                        />
                    </Form.Item>
                </Card>

                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TeamOutlined style={{ color: '#722ed1' }} />
                            <span>Paramètres des équipes</span>
                        </div>
                    }
                    style={{ borderRadius: '12px', marginBottom: 24 }}
                >
                    <Alert
                        message="Paramètres appliqués aux équipes créées"
                        description="Ces paramètres seront appliqués à toutes les équipes Teams créées automatiquement lors des imports."
                        type="info"
                        style={{ marginBottom: 16 }}
                    />

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                label="Équipes publiques"
                                name={['TeamsIntegration', 'teamSettings', 'isPublic']}
                                valuePropName="checked"
                                extra="Les équipes seront visibles par tous"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Membres peuvent créer des canaux"
                                name={['TeamsIntegration', 'teamSettings', 'allowMemberCreateUpdateChannels']}
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Membres peuvent créer des apps"
                                name={['TeamsIntegration', 'teamSettings', 'allowMemberCreateUpdateApps']}
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                label="Membres peuvent supprimer messages"
                                name={['TeamsIntegration', 'teamSettings', 'allowMemberDeleteMessages']}
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Propriétaires peuvent supprimer messages"
                                name={['TeamsIntegration', 'teamSettings', 'allowOwnerDeleteMessages']}
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label="Mentions d'équipe autorisées"
                                name={['TeamsIntegration', 'teamSettings', 'allowTeamMentions']}
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <WarningOutlined style={{ color: '#d97706' }} />
                            <span>Mappages OU → Enseignant</span>
                        </div>
                    }
                    style={{ borderRadius: '12px', marginBottom: 24 }}
                    extra={
                        <Tooltip title="Fonctionnalité à implémenter">
                            <Button type="dashed" size="small">
                                Gérer les mappages
                            </Button>
                        </Tooltip>
                    }
                >
                    <Alert
                        message="Configuration avancée"
                        description="Cette section permettra de définir quel enseignant sera assigné comme propriétaire pour chaque OU/classe spécifique."
                        type="warning"
                    />
                    
                    <div style={{ marginTop: 16, padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            Exemple de mappage :<br />
                            • OU=6eme → prof6@lycee.nd<br />
                            • OU=5eme → prof5@lycee.nd<br />
                            • OU=4eme → prof4@lycee.nd
                        </Text>
                    </div>
                </Card>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button onClick={handleReset} disabled={loading}>
                        Réinitialiser
                    </Button>
                    <Space>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            icon={<SaveOutlined />}
                            disabled={!hasChanges}
                        >
                            Enregistrer la configuration
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );
};

export default TeamsImportConfigTab;
