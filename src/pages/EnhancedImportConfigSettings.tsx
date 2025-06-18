import React, { useState, useEffect } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    List,
    message,
    Popconfirm,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Tabs,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    ExperimentOutlined,
    EyeOutlined,
    FolderOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    SettingOutlined,
    TeamOutlined,
    UploadOutlined
} from '@ant-design/icons';
import HeaderMappingEditor from '../components/HeaderMappingEditor';
import TeamsConfigTab from '../components/teams/TeamsConfigTab';
import ActionTypesSelector from '../components/ActionTypesSelector';
import { importConfigService, SavedImportConfig } from '../services/api/importConfigService';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Interface correspondant exactement au backend SavedImportConfig importée depuis le service

const EnhancedImportConfigSettings: React.FC = () => {
    // États principaux
    const [configs, setConfigs] = useState<SavedImportConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<SavedImportConfig | null>(null);
    const [showConfigEditor, setShowConfigEditor] = useState(false);
    const [activeTabKey, setActiveTabKey] = useState('1');
    const [form] = Form.useForm();

    // Fonction pour convertir les noms d'actions en valeurs numériques d'enum
    const convertActionTypesToNumbers = (actionTypes: string[]): number[] => {
        const actionTypeMap: { [key: string]: number } = {
            'CREATE_GROUP': 0,
            'CREATE_USER': 1,
            'UPDATE_USER': 2,
            'DELETE_USER': 3,
            'MOVE_USER': 4,
            'CREATE_OU': 5,
            'UPDATE_OU': 6,
            'DELETE_OU': 7,
            'CREATE_STUDENT_FOLDER': 8,
            'CREATE_TEAM': 9,
            'CREATE_CLASS_GROUP_FOLDER': 10,
            'ADD_USER_TO_GROUP': 11,
            'ERROR': 12
        };

        return actionTypes.map(actionType => actionTypeMap[actionType] ?? -1).filter(num => num !== -1);
    };

    // Charger les configurations
    const loadConfigs = async () => {
        try {
            setLoading(true);
            const savedConfigs = await importConfigService.getImportConfigs();
            setConfigs(savedConfigs);
        } catch (error) {
            console.error('Erreur lors du chargement des configurations:', error);
            message.error('Erreur lors du chargement des configurations');
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    };

    // Charger les configurations au montage
    useEffect(() => {
        loadConfigs();
    }, []);

    // Mettre à jour les valeurs du formulaire quand la configuration sélectionnée change
    useEffect(() => {
        if (selectedConfig && showConfigEditor) {
            // Attendre que le formulaire soit rendu
            setTimeout(() => {
                const configData = selectedConfig.configData;
                
                console.log('=== DEBUG: headerMapping ===', configData.headerMapping);
                
                const formValues = {
                    // Métadonnées de la configuration
                    name: selectedConfig.name || '',
                    description: selectedConfig.description || '',
                    isEnabled: selectedConfig.isEnabled ?? true,
                    
                    // Données de configuration (depuis configData)
                    defaultOU: configData.defaultOU || '',
                    csvDelimiter: configData.csvDelimiter || ';',
                    createMissingOUs: configData.createMissingOUs || false,
                    overwriteExisting: configData.overwriteExisting || false,
                    moveObjects: configData.moveObjects || false,
                    deleteNotInImport: configData.deleteNotInImport || false,
                    skipErrors: configData.skipErrors || false,
                    headerMapping: configData.headerMapping || {},
                    manualColumns: configData.manualColumns || [],
                    ouColumn: configData.ouColumn || '',
                    samAccountNameColumn: configData.samAccountNameColumn || '',
                    disabledActionTypes: configData.disabledActionTypes || [],
                    
                    // Configuration des dossiers (normalisée par le service)
                    Folders: {
                        EnableShareProvisioning: configData.Folders?.EnableShareProvisioning || false,
                        TargetServerName: configData.Folders?.TargetServerName || '',
                        HomeDriveLetter: configData.Folders?.HomeDriveLetter || '',
                        HomeDirectoryTemplate: configData.Folders?.HomeDirectoryTemplate || '',
                        ShareNameForUserFolders: configData.Folders?.ShareNameForUserFolders || '',
                        LocalPathForUserShareOnServer: configData.Folders?.LocalPathForUserShareOnServer || '',
                        DefaultShareSubfolders: configData.Folders?.DefaultShareSubfolders || []
                    },
                    
                    // Configuration Teams
                    TeamsIntegration: {
                        enabled: configData.TeamsIntegration?.enabled || false,
                        autoCreateTeamsForOUs: configData.TeamsIntegration?.autoCreateTeamsForOUs || false,
                        autoAddUsersToTeams: configData.TeamsIntegration?.autoAddUsersToTeams || false,
                        defaultTeacherUserId: configData.TeamsIntegration?.defaultTeacherUserId || '',
                        teamNamingTemplate: configData.TeamsIntegration?.teamNamingTemplate || 'Classe {OUName} - Année {Year}',
                        teamDescriptionTemplate: configData.TeamsIntegration?.teamDescriptionTemplate || 'Équipe collaborative pour la classe {OUName}',
                        folderMappings: configData.TeamsIntegration?.folderMappings || []
                    }
                };
                
                console.log('=== DEBUG: formValues.headerMapping ===', formValues.headerMapping);

                form.resetFields();
                form.setFieldsValue(formValues);
            }, 100);
        }
    }, [selectedConfig, showConfigEditor, form]);

    // Actions
    const handleCreateConfig = () => {
        setSelectedConfig(null);
        form.resetFields();
        setShowConfigEditor(true);
    };

    const handleEditConfig = (config: SavedImportConfig) => {
        setSelectedConfig(config);
        setShowConfigEditor(true);
    };

    const handleBackToList = () => {
        setShowConfigEditor(false);
        setSelectedConfig(null);
        setActiveTabKey('1');
        form.resetFields();
    };

    // Navigation entre onglets
    const tabs = [
        { key: '1', label: 'Général' },
        { key: '2', label: 'Dossiers' },
        { key: '3', label: 'Mappages' },
        { key: '4', label: 'Teams' }
    ];

    const getCurrentTabIndex = () => tabs.findIndex(tab => tab.key === activeTabKey);
    const isFirstTab = () => getCurrentTabIndex() === 0;
    const isLastTab = () => getCurrentTabIndex() === tabs.length - 1;

    const goToPreviousTab = () => {
        const currentIndex = getCurrentTabIndex();
        if (currentIndex > 0) {
            setActiveTabKey(tabs[currentIndex - 1].key);
        }
    };

    const goToNextTab = () => {
        const currentIndex = getCurrentTabIndex();
        if (currentIndex < tabs.length - 1) {
            setActiveTabKey(tabs[currentIndex + 1].key);
        }
    };

    const handleSaveConfig = async (values: any) => {
        try {
            setLoading(true);
            
            console.log('=== DEBUG: Values à sauvegarder ===', values);
            console.log('=== DEBUG: values.headerMapping ===', values.headerMapping);
            console.log('=== DEBUG: selectedConfig existant ===', selectedConfig);
            
            // Préserver les données existantes des autres onglets
            const existingConfigData = selectedConfig?.configData || {} as any;
            
            // Construire la structure SavedImportConfig complète en fusionnant les nouvelles valeurs avec les existantes
            const configToSave: SavedImportConfig = {
                id: selectedConfig?.id || '',
                name: values.name,
                description: values.description || '',
                createdBy: selectedConfig?.createdBy || 'Utilisateur',
                createdAt: selectedConfig?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                category: 'Import',
                isEnabled: values.isEnabled ?? true,
                configData: {
                    // Configuration de base - utiliser les nouvelles valeurs ou conserver les existantes
                    defaultOU: values.defaultOU !== undefined ? values.defaultOU : (existingConfigData.defaultOU || ''),
                    csvDelimiter: values.csvDelimiter !== undefined ? values.csvDelimiter : (existingConfigData.csvDelimiter || ';'),
                    createMissingOUs: values.createMissingOUs !== undefined ? values.createMissingOUs : (existingConfigData.createMissingOUs || false),
                    overwriteExisting: values.overwriteExisting !== undefined ? values.overwriteExisting : (existingConfigData.overwriteExisting || false),
                    moveObjects: values.moveObjects !== undefined ? values.moveObjects : (existingConfigData.moveObjects || false),
                    deleteNotInImport: values.deleteNotInImport !== undefined ? values.deleteNotInImport : (existingConfigData.deleteNotInImport || false),
                    skipErrors: values.skipErrors !== undefined ? values.skipErrors : (existingConfigData.skipErrors || false),
                    headerMapping: values.headerMapping !== undefined ? values.headerMapping : (existingConfigData.headerMapping || {}),
                    manualColumns: values.manualColumns !== undefined ? values.manualColumns : (existingConfigData.manualColumns || []),
                    ouColumn: values.ouColumn !== undefined ? values.ouColumn : (existingConfigData.ouColumn || ''),
                    samAccountNameColumn: values.samAccountNameColumn !== undefined ? values.samAccountNameColumn : (existingConfigData.samAccountNameColumn || ''),
                    disabledActionTypes: values.disabledActionTypes !== undefined ? convertActionTypesToNumbers(values.disabledActionTypes) : (existingConfigData.disabledActionTypes || []),
                    
                    // Configuration des dossiers - préserver les données existantes si pas dans le formulaire
                    Folders: values.Folders !== undefined ? {
                        HomeDirectoryTemplate: values.Folders.HomeDirectoryTemplate || '',
                        HomeDriveLetter: values.Folders.HomeDriveLetter || '',
                        TargetServerName: values.Folders.TargetServerName || '',
                        ShareNameForUserFolders: values.Folders.ShareNameForUserFolders || '',
                        LocalPathForUserShareOnServer: values.Folders.LocalPathForUserShareOnServer || '',
                        EnableShareProvisioning: values.Folders.EnableShareProvisioning || false,
                        DefaultShareSubfolders: values.Folders.DefaultShareSubfolders || []
                    } : existingConfigData.Folders,
                    
                    // Configuration Teams - préserver les données existantes si pas dans le formulaire
                    TeamsIntegration: values.TeamsIntegration !== undefined ? {
                        enabled: values.TeamsIntegration.enabled || false,
                        autoCreateTeamsForOUs: values.TeamsIntegration.autoCreateTeamsForOUs || false,
                        autoAddUsersToTeams: values.TeamsIntegration.autoAddUsersToTeams || false,
                        defaultTeacherUserId: values.TeamsIntegration.defaultTeacherUserId || '',
                        teamNamingTemplate: values.TeamsIntegration.teamNamingTemplate || 'Classe {OUName} - Année {Year}',
                        teamDescriptionTemplate: values.TeamsIntegration.teamDescriptionTemplate || 'Équipe collaborative pour la classe {OUName}',
                        folderMappings: values.TeamsIntegration.folderMappings || []
                    } : existingConfigData.TeamsIntegration,
                    
                    // Autres configurations - préserver les existantes
                    NetBiosDomainName: values.NetBiosDomainName !== undefined ? values.NetBiosDomainName : existingConfigData.NetBiosDomainName,
                    Mappings: values.Mappings !== undefined ? values.Mappings : (existingConfigData.Mappings || {}),
                    ClassGroupFolderCreationConfig: values.ClassGroupFolderCreationConfig !== undefined ? values.ClassGroupFolderCreationConfig : existingConfigData.ClassGroupFolderCreationConfig,
                    TeamGroupCreationConfig: values.TeamGroupCreationConfig !== undefined ? values.TeamGroupCreationConfig : existingConfigData.TeamGroupCreationConfig
                }
            };
            
            await importConfigService.saveImportConfig(configToSave);
            message.success('Configuration sauvegardée avec succès');
            setShowConfigEditor(false);
            loadConfigs();
        } catch (error: any) {
            message.error(`Erreur lors de la sauvegarde: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfig = async (configId: string) => {
        try {
            await importConfigService.deleteImportConfig(configId);
            message.success('Configuration supprimée');
            loadConfigs();
        } catch (error: any) {
            message.error(`Erreur lors de la suppression: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDuplicateConfig = async (configId: string) => {
        try {
            const originalConfig = configs.find(c => c.id === configId);
            if (!originalConfig) {
                message.error('Configuration source non trouvée');
                return;
            }
            const newName = `${originalConfig.name} - Copie`;
            await importConfigService.duplicateImportConfig(configId, newName);
            message.success('Configuration dupliquée avec succès');
            loadConfigs();
        } catch (error: any) {
            message.error(`Erreur lors de la duplication: ${error.response?.data?.message || error.message}`);
        }
    };

    const getConfigStatus = (config: SavedImportConfig) => {
        const hasHeaderMapping = config.configData.headerMapping && Object.keys(config.configData.headerMapping).length > 0;
        const hasFoldersConfig = config.configData.Folders && config.configData.Folders.EnableShareProvisioning;
        const hasTeamsConfig = config.configData.TeamsIntegration && config.configData.TeamsIntegration.enabled;

        if (hasHeaderMapping && (hasFoldersConfig || hasTeamsConfig)) {
            return { status: 'complete', color: '#059669', text: 'Configuration complète' };
        } else if (hasHeaderMapping || hasFoldersConfig || hasTeamsConfig) {
            return { status: 'partial', color: '#d97706', text: 'Configuration partielle' };
        } else {
            return { status: 'incomplete', color: '#6b7280', text: 'Configuration incomplète' };
        }
    };

    // Configuration de test
    const createTestConfig = () => {
        const testConfig: SavedImportConfig = {
            id: 'test-config',
            name: 'Configuration de Test',
            description: 'Configuration avec des valeurs de test pour les onglets',
            category: 'Import',
            isEnabled: true,
            createdBy: 'Test',
            createdAt: new Date().toISOString(),
            configData: {
                defaultOU: 'OU=TEST,DC=lycee,DC=nd',
                csvDelimiter: ';',
                createMissingOUs: true,
                overwriteExisting: false,
                moveObjects: false,
                deleteNotInImport: false,
                skipErrors: false,
                headerMapping: { 'prenom': 'givenName', 'nom': 'sn', 'email': 'mail' },
                manualColumns: ['prenom', 'nom', 'classe'],
                ouColumn: 'classe',
                samAccountNameColumn: 'sAMAccountName',
                
                Folders: {
                    EnableShareProvisioning: true,
                    TargetServerName: '192.168.10.43',
                    HomeDriveLetter: 'H:',
                    HomeDirectoryTemplate: '\\\\192.168.10.43\\Users\\%username%',
                    ShareNameForUserFolders: 'Users$',
                    LocalPathForUserShareOnServer: 'D:\\Users',
                    DefaultShareSubfolders: ['Documents', 'Desktop', 'Downloads']
                },
                
                TeamsIntegration: {
                    enabled: true,
                    autoCreateTeamsForOUs: true,
                    autoAddUsersToTeams: true,
                    defaultTeacherUserId: 'fbc8fa70-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    teamNamingTemplate: 'Classe {OUName} - Test 2025',
                    teamDescriptionTemplate: 'Équipe de test pour la classe {OUName}',
                    folderMappings: [
                        {
                            folderName: '📚 Documents de classe',
                            description: 'Dossier pour tous les documents partagés de la classe',
                            order: 1,
                            enabled: true,
                            defaultPermissions: {
                                canRead: true,
                                canWrite: true,
                                canDelete: false,
                                canCreateSubfolders: true
                            }
                        }
                    ]
                },
                
                NetBiosDomainName: 'lycee.nd',
                Mappings: {},
                ClassGroupFolderCreationConfig: {},
                TeamGroupCreationConfig: {}
            }
        };

        handleEditConfig(testConfig);
    };

    const renderConfigForm = () => (
        <Form form={form} layout="vertical" onFinish={handleSaveConfig}>
            <Tabs 
                activeKey={activeTabKey}
                onChange={setActiveTabKey}
                items={[
                {
                    key: '1',
                    label: <span><SettingOutlined />Général</span>,
                    children: (
                        <>
                            <Form.Item label="Nom" name="name" rules={[{ required: true, message: 'Nom requis' }]}>
                                <Input placeholder="Configuration élèves 2025" />
                            </Form.Item>
                            <Form.Item label="Description" name="description">
                                <TextArea rows={2} />
                            </Form.Item>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="OU par défaut" name="defaultOU" rules={[{ required: true }]}>
                                        <Input placeholder="OU=TEST,DC=lycee,DC=nd" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Délimiteur CSV" name="csvDelimiter">
                                        <Select>
                                            <Option value=";">Point-virgule (;)</Option>
                                            <Option value=",">Virgule (,)</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item label="Créer les OUs" name="createMissingOUs" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Écraser existants" name="overwriteExisting" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Configuration active" name="isEnabled" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Divider>Actions à exécuter</Divider>
                            <Form.Item 
                                label="Actions optionnelles"
                                name="disabledActionTypes"
                                tooltip="Désactivez les actions que vous ne souhaitez pas exécuter lors de l'import"
                            >
                                <ActionTypesSelector />
                            </Form.Item>
                        </>
                    )
                },
                {
                    key: '2',
                    label: <span><FolderOutlined />Dossiers</span>,
                    children: (
                        <>
                            <Form.Item
                                label="Activer le provisionnement de dossiers"
                                name={['Folders', 'EnableShareProvisioning']}
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Serveur cible" name={['Folders', 'TargetServerName']}>
                                        <Input placeholder="192.168.10.43" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Lettre de lecteur" name={['Folders', 'HomeDriveLetter']}>
                                        <Input placeholder="D:" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Template du répertoire personnel"
                                        name={['Folders', 'HomeDirectoryTemplate']}
                                    >
                                        <Input placeholder="\\\\192.168.10.43\\Data\\%username%" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Nom du partage pour utilisateurs"
                                        name={['Folders', 'ShareNameForUserFolders']}
                                    >
                                        <Input placeholder="Users$" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item
                                label="Chemin local sur le serveur"
                                name={['Folders', 'LocalPathForUserShareOnServer']}
                            >
                                <Input placeholder="D:\\Users" />
                            </Form.Item>
                            <Form.Item
                                label="Sous-dossiers par défaut"
                                name={['Folders', 'DefaultShareSubfolders']}
                            >
                                <Select mode="tags" placeholder="Documents, Desktop, etc.">
                                    <Option value="Documents">Documents</Option>
                                    <Option value="Desktop">Desktop</Option>
                                    <Option value="Pictures">Pictures</Option>
                                    <Option value="Downloads">Downloads</Option>
                                </Select>
                            </Form.Item>
                        </>
                    )
                },
                {
                    key: '3',
                    label: <span><ExperimentOutlined />Mappages</span>,
                    children: (
                        <>
                            <Form.Item label="Colonnes manuelles" name="manualColumns">
                                <Select mode="tags" placeholder="prenom, nom, classe, etc.">
                                    <Option value="prenom">prenom</Option>
                                    <Option value="nom">nom</Option>
                                    <Option value="classe">classe</Option>
                                    <Option value="dateNaissance">dateNaissance</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Colonne OU" name="ouColumn">
                                <Input placeholder="classe" />
                            </Form.Item>
                            <Divider>Mappages des attributs Active Directory</Divider>
                            <Form.Item
                                label="Mappages d'attributs"
                                name="headerMapping"
                                rules={[{ required: true, message: 'Au moins un mappage est requis' }]}
                            >
                                <HeaderMappingEditor />
                            </Form.Item>
                        </>
                    )
                },
                {
                    key: '4',
                    label: <span><TeamOutlined />Teams</span>,
                    children: <TeamsConfigTab />
                }
            ]} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <div>
                    <Button onClick={handleBackToList}>Annuler</Button>
                </div>
                <div>
                    <Space>
                        {!isFirstTab() && (
                            <Button onClick={goToPreviousTab}>
                                Précédent
                            </Button>
                        )}
                        {!isLastTab() && (
                            <Button type="default" onClick={goToNextTab}>
                                Suivant
                            </Button>
                        )}
                        <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                            Enregistrer
                        </Button>
                    </Space>
                </div>
            </div>
        </Form>
    );

    return (
        <div style={{ padding: '24px' }}>
            {!Array.isArray(configs) && !loading && (
                <Alert
                    message="Erreur de chargement"
                    description="Impossible de charger les configurations. Veuillez actualiser la page."
                    type="error"
                    showIcon
                    action={<Button size="small" danger onClick={loadConfigs}>Réessayer</Button>}
                    style={{ marginBottom: 24 }}
                />
            )}

            {showConfigEditor ? (
                <div>
                    <Card style={{ borderRadius: '12px', marginBottom: 24 }}>
                        <Row gutter={[24, 16]} align="middle">
                            <Col flex="auto">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <SettingOutlined style={{ fontSize: '20px', color: '#0078d4' }} />
                                    <div>
                                        <Title level={4} style={{ margin: 0 }}>
                                            {selectedConfig ? 'Modifier la configuration' : 'Nouvelle configuration'}
                                        </Title>
                                        <Text style={{ color: '#6b7280', fontSize: '14px' }}>
                                            {selectedConfig ? `Modification de "${selectedConfig.name}"` : 'Création d\'une nouvelle configuration'}
                                        </Text>
                                    </div>
                                </div>
                            </Col>
                            <Col>
                                <Button icon={<ReloadOutlined />} onClick={handleBackToList}>
                                    Retour à la liste
                                </Button>
                            </Col>
                        </Row>
                    </Card>
                    <Card style={{ borderRadius: '12px' }}>{renderConfigForm()}</Card>
                </div>
            ) : (
                <>
                    <Card style={{ borderRadius: '12px', marginBottom: 24 }}>
                        <Row gutter={[24, 16]} align="middle">
                            <Col flex="auto">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <UploadOutlined style={{ fontSize: '20px', color: '#0078d4' }} />
                                    <div>
                                        <Title level={4} style={{ margin: 0 }}>Configurations d'import</Title>
                                        <div style={{ marginTop: 4 }}>
                                            <Badge count={configs.length} style={{ backgroundColor: '#0078d4' }} />
                                            <Text style={{ marginLeft: 8, color: '#6b7280', fontSize: '14px' }}>
                                                configurations disponibles
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                            <Col>
                                <Space>
                                    <Button icon={<ReloadOutlined />} onClick={loadConfigs} disabled={loading}>
                                        Actualiser
                                    </Button>
                                    <Button type="dashed" onClick={createTestConfig}>
                                        Test Config
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleCreateConfig}
                                        style={{ background: '#0078d4', borderColor: '#0078d4' }}
                                    >
                                        Nouvelle configuration
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                    </Card>

                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <UploadOutlined style={{ color: '#0078d4' }} />
                                <span>Configurations disponibles</span>
                            </div>
                        }
                        style={{ borderRadius: '12px' }}
                        styles={{ body: { padding: 0 } }}
                    >
                        <Spin spinning={loading}>
                            {Array.isArray(configs) ? (
                                <List
                                    dataSource={configs}
                                    locale={{
                                        emptyText: (
                                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                                <Text type="secondary">Aucune configuration d'import disponible</Text>
                                                <div style={{ marginTop: 16 }}>
                                                    <Button type="primary" onClick={handleCreateConfig}>
                                                        Créer votre première configuration
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    }}
                                    renderItem={(config, index) => {
                                        if (!config) {
                                            return (
                                                <List.Item style={{ padding: '20px 24px', borderBottom: index === configs.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
                                                    <List.Item.Meta
                                                        title={<Text>Configuration corrompue</Text>}
                                                        description="Cette configuration ne peut pas être affichée"
                                                    />
                                                </List.Item>
                                            );
                                        }

                                        const status = getConfigStatus(config);
                                        return (
                                            <List.Item
                                                style={{ padding: '20px 24px', borderBottom: index === configs.length - 1 ? 'none' : '1px solid #f0f0f0' }}
                                                actions={[
                                                    <Tooltip title="Voir les détails" key="view">
                                                        <Button type="text" icon={<EyeOutlined />} onClick={() => handleEditConfig(config)} />
                                                    </Tooltip>,
                                                    <Tooltip title="Modifier" key="edit">
                                                        <Button type="text" icon={<EditOutlined />} onClick={() => handleEditConfig(config)} />
                                                    </Tooltip>,
                                                    <Tooltip title="Dupliquer" key="copy">
                                                        <Button type="text" icon={<CopyOutlined />} onClick={() => handleDuplicateConfig(config.id || '')} />
                                                    </Tooltip>,
                                                    <Popconfirm
                                                        title="Supprimer cette configuration ?"
                                                        onConfirm={() => handleDeleteConfig(config.id || '')}
                                                        key="delete"
                                                    >
                                                        <Button type="text" danger icon={<DeleteOutlined />} />
                                                    </Popconfirm>
                                                ]}
                                            >
                                                <List.Item.Meta
                                                    title={
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <Text strong>{config.name}</Text>
                                                            <Tag color={status.color}>{status.text}</Tag>
                                                                                                        {config.configData.Folders?.EnableShareProvisioning && (
                                                <Tag color="#7c3aed"><FolderOutlined /> Dossiers</Tag>
                                            )}
                                            {config.configData.TeamsIntegration?.enabled && (
                                                <Tag color="#059669"><TeamOutlined /> Teams</Tag>
                                            )}
                                                            {!config.isEnabled && <Tag color="#dc2626">Désactivée</Tag>}
                                                        </div>
                                                    }
                                                    description={
                                                        <div>
                                                            <div style={{ marginBottom: 8 }}>{config.description}</div>
                                                            <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                                Créé par : {config.createdBy} • OU : {config.configData.defaultOU || 'Non défini'}
                                                                {config.updatedAt && ` • Modifié le ${new Date(config.updatedAt).toLocaleDateString()}`}
                                                            </Text>
                                                        </div>
                                                    }
                                                />
                                            </List.Item>
                                        );
                                    }}
                                />
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <Text type="secondary">Chargement des configurations...</Text>
                                </div>
                            )}
                        </Spin>
                    </Card>
                </>
            )}
        </div>
    );
};

export default EnhancedImportConfigSettings;
