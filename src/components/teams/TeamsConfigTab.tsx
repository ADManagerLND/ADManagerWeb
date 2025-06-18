import React from 'react';
import {
    Alert,
    Card,
    Col,
    Form,
    Input,
    Row,
    Switch,
    Tag,
    Typography,
} from 'antd';
import {
    InfoCircleOutlined,
    TeamOutlined,
    UploadOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface TeamsConfigTabProps {
    // Pas de props spéciales nécessaires car c'est directement intégré dans le formulaire
}

const TeamsConfigTab: React.FC<TeamsConfigTabProps> = () => {
    return (
        <div>
            <Alert
                message="Configuration Teams pour les imports"
                description="Ces paramètres définissent comment Teams sera intégré lors des imports CSV d'utilisateurs."
                type="info"
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 24, borderRadius: '8px' }}
            />

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
                            label="Activer l'intégration Teams"
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
                style={{ borderRadius: '12px' }}
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
                    extra={
                        <div>
                            Variables disponibles : <Tag>{'{OUName}'}</Tag>, <Tag>{'{Year}'}</Tag>, <Tag>{'{SchoolName}'}</Tag>
                        </div>
                    }
                >
                    <TextArea 
                        rows={3} 
                        placeholder="Équipe collaborative pour la classe {OUName}" 
                    />
                </Form.Item>
            </Card>
        </div>
    );
};

export default TeamsConfigTab; 