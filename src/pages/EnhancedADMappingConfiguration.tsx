import React, {useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Drawer,
    Form,
    Input,
    message,
    Modal,
    Radio,
    Row,
    Space,
    Statistic,
    Steps,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    ImportOutlined,
    InfoCircleOutlined,
    PlusOutlined,
    SaveOutlined,
    UploadOutlined
} from '@ant-design/icons';
import {UserAttribute} from '../models/ApplicationSettings';
import {
    ADMappingIntegrationUtils,
    HeaderMapping,
    MappingPreview,
    SavedImportConfig
} from '../models/ADMappingIntegration';
import {useSettings} from '../hooks/useSettings';
import useADMappings from '../hooks/useADMappings';
import PredefinedColumnsSelector from '../components/PredefinedColumnsSelector';
import EnhancedMappingEditor from '../components/EnhancedMappingEditor';

const {Title, Text} = Typography;
const {TextArea} = Input;
const {Step} = Steps;

interface ConfigurationFormData {
    name: string;
    description: string;
    defaultOU: string;
    csvDelimiter: string;
}

type DataSourceType = 'manual' | 'csv';

const EnhancedADMappingConfiguration: React.FC = () => {
    // États pour l'interface en 3 étapes
    const [currentStep, setCurrentStep] = useState(0);
    const [dataSourceType, setDataSourceType] = useState<DataSourceType>('manual');
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    // États pour les données CSV
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvColumns, setCsvColumns] = useState<string[]>([]);

    // États pour la configuration
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [editingConfig, setEditingConfig] = useState<SavedImportConfig | null>(null);
    const [headerMappingEditor, setHeaderMappingEditor] = useState<HeaderMapping>({});
    const [form] = Form.useForm<ConfigurationFormData>();

    // Hooks pour la gestion des données
    const {
        configurations,
        loading: mappingsLoading,
        error: mappingsError,
        saveConfiguration,
        updateConfiguration,
        deleteConfiguration,
        validateHeaderMapping,
        convertToDisplayFormat,
        createNewConfiguration,
        refreshData
    } = useADMappings();

    // Utiliser le hook useSettings pour les attributs utilisateur
    const {
        settings: userAttributes,
        loading: attributesLoading
    } = useSettings<UserAttribute[]>('user-attributes');

    // Gérer l'upload de fichier CSV
    const handleCsvUpload = (info: any) => {
        const {file} = info;
        if (file.status === 'done') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const lines = text.split('\n').filter(line => line.trim());
                    const headers = lines[0].split(';').map(header => header.trim());

                    const data = lines.slice(1).map(line => {
                        const values = line.split(';').map(value => value.trim());
                        const row: Record<string, string> = {};

                        headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });

                        return row;
                    });

                    setCsvColumns(headers);
                    setCsvData(data);
                    setSelectedColumns(headers); // Auto-sélectionner les colonnes CSV
                    message.success('Fichier CSV chargé avec succès');
                } catch (error) {
                    message.error('Erreur lors de la lecture du fichier CSV');
                }
            };
            reader.readAsText(file.originFileObj);
        } else if (file.status === 'error') {
            message.error('Erreur lors de l\'upload du fichier CSV');
        }
    };

    // Créer une nouvelle configuration
    const handleCreateConfiguration = () => {
        const newConfig = createNewConfiguration();
        setEditingConfig(newConfig);
        setHeaderMappingEditor(newConfig.configData.headerMapping);
        form.setFieldsValue({
            name: newConfig.name,
            description: newConfig.description,
            defaultOU: newConfig.configData.defaultOU,
            csvDelimiter: newConfig.configData.csvDelimiter
        });
        setCurrentStep(0);
        setIsDrawerVisible(true);
    };

    // Éditer une configuration existante
    const handleEditConfiguration = (config: SavedImportConfig) => {
        setEditingConfig(config);
        setHeaderMappingEditor(config.configData.headerMapping);
        setSelectedColumns(config.configData.manualColumns || []);
        form.setFieldsValue({
            name: config.name,
            description: config.description,
            defaultOU: config.configData.defaultOU,
            csvDelimiter: config.configData.csvDelimiter
        });
        setCurrentStep(0);
        setIsDrawerVisible(true);
    };

    // Prévisualiser une configuration
    const handlePreviewConfiguration = (config: SavedImportConfig) => {
        const sampleData = csvData.length > 0 ? csvData[0] :
            selectedColumns.reduce((acc, col) => ({...acc, [col]: `Exemple ${col}`}), {});

        const preview = ADMappingIntegrationUtils.generateMappingPreviews(
            config.configData.headerMapping,
            sampleData,
            userAttributes || []
        );

        Modal.info({
            title: `Prévisualisation - ${config.name}`,
            width: 800,
            content: (
                <div>
                    <p>Aperçu des mappages avec des données d'exemple :</p>
                    <Table
                        dataSource={preview}
                        columns={[
                            {
                                title: 'Attribut AD',
                                dataIndex: 'adAttribute',
                                key: 'adAttribute'
                            },
                            {
                                title: 'Template',
                                dataIndex: 'template',
                                key: 'template',
                                render: (text: string) => <Text code>{text}</Text>
                            },
                            {
                                title: 'Valeur générée',
                                dataIndex: 'transformedValue',
                                key: 'transformedValue',
                                render: (text: string, record: MappingPreview) => (
                                    <Space>
                                        <Text>{text}</Text>
                                        {record.isValid ?
                                            <CheckCircleOutlined style={{color: '#52c41a'}}/> :
                                            <ExclamationCircleOutlined style={{color: '#ff4d4f'}}/>
                                        }
                                    </Space>
                                )
                            }
                        ]}
                        pagination={false}
                        size="small"
                    />
                </div>
            )
        });
    };

    // Sauvegarder la configuration
    const handleSaveConfiguration = async (values: ConfigurationFormData) => {
        if (!editingConfig) return;

        const configToSave: SavedImportConfig = {
            ...editingConfig,
            name: values.name,
            description: values.description,
            configData: {
                ...editingConfig.configData,
                defaultOU: values.defaultOU,
                csvDelimiter: values.csvDelimiter,
                headerMapping: headerMappingEditor,
                manualColumns: selectedColumns // Sauvegarder les colonnes sélectionnées
            }
        };

        let success = false;
        if (editingConfig.id.startsWith('temp-')) {
            const result = await saveConfiguration(configToSave);
            success = result !== null;
        } else {
            const result = await updateConfiguration(editingConfig.id, configToSave);
            success = result !== null;
        }

        if (success) {
            setIsDrawerVisible(false);
            setEditingConfig(null);
            form.resetFields();
            setCurrentStep(0);
            await refreshData();
        }
    };

    // Supprimer une configuration
    const handleDeleteConfiguration = async (configId: string) => {
        Modal.confirm({
            title: 'Confirmer la suppression',
            content: 'Êtes-vous sûr de vouloir supprimer cette configuration de mapping ?',
            okText: 'Supprimer',
            okType: 'danger',
            cancelText: 'Annuler',
            onOk: async () => {
                const success = await deleteConfiguration(configId);
                if (success) {
                    await refreshData();
                }
            }
        });
    };

    // Charger les données de démonstration
    const loadDemoData = () => {
        const demoHeaders = ['prenom', 'nom', 'email', 'poste', 'departement', 'telephone'];
        const demoData = [
            {
                prenom: 'Jean',
                nom: 'Dupont',
                email: 'jean.dupont@exemple.com',
                poste: 'Développeur',
                departement: 'IT',
                telephone: '0123456789'
            },
            {
                prenom: 'Marie',
                nom: 'Martin',
                email: 'marie.martin@exemple.com',
                poste: 'Designer',
                departement: 'Marketing',
                telephone: '0987654321'
            }
        ];

        setCsvColumns(demoHeaders);
        setCsvData(demoData);
        setSelectedColumns(demoHeaders);
        message.info('Données de démonstration chargées');
    };

    // Passer à l'étape suivante
    const nextStep = () => {
        if (currentStep === 0 && selectedColumns.length === 0) {
            message.warning('Veuillez sélectionner au moins une colonne');
            return;
        }
        setCurrentStep(currentStep + 1);
    };

    // Revenir à l'étape précédente
    const prevStep = () => {
        setCurrentStep(currentStep - 1);
    };

    // Colonnes pour le tableau des configurations
    const configurationsColumns = [
        {
            title: 'Nom',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: SavedImportConfig) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{fontSize: '12px'}}>
                        {Object.keys(record.configData.headerMapping).length} mappages
                        • {record.configData.manualColumns?.length || 0} colonnes
                    </Text>
                </Space>
            )
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (text: string) => text || <Text type="secondary">Aucune description</Text>
        },
        {
            title: 'OU Cible',
            key: 'targetOU',
            render: (_: any, record: SavedImportConfig) => (
                <Text code style={{fontSize: '12px'}}>
                    {record.configData.defaultOU}
                </Text>
            )
        },
        {
            title: 'Colonnes',
            key: 'columns',
            render: (_: any, record: SavedImportConfig) => (
                <Space wrap>
                    {(record.configData.manualColumns || []).slice(0, 3).map((col: string) => (
                        <Tag key={col}>{col}</Tag>
                    ))}
                    {(record.configData.manualColumns || []).length > 3 && (
                        <Tag>+{(record.configData.manualColumns || []).length - 3}</Tag>
                    )}
                </Space>
            )
        },
        {
            title: 'Dernière modification',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString('fr-FR')
        }
    ];

    // Gestion de la logique de l'éditeur de mappages
    const commonADAttributes = [
        {name: 'sAMAccountName', label: 'sAMAccountName', example: '%prenom:lowercase%.%nom:lowercase%'},
        {name: 'givenName', label: 'Prénom', example: '%prenom%'},
        {name: 'sn', label: 'Nom', example: '%nom:uppercase%'},
        {name: 'mail', label: 'Email', example: '%prenom:lowercase%.%nom:lowercase%@entreprise.com%'},
        {name: 'userPrincipalName', label: 'UPN', example: '%prenom:lowercase%.%nom:lowercase%@entreprise.com%'},
        {name: 'displayName', label: 'Nom Affiché', example: '%prenom% %nom:uppercase%'},
        {name: 'cn', label: 'Nom Commun', example: '%prenom% %nom%'}
    ];

    // Helper pour obtenir l'icône de validation
    const getValidationIcon = (adAttribute: string) => {
        // Utilise generateMappingPreviews pour obtenir la validation par attribut
        const previews: MappingPreview[] = ADMappingIntegrationUtils.generateMappingPreviews(
            headerMappingEditor,
            csvData.length > 0 ? csvData[0] : selectedColumns.reduce((acc, col) => ({
                ...acc,
                [col]: `Exemple ${col}`
            }), {}),
            userAttributes || [] // Passez userAttributes pour la validation
        );
        const attributeValidation = previews.find((v: MappingPreview) => v.adAttribute === adAttribute);

        if (!attributeValidation) {
            return <Tooltip title="Non mappé"><InfoCircleOutlined style={{color: '#d9d9d9'}}/></Tooltip>;
        }
        // Vérifie si error est défini avant de l'utiliser
        if (attributeValidation.isValid) {
            return <Tooltip title="Valide"><CheckCircleOutlined style={{color: '#52c41a'}}/></Tooltip>;
        }
        return <Tooltip title={attributeValidation.error || "Erreur inconnue"}><CloseCircleOutlined
            style={{color: '#ff4d4f'}}/></Tooltip>;
    };

    // Helper pour l'aide sur les templates
    const getTemplateHelp = () => (
        <Alert
            message="Utilisation des Templates"
            description={
                <Space direction="vertical">
                    <Text>Vous pouvez utiliser des variables comme <Text code>%prenom%</Text> et des transformations
                        comme <Text code>%nom:uppercase%</Text>.</Text>
                    <Text>Les colonnes disponibles sont affichées ci-dessous.</Text>
                    <Text>Exemple : <Text code>%prenom:lowercase%.%nom:lowercase%@domaine.com</Text></Text>
                </Space>
            }
            type="info"
            showIcon
            style={{marginBottom: 16}}
        />
    );

    // Contenu des étapes
    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Space direction="vertical" style={{width: '100%'}} size="large">
                        <Card title="1. Choisir la source des données" size="small">
                            <Radio.Group onChange={(e) => setDataSourceType(e.target.value)} value={dataSourceType}>
                                <Radio value="manual">Sélectionner des colonnes prédéfinies</Radio>
                                <Radio value="csv">Importer un fichier CSV</Radio>
                            </Radio.Group>
                            {dataSourceType === 'manual' && (
                                <div style={{marginTop: 16}}>
                                    <PredefinedColumnsSelector
                                        selectedColumns={selectedColumns}
                                        onColumnsChange={setSelectedColumns}
                                    />
                                    <Button
                                        onClick={loadDemoData}
                                        style={{marginTop: 16}}
                                        icon={<ImportOutlined/>}
                                    >
                                        Charger données de démonstration
                                    </Button>
                                </div>
                            )}
                            {dataSourceType === 'csv' && (
                                <div style={{marginTop: 16}}>
                                    <Upload.Dragger
                                        name="file"
                                        multiple={false}
                                        beforeUpload={() => false} // Empêcher l'upload automatique
                                        onChange={handleCsvUpload}
                                        showUploadList={false}
                                    >
                                        <p className="ant-upload-drag-icon">
                                            <UploadOutlined/>
                                        </p>
                                        <p className="ant-upload-text">Cliquez ou faites glisser un fichier CSV ici</p>
                                        <p className="ant-upload-hint">Supporte un seul fichier CSV pour le mapping.</p>
                                    </Upload.Dragger>
                                    {csvData.length > 0 && (
                                        <Alert
                                            message={`Fichier CSV chargé: ${csvColumns.length} colonnes détectées`}
                                            description={
                                                <Space wrap>
                                                    {csvColumns.map((col: string) => (
                                                        <Tag key={col} color="blue">{col}</Tag>
                                                    ))}
                                                </Space>
                                            }
                                            type="success"
                                            showIcon
                                            style={{marginTop: 16}}
                                        />
                                    )}
                                </div>
                            )}
                        </Card>

                        {selectedColumns.length > 0 && (
                            <Card title="Colonnes sélectionnées pour le mapping" size="small">
                                <Space wrap>
                                    {selectedColumns.map((col: string) => (
                                        <Tag key={col} color="blue">{col}</Tag>
                                    ))}
                                </Space>
                            </Card>
                        )}
                    </Space>
                );

            case 1:
                return (
                    <EnhancedMappingEditor
                        mappings={headerMappingEditor}
                        availableColumns={selectedColumns}
                        onMappingsChange={setHeaderMappingEditor}
                        sampleData={csvData.length > 0 ? csvData[0] : selectedColumns.reduce((acc, col) => ({
                            ...acc,
                            [col]: `Exemple ${col}`
                        }), {})}
                    />
                );

            case 2:
                return (
                    <Space direction="vertical" style={{width: '100%'}} size="large">
                        <Card title="3. Résumé et validation" size="small">
                            <Row gutter={[16, 16]}>
                                <Col span={8}>
                                    <Statistic
                                        title="Colonnes sélectionnées"
                                        value={selectedColumns.length}
                                        suffix="colonnes"
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="Mappages définis"
                                        value={Object.keys(headerMappingEditor).length}
                                        suffix="attributs Teams"
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="Source de données"
                                        value={dataSourceType === 'manual' ? 'Prédéfinie' : 'CSV'}
                                    />
                                </Col>
                            </Row>
                        </Card>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Card title="Colonnes sélectionnées" size="small">
                                    <Space wrap>
                                        {selectedColumns.map((col: string) => (
                                            <Tag key={col} color="blue">{col}</Tag>
                                        ))}
                                    </Space>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card title="Attributs Teams mappés" size="small">
                                    <Space direction="vertical" style={{width: '100%'}}>
                                        {Object.entries(headerMappingEditor).map(([attr, template]) => (
                                            <div key={attr}>
                                                <Text strong>{attr}:</Text> <Text code>{template}</Text>
                                            </div>
                                        ))}
                                    </Space>
                                </Card>
                            </Col>
                        </Row>

                        {csvData.length > 0 && (
                            <Card title="Aperçu des données" size="small">
                                <Table
                                    dataSource={[csvData[0]]}
                                    columns={selectedColumns.map((col: string) => ({
                                        title: col,
                                        dataIndex: col,
                                        key: col
                                    }))}
                                    pagination={false}
                                    size="small"
                                    scroll={{x: true}}
                                />
                            </Card>
                        )}
                    </Space>
                );

            default:
                return null;
        }
    };

    return (
        <div style={{padding: 24}}>
            <Title level={2}>Configuration des Teams</Title>

            <Alert
                message="Interface moderne avec colonnes prédéfinies"
                description="Système intégré : sélectionnez des colonnes prédéfinies ou importez un CSV, puis configurez les mappages Teams avec validation temps réel."
                type="info"
                showIcon
                style={{marginBottom: 24}}
            />

            <Row gutter={24}>
                <Col span={24}>
                    <Card
                        title="Configurations de mapping sauvegardées"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined/>}
                                onClick={handleCreateConfiguration}
                            >
                                Nouvelle configuration
                            </Button>
                        }
                    >
                        {mappingsError && (
                            <Alert
                                message="Erreur"
                                description={mappingsError}
                                type="error"
                                style={{marginBottom: 16}}
                            />
                        )}

                        <Table
                            dataSource={configurations}
                            columns={configurationsColumns}
                            rowKey="id"
                            loading={mappingsLoading}
                            pagination={{pageSize: 10}}
                            locale={{emptyText: 'Aucune configuration trouvée. Créez votre première configuration.'}}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Drawer pour créer/éditer une configuration */}
            <Drawer
                title={editingConfig?.id.startsWith('temp-') ? 'Nouvelle configuration' : 'Éditer la configuration'}
                width={800}
                open={isDrawerVisible}
                onClose={() => {
                    setIsDrawerVisible(false);
                    setEditingConfig(null);
                    form.resetFields();
                }}
                extra={
                    <Space>
                        <Button onClick={() => setIsDrawerVisible(false)}>
                            Annuler
                        </Button>
                        <Button type="primary" onClick={form.submit}>
                            Sauvegarder
                        </Button>
                    </Space>
                }
            >
                <Space direction="vertical" style={{width: '100%'}} size="large">
                    {/* Étapes */}
                    <Steps current={currentStep} size="small">
                        <Step title="Source & Colonnes" description="Choisir la source des données"/>
                        <Step title="Mappages Teams" description="Configurer les attributs Teams"/>
                        <Step title="Résumé" description="Valider et sauvegarder"/>
                    </Steps>

                    {/* Formulaire de base (affiché uniquement à la dernière étape) */}
                    {currentStep === 2 && (
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSaveConfiguration}
                        >
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="name"
                                        label="Nom de la configuration"
                                        rules={[{required: true, message: 'Le nom est requis'}]}
                                    >
                                        <Input placeholder="Nom de la configuration"/>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="csvDelimiter"
                                        label="Délimiteur CSV"
                                        rules={[{required: true, message: 'Le délimiteur est requis'}]}
                                    >
                                        <Input placeholder=";" maxLength={1}/>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="description"
                                label="Description"
                            >
                                <TextArea rows={2} placeholder="Description de la configuration"/>
                            </Form.Item>

                            <Form.Item
                                name="defaultOU"
                                label="Unité organisationnelle cible"
                                rules={[{required: true, message: 'L\'OU est requise'}]}
                            >
                                <Input placeholder="OU=Utilisateurs,DC=entreprise,DC=com"/>
                            </Form.Item>
                        </Form>
                    )}

                    {/* Contenu des étapes */}
                    {getStepContent(currentStep)}

                    <Space style={{marginTop: 24}}>
                        {currentStep > 0 && (
                            <Button onClick={prevStep}>Précédent</Button>
                        )}
                        {currentStep < 2 && (
                            <Button type="primary" onClick={nextStep}>Suivant</Button>
                        )}
                        {currentStep === 2 && (
                            <Button type="primary" onClick={form.submit} icon={<SaveOutlined/>}>Sauvegarder la
                                configuration</Button>
                        )}
                    </Space>
                </Space>
            </Drawer>
        </div>
    );
};

export default EnhancedADMappingConfiguration;
