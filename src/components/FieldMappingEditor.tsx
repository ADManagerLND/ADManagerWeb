import React, {useEffect, useMemo, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Collapse,
    Divider,
    Empty,
    Form,
    FormInstance,
    Input,
    Popover,
    Row,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {BulbOutlined, DeleteOutlined, MoreOutlined, QuestionCircleOutlined, SyncOutlined} from '@ant-design/icons';
import {UserAttribute} from '../models/ApplicationSettings';
import {useSettings} from '../hooks/useSettings';

const {Panel} = Collapse;
const {Text, Title} = Typography;
const {Option} = Select;

export interface MappingRow {
    id: string;
    csvColumn: string;
    adAttribute: string;
    isRequired: boolean;
    defaultValue?: string;
}

export interface AdAttributeInfo extends Omit<UserAttribute, 'dataType'> {
    displayName: string;
    description: string;
    isRequired: boolean;
    dataType: string;
}

/**
 * Génère le sAMAccountName en conservant le prénom en entier,
 * puis en complétant avec le nom nettoyé (sans accents, espaces, ni caractères spéciaux)
 * jusqu'à atteindre la limite de 20 caractères.
 */
export function generateSamAccountName(prenom: string, nom: string, maxLength: number = 20): string {
    const removeAccents = (str: string) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const clean = (str: string) =>
        removeAccents(str || '').toLowerCase().replace(/[^a-z]/g, '');

    const prenomClean = clean(prenom);
    const nomClean = clean(nom);

    const espaceDisponible = maxLength - prenomClean.length;
    if (espaceDisponible > 0) {
        return prenomClean + nomClean.substring(0, espaceDisponible);
    }
    return prenomClean.substring(0, maxLength);
}

/**
 * Applique un template aux données CSV en remplaçant les tokens.
 */
export function applyTemplate(template: string, row: Record<string, any>): string {
    if (!template) return '';

    return template.replace(/%([^%]+)%/g, (match, group1) => {
        const [colName, transform] = group1.split(':');
        let rawValue = row[colName] || '';

        // Cas spécial pour sAMAccountName - génération automatique si vide
        if (colName.toLowerCase() === 'samaccountname' && !rawValue) {
            rawValue = generateSamAccountName(row['prenom'] || row['Prenom'] || '', row['nom'] || row['Nom'] || '');
        }

        if (typeof rawValue !== 'string') {
            rawValue = String(rawValue ?? '');
        }

        // Application des transformations
        if (transform) {
            switch (transform.toLowerCase()) {
                case 'uppercase':
                    rawValue = rawValue.toUpperCase();
                    break;
                case 'lowercase':
                    rawValue = rawValue.toLowerCase();
                    break;
                case 'trim':
                    rawValue = rawValue.trim();
                    break;
                case 'capitalize':
                    rawValue = rawValue.charAt(0).toUpperCase() + rawValue.slice(1).toLowerCase();
                    break;
                case 'first':
                    rawValue = rawValue.charAt(0);
                    break;
                default:
                    break;
            }
        }

        return rawValue;
    });
}

/**
 * Composant qui affiche les infos et aides sur les transformations disponibles
 */
const TransformationsHelp: React.FC = () => (
    <Card size="small" title="Transformations disponibles">
        <table style={{width: '100%'}}>
            <thead>
            <tr>
                <th>Transformation</th>
                <th>Description</th>
                <th>Exemple</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td><code>uppercase</code></td>
                <td>Convertit en majuscules</td>
                <td><code>%nom:uppercase%</code> → DUPONT</td>
            </tr>
            <tr>
                <td><code>lowercase</code></td>
                <td>Convertit en minuscules</td>
                <td><code>%prenom:lowercase%</code> → jean</td>
            </tr>
            <tr>
                <td><code>capitalize</code></td>
                <td>Première lettre en majuscule</td>
                <td><code>%prenom:capitalize%</code> → Jean</td>
            </tr>
            <tr>
                <td><code>trim</code></td>
                <td>Supprime les espaces</td>
                <td><code>%service:trim%</code> → Marketing</td>
            </tr>
            <tr>
                <td><code>first</code></td>
                <td>Première lettre uniquement</td>
                <td><code>%prenom:first%</code> → J</td>
            </tr>
            </tbody>
        </table>
        <Divider/>
        <Text type="secondary">
            Exemple complet: <code>%prenom:lowercase%.%nom:lowercase%@entreprise.com</code>
        </Text>
    </Card>
);

/**
 * FieldMappingRow représente l'édition d'un mapping unique.
 */
interface FieldMappingRowProps {
    field: any;
    availableAttributes: AdAttributeInfo[];
    availableCsvColumns: string[];
    remove: (name: number | number[]) => void;
    form: FormInstance;
    attributesLoading: boolean;
    csvData: any[];
}

const FieldMappingRow: React.FC<FieldMappingRowProps> = ({
                                                             field,
                                                             availableAttributes,
                                                             availableCsvColumns,
                                                             remove,
                                                             form,
                                                             attributesLoading,
                                                             csvData
                                                         }) => {
    const mappingValue = Form.useWatch(['mappings', field.name, 'mappingValue'], form);
    const attributeValue = Form.useWatch(['mappings', field.name, 'attribute'], form);

    // Obtenir les informations de l'attribut actuellement sélectionné
    const selectedAttribute = useMemo(() => {
        return availableAttributes.find(attr => attr.name === attributeValue);
    }, [availableAttributes, attributeValue]);

    const handleInsertToken = (colName: string) => {
        const current: string = form.getFieldValue(['mappings', field.name, 'mappingValue']) || '';
        const token = `%${colName}%`;
        form.setFieldValue(['mappings', field.name, 'mappingValue'], current + token);
    };

    // Preview de la valeur générée
    const previewValue = useMemo(() => {
        if (!csvData.length || !mappingValue) return '';
        try {
            return applyTemplate(mappingValue, csvData[0]);
        } catch (err) {
            return 'Erreur dans le template';
        }
    }, [mappingValue, csvData]);

    // Détermine si ce mapping correspond à un attribut obligatoire.
    const isRequiredMapping = selectedAttribute?.isRequired || false;

    return (
        <Card size="small" style={{marginBottom: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: 6}}>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <Form.Item
                        name={[field.name, 'attribute']}
                        label={<Typography.Text strong>Attribut AD</Typography.Text>}
                        rules={[{required: true, message: 'Attribut requis'}]}
                        style={{marginBottom: 8}}
                        tooltip="Sélectionnez l'attribut Active Directory à mapper"
                    >
                        <Select
                            loading={attributesLoading}
                            placeholder="Attribut AD"
                            showSearch
                            optionFilterProp="children"
                            style={{width: '100%'}}
                            filterOption={(input: string, option: any) => {
                                if (!option || !option.children) return false;
                                return option.children.toString().toLowerCase().includes(input.toLowerCase());
                            }}
                            notFoundContent={attributesLoading ? 'Chargement...' : 'Aucun attribut trouvé'}
                        >
                            {availableAttributes.map((attr, idx) => (
                                <Select.Option key={`attr-${idx}`} value={attr.name || ''}>
                                    <Space>
                                        {attr.displayName || attr.name || 'Sans nom'}
                                        {attr.isRequired && <Tag color="red">Requis</Tag>}
                                    </Space>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {selectedAttribute && (
                        <Alert
                            message={selectedAttribute.description}
                            type="info"
                            showIcon
                            style={{marginBottom: 8}}
                        />
                    )}
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name={[field.name, 'mappingValue']}
                        label={
                            <Space>
                                <Typography.Text strong>Valeur</Typography.Text>
                                <Popover
                                    content={<TransformationsHelp/>}
                                    title="Aide sur les templates"
                                    trigger="click"
                                >
                                    <QuestionCircleOutlined style={{cursor: 'pointer', color: '#1890ff'}}/>
                                </Popover>
                            </Space>
                        }
                        rules={[{required: true, message: 'Valeur requise'}]}
                        style={{marginBottom: 8}}
                        tooltip="Utilisez %colonne% pour insérer des valeurs de colonnes CSV"
                    >
                        <Input placeholder="Ex: %prenom:capitalize%.%nom:uppercase%@domaine.com"/>
                    </Form.Item>

                    <div style={{marginBottom: 8, maxWidth: '100%', overflowX: 'auto'}}>
                        <Space wrap size={[4, 8]}>
                            {availableCsvColumns.slice(0, 6).map((col, index) => (
                                <Button
                                    key={`token-${index}`}
                                    size="small"
                                    onClick={() => handleInsertToken(col)}
                                    type="dashed"
                                >
                                    {col}
                                </Button>
                            ))}
                            {availableCsvColumns.length > 6 && (
                                <Popover
                                    title="Toutes les colonnes CSV"
                                    content={
                                        <div style={{maxWidth: 300, maxHeight: 200, overflowY: 'auto'}}>
                                            <Space direction="vertical" style={{width: '100%'}}>
                                                {availableCsvColumns.map((col, idx) => (
                                                    <Button
                                                        key={`pop-col-${idx}`}
                                                        size="small"
                                                        onClick={() => {
                                                            handleInsertToken(col);
                                                            return false;
                                                        }}
                                                        style={{marginBottom: 4}}
                                                        block
                                                    >
                                                        {col}
                                                    </Button>
                                                ))}
                                            </Space>
                                        </div>
                                    }
                                    trigger="click"
                                >
                                    <Button size="small" icon={<MoreOutlined/>}>
                                        Plus de colonnes
                                    </Button>
                                </Popover>
                            )}
                        </Space>
                    </div>

                    {previewValue && (
                        <Alert
                            message={
                                <Space>
                                    <BulbOutlined/>
                                    <span>Aperçu: <Text code>{previewValue}</Text></span>
                                </Space>
                            }
                            type="success"
                            style={{marginTop: 8}}
                        />
                    )}
                </Col>

                <Col xs={24} md={4} style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end'}}>
                    <Space>
                        {/* Bouton de suppression affiché uniquement si le mapping n'est pas obligatoire */}
                        {!isRequiredMapping && (
                            <Tooltip title="Supprimer ce mappage">
                                <Button
                                    danger
                                    shape="circle"
                                    icon={<DeleteOutlined/>}
                                    onClick={() => remove(field.name)}
                                />
                            </Tooltip>
                        )}
                    </Space>
                </Col>
            </Row>
        </Card>
    );
};

/**
 * FieldMappingEditor gère la liste complète des mappages.
 */
interface FieldMappingEditorProps {
    csvData: any[];
    csvColumns: string[];
    initialMappings?: MappingRow[];
    onSave?: (mappings: MappingRow[]) => void;
    attributesLoading?: boolean;
    adAttributes?: UserAttribute[];
}

const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({
                                                                   csvData,
                                                                   csvColumns,
                                                                   initialMappings = [],
                                                                   onSave,
                                                                   attributesLoading = false,
                                                                   adAttributes: propAttributes
                                                               }) => {
    const [mappings, setMappings] = useState<MappingRow[]>([]);

    // Si les attributs ne sont pas fournis en props, les récupérer via le hook
    const {
        settings: hookAttributes,
        loading: hookLoading,
        error: hookError
    } = useSettings<UserAttribute[]>('user-attributes');

    // Utiliser les attributs fournis en props ou ceux du hook
    const adAttributes = propAttributes || hookAttributes || [];
    const isLoading = attributesLoading || hookLoading;

    // Déterminer s'il y a une erreur de chargement
    const hasError = !!hookError && !propAttributes;

    // Initialiser les mappages avec les valeurs par défaut ou celles fournies
    useEffect(() => {
        if (initialMappings.length > 0) {
            setMappings(initialMappings);
        } else if (csvColumns.length > 0 && Array.isArray(adAttributes) && adAttributes.length > 0) {
            // Créer des mappages par défaut si possible
            const defaultMappings = csvColumns.map((column, index) => {
                // Essayer de faire correspondre le nom de colonne avec un attribut AD
                const matchingAttribute = adAttributes.find(attr =>
                    attr.name.toLowerCase().includes(column.toLowerCase()) ||
                    column.toLowerCase().includes(attr.name.toLowerCase())
                );

                return {
                    id: `mapping-${index}`,
                    csvColumn: column,
                    adAttribute: matchingAttribute ? matchingAttribute.name : '',
                    isRequired: matchingAttribute ? matchingAttribute.isRequired : false
                };
            });

            setMappings(defaultMappings);
        }
    }, [initialMappings, csvColumns, adAttributes]);

    // Gestionnaire pour mettre à jour un mappage
    const handleMappingChange = (id: string, field: keyof MappingRow, value: string | boolean) => {
        const updatedMappings = mappings.map(mapping => {
            if (mapping.id === id) {
                // Si l'attribut cible change, vérifier si c'est requis
                if (field === 'adAttribute' && typeof value === 'string') {
                    const attribute = Array.isArray(adAttributes) ? adAttributes.find(attr => attr.name === value) : undefined;
                    return {
                        ...mapping,
                        [field]: value,
                        isRequired: attribute?.isRequired || false
                    };
                }
                return {...mapping, [field]: value};
            }
            return mapping;
        });

        setMappings(updatedMappings);
        if (onSave) onSave(updatedMappings);
    };

    // Ajouter un nouveau mappage
    const addMapping = () => {
        const newMapping: MappingRow = {
            id: `mapping-${Date.now()}`,
            csvColumn: '',
            adAttribute: '',
            isRequired: false
        };

        const updatedMappings = [...mappings, newMapping];
        setMappings(updatedMappings);
        if (onSave) onSave(updatedMappings);
    };

    // Supprimer un mappage
    const deleteMapping = (id: string) => {
        const updatedMappings = mappings.filter(mapping => mapping.id !== id);
        setMappings(updatedMappings);
        if (onSave) onSave(updatedMappings);
    };

    // Définition des colonnes pour le tableau
    const columns = [
        {
            title: 'Colonne CSV',
            dataIndex: 'csvColumn',
            key: 'csvColumn',
            render: (text: string, record: MappingRow) => (
                <Select
                    style={{width: '100%'}}
                    value={text || undefined}
                    placeholder="Sélectionner une colonne"
                    onChange={(value) => handleMappingChange(record.id, 'csvColumn', value)}
                >
                    {csvColumns.map(column => (
                        <Option key={column} value={column}>{column}</Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Attribut Active Directory',
            dataIndex: 'adAttribute',
            key: 'adAttribute',
            render: (text: string, record: MappingRow) => (
                <Select
                    style={{width: '100%'}}
                    value={text || undefined}
                    placeholder={isLoading ? "Chargement..." : "Sélectionner un attribut"}
                    onChange={(value) => handleMappingChange(record.id, 'adAttribute', value)}
                    loading={isLoading}
                    disabled={isLoading || hasError}
                >
                    {Array.isArray(adAttributes) && adAttributes.map(attr => (
                        <Option key={attr.name} value={attr.name}>
                            {attr.displayName || attr.name} {attr.isRequired && '(Requis)'}
                        </Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Valeur par défaut / Template',
            dataIndex: 'defaultValue',
            key: 'defaultValue',
            render: (text: string | undefined, record: MappingRow) => (
                <Input
                    placeholder="Valeur par défaut ou template avec %colonne%"
                    value={text}
                    onChange={(e) => handleMappingChange(record.id, 'defaultValue', e.target.value)}
                />
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: MappingRow) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined/>}
                    onClick={() => deleteMapping(record.id)}
                    disabled={record.isRequired}
                />
            )
        }
    ];

    // Rendu du composant avec gestion des états de chargement et d'erreur
    if (isLoading) {
        return (
            <div style={{textAlign: 'center', padding: '30px'}}>
                <Spin tip="Chargement des attributs..."/>
            </div>
        );
    }

    if (hasError) {
        return (
            <Alert
                message="Erreur de chargement"
                description={`Impossible de charger les attributs AD: ${hookError}`}
                type="error"
                showIcon
            />
        );
    }

    if (!Array.isArray(adAttributes) || adAttributes.length === 0) {
        return (
            <Empty
                description={
                    <span>
            Aucun attribut AD n'est défini. Veuillez configurer les attributs dans les paramètres.
          </span>
                }
            />
        );
    }

    return (
        <div style={{
            padding: 16,
            backgroundColor: '#fff',
            borderRadius: 8,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: '#f9fafc',
                borderRadius: 8,
                border: '1px solid #f0f0f0'
            }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Typography.Title level={5} style={{margin: 0}}>
                            {(mappings || []).length} mappages définis
                        </Typography.Title>
                    </Col>
                    <Col>
                        <Space>
                            <Tooltip title="Suggérer des mappages automatiquement">
                                <Button
                                    icon={<SyncOutlined/>}
                                    onClick={addMapping}
                                >
                                    Ajouter un mappage
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Table des mappages */}
            <Table
                dataSource={mappings}
                columns={columns}
                rowKey="id"
                pagination={false}
                locale={{emptyText: 'Aucun mappage défini. Cliquez sur "Ajouter un mappage" pour commencer.'}}
            />

            {/* Aide sur les transformations */}
            <div style={{marginTop: 24}}>
                <Collapse ghost>
                    <Panel header="Aide sur les templates de transformation" key="1">
                        <TransformationsHelp/>
                    </Panel>
                </Collapse>
            </div>
        </div>
    );
};

export default FieldMappingEditor; 