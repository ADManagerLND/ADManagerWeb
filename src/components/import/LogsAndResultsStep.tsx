// src/components/import/LogsAndResultsStep.tsx
import React, {useState} from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Input,
    List,
    Modal,
    notification,
    Result,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Timeline,
    Typography
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DownloadOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
    SearchOutlined,
    SyncOutlined,
    WarningOutlined
} from '@ant-design/icons';
import {ImportWizardData} from '../../pages/EnhancedCsvImportPage';
import {ActionType, ImportActionResult} from '../../models/CsvImport';
import {getActionDisplay, getActionTypeColor} from '../../services/actionTypeUtils';

const {Title, Text, Paragraph} = Typography;
const {Option} = Select;

interface LogsAndResultsStepProps {
    wizardData: ImportWizardData;
    updateWizardData: (updates: Partial<ImportWizardData>) => void;
    onRestart: () => void;
}

const LogsAndResultsStep: React.FC<LogsAndResultsStepProps> = ({
                                                                   wizardData,
                                                                   updateWizardData,
                                                                   onRestart
                                                               }) => {
    const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');
    const [searchText, setSearchText] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'txt'>('csv');

    // Filtrer les logs
    const filteredLogs = wizardData.logs.filter(log => {
        const logLevel = log.level || 'info';
        const matchesFilter = logFilter === 'all' || logLevel === logFilter;
        const matchesSearch = searchText === '' || (log.message || '').toLowerCase().includes(searchText.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Statistiques des logs
    const logStats = wizardData.logs.reduce((stats, log) => {
        const logLevel = log.level || 'info';
        stats[logLevel] = (stats[logLevel] || 0) + 1;
        return stats;
    }, {} as Record<string, number>);

    // Obtenir l'icône selon le niveau de log
    const getLogIcon = (level: string) => {
        switch (level) {
            case 'success':
                return <CheckCircleOutlined style={{color: '#52c41a'}}/>;
            case 'error':
                return <CloseCircleOutlined style={{color: '#ff4d4f'}}/>;
            case 'warning':
                return <WarningOutlined style={{color: '#faad14'}}/>;
            case 'info':
                return <InfoCircleOutlined style={{color: '#1890ff'}}/>;
            default:
                return <InfoCircleOutlined/>;
        }
    };

    // Note: Utilisation de la fonction utilitaire centralisée getActionTypeColor

    // Colonnes pour le tableau des résultats détaillés
    const resultColumns = [
        {
            title: 'Type',
            dataIndex: 'actionType',
            width: 120,
            render: (actionType: ActionType) => {
                const actionDisplay = getActionDisplay(actionType);
                return (
                    <Tag color={actionDisplay.color}>
                        {actionDisplay.icon} {actionDisplay.name}
                    </Tag>
                );
            },
            filters: Object.values(ActionType).map(type => {
                const display = getActionDisplay(type);
                return {
                    text: `${display.icon} ${display.name}`,
                    value: type
                };
            }),
            onFilter: (value: any, record: ImportActionResult) => record.actionType === value
        },
        {
            title: 'Objet',
            dataIndex: 'objectName',
            ellipsis: true,
            sorter: (a: ImportActionResult, b: ImportActionResult) =>
                a.objectName.localeCompare(b.objectName)
        },
        {
            title: 'Chemin',
            dataIndex: 'path',
            ellipsis: true
        },
        {
            title: 'Statut',
            dataIndex: 'success',
            width: 100,
            render: (success: boolean) => (
                <Tag color={success ? 'success' : 'error'}>
                    {success ? 'Succès' : 'Erreur'}
                </Tag>
            ),
            filters: [
                {text: 'Succès', value: true},
                {text: 'Erreur', value: false}
            ],
            onFilter: (value: any, record: ImportActionResult) => record.success === value
        },
        {
            title: 'Message',
            dataIndex: 'message',
            ellipsis: true
        }
    ];

    // Exporter les données
    const exportData = () => {
        const data = {
            summary: wizardData.importResult?.summary,
            details: wizardData.importResult?.details || [],
            logs: wizardData.logs,
            configuration: wizardData.selectedConfig?.name,
            file: wizardData.selectedFile?.name,
            timestamp: new Date().toISOString()
        };

        let content = '';
        let filename = '';
        let mimeType = '';

        switch (exportFormat) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                filename = `import-report-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
                break;

            case 'csv':
                const headers = ['Type', 'Objet', 'Chemin', 'Statut', 'Message'];
                const csvContent = [
                    headers.join(','),
                    ...(wizardData.importResult?.details || []).map(detail => [
                        detail.actionType,
                        `"${detail.objectName}"`,
                        `"${detail.path || ''}"`,
                        detail.success ? 'Succès' : 'Erreur',
                        `"${detail.message}"`
                    ].join(','))
                ].join('\n');
                content = csvContent;
                filename = `import-report-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
                break;

            case 'txt':
                content = [
                    `Rapport d'import - ${new Date().toLocaleString()}`,
                    '='.repeat(50),
                    `Fichier: ${wizardData.selectedFile?.name}`,
                    `Configuration: ${wizardData.selectedConfig?.name}`,
                    '',
                    'RÉSUMÉ:',
                    `- Total: ${wizardData.importResult?.summary.totalObjects || 0}`,
                    `- Créés: ${wizardData.importResult?.summary.createCount || 0}`,
                    `- Modifiés: ${wizardData.importResult?.summary.updateCount || 0}`,
                    `- Erreurs: ${wizardData.importResult?.summary.errorCount || 0}`,
                    '',
                    'DÉTAILS:',
                    ...(wizardData.importResult?.details || []).map(detail =>
                        `[${detail.success ? 'OK' : 'KO'}] ${detail.actionType} - ${detail.objectName}: ${detail.message}`
                    ),
                    '',
                    'LOGS:',
                    ...wizardData.logs.map(log =>
                        `[${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Heure inconnue'}] ${(log.level || 'info').toString().toUpperCase()}: ${log.message || 'Message non disponible'}`
                    )
                ].join('\n');
                filename = `import-report-${new Date().toISOString().split('T')[0]}.txt`;
                mimeType = 'text/plain';
                break;
        }

        // Télécharger le fichier
        const blob = new Blob([content], {type: mimeType});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setShowExportModal(false);
        notification.success({
            message: 'Export réussi',
            description: `Le rapport a été téléchargé: ${filename}`
        });
    };

    return (
        <Card title="5. Résultats et rapport final" style={{width: '100%'}}>
            <Space direction="vertical" size={16} style={{width: '100%'}}>
                {/* Résumé global */}
                {wizardData.importResult ? (
                    <Result
                        status={wizardData.importResult.success ? "success" : "warning"}
                        title={wizardData.importResult.success ? "Import terminé avec succès" : "Import terminé avec des erreurs"}
                        subTitle={
                            <Row gutter={16} style={{marginTop: 16}}>
                                <Col span={6}>
                                    <Statistic
                                        title="Total traité"
                                        value={wizardData.importResult.summary.totalObjects}
                                        prefix={<FileTextOutlined/>}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Succès"
                                        value={
                                            wizardData.importResult.summary.createCount +
                                            wizardData.importResult.summary.updateCount +
                                            (wizardData.importResult.summary.createOUCount || 0)
                                        }
                                        valueStyle={{color: '#3f8600'}}
                                        prefix={<CheckCircleOutlined/>}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Erreurs"
                                        value={wizardData.importResult.summary.errorCount}
                                        valueStyle={{color: '#cf1322'}}
                                        prefix={<ExclamationCircleOutlined/>}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Taux de succès"
                                        value={
                                            wizardData.importResult.summary.totalObjects > 0
                                                ? Math.round(
                                                    ((wizardData.importResult.summary.totalObjects - wizardData.importResult.summary.errorCount) /
                                                        wizardData.importResult.summary.totalObjects) * 100
                                                )
                                                : 0
                                        }
                                        suffix="%"
                                        valueStyle={{color: '#1890ff'}}
                                        prefix={<SyncOutlined/>}
                                    />
                                </Col>
                            </Row>
                        }
                        extra={[
                            <Button
                                key="export"
                                type="primary"
                                icon={<DownloadOutlined/>}
                                onClick={() => setShowExportModal(true)}
                            >
                                Exporter le rapport
                            </Button>,
                            <Button
                                key="restart"
                                onClick={onRestart}
                                icon={<ReloadOutlined/>}
                            >
                                Nouvel import
                            </Button>
                        ]}
                    />
                ) : (
                    <Alert
                        type="info"
                        message="Aucun résultat d'import"
                        description="L'import n'a pas encore été exécuté ou les résultats ne sont pas disponibles."
                    />
                )}

                {/* Détails par onglets */}
                <Card size="small">
                    <Tabs
                        defaultActiveKey="details"
                        items={[
                            {
                                key: 'details',
                                label: (
                                    <Badge count={wizardData.importResult?.details?.length || 0} showZero>
                                        <span>Détails des actions</span>
                                    </Badge>
                                ),
                                children: (
                                    <div style={{padding: '16px 0'}}>
                                        {wizardData.importResult?.details && wizardData.importResult.details.length > 0 ? (
                                            <Table
                                                dataSource={wizardData.importResult.details}
                                                columns={resultColumns}
                                                rowKey={(record, index) => `${record.actionType}-${record.objectName}-${index}`}
                                                size="small"
                                                pagination={{pageSize: 20, showSizeChanger: true}}
                                                scroll={{x: 'max-content'}}
                                            />
                                        ) : (
                                            <Text type="secondary">Aucun détail d'action disponible</Text>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: 'logs',
                                label: (
                                    <Badge count={wizardData.logs.length} showZero>
                                        <span>Journal des opérations</span>
                                    </Badge>
                                ),
                                children: (
                                    <div style={{padding: '16px 0'}}>
                                        <Space direction="vertical" style={{width: '100%'}}>
                                            {/* Filtres pour les logs */}
                                            <Row gutter={16}>
                                                <Col span={8}>
                                                    <Input
                                                        placeholder="Rechercher dans les logs..."
                                                        prefix={<SearchOutlined/>}
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        allowClear
                                                    />
                                                </Col>
                                                <Col span={8}>
                                                    <Select
                                                        style={{width: '100%'}}
                                                        value={logFilter}
                                                        onChange={setLogFilter}
                                                        placeholder="Filtrer par niveau"
                                                    >
                                                        <Option value="all">Tous les logs ({wizardData.logs.length})</Option>
                                                        <Option value="success">Succès ({logStats.success || 0})</Option>
                                                        <Option value="info">Info ({logStats.info || 0})</Option>
                                                        <Option value="warning">Avertissements
                                                            ({logStats.warning || 0})</Option>
                                                        <Option value="error">Erreurs ({logStats.error || 0})</Option>
                                                    </Select>
                                                </Col>
                                                <Col span={8}>
                                                    <Text type="secondary">
                                                        Affichage: {filteredLogs.length} / {wizardData.logs.length} logs
                                                    </Text>
                                                </Col>
                                            </Row>

                                            {/* Timeline des logs */}
                                            <div>
                                                <Timeline
                                                    mode="left"
                                                    items={filteredLogs.map((log, index) => {
                                                        const logLevel = log.level || 'info';
                                                        return {
                                                            color: logLevel === 'error' ? 'red' :
                                                                logLevel === 'warning' ? 'orange' :
                                                                    logLevel === 'success' ? 'green' : 'blue',
                                                            dot: getLogIcon(logLevel),
                                                            children: (
                                                                <div key={index}>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center'
                                                                    }}>
                                                                        <Text strong style={{
                                                                            color:
                                                                                logLevel === 'error' ? '#ff4d4f' :
                                                                                    logLevel === 'warning' ? '#faad14' :
                                                                                        logLevel === 'success' ? '#52c41a' : '#1890ff'
                                                                        }}>
                                                                            {logLevel.toString().toUpperCase()}
                                                                        </Text>
                                                                        <Text type="secondary" style={{fontSize: '12px'}}>
                                                                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Heure non disponible'}
                                                                        </Text>
                                                                    </div>
                                                                    <div style={{marginTop: 4}}>
                                                                        {log.message || 'Message non disponible'}
                                                                    </div>
                                                                </div>
                                                            )
                                                        };
                                                    })}
                                                />
                                            </div>
                                        </Space>
                                    </div>
                                )
                            },
                            {
                                key: 'summary',
                                label: 'Résumé détaillé',
                                children: (
                                    <div style={{padding: '16px 0'}}>
                                        <Space direction="vertical" style={{width: '100%'}}>
                                            <Card size="small" title="Informations sur l'import">
                                                <Row gutter={[16, 16]}>
                                                    <Col span={12}>
                                                        <Text strong>Fichier source:</Text><br/>
                                                        <Text>{wizardData.selectedFile?.name || 'Non disponible'}</Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text strong>Configuration utilisée:</Text><br/>
                                                        <Text>{wizardData.selectedConfig?.name || 'Non disponible'}</Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text strong>Date d'import:</Text><br/>
                                                        <Text>{new Date().toLocaleString()}</Text>
                                                    </Col>
                                                    <Col span={12}>
                                                        <Text strong>Lignes analysées:</Text><br/>
                                                        <Text>{wizardData.previewData.length || 0}</Text>
                                                    </Col>
                                                </Row>
                                            </Card>

                                            {wizardData.importResult && (
                                                <Card size="small" title="Détail des opérations">
                                                    <Row gutter={[16, 8]}>
                                                        <Col span={8}>
                                                            <Statistic
                                                                title="Utilisateurs créés"
                                                                value={wizardData.importResult.summary.createCount}
                                                                valueStyle={{color: '#52c41a'}}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Statistic
                                                                title="Utilisateurs modifiés"
                                                                value={wizardData.importResult.summary.updateCount}
                                                                valueStyle={{color: '#1890ff'}}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Statistic
                                                                title="OUs créées"
                                                                value={wizardData.importResult.summary.createOUCount || 0}
                                                                valueStyle={{color: '#722ed1'}}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </Card>
                                            )}
                                        </Space>
                                    </div>
                                )
                            }
                        ]}
                    />
                </Card>

                {/* Actions finales */}
                <div style={{textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0'}}>
                    <Space size="large">
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => setShowExportModal(true)}
                            icon={<DownloadOutlined/>}
                        >
                            Exporter le rapport
                        </Button>

                        <Button
                            size="large"
                            onClick={onRestart}
                            icon={<ReloadOutlined/>}
                        >
                            Nouveau fichier
                        </Button>
                    </Space>
                </div>
            </Space>

            {/* Modal d'export */}
            <Modal
                title="Exporter le rapport d'import"
                open={showExportModal}
                onCancel={() => setShowExportModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowExportModal(false)}>
                        Annuler
                    </Button>,
                    <Button key="export" type="primary" onClick={exportData}>
                        Télécharger
                    </Button>
                ]}
            >
                <Space direction="vertical" style={{width: '100%'}}>
                    <div>
                        <Text strong>Format d'export:</Text>
                        <Select
                            style={{width: '100%', marginTop: 8}}
                            value={exportFormat}
                            onChange={setExportFormat}
                        >
                            <Option value="csv">CSV - Pour Excel/LibreOffice</Option>
                            <Option value="json">JSON - Format structuré</Option>
                            <Option value="txt">TXT - Rapport lisible</Option>
                        </Select>
                    </div>

                    <Alert
                        type="info"
                        message="Le rapport contiendra"
                        description={
                            <List
                                size="small"
                                dataSource={[
                                    'Résumé statistique de l\'import',
                                    'Détails de chaque action exécutée',
                                    'Journal complet des opérations',
                                    'Configuration utilisée et fichier source'
                                ]}
                                renderItem={(item) => (
                                    <List.Item>
                                        <Text>• {item}</Text>
                                    </List.Item>
                                )}
                            />
                        }
                    />
                </Space>
            </Modal>
        </Card>
    );
};

export default LogsAndResultsStep;