// src/components/import/ConfigurationStep.tsx
import React, {useEffect, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    List,
    Modal,
    notification,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {CheckCircleOutlined, EditOutlined, PlusOutlined, RightOutlined} from '@ant-design/icons';
import {ImportWizardData} from '../../pages/EnhancedCsvImportPage';
import {ImportConfig, ActionType, getActionTypeDetails} from '../../models/CsvImport';
import {csvImportService} from '../../services/csvImportService';
import ActionTypesSelector from '../ActionTypesSelector';
import {importConfigService} from '../../services/api/importConfigService';

const {Title, Text, Paragraph} = Typography;
const {Option} = Select;

interface ConfigurationStepProps {
    wizardData: ImportWizardData;
    updateWizardData: (updates: Partial<ImportWizardData>) => void;
    onNext: () => void;
    onPrev: () => void;
}

const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
                                                                 wizardData,
                                                                 updateWizardData,
                                                                 onNext,
                                                                 onPrev
                                                             }) => {
    const [configs, setConfigs] = useState<ImportConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [selectedConfigForEdit, setSelectedConfigForEdit] = useState<ImportConfig | null>(null);
    const [form] = Form.useForm();

    // Charger les configurations au montage
    useEffect(() => {
        loadConfigurations();
    }, []);

    // Charger les configurations
    const loadConfigurations = async () => {
        try {
            setLoading(true);
            const configsList = await csvImportService.getImportConfigs();
            setConfigs(configsList);

            if (configsList.length > 0 && !wizardData.configId) {
                const firstConfig = configsList[0];
                updateWizardData({
                    configId: firstConfig.id || '',
                    selectedConfig: firstConfig,
                    temporaryDisabledActions: (firstConfig as any)?.disabledActionTypes || []
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des configurations:', error);
            notification.error({
                message: 'Erreur de chargement',
                description: 'Impossible de charger les configurations d\'import'
            });
        } finally {
            setLoading(false);
        }
    };

    // Gérer le changement de configuration
    const handleConfigChange = (configId: string) => {
        const selectedConfig = configs.find(c => c.id === configId);
        const disabledActions = (selectedConfig as any)?.configData?.disabledActionTypes ||
            (selectedConfig as any)?.disabledActionTypes ||
            [];
        
        updateWizardData({
            configId,
            selectedConfig: selectedConfig || null,
            temporaryDisabledActions: disabledActions
        });
    };
    
    // Gérer la continuité avec les actions temporaires
    const handleContinue = async () => {
        if (wizardData.selectedConfig) {
            // Créer une copie de la configuration pour la modifier
            const configCopy = JSON.parse(JSON.stringify(wizardData.selectedConfig));

            // Mettre à jour les actions désactivées dans la copie
            configCopy.disabledActionTypes = wizardData.temporaryDisabledActions;
            
            // Mettre à jour l'état du wizard avec la config modifiée
            updateWizardData({ selectedConfig: configCopy });
        }
        
        onNext();
    };

    const getConfigurationDetails = (config: ImportConfig) => {
        const configData = (config as any).configData || config;
        const details = [
            { label: 'Délimiteur CSV', value: configData.csvDelimiter },
            { label: 'OU par défaut', value: configData.defaultOU },
            { label: 'Colonne pour l\'OU', value: configData.ouColumn || 'Non spécifiée' },
        ];

        return details;
    };

    return (
        <Card title="2. Configuration de l'import" style={{width: '100%'}}>
            <Space direction="vertical" size="large" style={{width: '100%'}}>
                
                <Row justify="end">
                    <Button
                        type="primary"
                        icon={<RightOutlined />}
                        onClick={handleContinue}
                        disabled={!wizardData.selectedConfig}
                    >
                        Continuer vers l'analyse
                    </Button>
                </Row>
                
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px 0'}}>
                        <Spin size="large"/>
                        <Text style={{ marginTop: 16, display: 'block' }}>Chargement des configurations...</Text>
                    </div>
                ) : (
                    <>
                        <div>
                            <Title level={5}>Choisir une configuration d'import</Title>
                            <Paragraph type="secondary">
                                Sélectionnez un modèle de configuration pour l'import. Vous pourrez ensuite ajuster les actions à exécuter pour cet import spécifique.
                            </Paragraph>
                            <Space style={{width: '100%'}} size="middle">
                                <Select
                                    style={{flex: 1}}
                                    value={wizardData.configId}
                                    onChange={handleConfigChange}
                                    placeholder="Sélectionner une configuration"
                                    loading={loading}
                                    showSearch
                                    optionFilterProp="label"
                                    options={configs.map(c => ({
                                        value: c.id || '',
                                        label: c.name,
                                        description: c.description
                                    }))}
                                    optionRender={(option) => (
                                        <Space direction="vertical">
                                            <Text strong>{option.data.label}</Text>
                                            <Text type="secondary">{option.data.description}</Text>
                                        </Space>
                                    )}
                                />
                            </Space>
                        </div>

                        {wizardData.selectedConfig && (
                            <Row gutter={24}>
                                <Col xs={24} md={12}>
                                    <Divider orientation="left">Détails de la configuration</Divider>
                                    <List
                                        size="small"
                                        bordered
                                        dataSource={getConfigurationDetails(wizardData.selectedConfig)}
                                        renderItem={item => (
                                            <List.Item>
                                                <Text strong>{item.label}:</Text> <Text>{item.value}</Text>
                                            </List.Item>
                                        )}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <Divider orientation="left">Actions pour cet import</Divider>
                                    <Paragraph type="secondary">
                                        Décochez les actions que vous ne souhaitez pas exécuter pour CET import.
                                        Ces choix ne modifient pas la configuration enregistrée.
                                    </Paragraph>
                                    <ActionTypesSelector
                                        value={wizardData.temporaryDisabledActions}
                                        onChange={(actions) => updateWizardData({ temporaryDisabledActions: actions })}
                                    />
                                    
                                    <Alert
                                        style={{ marginTop: 16 }}
                                        message="Actions désactivées"
                                        description={
                                            wizardData.temporaryDisabledActions.length > 0 ?
                                            <Space wrap>
                                                {wizardData.temporaryDisabledActions.map(action => (
                                                    <Tag key={action} color="volcano">
                                                        {getActionTypeDetails(action).label}
                                                    </Tag>
                                                ))}
                                            </Space> : "Toutes les actions de la configuration sont activées."
                                        }
                                        type="info"
                                    />
                                </Col>
                            </Row>
                        )}
                    </>
                )}

                <Divider />

                <Row justify="space-between">
                    <Button onClick={onPrev}>
                        Précédent
                    </Button>
                    <Button
                        type="primary"
                        icon={<RightOutlined />}
                        onClick={handleContinue}
                        disabled={!wizardData.selectedConfig}
                    >
                        Continuer vers l'analyse
                    </Button>
                </Row>
            </Space>
        </Card>
    );
};

export default ConfigurationStep;