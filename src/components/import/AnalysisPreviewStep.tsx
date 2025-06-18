// src/components/import/AnalysisPreviewStep.tsx
import React, {useEffect, useState} from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Divider,
    Empty,
    notification,
    Progress,
    Row,
    Space,
    Statistic,
    Switch,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    FileDoneOutlined,
    InfoCircleOutlined,
    IssuesCloseOutlined,
    PlayCircleOutlined,
    ReloadOutlined,
    SyncOutlined
} from '@ant-design/icons';
import {ImportWizardData} from '../../pages/EnhancedCsvImportPage';
import {ActionItem, ActionType, ImportConfig} from '../../models/CsvImport';
import {CsvImportServiceInterface} from '../../services/csvImportService';
import {getActionDisplay, getActionTypeColor} from '../../services/actionTypeUtils';

const {Title, Text, Paragraph} = Typography;

interface AnalysisPreviewStepProps {
    wizardData: ImportWizardData;
    updateWizardData: (updates: Partial<ImportWizardData>) => void;
    onNext: () => void;
    onPrev: () => void;
    csvImportService: CsvImportServiceInterface;
}

const AnalysisPreviewStep: React.FC<AnalysisPreviewStepProps> = ({
                                                                     wizardData,
                                                                     updateWizardData,
                                                                     onNext,
                                                                     onPrev,
                                                                     csvImportService
                                                                 }) => {
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisTime, setAnalysisTime] = useState(0);
    const [showDetails, setShowDetails] = useState(false);

    // Timer pour le temps d'analyse
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (analyzing) {
            interval = setInterval(() => {
                setAnalysisTime(prev => prev + 1);
            }, 1000);
        } else {
            setAnalysisTime(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [analyzing]);

    // Démarrer l'analyse
    const startAnalysis = async () => {
        if (!wizardData.selectedFile || !wizardData.selectedConfig) {
            notification.error({
                message: 'Données manquantes',
                description: 'Fichier ou configuration manquant pour l\'analyse'
            });
            return;
        }

        try {
            setAnalyzing(true);
            setAnalysisTime(0);

            notification.info({
                message: 'Analyse en cours',
                description: 'Analyse du fichier en cours, veuillez patienter...',
                duration: 2
            });

            console.log('[AnalysisPreviewStep] Démarrage de l\'analyse avec:', {
                fileName: wizardData.selectedFile.name,
                configId: wizardData.configId,
                fileSize: wizardData.selectedFile.size,
                disabledActionTypes: wizardData.temporaryDisabledActions || []
            });

            // ✅ CORRECTION : Construire une config temporaire pour l'analyse
            const configForAnalysis: ImportConfig = {
                ...wizardData.selectedConfig!,
                // Utiliser les actions temporaires de l'état parent
                disabledActionTypes: wizardData.temporaryDisabledActions || []
            };

            const result = await csvImportService.uploadAndAnalyzeCsvWithConfig(
                wizardData.selectedFile,
                configForAnalysis
            );

            console.log('[AnalysisPreviewStep] Résultat de l\'analyse:', result);
            
            // Analyser les actions par type pour vérifier le filtrage
            if (result.success && result.analysis?.actions) {
                const actionsByType = result.analysis.actions.reduce((acc: Record<string, number>, action: any) => {
                    const actionType = action.actionType || action.ActionType || 'UNKNOWN';
                    acc[actionType] = (acc[actionType] || 0) + 1;
                    return acc;
                }, {});
                
                console.log('[AnalysisPreviewStep] Actions détectées par type:', actionsByType);
                console.log('[AnalysisPreviewStep] Total des actions:', result.analysis.actions.length);
                
                // Vérifier spécifiquement les actions de dossiers
                const studentFolderActions = (result.analysis?.actions || []).filter(
                    a => normalizeActionType(a.actionType) === normalizeActionType(ActionType.CREATE_STUDENT_FOLDER)
                ).length;
                const classFolderActions = (result.analysis?.actions || []).filter(
                    a => normalizeActionType(a.actionType) === normalizeActionType(ActionType.CREATE_CLASS_GROUP_FOLDER)
                ).length;
                
                // ✅ CORRECTION : Vérifier avec les actions temporaires de CETTE analyse
                const wereFoldersDisabled = wizardData.temporaryDisabledActions.some(
                    (type: ActionType) => normalizeActionType(type) === normalizeActionType(ActionType.CREATE_STUDENT_FOLDER)
                );
                
                if (wereFoldersDisabled && (studentFolderActions > 0 || classFolderActions > 0)) {
                    console.warn('[AnalysisPreviewStep] ⚠️ Actions de dossiers détectées malgré la désactivation:', {
                        studentFolderActions,
                        classFolderActions
                    });
                } else {
                    console.log('[AnalysisPreviewStep] ✅ Actions de dossiers correctement filtrées');
                }
            }

            if (result.success) {
                notification.success({
                    message: 'Analyse terminée',
                    description: `${result.summary?.actionsCount || 0} actions détectées`,
                    placement: 'topRight'
                });
            } else {
                notification.error({
                    message: 'Erreur d\'analyse',
                    description: result.errorMessage || 'Erreur lors de l\'analyse'
                });
            }
        } catch (error: any) {
            console.error('Erreur lors de l\'analyse:', error);
            notification.error({
                message: 'Erreur d\'analyse',
                description: error.message || 'Erreur lors de l\'analyse du fichier'
            });
        } finally {
            setAnalyzing(false);
        }
    };

    // Note: Utilisation des fonctions utilitaires centralisées getActionDisplay et getActionTypeColor

    // Formater le temps d'analyse
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Gérer la sélection des actions
    const handleActionToggle = (actionId: string, selected: boolean) => {
        const updatedActions = wizardData.detectedActions.map(action => {
            if (action.id === actionId) {
                // Vérifier si l'action est désactivée dans la configuration
                const disabledActionTypes = (wizardData.selectedConfig as any)?.disabledActionTypes || [];
                const actionTypeStr = normalizeActionType(action.actionType);
                const isDisabledInConfig = disabledActionTypes.some((disabledType: ActionType) => 
                    normalizeActionType(disabledType) === actionTypeStr
                );
                
                // Ne pas permettre la modification des actions désactivées
                if (isDisabledInConfig) {
                    return action;
                }
                
                return {...action, selected};
            }
            return action;
        });
        updateWizardData({detectedActions: updatedActions});
    };

    // Sélectionner/désélectionner toutes les actions (filtrées ou toutes parmi les activées)
    const handleSelectAll = (selected: boolean) => {
        const updatedActions = wizardData.detectedActions.map(action => {
            // Vérifier si l'action est désactivée dans la configuration
            const disabledActionTypes = (wizardData.selectedConfig as any)?.disabledActionTypes || [];
            const actionTypeStr = normalizeActionType(action.actionType);
            const isDisabledInConfig = disabledActionTypes.some((disabledType: ActionType) => 
                normalizeActionType(disabledType) === actionTypeStr
            );
            
            // Ne pas modifier les actions désactivées dans la configuration
            if (isDisabledInConfig) {
                return action;
            }

            // Si des filtres sont actifs, ne modifier que les actions filtrées
            if (selectedActionTypes.length > 0) {
                const normalizedActionType = normalizeActionType(action.actionType);
                const isFiltered = selectedActionTypes.some(selectedType => 
                    normalizeActionType(selectedType) === normalizedActionType
                );
                return isFiltered ? {...action, selected} : action;
            }
            // Sinon, modifier toutes les actions activées
            return {...action, selected};
        });
        updateWizardData({detectedActions: updatedActions});
    };

    // Formater le type d'action pour l'affichage
    const formatActionType = (actionType: ActionType): string => {
        const actionTypeStr = typeof actionType === 'string' ? actionType : String(actionType);
        return actionTypeStr.replace('_', ' ');
    };

    // Fonction pour normaliser les types d'actions pour la comparaison
    const normalizeActionType = (actionType: ActionType | string | number): string => {
        if (typeof actionType === 'number') {
            // Convertir les codes numériques en chaînes pour la comparaison
            return actionType.toString();
        }
        return String(actionType);
    };

    // Colonnes pour le tableau des actions
    const actionColumns = [
        {
            title: 'Sélection',
            dataIndex: 'selected',
            width: 80,
            render: (selected: boolean, record: ActionItem) => {
                // Vérifier si l'action est désactivée dans la configuration
                const disabledActionTypes = (wizardData.selectedConfig as any)?.disabledActionTypes || [];
                const actionTypeStr = normalizeActionType(record.actionType);
                const isDisabledInConfig = disabledActionTypes.some((disabledType: ActionType) => 
                    normalizeActionType(disabledType) === actionTypeStr
                );
                
                return (
                    <Switch
                        size="small"
                        checked={selected}
                        disabled={isDisabledInConfig}
                        onChange={(checked) => handleActionToggle(record.id, checked)}
                        title={isDisabledInConfig ? "Action désactivée dans la configuration" : ""}
                    />
                );
            }
        },
        {
            title: 'Type',
            dataIndex: 'actionType',
            width: 120,
            render: (actionType: ActionType) => {
                const actionDisplay = getActionDisplay(actionType);
                return (
                    <Tag color={getActionTypeColor(actionType)}>
                        {actionDisplay.icon} {actionDisplay.name}
                    </Tag>
                );
            }
        },
        {
            title: 'Objet',
            dataIndex: 'objectName',
            ellipsis: true
        },
        {
            title: 'Chemin',
            dataIndex: 'path',
            ellipsis: true
        },
        {
            title: 'Message',
            dataIndex: 'message',
            ellipsis: true
        }
    ];

    // Filtrer les actions selon les actions désactivées dans la configuration
    const getEnabledActions = () => {
        const disabledActionTypes = wizardData.temporaryDisabledActions || [];
        return wizardData.detectedActions.filter(action => {
            const actionTypeStr = normalizeActionType(action.actionType);
            return !disabledActionTypes.some((disabledType: ActionType) => 
                normalizeActionType(disabledType) === actionTypeStr
            );
        });
    };

    const enabledActions = getEnabledActions();

    // Statistiques des actions (seulement les actions activées)
    const actionStats = enabledActions.reduce((stats, action) => {
        const type = action.actionType;
        stats[type] = (stats[type] || 0) + 1;
        return stats;
    }, {} as Record<ActionType, number>);

    // État pour le filtrage
    const [selectedActionTypes, setSelectedActionTypes] = useState<(ActionType | string)[]>([]);

    // Filtrer les actions selon les types sélectionnés (parmi les actions activées)
    const filteredActions = selectedActionTypes.length > 0 
        ? enabledActions.filter(action => {
            const normalizedActionType = normalizeActionType(action.actionType);
            return selectedActionTypes.some(selectedType => 
                normalizeActionType(selectedType) === normalizedActionType
            );
        })
        : enabledActions;

    // Gérer le filtrage par type d'action
    const handleActionTypeFilter = (actionType: ActionType | string, checked: boolean) => {
        if (checked) {
            setSelectedActionTypes(prev => [...prev, actionType]);
        } else {
            setSelectedActionTypes(prev => prev.filter(type => 
                normalizeActionType(type) !== normalizeActionType(actionType)
            ));
        }
    };

    // Effacer tous les filtres
    const clearFilters = () => {
        setSelectedActionTypes([]);
    };

    return (
        <Card title="3. Analyse et prévisualisation des données" style={{width: '100%'}}>
            <Space direction="vertical" size={16} style={{width: '100%'}}>
                    {/* Section d'analyse */}
                    {!wizardData.analysisResult ? (
                        <div style={{textAlign: 'center', padding: '40px 0'}}>
                            <div style={{marginBottom: 24}}>
                                <FileDoneOutlined style={{fontSize: 64, color: '#1890ff'}}/>
                            </div>
                            <Title level={4}>Analyser le fichier</Title>
                            <Paragraph type="secondary">
                                L'analyse va vérifier la structure du fichier, valider les données
                                et déterminer les actions à effectuer dans l'Active Directory.
                            </Paragraph>

                            {analyzing && (
                                <div style={{marginBottom: 16}}>
                                    <Progress
                                        type="circle"
                                        percent={wizardData.importProgress?.progress || 0}
                                        format={() => formatTime(analysisTime)}
                                    />
                                    <div style={{marginTop: 8}}>
                                        <Text type="secondary">
                                            {wizardData.importProgress?.message || 'Analyse en cours...'}
                                        </Text>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="primary"
                                size="large"
                                icon={analyzing ? <ReloadOutlined/> : <PlayCircleOutlined/>}
                                onClick={startAnalysis}
                                loading={analyzing}
                                disabled={analyzing}
                            >
                                {analyzing ? 'Analyse en cours...' : 'Démarrer l\'analyse'}
                            </Button>
                        </div>
                    ) : (
                        <div>
                            {/* Résultats de l'analyse */}
                            <Alert
                                type={wizardData.analysisResult.success ? "success" : "error"}
                                showIcon
                                message={wizardData.analysisResult.success ? "Analyse réussie" : "Erreur d'analyse"}
                                description={
                                    wizardData.analysisResult.success ? (
                                        <Row gutter={16}>
                                            <Col span={6}>
                                                <Statistic
                                                    title="Lignes analysées"
                                                    value={wizardData.analysisResult.summary?.totalRows || 0}
                                                    prefix={<FileDoneOutlined/>}
                                                />
                                            </Col>
                                            <Col span={6}>
                                                <Statistic
                                                    title="Actions détectées"
                                                    value={wizardData.analysisResult.summary?.actionsCount || 0}
                                                    prefix={<PlayCircleOutlined/>}
                                                />
                                            </Col>
                                            <Col span={6}>
                                                <Statistic
                                                    title="Créations"
                                                    value={wizardData.analysisResult.summary?.createCount || 0}
                                                    prefix={<CheckCircleOutlined/>}
                                                    valueStyle={{color: '#3f8600'}}
                                                />
                                            </Col>
                                            <Col span={6}>
                                                <Statistic
                                                    title="Erreurs"
                                                    value={wizardData.analysisResult.summary?.errorCount || 0}
                                                    prefix={<ExclamationCircleOutlined/>}
                                                    valueStyle={{
                                                        color: (wizardData.analysisResult.summary?.errorCount || 0) > 0 ? '#cf1322' : '#3f8600'
                                                    }}
                                                />
                                            </Col>
                                        </Row>
                                    ) : (
                                        wizardData.analysisResult.errorMessage
                                    )
                                }
                                style={{marginBottom: 16}}
                            />

                            {/* Actions prévues avec filtrage */}
                            {wizardData.analysisResult.success && (
                                <div style={{marginTop: 16}}>
                                    <Space direction="vertical" style={{width: '100%'}}>
                                        {/* Avertissement si des actions sont désactivées */}
                                        {(() => {
                                            const disabledActionTypes = (wizardData.selectedConfig as any)?.disabledActionTypes || [];
                                            const disabledCount = wizardData.detectedActions.length - enabledActions.length;
                                            return disabledCount > 0 ? (
                                                <Alert
                                                    type="info"
                                                    showIcon
                                                    message={`${disabledCount} action(s) désactivée(s) dans la configuration`}
                                                    description="Certaines actions ont été désactivées dans les paramètres de cette configuration et ne seront pas exécutées."
                                                    style={{marginBottom: 16}}
                                                />
                                            ) : null;
                                        })()}

                                        {/* Statistiques des actions avec filtres */}
                                        <Card size="small" title="Répartition des actions (activées)">
                                            <Row gutter={[16, 8]}>
                                                {Object.entries(actionStats).map(([type, count]) => {
                                                    const actionDisplay = getActionDisplay(type as ActionType);
                                                    const isSelected = selectedActionTypes.some(selectedType => 
                                                        normalizeActionType(selectedType) === normalizeActionType(type)
                                                    );
                                                    return (
                                                        <Col span={6} key={type}>
                                                            <div 
                                                                style={{
                                                                    textAlign: 'center',
                                                                    padding: '8px',
                                                                    border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: isSelected ? '#f6ffed' : 'transparent',
                                                                    transition: 'all 0.3s'
                                                                }}
                                                                onClick={() => handleActionTypeFilter(type, !isSelected)}
                                                            >
                                                                <div style={{fontSize: '24px'}}>
                                                                    {actionDisplay.icon}
                                                                </div>
                                                                <div style={{fontWeight: 'bold'}}>{count}</div>
                                                                <div style={{fontSize: '12px', color: '#666'}}>
                                                                    {actionDisplay.name}
                                                                </div>
                                                                {isSelected && (
                                                                    <div style={{fontSize: '10px', color: '#1890ff', marginTop: '2px'}}>
                                                                        Filtré
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Col>
                                                    );
                                                })}
                                            </Row>
                                            {selectedActionTypes.length > 0 && (
                                                <div style={{marginTop: 16, textAlign: 'center'}}>
                                                    <Button size="small" onClick={clearFilters}>
                                                        Effacer les filtres
                                                    </Button>
                                                    <Text type="secondary" style={{marginLeft: 8}}>
                                                        {filteredActions.length} / {enabledActions.length} actions affichées
                                                    </Text>
                                                </div>
                                            )}
                                        </Card>

                                        {/* Contrôles de sélection */}
                                        <div style={{marginBottom: 16}}>
                                            <Space>
                                                <Button
                                                    size="small"
                                                    onClick={() => handleSelectAll(true)}
                                                >
                                                    {selectedActionTypes.length > 0 ? 'Sélectionner les filtrées' : 'Tout sélectionner'}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => handleSelectAll(false)}
                                                >
                                                    {selectedActionTypes.length > 0 ? 'Désélectionner les filtrées' : 'Tout désélectionner'}
                                                </Button>
                                                <Text type="secondary">
                                                    {selectedActionTypes.length > 0 ? (
                                                        <>
                                                            {filteredActions.filter(a => a.selected).length} / {filteredActions.length} actions filtrées sélectionnées
                                                            <br />
                                                            ({enabledActions.filter(a => a.selected).length} / {enabledActions.length} activées)
                                                        </>
                                                    ) : (
                                                        <>
                                                            {enabledActions.filter(a => a.selected).length} / {enabledActions.length} actions activées sélectionnées
                                                        </>
                                                    )}
                                                </Text>
                                            </Space>
                                        </div>

                                        {/* Tableau des actions */}
                                        <Table
                                            dataSource={filteredActions}
                                            columns={actionColumns}
                                            rowKey="id"
                                            size="small"
                                            pagination={{pageSize: 15}}
                                            scroll={{x: 'max-content'}}
                                            locale={{
                                                emptyText: selectedActionTypes.length > 0 ? (
                                                    <Empty
                                                        description="Aucune action ne correspond aux filtres sélectionnés"
                                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    />
                                                ) : (
                                                    <Empty
                                                        description="Aucune action détectée"
                                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    />
                                                )
                                            }}
                                        />
                                    </Space>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Actions */}
                    <div style={{textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0'}}>
                        <Space size="large">
                            <Button size="large" onClick={onPrev}>
                                Retour à la configuration
                            </Button>

                            {!wizardData.analysisResult && (
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={startAnalysis}
                                    disabled={analyzing}
                                    loading={analyzing}
                                    icon={<PlayCircleOutlined/>}
                                >
                                    Analyser le fichier
                                </Button>
                            )}

                            {wizardData.analysisResult?.success && wizardData.detectedActions.length > 0 && (
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={onNext}
                                    disabled={wizardData.detectedActions.filter(a => a.selected).length === 0}
                                    icon={<PlayCircleOutlined/>}
                                >
                                    Continuer vers l'import
                                    ({wizardData.detectedActions.filter(a => a.selected).length} actions)
                                </Button>
                            )}
                        </Space>
                    </div>
                </Space>
            </Card>
    );
};

export default AnalysisPreviewStep;