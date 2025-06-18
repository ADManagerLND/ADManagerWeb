import React from 'react';
import { Checkbox, Col, Row, Typography, Card, Tag } from 'antd';
import { ActionType } from '../models/CsvImport';

const { Text } = Typography;

interface ActionTypesSelectorProps {
    value?: ActionType[];
    onChange?: (values: ActionType[]) => void;
    disabled?: boolean;
}

// Configuration des types d'actions avec leurs descriptions
const actionTypeConfig = {
    [ActionType.CREATE_TEAM]: {
        label: 'Créer les équipes Teams',
        description: 'Création automatique d\'équipes Microsoft Teams pour chaque classe',
        color: 'purple',
        category: 'Teams'
    },
    [ActionType.CREATE_STUDENT_FOLDER]: {
        label: 'Créer les dossiers étudiants',
        description: 'Création des dossiers personnels et partages pour chaque étudiant',
        color: 'blue',
        category: 'Dossiers'
    },
    [ActionType.DELETE_USER]: {
        label: 'Supprimer les utilisateurs',
        description: 'Suppression des utilisateurs qui ne sont plus dans le fichier d\'import',
        color: 'red',
        category: 'Utilisateurs'
    },
    [ActionType.DELETE_OU]: {
        label: 'Supprimer les OUs vides',
        description: 'Suppression des unités organisationnelles qui deviennent vides',
        color: 'volcano',
        category: 'Organisation'
    },
    [ActionType.CREATE_CLASS_GROUP_FOLDER]: {
        label: 'Créer les dossiers de classe',
        description: 'Création des dossiers partagés pour chaque groupe de classe',
        color: 'cyan',
        category: 'Dossiers'
    },
    [ActionType.CREATE_GROUP]: {
        label: 'Créer les groupes AD',
        description: 'Création des groupes de sécurité et distribution Active Directory',
        color: 'green',
        category: 'Groupes'
    }
};

const ActionTypesSelector: React.FC<ActionTypesSelectorProps> = ({ 
    value = [], 
    onChange, 
    disabled = false 
}) => {
    const handleChange = (actionType: ActionType, checked: boolean) => {
        if (!onChange) return;
        
        if (checked) {
            // Ajouter à la liste des actions désactivées
            onChange([...value, actionType]);
        } else {
            // Retirer de la liste des actions désactivées
            onChange(value.filter(type => type !== actionType));
        }
    };

    const configurableActions = Object.keys(actionTypeConfig) as ActionType[];

    // Grouper par catégorie
    const groupedActions = configurableActions.reduce((groups, actionType) => {
        const config = actionTypeConfig[actionType as keyof typeof actionTypeConfig];
        if (!config) return groups;
        
        const category = config.category;
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(actionType);
        return groups;
    }, {} as Record<string, ActionType[]>);

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Text strong>Actions optionnelles</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    Désactivez les actions que vous ne souhaitez pas exécuter lors de l'import
                </Text>
            </div>

            {Object.entries(groupedActions).map(([category, actions]) => (
                <Card 
                    key={category}
                    size="small"
                    title={
                        <Text strong style={{ fontSize: '14px' }}>
                            {category}
                        </Text>
                    }
                    style={{ marginBottom: 12 }}
                    bodyStyle={{ padding: '12px 16px' }}
                >
                    <Row gutter={[12, 8]}>
                        {actions.map(actionType => {
                            const config = actionTypeConfig[actionType as keyof typeof actionTypeConfig];
                            if (!config) return null;
                            const isDisabled = value.includes(actionType);
                            
                            return (
                                <Col span={24} key={actionType}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'flex-start', 
                                        gap: 8,
                                        padding: '8px',
                                        backgroundColor: isDisabled ? '#f5f5f5' : 'transparent',
                                        borderRadius: '4px',
                                        border: isDisabled ? '1px dashed #d9d9d9' : '1px solid transparent'
                                    }}>
                                        <Checkbox
                                            checked={isDisabled}
                                            onChange={(e) => handleChange(actionType, e.target.checked)}
                                            disabled={disabled}
                                            style={{ marginTop: '2px' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <Text strong style={{ 
                                                    fontSize: '13px',
                                                    textDecoration: isDisabled ? 'line-through' : 'none',
                                                    color: isDisabled ? '#999' : 'inherit'
                                                }}>
                                                    {config.label}
                                                </Text>
                                                <Tag 
                                                    color={isDisabled ? 'default' : config.color}
                                                >
                                                    {isDisabled ? 'Désactivé' : 'Actif'}
                                                </Tag>
                                            </div>
                                            <Text 
                                                type="secondary" 
                                                style={{ 
                                                    fontSize: '12px',
                                                    color: isDisabled ? '#ccc' : undefined
                                                }}
                                            >
                                                {config.description}
                                            </Text>
                                        </div>
                                    </div>
                                </Col>
                            );
                        })}
                    </Row>
                </Card>
            ))}

            {value.length > 0 && (
                <div style={{ 
                    marginTop: 16, 
                    padding: '8px 12px', 
                    backgroundColor: '#fff2e8', 
                    borderRadius: '4px',
                    border: '1px solid #ffcb7a'
                }}>
                    <Text style={{ fontSize: '12px', color: '#d46b08' }}>
                        ⚠️ {value.length} action(s) désactivée(s). Ces actions ne seront pas exécutées lors de l'import.
                    </Text>
                </div>
            )}
        </div>
    );
};

export default ActionTypesSelector; 