import React, {useEffect, useState} from 'react';
import {Button, Card, Divider, Form, Input, List, Select, Space, Switch, Tag, Tooltip, Typography} from 'antd';
import {DeleteOutlined, PlusOutlined, WarningOutlined} from '@ant-design/icons';
import {
    ADMappingIntegrationUtils,
    ConflictBehavior,
    ImportConfig,
    MappingDisplayItem,
    MappingPreview,
    SavedImportConfig,
    ValidationResult
} from '../models/ADMappingIntegration';

const {Option} = Select;
const {Text} = Typography;

interface MappingItem {
    adAttribute: string;
    template: string;
    isValid?: boolean;
    errors?: string[];
    transformedValue?: string;
}

interface EnhancedMappingEditorProps {
    initialConfig?: Partial<SavedImportConfig>;
    onSave: (config: Partial<SavedImportConfig>) => void;
    onCancel: () => void;
    loading: boolean;
    availableCsvHeaders: string[];
    suggestedAttributes: { label: string, value: string }[];
    suggestedTransformations: string[];
    userAttributes: any[]; // Attributs de l'utilisateur pour la prévisualisation
}

const EnhancedMappingEditor: React.FC<EnhancedMappingEditorProps> = ({
                                                                         initialConfig,
                                                                         onSave,
                                                                         onCancel,
                                                                         loading,
                                                                         availableCsvHeaders,
                                                                         suggestedAttributes,
                                                                         suggestedTransformations,
                                                                         userAttributes
                                                                     }) => {
    const [form] = Form.useForm();
    const [localMappingDisplayItems, setLocalMappingDisplayItems] = useState<MappingDisplayItem[]>([]);
    const [previewData, setPreviewData] = useState<MappingPreview[]>([]);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    useEffect(() => {
        if (initialConfig?.configData?.headerMapping) {
            const displayItems = ADMappingIntegrationUtils.convertImportConfigToMappingDisplay({
                id: initialConfig.id || '',
                name: initialConfig.name || '',
                description: initialConfig.description || '',
                createdBy: initialConfig.createdBy || '',
                configData: initialConfig.configData,
                createdAt: initialConfig.createdAt || '',
            });
            setLocalMappingDisplayItems(displayItems);
            form.setFieldsValue(initialConfig);
            // Générer la prévisualisation initiale si les attributs utilisateur sont disponibles
            if (userAttributes.length > 0) {
                const currentHeaderMapping = ADMappingIntegrationUtils.convertDisplayItemsToHeaderMapping(displayItems);
                const previews = ADMappingIntegrationUtils.generateMappingPreviews(currentHeaderMapping, {}, userAttributes);
                setPreviewData(previews);
            }
        }
    }, [initialConfig, userAttributes, form]);

    // Fonction pour ajouter un nouveau mappage
    const addMapping = () => {
        setLocalMappingDisplayItems([...localMappingDisplayItems, {
            adAttribute: '',
            template: '',
            isTemplate: false,
            estimatedColumns: [],
            validation: {isValid: true, errors: [] as string[], warnings: [] as string[]}
        }]);
    };

    // Fonction pour supprimer un mappage
    const removeMapping = (index: number) => {
        const newItems = localMappingDisplayItems.filter((_, i) => i !== index);
        setLocalMappingDisplayItems(newItems);
    };

    // Gestionnaire de changement pour les champs de mappage
    const handleMappingChange = (index: number, field: keyof MappingDisplayItem, value: any) => {
        const newItems = [...localMappingDisplayItems];
        const item = {...newItems[index]}; // Créer une copie pour éviter la mutation directe
        if (item) {
            (item as any)[field] = value; // Utiliser 'as any' temporairement pour l'assignation de champ dynamique
            if (field === 'template') {
                item.isTemplate = typeof value === 'string' && value.includes('%');
                item.estimatedColumns = typeof value === 'string' ? ADMappingIntegrationUtils.extractColumnsFromTemplate(value) : [];
            }
            newItems[index] = item;
            setLocalMappingDisplayItems(newItems);
            updatePreviewAndValidation(newItems);
        }
    };

    // Fonction pour mettre à jour la prévisualisation et la validation
    const updatePreviewAndValidation = (currentItems: MappingDisplayItem[]) => {
        const currentHeaderMapping = ADMappingIntegrationUtils.convertDisplayItemsToHeaderMapping(currentItems);
        // Validation
        const validation = ADMappingIntegrationUtils.validateHeaderMapping(currentHeaderMapping);
        setValidationResult(validation);

        // Prévisualisation
        if (userAttributes.length > 0) {
            const previews = ADMappingIntegrationUtils.generateMappingPreviews(currentHeaderMapping, {}, userAttributes);
            setPreviewData(previews);
        } else {
            setPreviewData([]);
        }
    };

    // Gestion de la soumission du formulaire
    const onFinish = (values: Partial<SavedImportConfig>) => {
        // Convertir les display items en headerMapping pour la sauvegarde
        const headerMapping = ADMappingIntegrationUtils.convertDisplayItemsToHeaderMapping(localMappingDisplayItems);
        const finalConfig: Partial<SavedImportConfig> = {
            ...values,
            configData: {
                ...values.configData,
                headerMapping: headerMapping,
            } as ImportConfig,
        };
        onSave(finalConfig);
    };

    return (
        <Card title="Éditeur de Configuration AD" style={{width: '100%'}}>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={initialConfig}
                onValuesChange={(_, allValues: Partial<SavedImportConfig>) => {
                    // Mettre à jour les display items si les valeurs de form.Item changent
                    if (allValues.configData?.headerMapping) {
                        const displayItems = ADMappingIntegrationUtils.convertImportConfigToMappingDisplay({
                            id: initialConfig?.id || '',
                            name: initialConfig?.name || '',
                            description: initialConfig?.description || '',
                            createdBy: initialConfig?.createdBy || '',
                            configData: allValues.configData as ImportConfig,
                            createdAt: initialConfig?.createdAt || '',
                        });
                        setLocalMappingDisplayItems(displayItems);
                    }
                }}
            >
                <Form.Item name="name" label="Nom du Mappage" rules={[{required: true, message: 'Nom requis'}]}>
                    <Input/>
                </Form.Item>
                <Form.Item name="description" label="Description">
                    <Input.TextArea/>
                </Form.Item>

                <Divider orientation="left">Paramètres d'intégration Active Directory</Divider>

                <Form.Item
                    name={['configData', 'adMappingSettings', 'isADMappingEnabled']}
                    label="Activer l'intégration AD"
                    valuePropName="checked"
                >
                    <Switch/>
                </Form.Item>
                <Form.Item
                    name={['configData', 'adMappingSettings', 'targetOU']}
                    label="OU Cible"
                    rules={[{required: true, message: 'OU Cible requise'}]}
                >
                    <Input placeholder="ex: OU=Utilisateurs,DC=mondomaine,DC=local"/>
                </Form.Item>
                <Form.Item
                    name={['configData', 'adMappingSettings', 'conflictBehavior']}
                    label="Comportement en cas de conflit"
                    rules={[{required: true, message: 'Comportement en cas de conflit requis'}]}
                >
                    <Select>
                        {Object.values(ConflictBehavior).map(behavior => (
                            <Select.Option key={behavior} value={behavior}>
                                {behavior}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Divider orientation="left">Règles de mappage</Divider>

                <Form.List name={['configData', 'headerMapping']}>
                    {(_, {add, remove}) => (
                        <>
                            {localMappingDisplayItems.map((item, index) => (
                                <Space key={index} style={{display: 'flex', marginBottom: 8}} align="baseline">
                                    <Form.Item
                                        name={[index, 'adAttribute']}
                                        rules={[{required: true, message: 'Attribut AD requis'}]}
                                        style={{width: '200px'}}
                                    >
                                        <Select
                                            placeholder="Attribut AD"
                                            options={suggestedAttributes}
                                            showSearch
                                            onChange={value => handleMappingChange(index, 'adAttribute', value)}
                                        />
                                    </Form.Item>
                                    <Text style={{marginRight: 8}}>→</Text>
                                    <Form.Item
                                        name={[index, 'template']}
                                        rules={[{required: true, message: 'Template requis'}]}
                                        style={{flexGrow: 1}}
                                    >
                                        <Input
                                            placeholder="Ex: %Nom% %Prénom% ou nom.prénom@domaine.com"
                                            onChange={e => handleMappingChange(index, 'template', e.target.value)}
                                        />
                                    </Form.Item>
                                    <Select
                                        placeholder="Transformation"
                                        style={{width: 150}}
                                        value={ADMappingIntegrationUtils.extractTransformationFromTemplate(item.template)}
                                        onChange={value => {
                                            const currentTemplate = item.template;
                                            const newTemplate = ADMappingIntegrationUtils.applyTransformationToTemplate(currentTemplate, value);
                                            handleMappingChange(index, 'template', newTemplate);
                                        }}
                                        options={suggestedTransformations.map(t => ({label: t, value: t}))}
                                        allowClear
                                    />
                                    {item.isTemplate && item.estimatedColumns.length > 0 && (
                                        <Tooltip title={`Colonnes CSV estimées: ${item.estimatedColumns.join(', ')}`}>
                                            <Tag color="blue">CSV</Tag>
                                        </Tooltip>
                                    )}
                                    {item.validation && !item.validation.isValid && (
                                        <Tooltip title={item.validation.errors.join('\n')}>
                                            <Tag color="red"><WarningOutlined/> Erreur</Tag>
                                        </Tooltip>
                                    )}
                                    {item.validation && item.validation.warnings.length > 0 && (
                                        <Tooltip title={item.validation.warnings.join('\n')}>
                                            <Tag color="orange"><WarningOutlined/> Avertissement</Tag>
                                        </Tooltip>
                                    )}
                                    <Button danger onClick={() => remove(index)} icon={<DeleteOutlined/>}/>
                                </Space>
                            ))}
                            <Button type="dashed" onClick={add} block icon={<PlusOutlined/>}>
                                Ajouter un nouveau mappage
                            </Button>
                        </>
                    )}
                </Form.List>

                <Divider orientation="left">Prévisualisation</Divider>
                <List
                    bordered
                    dataSource={previewData}
                    renderItem={(preview: MappingPreview) => (
                        <List.Item>
                            <Text strong>{preview.adAttribute}:</Text> {preview.transformedValue || ''}
                            {preview.isValid ?
                                <Tag color="green" style={{marginLeft: 8}}>Valide</Tag> :
                                <Tag color="red" style={{marginLeft: 8}}>Invalide</Tag>
                            }
                            {preview.error &&
                                <Tooltip title={preview.error}><WarningOutlined style={{color: 'red', marginLeft: 4}}/></Tooltip>}
                            {preview.warnings && preview.warnings.length > 0 &&
                                <Tooltip title={preview.warnings.join('\n')}><WarningOutlined
                                    style={{color: 'orange', marginLeft: 4}}/></Tooltip>}
                        </List.Item>
                    )}
                />

                <Form.Item style={{marginTop: 24}}>
                    <Space>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Sauvegarder
                        </Button>
                        <Button onClick={onCancel}>Annuler</Button>
                    </Space>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default EnhancedMappingEditor;
