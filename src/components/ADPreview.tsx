import React, {useEffect, useState} from 'react';
import {Avatar, Button, Card, Col, Divider, Empty, Input, Row, Space, Tabs, Tag, Tooltip, Typography} from 'antd';
import {InfoCircleOutlined, SettingOutlined, UserOutlined} from '@ant-design/icons';
import type {UserAttribute} from '../models/ApplicationSettings';
import {useSettings} from '../hooks/useSettings';

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

const ADPreview: React.FC<ADPreviewProps> = ({csvData, mappings, adAttributes = [], loading = false}) => {
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

            // Récupérer la valeur directement depuis la colonne CSV correspondante
            newPreviewData[adAttribute] = firstRow[csvColumn] || mapping.defaultValue || '';
        });

        setPreviewData(newPreviewData);
    }, [csvData, mappings]);

    if (!csvData?.length || !mappings?.length) {
        return (
            <Card title="Aucune prévisualisation disponible">
                <Empty
                    description="Veuillez définir des mappages et fournir des données CSV pour visualiser un aperçu."/>
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
        <Card
            title={(
                <Space align="center">
                    <Avatar size="large" icon={<UserOutlined/>}/>
                    <div>
                        <div style={{fontWeight: 'bold'}}>{titre}</div>
                        <Text type="secondary">Prévisualisation des attributs AD</Text>
                    </div>
                </Space>
            )}
            style={{minHeight: 500}}
            loading={isLoading}
            extra={
                <Space>
                    <Button type="primary" icon={<SettingOutlined/>}>
                        Configuration AD
                    </Button>
                </Space>
            }
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                items={tabItems}
            />

            <Divider/>

            {/* Boutons en bas */}
            <div style={{textAlign: 'right'}}>
                <Space>
                    <Button>Précédent</Button>
                    <Button type="primary">Suivant</Button>
                    <Button>Annuler</Button>
                </Space>
            </div>
        </Card>
    );
};

export default ADPreview; 