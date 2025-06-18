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
import {CheckCircleOutlined, EditOutlined, PlusOutlined} from '@ant-design/icons';
import {ImportWizardData} from '../../pages/EnhancedCsvImportPage';
import {ImportConfig, ActionType} from '../../models/CsvImport';
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

            // Sélectionner automatiquement la première configuration si aucune n'est sélectionnée
            if (configsList.length > 0 && !wizardData.configId) {
                const firstConfig = configsList[0];
                updateWizardData({
                    configId: firstConfig.id || '',
                    selectedConfig: firstConfig
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
        
        updateWizardData({
            configId,
            selectedConfig: selectedConfig || null,
            temporaryDisabledActions: (selectedConfig as any)?.disabledActionTypes || []
        });
    };

    // Ouvrir le modal d'édition
    const openEditModal = (config: ImportConfig) => {
        setSelectedConfigForEdit(config);
        form.setFieldsValue({
            name: config.name,
            description: config.description,
            csvDelimiter: config.csvDelimiter,
            defaultOU: config.defaultOU,
            createMissingOUs: config.createMissingOUs,
            ouColumn: config.ouColumn
        });
        setEditModalVisible(true);
    };

    // Ouvrir le modal de création
    const openCreateModal = () => {
        form.resetFields();
        form.setFieldsValue({
            csvDelimiter: ',',
            createMissingOUs: true
        });
        setCreateModalVisible(true);
    };

    // Sauvegarder la configuration
    const saveConfiguration = async (values: any) => {
        try {
            // Ici vous pourriez appeler un service pour sauvegarder la configuration
            // await configService.saveConfig(values);

            notification.success({
                message: 'Configuration sauvegardée',
                description: 'La configuration a été sauvegardée avec succès'
            });

            setEditModalVisible(false);
            setCreateModalVisible(false);

            // Recharger les configurations
            await loadConfigurations();
        } catch (error) {
            notification.error({
                message: 'Erreur de sauvegarde',
                description: 'Impossible de sauvegarder la configuration'
            });
        }
    };

    // Gérer la continuité avec les actions temporaires
    const handleContinue = async () => {
        onNext();
    };

    // Obtenir la description détaillée de la configuration
    const getConfigurationDetails = (config: ImportConfig) => {
        return [
            {
                label: 'Délimiteur CSV',
                value: config.csvDelimiter === ',' ? 'Virgule (,)' : config.csvDelimiter === ';' ? 'Point-virgule (;)' : config.csvDelimiter
            },
            {label: 'OU par défaut', value: config.defaultOU || 'Non définie'},
            {label: 'Colonne OU', value: config.ouColumn || 'Non définie'},
            {label: 'Créer OUs manquantes', value: config.createMissingOUs ? 'Oui' : 'Non'},
            {label: 'Mappings', value: Object.keys(config.headerMapping || {}).length + ' colonnes mappées'}
        ];
    };

    return (
        <Card title="2. Configuration de l'import" style={{width: '100%'}}>
            <Space direction="vertical" size={16} style={{width: '100%'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px 0'}}>
                        <Spin size="large"/>
                        <div style={{marginTop: 16}}>
                            <Text>Chargement des configurations...</Text>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Sélection de configuration */}
                        <div>
                            <Title level={5} style={{marginBottom: 12}}>Choisir une configuration d'import</Title>
                            <Space style={{width: '100%'}} size="middle">
                                <Select
                                    style={{flex: 1, minWidth: 300}}
                                    value={wizardData.configId}
                                    onChange={handleConfigChange}
                                    placeholder="Sélectionner une configuration"
                                    loading={loading}
                                    showSearch
                                    optionFilterProp="label"
                                    disabled={loading}
                                    notFoundContent={
                                        loading ? <Spin size="small"/> : "Aucune configuration disponible"
                                    }
                                >
                                    {configs.map(config => (
                                        <Option
                                            key={config.id}
                                            value={config.id || ''}
                                            label={config.name}
                                        >
                                            <div>
                                                <div style={{fontWeight: 'bold'}}>{config.name}</div>
                                                {config.description && (
                                                    <div style={{fontSize: '12px', color: '#666'}}>
                                                        {config.description}
                                                    </div>
                                                )}
                                            </div>
                                        </Option>
                                    ))}
                                </Select>

                                <Tooltip title="Créer une nouvelle configuration">
                                    <Button
                                        icon={<PlusOutlined/>}
                                        onClick={openCreateModal}
                                        disabled={loading}
                                    >
                                        Nouvelle
                                    </Button>
                                </Tooltip>

                                {wizardData.selectedConfig && (
                                    <Tooltip title="Modifier la configuration sélectionnée">
                                        <Button
                                            icon={<EditOutlined/>}
                                            onClick={() => openEditModal(wizardData.selectedConfig!)}
                                            disabled={loading}
                                        >
                                            Modifier
                                        </Button>
                                    </Tooltip>
                                )}
                            </Space>
                        </div>

                        {/* Configuration des actions pour cet import */}
                        {wizardData.selectedConfig && (
                            <div>
                                <Divider orientation="left">Actions pour cet import</Divider>
                                <div style={{ marginBottom: 16 }}>
                                    <Text type="secondary">
                                        Personnalisez les actions qui seront exécutées pour cet import spécifique.
                                        Ces modifications ne seront pas sauvegardées dans la configuration.
                                    </Text>
                                </div>
                                <ActionTypesSelector
                                    value={wizardData.temporaryDisabledActions}
                                    onChange={(actions) => updateWizardData({ temporaryDisabledActions: actions })}
                                />
                            </div>
                        )}

                        {/* Détails de la configuration sélectionnée */}
                        {wizardData.selectedConfig && (
                            <div>
                                <Divider orientation="left">Détails de la configuration</Divider>
                                <Row gutter={[16, 8]}>
                                    {getConfigurationDetails(wizardData.selectedConfig).map((detail, index) => (
                                        <Col span={8} key={index}>
                                            <div style={{marginBottom: 8}}>
                                                <Text type="secondary" style={{fontSize: '12px'}}>
                                                    {detail.label}
                                                </Text>
                                                <div style={{fontWeight: 'bold'}}>
                                                    {detail.value}
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>

                                {/* Mappings des colonnes */}
                                {wizardData.selectedConfig.headerMapping && Object.keys(wizardData.selectedConfig.headerMapping).length > 0 && (
                                    <div style={{marginTop: 16}}>
                                        <Text strong style={{fontSize: '14px', marginBottom: 8, display: 'block'}}>
                                            Mapping des colonnes
                                        </Text>
                                        <Row gutter={[8, 4]}>
                                            {Object.entries(wizardData.selectedConfig.headerMapping).map(([csvColumn, adAttribute]) => (
                                                <Col span={8} key={csvColumn}>
                                                    <Tag color="blue" style={{width: '100%', textAlign: 'center'}}>
                                                        {csvColumn} → {adAttribute}
                                                    </Tag>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Avertissements et conseils */}
                        {wizardData.selectedConfig && (
                            <Alert
                                type="info"
                                showIcon
                                message="Configuration prête"
                                description={
                                    <div>
                                        <p>La configuration <strong>{wizardData.selectedConfig.name}</strong> sera utilisée
                                            pour analyser votre fichier.</p>
                                        <p>Assurez-vous que les colonnes de votre fichier correspondent au mapping
                                            défini.</p>
                                    </div>
                                }
                            />
                        )}

                        {/* Message si aucune configuration */}
                        {configs.length === 0 && !loading && (
                            <Alert
                                type="warning"
                                showIcon
                                message="Aucune configuration disponible"
                                description={
                                    <div>
                                        <p>Vous devez créer au moins une configuration d'import pour continuer.</p>
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined/>}
                                            onClick={openCreateModal}
                                            style={{marginTop: 8}}
                                        >
                                            Créer ma première configuration
                                        </Button>
                                    </div>
                                }
                            />
                        )}
                    </>
                )}
                
                {/* Actions */}
                <div style={{textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0'}}>
                    <Space size="large">
                        <Button size="large" onClick={onPrev}>
                            Retour au fichier
                        </Button>

                        <Button
                            type="primary"
                            size="large"
                            onClick={handleContinue}
                            disabled={!wizardData.selectedConfig}
                            icon={<CheckCircleOutlined/>}
                        >
                            Continuer vers l'analyse
                        </Button>
                    </Space>
                </div>
            </Space>

            {/* Modal de création/édition de configuration */}
            <Modal
                title={createModalVisible ? "Créer une nouvelle configuration" : "Modifier la configuration"}
                open={editModalVisible || createModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setCreateModalVisible(false);
                }}
                footer={null}
                width={800}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={saveConfiguration}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Nom de la configuration"
                                name="name"
                                rules={[{required: true, message: 'Le nom est obligatoire'}]}
                            >
                                <Input placeholder="Ex: Import Utilisateurs RH"/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Délimiteur CSV"
                                name="csvDelimiter"
                                rules={[{required: true, message: 'Le délimiteur est obligatoire'}]}
                            >
                                <Select>
                                    <Option value=",">Virgule (,)</Option>
                                    <Option value=";">Point-virgule (;)</Option>
                                    <Option value="\t">Tabulation</Option>
                                    <Option value="|">Pipe (|)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Description"
                        name="description"
                    >
                        <Input.TextArea 
                            placeholder="Description optionnelle de la configuration"
                            rows={3}
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="OU par défaut"
                                name="defaultOU"
                            >
                                <Input placeholder="Ex: OU=Utilisateurs,DC=domaine,DC=com"/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Colonne OU"
                                name="ouColumn"
                            >
                                <Input placeholder="Nom de la colonne contenant l'OU"/>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Créer les OUs manquantes"
                        name="createMissingOUs"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    <div style={{textAlign: 'right', marginTop: 24}}>
                        <Space>
                            <Button onClick={() => {
                                setEditModalVisible(false);
                                setCreateModalVisible(false);
                            }}>
                                Annuler
                            </Button>
                            <Button type="primary" htmlType="submit">
                                {createModalVisible ? 'Créer' : 'Modifier'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </Card>
    );
};

export default ConfigurationStep;