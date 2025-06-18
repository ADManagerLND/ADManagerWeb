// src/pages/EnhancedCsvImportPage.tsx
import React, {useCallback, useEffect, useState} from 'react';
import {Badge, Button, Card, Col, notification, Progress, Result, Row, Space, Spin, Steps, Typography} from 'antd';
import {
    CheckCircleOutlined,
    EyeOutlined,
    FileSearchOutlined,
    LoadingOutlined,
    PlayCircleOutlined,
    SettingOutlined,
    UploadOutlined
} from '@ant-design/icons';

// Composants pour chaque phase
import FileSelectionStep from '../components/import/FileSelectionStep';
import ConfigurationStep from '../components/import/ConfigurationStep';
import AnalysisPreviewStep from '../components/import/AnalysisPreviewStep';
import ImportExecutionStep from '../components/import/ImportExecutionStep';
import LogsAndResultsStep from '../components/import/LogsAndResultsStep';

// Types et services
import {
    ActionItem,
    ActionType,
    CsvAnalysisResult,
    ImportConfig,
    ImportProgress,
    ImportResult,
    LogEntry
} from '../models/CsvImport';
import {csvImportService} from '../services/csvImportService';
import {importSystemMigrator} from '../services/importSystemMigrator';
import {importConfigService} from '../services/api/importConfigService';

const {Title, Text, Paragraph} = Typography;

export interface ImportWizardData {
    // Phase 1: Fichier
    selectedFile: File | null;
    fileContent: string;
    fileValidation: {
        isValid: boolean;
        errors: string[];
    };

    // Phase 2: Configuration
    selectedConfig: ImportConfig | null;
    configId: string;
    temporaryDisabledActions: ActionType[];

    // Phase 3: Analyse
    analysisResult: CsvAnalysisResult | null;
    previewData: Record<string, string>[];
    detectedActions: ActionItem[];

    // Phase 4: Import
    importProgress: ImportProgress | null;
    selectedActions: ActionItem[];

    // Phase 5: Résultats
    importResult: ImportResult | null;
    logs: LogEntry[];
    importReport: any;
}

const EnhancedCsvImportPage: React.FC = () => {
    // États principaux du wizard
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [serviceReady, setServiceReady] = useState(false);

    // Données du wizard
    const [wizardData, setWizardData] = useState<ImportWizardData>({
        selectedFile: null,
        fileContent: '',
        fileValidation: {isValid: false, errors: []},
        selectedConfig: null,
        configId: '',
        analysisResult: null,
        previewData: [],
        detectedActions: [],
        importProgress: null,
        selectedActions: [],
        importResult: null,
        logs: [],
        importReport: null,
        temporaryDisabledActions: []
    });

    // Configuration des étapes
    const steps = [
        {
            title: 'Sélection fichier',
            description: 'Choisir le fichier CSV/Excel à importer',
            icon: <UploadOutlined/>,
            content: 'file-selection',
            color: '#0078d4'
        },
        {
            title: 'Configuration',
            description: 'Paramétrer les règles d\'importation',
            icon: <SettingOutlined/>,
            content: 'configuration',
            color: '#059669'
        },
        {
            title: 'Analyse & prévisualisation',
            description: 'Vérifier les données et actions',
            icon: <EyeOutlined/>,
            content: 'analysis-preview',
            color: '#d97706'
        },
        {
            title: 'Exécution',
            description: 'Traitement et import des données',
            icon: <PlayCircleOutlined/>,
            content: 'import-execution',
            color: '#7c3aed'
        },
        {
            title: 'Résultats',
            description: 'Rapport final et logs détaillés',
            icon: <FileSearchOutlined/>,
            content: 'logs-results',
            color: '#dc2626'
        }
    ];

    // Initialisation du service
    useEffect(() => {
        const initializeService = async () => {
            try {
                setLoading(true);
                console.log('Initialisation du service d\'import CSV...');

                await importSystemMigrator.initializeService();
                csvImportService.setAutoReconnect(true);

                // S'abonner aux événements
                csvImportService.subscribeToProgress(handleProgress);
                csvImportService.subscribeToLogs(handleLog);

                setServiceReady(true);

                notification.success({
                    message: 'Service initialisé',
                    description: 'Le service d\'import est prêt à être utilisé',
                    placement: 'topRight'
                });
            } catch (error) {
                console.error('Erreur lors de l\'initialisation du service:', error);
                notification.error({
                    message: 'Erreur d\'initialisation',
                    description: 'Impossible d\'initialiser le service d\'import',
                    placement: 'topRight'
                });
            } finally {
                setLoading(false);
            }
        };

        initializeService();

        return () => {
            // Nettoyage lors du démontage
            csvImportService.setAutoReconnect(false);
            csvImportService.disconnect().catch(console.error);
        };
    }, []);

    // Gestionnaire de progression
    const handleProgress = useCallback((progress: ImportProgress) => {
        console.log('Progression reçue:', progress);

        setWizardData(prev => ({
            ...prev,
            importProgress: progress
        }));

        // Gérer les changements d'état
        if (progress.status === 'analyzed' && progress.analysis) {
            const analysis = progress.analysis;
            const disabledActionTypes = wizardData.selectedConfig?.disabledActionTypes || [];
            
            setWizardData(prev => ({
                ...prev,
                analysisResult: {
                    success: true,
                    analysis: analysis,
                    csvData: analysis.csvData || [],
                    summary: {
                        totalRows: analysis.summary?.totalObjects || analysis.csvData?.length || 0,
                        actionsCount: analysis.actions?.length || 0,
                        createCount: analysis.summary?.createCount || 0,
                        updateCount: analysis.summary?.updateCount || 0,
                        errorCount: analysis.summary?.errorCount || 0
                    }
                },
                detectedActions: (analysis.actions || []).map((action, index) => {
                    // Vérifier si l'action est désactivée dans la configuration
                    const isDisabled = disabledActionTypes.some(disabledType => 
                        String(disabledType) === String(action.actionType)
                    );
                    
                    return {
                        id: `action-${index}`,
                        actionType: action.actionType,
                        objectName: action.objectName,
                        path: action.path,
                        message: action.message,
                        attributes: action.attributes,
                        selected: !isDisabled // Marquer comme non sélectionnée si désactivée
                    };
                }),
                previewData: analysis.csvData || []
            }));
        }

        if (progress.status === 'completed' && progress.result) {
            setWizardData(prev => ({
                ...prev,
                importResult: progress.result ?? null
            }));
        }
    }, []);

    // Gestionnaire de logs
    const handleLog = useCallback((log: LogEntry) => {
        setWizardData(prev => ({
            ...prev,
            logs: [...prev.logs, {
                ...log,
                timestamp: log.timestamp || new Date().toISOString(),
                level: log.level || 'info'
            }]
        }));
    }, []);

    // Méthodes de navigation
    const goToStep = (step: number) => {
        if (step >= 0 && step < steps.length) {
            setCurrentStep(step);
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Méthodes de mise à jour des données
    const updateWizardData = (updates: Partial<ImportWizardData>) => {
        setWizardData(prev => ({...prev, ...updates}));
    };

    // Validation des étapes
    const canProceedToStep = (stepIndex: number): boolean => {
        switch (stepIndex) {
            case 1: // Configuration
                return wizardData.selectedFile !== null && wizardData.fileValidation.isValid;
            case 2: // Analyse
                return wizardData.selectedConfig !== null && wizardData.configId !== '';
            case 3: // Import
                return wizardData.analysisResult !== null && wizardData.analysisResult.success;
            case 4: // Résultats
                return wizardData.importResult !== null;
            default:
                return true;
        }
    };

    // Calculer la progression globale
    const getOverallProgress = () => {
        const stepProgress = (currentStep / (steps.length - 1)) * 100;
        return Math.min(stepProgress, 100);
    };

    // Rendu du contenu de l'étape
    const renderStepContent = () => {
        if (!serviceReady) {
            return (
                                    <Card
                        style={{
                            borderRadius: '12px',
                            border: '1px solid #e8e8e8',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                        }}
                        styles={{body: {padding: '48px 24px'}}}
                    >
                    <div style={{textAlign: 'center'}}>
                        <Spin size="large"/>
                        <div style={{marginTop: 24}}>
                            <Text style={{fontSize: '16px', color: '#6b7280'}}>
                                Initialisation du service d'import...
                            </Text>
                        </div>
                    </div>
                </Card>
            );
        }

        switch (currentStep) {
            case 0:
                return (
                    <FileSelectionStep
                        wizardData={wizardData}
                        updateWizardData={updateWizardData}
                        onNext={nextStep}
                    />
                );
            case 1:
                return (
                    <ConfigurationStep
                        wizardData={wizardData}
                        updateWizardData={updateWizardData}
                        onNext={nextStep}
                        onPrev={prevStep}
                    />
                );
            case 2:
                return (
                    <AnalysisPreviewStep
                        wizardData={wizardData}
                        updateWizardData={updateWizardData}
                        onNext={nextStep}
                        onPrev={prevStep}
                        csvImportService={csvImportService}
                    />
                );
            case 3:
                return (
                    <ImportExecutionStep
                        wizardData={wizardData}
                        updateWizardData={updateWizardData}
                        onNext={nextStep}
                        onPrev={prevStep}
                        csvImportService={csvImportService}
                    />
                );
            case 4:
                return (
                    <LogsAndResultsStep
                        wizardData={wizardData}
                        updateWizardData={updateWizardData}
                        onRestart={() => {
                            setCurrentStep(0);
                            setWizardData({
                                selectedFile: null,
                                fileContent: '',
                                fileValidation: {isValid: false, errors: []},
                                selectedConfig: null,
                                configId: '',
                                analysisResult: null,
                                previewData: [],
                                detectedActions: [],
                                importProgress: null,
                                selectedActions: [],
                                importResult: null,
                                logs: [],
                                importReport: null,
                                temporaryDisabledActions: []
                            });
                        }}
                    />
                );
            default:
                return (
                    <Card style={{
                        borderRadius: '12px',
                        border: '1px solid #e8e8e8',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                        width: '100%'
                    }}>
                        <Result
                            status="warning"
                            title="Étape non reconnue"
                            subTitle="Cette étape n'existe pas dans le processus d'import."
                            extra={
                                <Button type="primary" onClick={() => setCurrentStep(0)}>
                                    Retour au début
                                </Button>
                            }
                        />
                    </Card>
                );
        }
    };

    // Rendu principal
    if (loading) {
        return (
            <div style={{
                background: '#fafbfc',
                minHeight: '100vh',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Card style={{
                    borderRadius: '12px',
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    padding: '24px'
                }}>
                    <div style={{textAlign: 'center'}}>
                        <Spin size="large"/>
                        <div style={{marginTop: 24}}>
                            <Text style={{fontSize: '16px', color: '#6b7280'}}>
                                Chargement de l'interface d'import...
                            </Text>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            background: '#fafbfc',
            minHeight: '100vh',
            padding: '24px 24px 48px 24px'
        }}>
            {/* Indicateur d'étapes moderne */}
            <Card style={{
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                marginBottom: '24px'
            }}>
                <Steps
                    current={currentStep}
                    size="default"
                    style={{padding: '8px 0'}}
                    items={steps.map((step, index) => ({
                        title: (
                            <div>
                                <div style={{
                                    fontWeight: index <= currentStep ? '600' : '500',
                                    color: index <= currentStep ? '#1f2937' : '#6b7280',
                                    fontSize: '14px'
                                }}>
                                    {step.title}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: '#9ca3af',
                                    marginTop: '2px'
                                }}>
                                    {step.description}
                                </div>
                            </div>
                        ),
                        icon: index < currentStep ? (
                            <CheckCircleOutlined style={{color: '#059669', fontSize: '20px'}}/>
                        ) : index === currentStep && loading ? (
                            <LoadingOutlined style={{color: step.color, fontSize: '20px'}}/>
                        ) : (
                            React.cloneElement(step.icon, {
                                style: {
                                    color: index <= currentStep ? step.color : '#9ca3af',
                                    fontSize: '20px'
                                }
                            })
                        ),
                        status: index < currentStep ? 'finish' :
                            index === currentStep ? 'process' : 'wait'
                    }))}
                />
            </Card>



            {/* Contenu de l'étape */}
            <div>
                {renderStepContent()}
            </div>
        </div>
    );
};

export default EnhancedCsvImportPage;
