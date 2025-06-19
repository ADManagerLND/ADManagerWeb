import React, {useCallback, useEffect, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Input,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {
    DeleteOutlined,
    EyeOutlined,
    InfoCircleOutlined,
    PlusOutlined
} from '@ant-design/icons';

const {Option} = Select;

// Attributs AD communs avec descriptions
const AD_ATTRIBUTES = [
    {value: 'sAMAccountName', label: 'sAMAccountName', description: 'Nom de connexion (obligatoire)', required: true},
    {value: 'userPrincipalName', label: 'userPrincipalName', description: 'UPN (email format)', required: true},
    {value: 'mail', label: 'mail', description: 'Adresse email'},
    {value: 'givenName', label: 'givenName', description: 'Prénom'},
    {value: 'sn', label: 'sn', description: 'Nom de famille'},
    {value: 'cn', label: 'cn', description: 'Nom commun'},
    {value: 'displayName', label: 'displayName', description: 'Nom d\'affichage', required: true},
    {value: 'description', label: 'description', description: 'Description'},
    {value: 'title', label: 'title', description: 'Titre/Fonction'},
    {value: 'department', label: 'department', description: 'Département'},
    {value: 'division', label: 'division', description: 'Division/Classe'},
    {value: 'company', label: 'company', description: 'Entreprise/École'},
    {value: 'manager', label: 'manager', description: 'Manager'},
    {value: 'telephoneNumber', label: 'telephoneNumber', description: 'Téléphone'},
    {value: 'mobile', label: 'mobile', description: 'Mobile'},
    {value: 'facsimileTelephoneNumber', label: 'facsimileTelephoneNumber', description: 'Fax'},
    {value: 'pager', label: 'pager', description: 'Bipeur'},
    {value: 'physicalDeliveryOfficeName', label: 'physicalDeliveryOfficeName', description: 'Bureau'},
    {value: 'streetAddress', label: 'streetAddress', description: 'Adresse'},
    {value: 'l', label: 'l', description: 'Ville'},
    {value: 'st', label: 'st', description: 'État/Région'},
    {value: 'postalCode', label: 'postalCode', description: 'Code postal'},
    {value: 'co', label: 'co', description: 'Pays'},
    {value: 'homeDirectory', label: 'homeDirectory', description: 'Répertoire personnel'},
    {value: 'homeDrive', label: 'homeDrive', description: 'Lecteur personnel'},
    {value: 'profilePath', label: 'profilePath', description: 'Chemin du profil'},
    {value: 'scriptPath', label: 'scriptPath', description: 'Script de connexion'},
    {value: 'initials', label: 'initials', description: 'Initiales'},
    {value: 'personalTitle', label: 'personalTitle', description: 'Titre personnel'},
    {value: 'extensionAttribute1', label: 'extensionAttribute1', description: 'Attribut étendu 1'},
    {value: 'extensionAttribute2', label: 'extensionAttribute2', description: 'Attribut étendu 2'},
    {value: 'extensionAttribute3', label: 'extensionAttribute3', description: 'Attribut étendu 3'},
    {value: 'extensionAttribute4', label: 'extensionAttribute4', description: 'Attribut étendu 4'},
    {value: 'extensionAttribute5', label: 'extensionAttribute5', description: 'Attribut étendu 5'}
];

// Modèles prédéfinis
const PRESET_MAPPINGS = {
    lycee: {
        sAMAccountName: '%prenom:username%.%nom:username%',
        userPrincipalName: '%prenom:username%.%nom:username%@lycee-ndchallans.com',
        mail: '%prenom:username%.%nom:username%@lycee-ndchallans.com',
        givenName: '%prenom%',
        sn: '%nom:uppercase%',
        cn: '%prenom% %nom%',
        displayName: '%prenom% %nom:uppercase%',
        division: '%classe%',
        company: 'Lycée Notre-Dame',
        description: 'Élève de la classe de %classe%',
        department: 'Eleves / %classe%',
        physicalDeliveryOfficeName: '%classe%'
    },
    entreprise: {
        sAMAccountName: '%username%',
        userPrincipalName: '%username%@company.com',
        mail: '%email%',
        givenName: '%firstname%',
        sn: '%lastname%',
        cn: '%firstname% %lastname%',
        displayName: '%firstname% %lastname%',
        title: '%jobtitle%',
        department: '%department%',
        company: 'Mon Entreprise'
    }
};

interface HeaderMappingEditorProps {
    value?: Record<string, string>;
    onChange?: (value: Record<string, string>) => void;
}

interface MappingRow {
    key: string;
    adAttribute: string;
    mapping: string;
}

const HeaderMappingEditor: React.FC<HeaderMappingEditorProps> = ({value = {}, onChange}) => {
    const [mappings, setMappings] = useState<MappingRow[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Initialiser les mappages depuis la valeur - UNE SEULE FOIS au montage
    useEffect(() => {
        if (initialized) return;

        if (!value || Object.keys(value).length === 0) {
            setInitialized(true);
            return;
        }

        const mappingRows: MappingRow[] = Object.entries(value).map(([adAttribute, mapping], index) => ({
            key: `${adAttribute}-${index}`,
            adAttribute,
            mapping
        }));

        setMappings(mappingRows);
        setInitialized(true);
    }, [value, initialized]);

    // Notifier les changements
    const notifyChange = useCallback((newMappings: MappingRow[]) => {
        const mappingObject: Record<string, string> = {};
        newMappings.forEach(row => {
            // Inclure même les mappages partiels (seulement adAttribute OU seulement mapping)
            if (row.adAttribute && row.mapping) {
                mappingObject[row.adAttribute] = row.mapping;
            }
        });
        onChange?.(mappingObject);
    }, [onChange]);

    // Ajouter un nouveau mappage
    const handleAdd = () => {
        const newKey = Date.now().toString();
        const newMappings = [...mappings, {
            key: newKey,
            adAttribute: '',
            mapping: ''
        }];
        setMappings(newMappings);
    };

    // Supprimer un mappage
    const handleDelete = (key: string) => {
        const newMappings = mappings.filter(item => item.key !== key);
        setMappings(newMappings);
        notifyChange(newMappings);
    };

    // Mettre à jour un mappage
    const updateMapping = (key: string, field: 'adAttribute' | 'mapping', value: string) => {
        const newMappings = mappings.map(item => {
            if (item.key === key) {
                return {...item, [field]: value};
            }
            return item;
        });
        setMappings(newMappings);
        
        // Seulement notifier les changements pour les mappages complets
        const completeMappings = newMappings.filter(row => row.adAttribute && row.mapping);
        const mappingObject: Record<string, string> = {};
        completeMappings.forEach(row => {
            mappingObject[row.adAttribute] = row.mapping;
        });
        onChange?.(mappingObject);
    };

    // Charger un modèle prédéfini
    const handleLoadPreset = (presetKey: keyof typeof PRESET_MAPPINGS) => {
        const preset = PRESET_MAPPINGS[presetKey];
        const newMappings: MappingRow[] = Object.entries(preset).map(([adAttribute, mapping], index) => ({
            key: `preset-${adAttribute}-${index}`,
            adAttribute,
            mapping
        }));
        setMappings(newMappings);
        notifyChange(newMappings);
    };

    const columns = [
        {
            title: 'Attribut Active Directory',
            dataIndex: 'adAttribute',
            key: 'adAttribute',
            width: '40%',
            render: (text: string, record: MappingRow) => (
                <Select
                    value={text}
                    onChange={(value) => updateMapping(record.key, 'adAttribute', value)}
                    style={{width: '100%'}}
                    placeholder="Sélectionner un attribut AD"
                    showSearch
                    optionLabelProp="label"
                    filterOption={(input, option) => {
                        const labelMatch = option?.label?.toString().toLowerCase().includes(input.toLowerCase()) ?? false;
                        const valueMatch = option?.value?.toString().toLowerCase().includes(input.toLowerCase()) ?? false;
                        return labelMatch || valueMatch;
                    }}
                >
                    {AD_ATTRIBUTES.map(attr => (
                        <Option key={attr.value} value={attr.value} label={attr.label}>
                            <div>
                                <Space>
                                    <strong>{attr.label}</strong>
                                    {attr.required && <Tag color="red">Requis</Tag>}
                                </Space>
                                <div style={{fontSize: '12px', color: '#666'}}>{attr.description}</div>
                            </div>
                        </Option>
                    ))}
                </Select>
            )
        },
        {
            title: (
                <Space>
                    <span>Mappage</span>
                    <Tooltip title="Utilisez des variables comme %nom%, %prenom%, %classe% avec des transformations optionnelles comme :uppercase, :lowercase">
                        <InfoCircleOutlined style={{color: '#1890ff'}} />
                    </Tooltip>
                </Space>
            ),
            dataIndex: 'mapping',
            key: 'mapping',
            width: '45%',
            render: (text: string, record: MappingRow) => (
                <Input
                    value={text}
                    onChange={(e) => updateMapping(record.key, 'mapping', e.target.value)}
                    placeholder="%prenom% %nom:uppercase%"
                    style={{width: '100%'}}
                />
            )
        },
        {
            title: 'Actions',
            dataIndex: 'actions',
            key: 'actions',
            width: '15%',
            render: (_: any, record: MappingRow) => (
                <Popconfirm
                    title="Êtes-vous sûr de vouloir supprimer ce mappage ?"
                    onConfirm={() => handleDelete(record.key)}
                    okText="Oui"
                    cancelText="Non"
                >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                        Supprimer
                    </Button>
                </Popconfirm>
            )
        }
    ];

    return (
        <Card title="Mappages des attributs Active Directory" size="small">
            <div style={{marginBottom: 16}}>
                <Space wrap>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Ajouter un mappage
                    </Button>
                    <Button 
                        icon={<EyeOutlined />} 
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? 'Masquer' : 'Aperçu'}
                    </Button>
                </Space>
            </div>

            <Table
                dataSource={mappings}
                columns={columns}
                pagination={false}
                locale={{
                    emptyText: (
                        <Empty
                            description="Aucun mappage configuré"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                Ajouter le premier mappage
                            </Button>
                        </Empty>
                    )
                }}
                style={{marginBottom: showPreview ? 16 : 0}}
            />

            {showPreview && mappings.length > 0 && (
                <Alert
                    type="info"
                    message="Aperçu des mappages"
                    description={
                        <div style={{marginTop: 8}}>
                            {mappings.map(mapping => (
                                <div key={mapping.key} style={{marginBottom: 4}}>
                                    <strong>{mapping.adAttribute}:</strong> {mapping.mapping || <em style={{color: '#999'}}>Non défini</em>}
                                </div>
                            ))}
                        </div>
                    }
                />
            )}
        </Card>
    );
};

export default HeaderMappingEditor; 