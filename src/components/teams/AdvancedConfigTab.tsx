// src/components/teams/AdvancedConfigTab.tsx
import React from 'react';
import { Alert, Card, Col, Form, Input, InputNumber, Row, Switch } from 'antd';
import { KeyOutlined, SettingOutlined } from '@ant-design/icons';
import { DEFAULT_AZURE_CONFIG } from './constants';

interface AdvancedConfigTabProps {
    teamsEnabled: boolean;
}

const AdvancedConfigTab: React.FC<AdvancedConfigTabProps> = ({ teamsEnabled }) => {
    if (!teamsEnabled) {
        return null;
    }

    return (
        <Row gutter={[24, 0]}>
            <Col xs={24} lg={12}>
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <SettingOutlined style={{ color: '#d97706' }} />
                            <span>Configuration par défaut Teams</span>
                        </div>
                    }
                    style={{
                        borderRadius: '12px',
                        border: '1px solid #e8e8e8',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        marginBottom: 24
                    }}
                    bodyStyle={{ padding: '24px' }}
                >
                    <Form.Item
                        label="Création automatique d'équipes"
                        name={['defaultTeamsImportConfig', 'autoCreateTeamsForOUs']}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="Ajout automatique d'utilisateurs"
                        name={['defaultTeamsImportConfig', 'autoAddUsersToTeams']}
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="Modèle de nom d'équipe"
                        name={['defaultTeamsImportConfig', 'teamNamingTemplate']}
                        tooltip="Utilisez {OUName} pour le nom de l'OU"
                    >
                        <Input
                            placeholder="Classe {OUName}"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Modèle de description"
                        name={['defaultTeamsImportConfig', 'teamDescriptionTemplate']}
                    >
                        <Input
                            placeholder="Équipe pour la classe {OUName}"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="ID enseignant par défaut"
                        name={['defaultTeamsImportConfig', 'defaultTeacherUserId']}
                        tooltip="GUID de l'utilisateur enseignant par défaut pour les équipes"
                    >
                        <Input
                            placeholder="00000000-0000-0000-0000-000000000000"
                            size="large"
                        />
                    </Form.Item>
                </Card>
            </Col>

            <Col xs={24} lg={12}>
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <KeyOutlined style={{ color: '#059669' }} />
                            <span>API Graph - Paramètres avancés</span>
                        </div>
                    }
                    style={{
                        borderRadius: '12px',
                        border: '1px solid #e8e8e8',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        marginBottom: 24
                    }}
                    bodyStyle={{ padding: '24px' }}
                >
                    <Alert
                        message="Configuration Azure AD"
                        description={`Configuration générique. Client ID: ${DEFAULT_AZURE_CONFIG.clientId.substring(0, 8)}... (non configuré)`}
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16, borderRadius: '8px' }}
                    />

                    <Form.Item
                        label="Timeout API Graph (secondes)"
                        name={['graphApiConfig', 'timeoutSeconds']}
                    >
                        <InputNumber
                            min={10}
                            max={300}
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Nombre max de tentatives"
                        name={['graphApiConfig', 'maxRetryAttempts']}
                    >
                        <InputNumber
                            min={1}
                            max={10}
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Délai entre tentatives (ms)"
                        name={['graphApiConfig', 'retryDelayMs']}
                    >
                        <InputNumber
                            min={1000}
                            max={30000}
                            step={1000}
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Form.Item>
                </Card>
            </Col>
        </Row>
    );
};

export default AdvancedConfigTab;
