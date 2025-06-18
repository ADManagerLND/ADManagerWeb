// src/components/import/ImportExecutionStep.tsx
import React, {useEffect, useRef, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    List,
    Modal,
    notification,
    Progress,
    Row,
    Space,
    Spin,
    Statistic,
    Tag,
    Typography
} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    PlayCircleOutlined,
    SyncOutlined
} from '@ant-design/icons';
import {ImportWizardData} from '../../pages/EnhancedCsvImportPage';
import {ActionType} from '../../models/CsvImport';
import {CsvImportServiceInterface} from '../../services/csvImportService';
import {getActionDisplay} from '../../services/actionTypeUtils';

const {Title, Text, Paragraph} = Typography;

interface ImportExecutionStepProps {
    wizardData: ImportWizardData;
    updateWizardData: (updates: Partial<ImportWizardData>) => void;
    onNext: () => void;
    onPrev: () => void;
    csvImportService: CsvImportServiceInterface;
}

const ImportExecutionStep: React.FC<ImportExecutionStepProps> = ({
                                                                     wizardData,
                                                                     updateWizardData,
                                                                     onNext,
                                                                     onPrev,
                                                                     csvImportService
                                                                 }) => {
    const [importing, setImporting] = useState(false);
    const [importTime, setImportTime] = useState(0);
    const [currentAction, setCurrentAction] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [realtimeLogs, setRealtimeLogs] = useState<string[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Timer pour le temps d'import
    useEffect(() => {
        if (importing) {
            intervalRef.current = setInterval(() => {
                setImportTime(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (!importing && wizardData.importResult) {
                // Import terminé
                setImportTime(0);
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [importing, wizardData.importResult]);

    // Surveiller les changements de progression
    useEffect(() => {
        if (wizardData.importProgress) {
            const progress = wizardData.importProgress;

            // Mettre à jour l'action courante
            if (progress.currentAction) {
                setCurrentAction(`${progress.currentAction.actionType}: ${progress.currentAction.objectName}`);
            }

            // Ajouter aux logs en temps réel
            if (progress.message) {
                setRealtimeLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()} - ${progress.message}`]);
            }

            // Gérer les changements d'état
            if (progress.status === 'importing') {
                setImporting(true);
            } else if (progress.status === 'completed' || progress.status === 'error') {
                setImporting(false);
                if (progress.status === 'completed') {
                    notification.success({
                        message: 'Import terminé',
                        description: 'Toutes les opérations ont été exécutées avec succès',
                        placement: 'topRight'
                    });
                }
            }
        }
    }, [wizardData.importProgress]);

    // Démarrer l'import
    const startImport = async () => {
        console.log('[ImportExecutionStep] 🚀 Début de startImport avec AnalysisDataStore');
        console.log('[ImportExecutionStep] selectedConfig:', wizardData.selectedConfig);

        if (!wizardData.selectedConfig) {
            notification.error({
                message: 'Configuration manquante',
                description: 'Configuration manquante pour l\'import'
            });
            return;
        }

        try {
            console.log('[ImportExecutionStep] Démarrage de l\'import avec AnalysisDataStore...');
            setImporting(true);
            setImportTime(0);
            setRealtimeLogs([]);
            setCurrentAction('');

            notification.info({
                message: 'Import démarré',
                description: 'Utilisation de l\'analyse stockée automatiquement...',
                duration: 3
            });

            // ✅ SOLUTION : Utiliser executeDirectImport qui envoie Actions: []
            // Cela déclenche l'utilisation de l'AnalysisDataStore côté backend
            console.log('[ImportExecutionStep] Appel à executeDirectImport (Actions vides)');

            const result = await csvImportService.executeDirectImport(
                [], // csvData vide - le backend utilise les données stockées
                wizardData.selectedConfig
            );

            console.log('[ImportExecutionStep] ✅ Résultat de executeDirectImport:', result);
            updateWizardData({importResult: result});

        } catch (error: any) {
            console.error('[ImportExecutionStep] ❌ Erreur lors de l\'import:', error);
            notification.error({
                message: 'Erreur d\'import',
                description: error.message || 'Une erreur est survenue lors de l\'import'
            });
            setImporting(false);
        }
    };

    // Confirmer le démarrage de l'import
    const confirmStartImport = () => {
        console.log('[ImportExecutionStep] Début de confirmStartImport');
        const selectedActions = wizardData.detectedActions.filter(action => action.selected);
        console.log('[ImportExecutionStep] Actions sélectionnées pour confirmation:', selectedActions.length);

        Modal.confirm({
            title: 'Confirmer l\'import',
            content: `Vous êtes sur le point d'exécuter ${selectedActions.length} actions dans l'Active Directory. Cette opération ne peut pas être annulée. Voulez-vous continuer ?`,
            onOk: () => {
                console.log('[ImportExecutionStep] Confirmation OK, appel de startImport');
                return startImport();
            },
            onCancel: () => {
                console.log('[ImportExecutionStep] Import annulé par l\'utilisateur');
            },
            okText: 'Confirmer',
            cancelText: 'Annuler',
            type: 'warning'
        });
    };

    // Formater le temps
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Note: Utilisation de la fonction utilitaire centralisée getActionDisplay
    // Obtenir le statut de la progression
    const getProgressStatus = (): "normal" | "active" | "exception" | "success" => {
        if (!wizardData.importProgress) return "normal";

        switch (wizardData.importProgress.status) {
            case 'error':
                return "exception";
            case 'completed':
                return "success";
            case 'importing':
                return "active";
            default:
                return "normal";
        }
    };

    // Calculer les statistiques
    const selectedActions = wizardData.detectedActions.filter(action => action.selected);
    const actionStats = selectedActions.reduce((stats, action) => {
        const type = action.actionType;
        stats[type] = (stats[type] || 0) + 1;
        return stats;
    }, {} as Record<ActionType, number>);

    return (
        <Card title="4. Exécution de l'import" style={{width: '100%'}}>
            <Space direction="vertical" size={16} style={{width: '100%'}}>
                    {/* Résumé avant import */}
                    {!importing && !wizardData.importResult && (
                        <Alert
                            type="info"
                            showIcon
                            message="Prêt pour l'import"
                            description={
                                <div>
                                    <p><strong>{selectedActions.length} actions</strong> seront exécutées dans l'Active
                                        Directory.</p>
                                    <Row gutter={16} style={{marginTop: 16}}>
                                        {Object.entries(actionStats).map(([type, count]) => {
                                            const actionDisplay = getActionDisplay(type as ActionType);
                                            return (
                                                <Col span={6} key={type}>
                                                    <Statistic
                                                        title={actionDisplay.name}
                                                        value={count}
                                                        valueStyle={{fontSize: '18px'}}
                                                        prefix={<span
                                                            style={{fontSize: '20px'}}>{actionDisplay.icon}</span>}
                                                    />
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </div>
                            }
                        />
                    )}

                    {/* Progression de l'import */}
                    {(importing || wizardData.importResult) && (
                        <Card size="small" title="Progression de l'import">
                            <Space direction="vertical" style={{width: '100%'}}>
                                {/* Barre de progression principale */}
                                <div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                                        <Text strong>Progression globale</Text>
                                        {importing && (
                                            <Tag color="processing">
                                                <ClockCircleOutlined/> {formatTime(importTime)}
                                            </Tag>
                                        )}
                                    </div>
                                    <Progress
                                        percent={wizardData.importProgress?.progress || 0}
                                        status={getProgressStatus()}
                                        strokeColor={{
                                            '0%': '#108ee9',
                                            '100%': '#87d068',
                                        }}
                                        format={(percent) => importing ? `${percent}%` : wizardData.importResult ? '100%' : `${percent}%`}
                                    />
                                </div>

                                {/* Action courante */}
                                {importing && currentAction && (
                                    <div>
                                        <Text type="secondary">Action en cours :</Text>
                                        <div style={{marginTop: 4}}>
                                            <Tag icon={<SyncOutlined spin/>} color="processing">
                                                {currentAction}
                                            </Tag>
                                        </div>
                                    </div>
                                )}

                                {/* Message de statut */}
                                {wizardData.importProgress?.message && (
                                    <div>
                                        <Text type="secondary">{wizardData.importProgress.message}</Text>
                                    </div>
                                )}
                            </Space>
                        </Card>
                    )}

                    {/* Logs en temps réel */}
                    {(importing || realtimeLogs.length > 0) && (
                        <Card size="small" title="Logs en temps réel">
                            <div style={{
                                backgroundColor: '#f5f5f5',
                                padding: '12px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px'
                            }}>
                                {realtimeLogs.length === 0 ? (
                                    <Text type="secondary">En attente des logs...</Text>
                                ) : (
                                    realtimeLogs.map((log, index) => (
                                        <div key={index} style={{marginBottom: 4}}>
                                            {log}
                                        </div>
                                    ))
                                )}
                                {importing && (
                                    <div style={{marginTop: 8}}>
                                        <Spin size="small"/> Traitement en cours...
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Résultats de l'import */}
                    {wizardData.importResult && (
                        <Alert
                            type={wizardData.importResult.success ? "success" : "warning"}
                            showIcon
                            message={wizardData.importResult.success ? "Import terminé avec succès" : "Import terminé avec des erreurs"}
                            description={
                                <Row gutter={16}>
                                    <Col span={6}>
                                        <Statistic
                                            title="Créés"
                                            value={wizardData.importResult.summary.createCount}
                                            valueStyle={{color: '#3f8600'}}
                                            prefix={<CheckCircleOutlined/>}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title="Modifiés"
                                            value={wizardData.importResult.summary.updateCount}
                                            valueStyle={{color: '#1890ff'}}
                                            prefix={<SyncOutlined/>}
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
                                            title="Total"
                                            value={wizardData.importResult.summary.totalObjects}
                                            prefix={<InfoCircleOutlined/>}
                                        />
                                    </Col>
                                </Row>
                            }
                        />
                    )}

                    {/* Actions à exécuter */}
                    {!importing && !wizardData.importResult && (
                        <Card size="small" title="Actions sélectionnées">
                            <List
                                size="small"
                                dataSource={selectedActions.slice(0, 10)}
                                renderItem={(action) => {
                                    const actionDisplay = getActionDisplay(action.actionType);
                                    return (
                                        <List.Item>
                                            <Space>
                                                <Tag color={action.actionType === ActionType.CREATE_USER ? 'green' :
                                                    action.actionType === ActionType.UPDATE_USER ? 'blue' :
                                                        action.actionType === ActionType.CREATE_OU ? 'purple' : 'default'}>
                                                    {actionDisplay.icon} {actionDisplay.name}
                                                </Tag>
                                                <Text>{action.objectName}</Text>
                                                <Text type="secondary">→ {action.path}</Text>
                                            </Space>
                                        </List.Item>
                                    );
                                }}
                                footer={selectedActions.length > 10 && (
                                    <Text type="secondary">
                                        ... et {selectedActions.length - 10} autres actions
                                    </Text>
                                )}
                            />
                        </Card>
                    )}
                
                {/* Actions */}
                <div style={{textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0'}}>
                    <Space size="large">
                        <Button
                            size="large"
                            onClick={onPrev}
                            disabled={importing}
                        >
                            Retour à l'analyse
                        </Button>

                        {!importing && !wizardData.importResult && (
                            <Button
                                type="primary"
                                size="large"
                                onClick={() => {
                                    console.log('[ImportExecutionStep] Clic direct sur Démarrer l\'import avec AnalysisDataStore');
                                    startImport();
                                }}
                                disabled={!wizardData.analysisResult || !wizardData.selectedConfig}
                                icon={<PlayCircleOutlined/>}
                            >
                                Démarrer l'import (utiliser l'analyse stockée)
                            </Button>
                        )}

                        {importing && (
                            <Button
                                size="large"
                                disabled
                                icon={<SyncOutlined spin/>}
                            >
                                Import en cours...
                            </Button>
                        )}

                        {wizardData.importResult && (
                            <Button
                                type="primary"
                                size="large"
                                onClick={onNext}
                                icon={<CheckCircleOutlined/>}
                            >
                                Voir les résultats détaillés
                            </Button>
                        )}
                    </Space>
                </div>
            </Space>
        </Card>
    );
};

export default ImportExecutionStep;