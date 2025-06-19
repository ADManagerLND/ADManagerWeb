import React, {useState, useMemo} from 'react';
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
    Progress,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Timeline,
    Typography,
    Descriptions,
    Tooltip,
    Empty
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DownloadOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
    SearchOutlined,
    SyncOutlined,
    WarningOutlined,
    PieChartOutlined,
    BarChartOutlined,
    ClockCircleOutlined,
    BugOutlined,
    UserOutlined,
    FolderOutlined,
    EditOutlined
} from '@ant-design/icons';
import {ImportWizardData} from '../../pages/EnhancedCsvImportPage';
import {ActionType, ImportActionResult} from '../../models/CsvImport';
import {getActionDisplay} from '../../services/actionTypeUtils';

const {Text} = Typography;
const {Option} = Select;

interface LogsAndResultsStepProps {
    wizardData: ImportWizardData;
    updateWizardData: (updates: Partial<ImportWizardData>) => void;
    onRestart: () => void;
}

const LogsAndResultsStep: React.FC<LogsAndResultsStepProps> = ({
    wizardData,
    onRestart
}) => {
    const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');
    const [searchText, setSearchText] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'txt'>('csv');
    const [detailsFilter, setDetailsFilter] = useState<'all' | 'success' | 'error'>('all');
    const [selectedActionType, setSelectedActionType] = useState<ActionType | 'all'>('all');

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

    // Statistiques avancées calculées
    const advancedStats = useMemo(() => {
        console.log('[LogsAndResultsStep] === DÉBUT DEBUG ===');
        console.log('[LogsAndResultsStep] wizardData complet:', wizardData);
        console.log('[LogsAndResultsStep] wizardData.importResult:', wizardData.importResult);
        console.log('[LogsAndResultsStep] Type de importResult:', typeof wizardData.importResult);
        console.log('[LogsAndResultsStep] Keys de importResult:', wizardData.importResult ? Object.keys(wizardData.importResult) : 'N/A');
        
        if (!wizardData.importResult) {
            console.log('[LogsAndResultsStep] No importResult found');
            return null;
        }

        const details = wizardData.importResult.details || [];
        const summary = wizardData.importResult.summary;
        console.log('[LogsAndResultsStep] details:', details);
        console.log('[LogsAndResultsStep] details length:', details.length);
        console.log('[LogsAndResultsStep] summary:', summary);
        console.log('[LogsAndResultsStep] Type de summary:', typeof summary);
        console.log('[LogsAndResultsStep] Keys de summary:', summary ? Object.keys(summary) : 'N/A');
        
        // Priorité aux données du summary si elles existent, sinon calculer depuis les détails
        const successCount = summary && (summary.processedCount || summary.createCount || summary.updateCount) 
            ? ((summary.processedCount || 0) - (summary.errorCount || 0)) || ((summary.createCount || 0) + (summary.updateCount || 0) + (summary.moveCount || 0))
            : details.filter(d => d.success).length;
        const errorCount = summary?.errorCount || details.filter(d => !d.success).length;
        const totalCount = summary?.totalObjects || summary?.processedCount || details.length;

        // Statistiques par type d'action (combinant summary + détails)
        const actionTypeStats = details.reduce((stats, detail) => {
            const actionType = detail.actionType;
            if (!stats[actionType]) {
                stats[actionType] = { total: 0, success: 0, error: 0 };
            }
            stats[actionType].total++;
            if (detail.success) {
                stats[actionType].success++;
            } else {
                stats[actionType].error++;
            }
            return stats;
        }, {} as Record<ActionType, { total: number; success: number; error: number }>);
        
        // Enrichir avec les données du summary si les détails sont vides
        if (details.length === 0 && summary) {
            if (summary.createCount && summary.createCount > 0) {
                actionTypeStats['CREATE_USER'] = {
                    total: summary.createCount,
                    success: summary.createCount,
                    error: 0
                };
            }
            if (summary.updateCount && summary.updateCount > 0) {
                actionTypeStats['UPDATE_USER'] = {
                    total: summary.updateCount,
                    success: summary.updateCount,
                    error: 0
                };
            }
            if (summary.moveCount && summary.moveCount > 0) {
                actionTypeStats['MOVE_USER'] = {
                    total: summary.moveCount,
                    success: summary.moveCount,
                    error: 0
                };
            }
        }

        // Erreurs les plus fréquentes
        const errorMessages = details
            .filter(d => !d.success)
            .map(d => d.message)
            .reduce((counts, message) => {
                counts[message] = (counts[message] || 0) + 1;
                return counts;
            }, {} as Record<string, number>);

        const topErrors = Object.entries(errorMessages)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        return {
            totalCount,
            successCount,
            errorCount,
            successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
            actionTypeStats,
            topErrors
        };
    }, [wizardData.importResult]);

    // Filtrer les détails
    const filteredDetails = useMemo(() => {
        if (!wizardData.importResult?.details) return [];
        
        return wizardData.importResult.details.filter(detail => {
            const matchesStatus = detailsFilter === 'all' || 
                (detailsFilter === 'success' && detail.success) ||
                (detailsFilter === 'error' && !detail.success);
            
            const matchesActionType = selectedActionType === 'all' || detail.actionType === selectedActionType;
            
            return matchesStatus && matchesActionType;
        });
    }, [wizardData.importResult?.details, detailsFilter, selectedActionType]);

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

    // Colonnes pour le tableau des résultats détaillés
    const resultColumns = [
        {
            title: 'Type d\'action',
            dataIndex: 'actionType',
            width: 140,
            render: (actionType: ActionType) => {
                const actionDisplay = getActionDisplay(actionType);
                return (
                    <Tag color={actionDisplay.color} style={{ borderRadius: '6px', padding: '2px 8px' }}>
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
            title: 'Objet traité',
            dataIndex: 'objectName',
            ellipsis: { showTitle: false },
            render: (objectName: string) => (
                <Tooltip title={objectName} placement="topLeft">
                    <Text strong style={{ color: '#1890ff' }}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        {objectName}
                    </Text>
                </Tooltip>
            ),
            sorter: (a: ImportActionResult, b: ImportActionResult) =>
                a.objectName.localeCompare(b.objectName)
        },
        {
            title: 'Chemin',
            dataIndex: 'path',
            ellipsis: { showTitle: false },
            render: (path: string) => (
                <Tooltip title={path} placement="topLeft">
                    <Text type="secondary">
                        <FolderOutlined style={{ marginRight: 4 }} />
                        {path}
                    </Text>
                </Tooltip>
            )
        },
        {
            title: 'Statut',
            dataIndex: 'success',
            width: 120,
            align: 'center' as const,
            render: (success: boolean) => (
                <div style={{ textAlign: 'center' }}>
                    <Tag 
                        color={success ? 'success' : 'error'} 
                        icon={success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                        style={{ borderRadius: '6px', fontWeight: 'bold' }}
                    >
                        {success ? 'Succès' : 'Échec'}
                    </Tag>
                </div>
            ),
            filters: [
                {text: '✅ Succès', value: true},
                {text: '❌ Échecs', value: false}
            ],
            onFilter: (value: any, record: ImportActionResult) => record.success === value
        },
        {
            title: 'Message / Erreur',
            dataIndex: 'message',
            ellipsis: { showTitle: false },
            render: (message: string, record: ImportActionResult) => (
                <div style={{ maxWidth: '300px' }}>
                    <Tooltip title={message} placement="topLeft">
                        <Text style={{ 
                            color: record.success ? '#52c41a' : '#ff4d4f',
                            fontWeight: record.success ? 'normal' : 'bold'
                        }}>
                            {message}
                        </Text>
                    </Tooltip>
                    {!record.success && (
                        <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                <BugOutlined style={{ marginRight: 4 }} />
                                <strong>Échec de l'opération</strong>
                            </Text>
                        </div>
                    )}
                </div>
            )
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
        <div style={{ width: '100%' }}>
            <Card 
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <PieChartOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>5. Résultats et rapport final</span>
                    </div>
                }
                style={{ marginBottom: '16px' }}
            >
                <Space direction="vertical" size={20} style={{width: '100%'}}>
                    {/* Résumé global amélioré */}
                    {wizardData.importResult ? (
                        <>
                            {/* En-tête avec statut principal */}
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ 
                                    fontSize: '24px', 
                                    fontWeight: 'bold', 
                                    color: wizardData.importResult.success ? '#52c41a' : '#faad14',
                                    marginBottom: '8px'
                                }}>
                                    {wizardData.importResult.success ? 
                                        'Import terminé avec succès' :
                                        '⚠️ Import terminé avec des problèmes'
                                    }
                                </div>
                                {advancedStats && (
                                    <Progress
                                        type="circle"
                                        percent={Math.round(advancedStats.successRate)}
                                        format={(percent) => `${percent}%`}
                                        strokeColor={{
                                            '0%': '#108ee9',
                                            '100%': '#108ee9',
                                        }}
                                        size={120}
                                        style={{ margin: '16px 0' }}
                                    />
                                )}
                            </div>

                            {/* Statistiques principales */}
                            <Card size="small" title="📊 Vue d'ensemble" style={{ borderLeft: '4px solid #1890ff' }}>
                                <Row gutter={[24, 16]}>
                                    <Col span={6}>
                                        <Statistic
                                            title="Total traité"
                                            value={wizardData.importResult.summary.totalObjects}
                                            prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                                            valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title="Opérations réussies"
                                            value={advancedStats?.successCount || 0}
                                            valueStyle={{color: '#52c41a', fontSize: '24px', fontWeight: 'bold'}}
                                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title="Échecs"
                                            value={advancedStats?.errorCount || 0}
                                            valueStyle={{color: '#ff4d4f', fontSize: '24px', fontWeight: 'bold'}}
                                            prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title="Taux de réussite"
                                            value={advancedStats?.successRate || 0}
                                            suffix="%"
                                            valueStyle={{
                                                color: (advancedStats?.successRate || 0) >= 90 ? '#52c41a' : 
                                                       (advancedStats?.successRate || 0) >= 70 ? '#faad14' : '#ff4d4f',
                                                fontSize: '24px',
                                                fontWeight: 'bold'
                                            }}
                                            prefix={<SyncOutlined />}
                                        />
                                    </Col>
                                </Row>
                            </Card>

                            {/* Statistiques par type d'action */}
                            {advancedStats?.actionTypeStats && Object.keys(advancedStats.actionTypeStats).length > 0 && (
                                <Card size="small" title="🔧 Détail par type d'action" style={{ borderLeft: '4px solid #52c41a' }}>
                                    <Row gutter={[16, 12]}>
                                        {Object.entries(advancedStats.actionTypeStats).map(([actionType, stats]) => {
                                            const actionDisplay = getActionDisplay(actionType as ActionType);
                                            const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
                                            return (
                                                <Col span={8} key={actionType}>
                                                    <Card 
                                                        size="small" 
                                                        style={{ 
                                                            borderRadius: '8px'
                                                        }}
                                                    >
                                                        <div style={{ textAlign: 'center' }}>
                                                            <Tag color={actionDisplay.color} style={{ marginBottom: '8px' }}>
                                                                {actionDisplay.icon} {actionDisplay.name}
                                                            </Tag>
                                                            <div>
                                                                <Text strong style={{ fontSize: '16px' }}>{stats.success}</Text>
                                                                <Text type="secondary">/{stats.total}</Text>
                                                            </div>
                                                            <Progress
                                                                percent={Math.round(successRate)}
                                                                size="small"
                                                                strokeColor={successRate >= 90 ? '#52c41a' : successRate >= 70 ? '#faad14' : '#ff4d4f'}
                                                                showInfo={false}
                                                                style={{ marginTop: '4px' }}
                                                            />
                                                        </div>
                                                    </Card>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </Card>
                            )}

                            {/* Top des erreurs */}
                            {advancedStats?.topErrors && advancedStats.topErrors.length > 0 && (
                                <Card size="small" title="🚨 Erreurs les plus fréquentes" style={{ borderLeft: '4px solid #ff4d4f' }}>
                                    <List
                                        dataSource={advancedStats.topErrors}
                                        renderItem={([message, count]) => (
                                            <List.Item>
                                                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ flex: 1 }}>{message}</Text>
                                                    <Tag color="red">{count} occurrence{count > 1 ? 's' : ''}</Tag>
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                </Card>
                            )}

                            {/* Actions */}
                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <Space size="large">
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<DownloadOutlined/>}
                                        onClick={() => setShowExportModal(true)}
                                    >
                                        Exporter le rapport complet
                                    </Button>
                                    <Button
                                        size="large"
                                        onClick={onRestart}
                                        icon={<ReloadOutlined/>}
                                    >
                                        Nouvel import
                                    </Button>
                                </Space>
                            </div>
                        </>
                    ) : (
                        <Empty 
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <Text strong>Aucun résultat d'import disponible</Text>
                                    <br />
                                    <Text type="secondary">L'import n'a pas encore été exécuté ou les résultats ne sont pas disponibles.</Text>
                                </div>
                            }
                        />
                    )}
                </Space>
            </Card>

            {/* Détails par onglets */}
            {wizardData.importResult && (
                <Card 
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <BarChartOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
                            <span>Analyse détaillée des opérations</span>
                        </div>
                    }
                >
                    <Tabs
                        defaultActiveKey="details"
                        items={[
                            {
                                key: 'details',
                                label: '📋 Détails des actions',
                                children: (
                                    <div style={{padding: '16px 0'}}>
                                        {/* Filtres améliorés */}
                                        <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#fafafa' }}>
                                            <Row gutter={16}>
                                                <Col span={8}>
                                                    <Text strong>Filtrer par statut:</Text>
                                                    <Select
                                                        style={{ width: '100%', marginTop: '4px' }}
                                                        value={detailsFilter}
                                                        onChange={setDetailsFilter}
                                                    >
                                                                                                <Option value="all">🔍 Tous ({filteredDetails.length})</Option>
                                        <Option value="success">✅ Succès ({advancedStats?.successCount || 0})</Option>
                                        <Option value="error">❌ Échecs ({advancedStats?.errorCount || 0})</Option>
                                                    </Select>
                                                </Col>
                                                <Col span={8}>
                                                    <Text strong>Filtrer par type d'action:</Text>
                                                    <Select
                                                        style={{ width: '100%', marginTop: '4px' }}
                                                        value={selectedActionType}
                                                        onChange={setSelectedActionType}
                                                    >
                                                        <Option value="all">Tous les types</Option>
                                                        {Object.keys(advancedStats?.actionTypeStats || {}).map(actionType => {
                                                            const display = getActionDisplay(actionType as ActionType);
                                                            return (
                                                                <Option key={actionType} value={actionType}>
                                                                    {display.icon} {display.name}
                                                                </Option>
                                                            );
                                                        })}
                                                    </Select>
                                                </Col>
                                                <Col span={8} style={{ display: 'flex', alignItems: 'end' }}>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        Affichage: <strong>{filteredDetails.length}</strong> résultat{filteredDetails.length > 1 ? 's' : ''} sur {wizardData.importResult?.details?.length || 0}
                                                    </Text>
                                                </Col>
                                            </Row>
                                        </Card>

                                        {/* Tableau des résultats */}
                                        {filteredDetails.length > 0 ? (
                                            <Table
                                                dataSource={filteredDetails}
                                                columns={resultColumns}
                                                rowKey={(record, index) => `${record.actionType}-${record.objectName}-${index}`}
                                                size="small"
                                                pagination={{
                                                    pageSize: 20, 
                                                    showSizeChanger: true,
                                                    showQuickJumper: true,
                                                    showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} éléments`
                                                }}
                                                scroll={{x: 'max-content'}}
                                                rowClassName={(record) => record.success ? 'success-row' : 'error-row'}
                                            />
                                        ) : (
                                            <Empty 
                                                description={
                                                    advancedStats && advancedStats.totalCount > 0 
                                                        ? `Les détails individuels ne sont pas disponibles, mais l'import a traité ${advancedStats.totalCount} objets avec ${advancedStats.successCount} succès et ${advancedStats.errorCount} échecs.`
                                                        : "Aucun résultat ne correspond aux filtres sélectionnés"
                                                }
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            />
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: 'logs',
                                label: '📝 Journal des opérations',
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
                                                        <Option value="warning">Avertissements ({logStats.warning || 0})</Option>
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
                                label: '📊 Résumé détaillé',
                                children: (
                                    <div style={{padding: '16px 0'}}>
                                        <Space direction="vertical" style={{width: '100%'}}>
                                            <Card size="small" title="ℹ️ Informations sur l'import">
                                                <Descriptions bordered column={2}>
                                                    <Descriptions.Item label="Fichier source">
                                                        {wizardData.selectedFile?.name || 'Non disponible'}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Configuration utilisée">
                                                        {wizardData.selectedConfig?.name || 'Non disponible'}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Date d'import">
                                                        {new Date().toLocaleString()}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Lignes analysées">
                                                        {wizardData.previewData.length || 0}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Temps d'exécution">
                                                        <Text>
                                                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                            Instantané
                                                        </Text>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Taille du fichier">
                                                        {wizardData.selectedFile ? 
                                                            (wizardData.selectedFile.size / 1024).toFixed(1) + ' KB' : 
                                                            'Non disponible'
                                                        }
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </Card>

                                            {wizardData.importResult && (
                                                <Card size="small" title="📈 Détail des opérations par catégorie">
                                                    <Row gutter={[16, 16]}>
                                                        <Col span={8}>
                                                            <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                                                                <Statistic
                                                                    title="👥 Utilisateurs créés"
                                                                    value={wizardData.importResult.summary.createCount}
                                                                    valueStyle={{color: '#52c41a'}}
                                                                    prefix={<UserOutlined />}
                                                                />
                                                            </Card>
                                                        </Col>
                                                        <Col span={8}>
                                                            <Card size="small" style={{ borderLeft: '4px solid #1890ff' }}>
                                                                <Statistic
                                                                    title="✏️ Utilisateurs modifiés"
                                                                    value={wizardData.importResult.summary.updateCount}
                                                                    valueStyle={{color: '#1890ff'}}
                                                                    prefix={<EditOutlined />}
                                                                />
                                                            </Card>
                                                        </Col>
                                                        <Col span={8}>
                                                            <Card size="small" style={{ borderLeft: '4px solid #722ed1' }}>
                                                                <Statistic
                                                                    title="📁 OUs créées"
                                                                    value={wizardData.importResult.summary.createOUCount || 0}
                                                                    valueStyle={{color: '#722ed1'}}
                                                                    prefix={<FolderOutlined />}
                                                                />
                                                            </Card>
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
            )}

            {/* Modal d'export */}
            <Modal
                title="📥 Exporter le rapport d'import"
                open={showExportModal}
                onCancel={() => setShowExportModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowExportModal(false)}>
                        Annuler
                    </Button>,
                    <Button key="export" type="primary" onClick={exportData}>
                        <DownloadOutlined /> Télécharger
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
                            <Option value="csv">📊 CSV - Pour Excel/LibreOffice</Option>
                            <Option value="json">🔧 JSON - Format structuré</Option>
                            <Option value="txt">📄 TXT - Rapport lisible</Option>
                        </Select>
                    </div>

                    <Alert
                        type="info"
                        message="Le rapport contiendra"
                        description={
                            <List
                                size="small"
                                dataSource={[
                                    'Résumé statistique complet de l\'import',
                                    'Détails de chaque action exécutée avec statut',
                                    'Journal complet des opérations avec horodatage',
                                    'Configuration utilisée et informations sur le fichier source',
                                    'Analyse des erreurs et recommandations'
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

            <style>{`
                .success-row {
                    background-color: #f6ffed !important;
                }
                .error-row {
                    background-color: #fff2f0 !important;
                }
            `}</style>
        </div>
    );
};

export default LogsAndResultsStep; 