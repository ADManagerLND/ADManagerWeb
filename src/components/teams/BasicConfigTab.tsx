// src/components/teams/BasicConfigTab.tsx
import React from 'react';
import { Card, Col, Form, Input, Row, Select, Switch, Typography } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BasicConfigTabProps {
    teamsEnabled: boolean;
    onTeamsEnabledChange: (enabled: boolean) => void;
}

const BasicConfigTab: React.FC<BasicConfigTabProps> = ({
    teamsEnabled,
    onTeamsEnabledChange
}) => {
    return (
        <Row gutter={[24, 0]}>
            <Col xs={24} lg={12}>
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TeamOutlined style={{ color: '#0078d4' }} />
                            <span>Intégration Microsoft Teams</span>
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
                        label="Activer l'intégration Teams"
                        name={['teamsIntegration', 'enabled']}
                        valuePropName="checked"
                        tooltip="Active la création automatique d'équipes Teams pour les OUs"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Switch
                                size="default"
                                onChange={onTeamsEnabledChange}
                            />
                            <Text style={{ color: '#6b7280', fontSize: '14px' }}>
                                Créer automatiquement les équipes Teams
                            </Text>
                        </div>
                    </Form.Item>

                    {teamsEnabled && (
                        <Form.Item
                            label="OUs exclues"
                            name={['teamsIntegration', 'excludedOUs']}
                            tooltip="Liste des OUs à exclure de la création automatique d'équipes"
                        >
                            <Select
                                mode="tags"
                                placeholder="Ajouter des OUs à exclure"
                                size="large"
                            />
                        </Form.Item>
                    )}
                </Card>
            </Col>
        </Row>
    );
};

export default BasicConfigTab;
