// src/components/teams/StatusCard.tsx
import React from 'react';
import { Card, Col, Row, Space, Tag, Tooltip, Button, Typography, Upload } from 'antd';
import {
    CheckCircleOutlined,
    DownloadOutlined,
    ReloadOutlined,
    SyncOutlined,
    TeamOutlined,
    UndoOutlined,
    UploadOutlined,
    WarningOutlined,
    ApiOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { ConnectionStatus, ConfigStatus, TeamsFolderMapping } from './types';

const { Text } = Typography;

interface StatusCardProps {
    configStatus: {
        status: ConfigStatus;
        color: string;
        text: string;
    };
    teamsEnabled: boolean;
    folderTemplates: TeamsFolderMapping[];
    connectionStatus: ConnectionStatus;
    testingConnection: boolean;
    loading: boolean;
    onTestConnection: () => void;
    onExportConfiguration: () => void;
    onImportConfiguration: (file: File) => boolean;
    onLoadDefault: () => void;
    onReload: () => void;
    onReset: () => void;
}

const getConnectionIcon = (status: ConnectionStatus) => {
    switch (status) {
        case 'success':
            return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        case 'error':
            return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
        default:
            return <ApiOutlined style={{ color: '#d9d9d9' }} />;
    }
};

const StatusCard: React.FC<StatusCardProps> = ({
    configStatus,
    teamsEnabled,
    folderTemplates,
    connectionStatus,
    testingConnection,
    loading,
    onTestConnection,
    onExportConfiguration,
    onImportConfiguration,
    onLoadDefault,
    onReload,
    onReset
}) => {
    return (
        <Card
            style={{
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                marginBottom: 24
            }}
            bodyStyle={{ padding: '20px' }}
        >
            <Row gutter={[24, 16]} align="middle">
                <Col flex="auto">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <SyncOutlined style={{ fontSize: '20px', color: '#7c3aed' }} />
                        <div>
                            <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
                                État de la configuration Teams
                            </Text>
                            <div style={{ marginTop: 4 }}>
                                <Tag color={configStatus.color} style={{ fontWeight: 500 }}>
                                    {configStatus.status === 'complete' && <CheckCircleOutlined />}
                                    {configStatus.status === 'partial' && <WarningOutlined />}
                                    {configStatus.status === 'disabled' && <WarningOutlined />}
                                    {' '}{configStatus.text}
                                </Tag>
                                {teamsEnabled && (
                                    <Tag color="#0078d4" style={{ marginLeft: 8 }}>
                                        <TeamOutlined /> Teams Activé ({folderTemplates.length} templates de dossier)
                                    </Tag>
                                )}
                            </div>
                        </div>
                    </div>
                </Col>
                <Col>
                    <Space wrap>
                        <Tooltip title="Tester la connexion Teams">
                            <Button
                                icon={getConnectionIcon(connectionStatus)}
                                onClick={onTestConnection}
                                loading={testingConnection}
                                disabled={loading || !teamsEnabled}
                                style={{
                                    background: connectionStatus === 'success' ? '#52c41a' : undefined,
                                    borderColor: connectionStatus === 'success' ? '#52c41a' : undefined,
                                    color: connectionStatus === 'success' ? 'white' : undefined
                                }}
                            >
                                Test Connexion
                            </Button>
                        </Tooltip>
                        <Tooltip title="Exporter la configuration">
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={onExportConfiguration}
                                disabled={loading}
                            >
                                Exporter
                            </Button>
                        </Tooltip>
                        <Upload
                            accept=".json"
                            beforeUpload={onImportConfiguration}
                            showUploadList={false}
                        >
                            <Tooltip title="Importer une configuration">
                                <Button
                                    icon={<UploadOutlined />}
                                    disabled={loading}
                                >
                                    Importer
                                </Button>
                            </Tooltip>
                        </Upload>
                        <Tooltip title="Charger la configuration par défaut">
                            <Button
                                icon={<CheckCircleOutlined />}
                                onClick={onLoadDefault}
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
                        <Tooltip title="Actualiser la configuration">
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={onReload}
                                disabled={loading}
                            >
                                Actualiser
                            </Button>
                        </Tooltip>
                        <Tooltip title="Remettre aux valeurs par défaut">
                            <Button
                                icon={<UndoOutlined />}
                                onClick={onReset}
                                disabled={loading}
                                danger
                            >
                                Réinitialiser
                            </Button>
                        </Tooltip>
                    </Space>
                </Col>
            </Row>
        </Card>
    );
};

export default StatusCard;
