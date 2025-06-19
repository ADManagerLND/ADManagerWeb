import React, {useEffect, useState} from 'react';
import {Avatar, Button, Card, Col, Divider, Empty, Input, Row, Space, Tabs, Tag, Tooltip, Typography} from 'antd';
import {InfoCircleOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, UserOutlined} from '@ant-design/icons';
import type {UserAttribute} from '../models/ApplicationSettings';
import {useSettings} from '../hooks/useSettings';
import '../styles/HeaderMappingEditor.css';

const {Text} = Typography;

export interface ADPreviewProps {
    csvData: any[];
    mappings: Array<{
        id: string;
        csvColumn: string;
        adAttribute: string;
        isRequired: boolean;
        defaultValue?: string;
    }>;
    adAttributes?: UserAttribute[];
    loading?: boolean;
    onRefresh?: () => void;
}

// Regroupements d'attributs AD par onglet
const attributeGroups: Record<string, string[]> = {
    general: [
        'givenName', 'sn', 'initials', 'displayName', 'description',
        'physicalDeliveryOfficeName', 'telephoneNumber', 'mail', 'wWWHomePage'
    ],
    address: [
        'streetAddress', 'postOfficeBox', 'l', 'st', 'postalCode', 'co', 'c'
    ],
    account: [
        'sAMAccountName', 'userPrincipalName', 'mail', 'distinguishedName', 'objectGUID', 'userAccountControl'
    ],
    profile: [
        'profilePath', 'scriptPath', 'homeDirectory', 'homeDrive'
    ],
    phones: [
        'telephoneNumber', 'homePhone', 'pager', 'mobile', 'facsimileTelephoneNumber', 'ipPhone'
    ],
    organization: [
        'title', 'department', 'company', 'manager', 'directReports'
    ],
    custom: []
};

// Attributs obligatoires selon Active Directory
const requiredAttributes = ['sAMAccountName', 'displayName', 'userPrincipalName'];

// Libellés français pour les attributs AD
const attributeLabels: Record<string, string> = {
    givenName: 'Prénom',
    sn: 'Nom',
    initials: 'Initiales',
    displayName: 'Nom complet',
    description: 'Description',
    physicalDeliveryOfficeName: 'Bureau',
    telephoneNumber: 'Numéro de téléphone',
    mail: 'Adresse de messagerie',
    wWWHomePage: 'Page Web',
    streetAddress: 'Adresse',
    postOfficeBox: 'Boîte postale',
    l: 'Ville',
    st: 'Département ou région',
    postalCode: 'Code postal',
    co: 'Pays/Région',
    c: 'Code pays (ISO)',
    sAMAccountName: "Nom d'ouverture de session",
    userPrincipalName: "Nom UPN",
    distinguishedName: "Nom distinctif (DN)",
    objectGUID: "GUID de l'objet",
    userAccountControl: "Contrôle du compte",
    profilePath: "Chemin du profil",
    scriptPath: "Script d'ouverture de session",
    homeDirectory: "Dossier personnel",
    homeDrive: "Lecteur",
    homePhone: "Domicile",
    pager: "Radiomessagerie",
    mobile: "Tél. Mobile",
    facsimileTelephoneNumber: "Télécopie",
    ipPhone: "Téléphone IP",
    title: "Fonction",
    department: "Service",
    company: "Société",
    manager: "Responsable",
    directReports: "Employés",
};

const ADPreview: React.FC<ADPreviewProps> = ({csvData, mappings, adAttributes = [], loading = false, onRefresh}) => {
    const [previewData, setPreviewData] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState('general');

    // Utilisation du hook useSettings pour récupérer les attributs utilisateur
    const {
        settings: userAttributesSettings,
        loading: attributesLoading,
        error: attributesError
    } = useSettings<UserAttribute[]>('user-attributes');

    // Fusionner les attributs du hook avec ceux passés en props
    const allAttributes = Array.isArray(adAttributes) && adAttributes.length > 0
        ? adAttributes
        : (Array.isArray(userAttributesSettings) ? userAttributesSettings : []);
    const isLoading = loading || attributesLoading;
    const hasError = !!attributesError && (!Array.isArray(adAttributes) || adAttributes.length === 0);

    useEffect(() => {
        if (!csvData?.length || !mappings?.length) return;

        const firstRow = csvData[0];
        const newPreviewData: Record<string, string> = {};

        mappings.forEach((mapping) => {
            const {csvColumn, adAttribute} = mapping;
            if (!adAttribute || !csvColumn) return;

            // Traitement des templates de mappage (comme %prenom%, %nom:uppercase%, etc.)
            let processedValue = csvColumn;

            // Si c'est un template avec des variables %...%
            if (processedValue.includes('%')) {
                // Remplacer les variables par les valeurs du CSV
                processedValue = processedValue.replace(/%([^%:]+)(?::([^%]+))?%/g, (match, columnName, transformation) => {
                    let value = firstRow[columnName] || '';
                    
                    // Appliquer les transformations
                    if (transformation) {
                        switch (transformation.toLowerCase()) {
                            case 'uppercase':
                                value = value.toUpperCase();
                                break;
                            case 'lowercase':
                                value = value.toLowerCase();
                                break;
                            case 'username':
                                // Conversion en format username (suppression accents, espaces, etc.)
                                value = value
                                    .toLowerCase()
                                    .normalize('NFD')
                                    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
                                    .replace(/[^a-z0-9]/g, ''); // Garde seulement lettres et chiffres
                                break;
                            case 'capitalize':
                                value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                                break;
                        }
                    }
                    
                    return value;
                });
            } else {
                // Si ce n'est pas un template, utiliser directement la valeur de la colonne CSV
                processedValue = firstRow[processedValue] || mapping.defaultValue || '';
            }

            newPreviewData[adAttribute] = processedValue;
        });

        setPreviewData(newPreviewData);
    }, [csvData, mappings]);

    if (!csvData?.length || !mappings?.length) {
        return (
            <Card 
                title={
                    <Space align="center">
                        <Avatar size="large" icon={<UserOutlined/>} style={{ backgroundColor: '#faad14' }}/>
                        <div>
                            <div style={{fontWeight: 'bold', fontSize: '16px'}}>Prévisualisation Active Directory</div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>En attente de configuration...</Text>
                        </div>
                    </Space>
                }
                style={{
                    minHeight: 400,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid #d9d9d9',
                    borderRadius: '8px'
                }}
                extra={
                    <Space>
                        <Button 
                            type="primary" 
                            icon={<ReloadOutlined/>} 
                            size="small"
                            onClick={() => {
                                onRefresh?.();
                                // Force re-render
                                setPreviewData({});
                            }}
                        >
                            Actualiser
                        </Button>
                    </Space>
                }
            >
                <div style={{ 
                    backgroundColor: '#fff7e6', 
                    padding: '16px', 
                    borderRadius: '6px', 
                    marginBottom: '16px',
                    border: '1px solid #ffd591',
                    textAlign: 'center'
                }}>
                    <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ color: '#fa8c16', fontSize: '16px' }}>
                            ⚠️ Configuration requise
                        </Text>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <Text>
                            Pour voir la prévisualisation Active Directory, vous devez :
                        </Text>
                    </div>
                    <div style={{ textAlign: 'left', marginBottom: 16 }}>
                        <div style={{ marginBottom: 8 }}>
                            <Text>• {!mappings?.length ? '❌' : '✅'} <strong>Configurer au moins un mappage</strong> d'attribut AD</Text>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <Text>• {!csvData?.length ? '❌' : '✅'} <strong>Avoir des données d'exemple</strong> disponibles</Text>
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined/>}
                            onClick={() => {
                                // Essayer de faire défiler vers le haut vers le HeaderMappingEditor
                                const mappingEditor = document.querySelector('.ant-card .ant-form-item');
                                mappingEditor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                        >
                            Configurer un mappage
                        </Button>
                        <Button 
                            style={{ marginLeft: 8 }}
                            icon={<ReloadOutlined/>}
                            onClick={() => {
                                onRefresh?.();
                                setPreviewData({});
                            }}
                        >
                            Actualiser
                        </Button>
                    </div>
                </div>
                
                <Empty
                    description={
                        <div>
                            <Text type="secondary">
                                Une fois configuré, vous verrez ici une simulation complète<br/>
                                de l'interface des propriétés utilisateur d'Active Directory
                            </Text>
                        </div>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Card>
        );
    }

    const titre = previewData.displayName
        ? `${previewData.displayName} (${previewData.sAMAccountName || ''})`
        : 'Prévisualisation AD';

    // Fonction générique pour rendre un onglet
    const renderTabContent = (attributeList: string[]) => (
        <Row gutter={[16, 16]}>
            {attributeList.map((attrName) => {
                // Vérifier si l'attribut est requis basé sur les settings et/ou la liste statique
                const attributeInfo = Array.isArray(allAttributes)
                    ? allAttributes.find(attr => attr.name === attrName)
                    : undefined;
                const isRequired = requiredAttributes.includes(attrName) || (attributeInfo?.isRequired ?? false);
                const isMapped = previewData[attrName] !== undefined;

                return (
                    <Col key={attrName} xs={24} md={12}>
                        <div style={{marginBottom: 8}}>
                            <Space>
                                <Text
                                    strong>{attributeLabels[attrName] || attributeInfo?.displayName || attrName}</Text>
                                {isRequired && <Tag color="red">Requis</Tag>}
                                {!isMapped && <Tag color="orange">Non mappé</Tag>}
                                <Tooltip title={attributeInfo?.description || "Information sur cet attribut"}>
                                    <InfoCircleOutlined style={{color: '#1890ff'}}/>
                                </Tooltip>
                            </Space>
                        </div>
                        <Input
                            value={previewData[attrName] || ''}
                            readOnly
                            placeholder={isRequired ? "Cet attribut est requis" : "Non mappé"}
                            status={isRequired && !previewData[attrName] ? "error" : ""}
                            className={`ad-preview-input ${
                                isRequired && !previewData[attrName] ? 'ad-preview-required' :
                                isMapped ? 'ad-preview-mapped' : 'ad-preview-unmapped'
                            }`}
                        />
                    </Col>
                );
            })}
        </Row>
    );

    // Ajout des attributs personnalisés à l'onglet custom
    const customAttributes = Array.isArray(allAttributes)
        ? allAttributes
            .filter(attr => !Object.values(attributeGroups).flat().includes(attr.name))
            .map(attr => attr.name)
        : [];

    attributeGroups.custom = customAttributes;

    // Construction des items pour le composant Tabs
    const tabItems = [
        {
            key: 'general',
            label: 'Général',
            children: renderTabContent(attributeGroups.general)
        },
        {
            key: 'account',
            label: 'Compte',
            children: renderTabContent(attributeGroups.account)
        },
        {
            key: 'address',
            label: 'Adresse',
            children: renderTabContent(attributeGroups.address)
        },
        {
            key: 'profile',
            label: 'Profil',
            children: renderTabContent(attributeGroups.profile)
        },
        {
            key: 'phones',
            label: 'Téléphones',
            children: renderTabContent(attributeGroups.phones)
        },
        {
            key: 'organization',
            label: 'Organisation',
            children: renderTabContent(attributeGroups.organization)
        }
    ];

    // Ajouter l'onglet des attributs personnalisés s'il y en a
    if (customAttributes.length > 0) {
        tabItems.push({
            key: 'custom',
            label: 'Attributs personnalisés',
            children: renderTabContent(attributeGroups.custom)
        });
    }

    return (
        <div className="ad-preview-container">
            <Card
                title={(
                    <Space align="center">
                        <Avatar size="large" icon={<UserOutlined/>} style={{ backgroundColor: '#1890ff' }}/>
                        <div>
                            <div style={{fontWeight: 'bold', fontSize: '16px'}}>{titre}</div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>Prévisualisation des propriétés utilisateur Active Directory</Text>
                        </div>
                    </Space>
                )}
                style={{
                    minHeight: 500,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid #d9d9d9',
                    borderRadius: '8px'
                }}
                loading={isLoading}
                extra={
                    <Space>
                        <Tag color="blue" style={{ marginRight: 8 }}>
                            {Object.keys(previewData).length} attribut{Object.keys(previewData).length > 1 ? 's' : ''} mappé{Object.keys(previewData).length > 1 ? 's' : ''}
                        </Tag>
                        <Button type="primary" icon={<SettingOutlined/>} size="small">
                            Ouvrir dans AD
                        </Button>
                    </Space>
                }
            >
                <div style={{ 
                    backgroundColor: '#fafafa', 
                    padding: '12px', 
                    borderRadius: '6px', 
                    marginBottom: '16px',
                    border: '1px solid #e8e8e8'
                }}>
                    <Text strong style={{ color: '#1890ff' }}>
                        💡 Cette prévisualisation simule l'interface des propriétés utilisateur d'Active Directory
                    </Text>
                </div>
                
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    type="card"
                    items={tabItems}
                />
            </Card>
        </div>
    );
};

export default ADPreview; 