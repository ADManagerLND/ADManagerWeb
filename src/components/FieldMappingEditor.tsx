import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Select,
  Input,
  Tooltip,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Tag,
  message,
  Popover,
  Form,
  FormInstance,
  Collapse,
  Alert,
  Divider
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
  MoreOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { UserAttribute } from '../models/ApplicationSettings';
import { useSettings } from '../hooks/useSettings';

const { Panel } = Collapse;
const { Text, Title } = Typography;

export interface MappingRow {
  attribute: string;
  mappingType: 'direct' | 'template';
  mappingValue: string;
  isRequired?: boolean;
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
    <table style={{ width: '100%' }}>
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
    <Divider />
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
    <Card size="small" style={{ marginBottom: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderRadius: 6 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Form.Item
            name={[field.name, 'attribute']}
            label={<Typography.Text strong>Attribut AD</Typography.Text>}
            rules={[{ required: true, message: 'Attribut requis' }]}
            style={{ marginBottom: 8 }}
            tooltip="Sélectionnez l'attribut Active Directory à mapper"
          >
            <Select
              loading={attributesLoading}
              placeholder="Attribut AD"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
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
              style={{ marginBottom: 8 }}
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
                  content={<TransformationsHelp />} 
                  title="Aide sur les templates"
                  trigger="click"
                >
                  <QuestionCircleOutlined style={{ cursor: 'pointer', color: '#1890ff' }} />
                </Popover>
              </Space>
            }
            rules={[{ required: true, message: 'Valeur requise' }]}
            style={{ marginBottom: 8 }}
            tooltip="Utilisez %colonne% pour insérer des valeurs de colonnes CSV"
          >
            <Input placeholder="Ex: %prenom:capitalize%.%nom:uppercase%@domaine.com" />
          </Form.Item>
          
          <div style={{ marginBottom: 8, maxWidth: '100%', overflowX: 'auto' }}>
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
                    <div style={{ maxWidth: 300, maxHeight: 200, overflowY: 'auto' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {availableCsvColumns.map((col, idx) => (
                          <Button
                            key={`pop-col-${idx}`}
                            size="small"
                            onClick={() => {
                              handleInsertToken(col);
                              return false;
                            }}
                            style={{ marginBottom: 4 }}
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
                  <Button size="small" icon={<MoreOutlined />}>
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
                  <BulbOutlined />
                  <span>Aperçu: <Text code>{previewValue}</Text></span>
                </Space>
              }
              type="success"
              style={{ marginTop: 8 }}
            />
          )}
        </Col>

        <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Space>
            {/* Bouton de suppression affiché uniquement si le mapping n'est pas obligatoire */}
            {!isRequiredMapping && (
              <Tooltip title="Supprimer ce mappage">
                <Button 
                  danger 
                  shape="circle" 
                  icon={<DeleteOutlined />} 
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
export interface FieldMappingEditorProps {
  csvData: any[];
  csvColumns: string[];
  initialMappings?: MappingRow[];
  onSave?: (mappings: MappingRow[]) => void;
  availableAttributes?: AdAttributeInfo[];
  attributesLoading?: boolean;
}

const FieldMappingEditor: React.FC<FieldMappingEditorProps> = ({
  csvData,
  csvColumns,
  initialMappings = [],
  onSave,
  availableAttributes = [],
  attributesLoading = false
}) => {
  const [form] = Form.useForm();
  
  // Utiliser le hook useSettings pour récupérer les attributs utilisateur
  const { 
    settings: userAttributeSettings,
    loading: userAttributesLoading
  } = useSettings<UserAttribute[]>('user-attributes');
  
  // Fusionner les attributs du hook avec ceux fournis en props
  const allAttributes = useMemo(() => {
    if (userAttributeSettings && userAttributeSettings.length > 0) {
      // Transformer les attributs du hook en AdAttributeInfo
      return userAttributeSettings.map(attr => ({
        ...attr,
        displayName: attr.displayName || attr.name,
        description: attr.description || '',
        isRequired: attr.isRequired || false,
        dataType: attr.dataType || 'string'
      }));
    }
    return availableAttributes;
  }, [userAttributeSettings, availableAttributes]);
  
  const isLoading = attributesLoading || userAttributesLoading;
  
  // État pour suivre si tous les attributs obligatoires sont mappés
  const [missingRequiredAttributes, setMissingRequiredAttributes] = useState<string[]>([]);

  // Pré-remplir le formulaire au montage ou quand initialMappings change
  useEffect(() => {
    form.setFieldsValue({ mappings: initialMappings });
  }, [form, initialMappings]);

  // Liste des attributs obligatoires
  const requiredAttributes = useMemo(() => {
    return allAttributes
      .filter(attr => attr.isRequired)
      .map(attr => attr.name);
  }, [allAttributes]);

  // Mise à jour automatique des mappages lorsque les mappages du formulaire changent
  const mappingsWatch = Form.useWatch('mappings', form) as MappingRow[] | undefined;

  // Vérifier les attributs obligatoires manquants
  useEffect(() => {
    if (!mappingsWatch || !requiredAttributes.length) {
      setMissingRequiredAttributes([]);
      return;
    }

    const mappedAttributes = mappingsWatch
      .filter(m => m && m.attribute)
      .map(m => m.attribute);
    
    const missing = requiredAttributes.filter(
      attr => !mappedAttributes.includes(attr)
    );
    
    setMissingRequiredAttributes(missing);
    
    // Sauvegarder uniquement les mappages valides
    if (onSave) {
      const validMappings = mappingsWatch.filter(m => m && m.attribute && m.mappingValue);
      onSave(validMappings);
    }
  }, [mappingsWatch, requiredAttributes, onSave]);

  // Ajouter automatiquement les mappages pour les attributs obligatoires
  useEffect(() => {
    const currentMappings = form.getFieldValue('mappings') || [];
    let updatedMappings = [...currentMappings];
    let hasChange = false;

    allAttributes.forEach(attr => {
      if (attr.isRequired) {
        if (!updatedMappings.some((m: any) => m && m.attribute === attr.name)) {
          // Pour les attributs obligatoires, suggérer un mappage initial
          let initialValue = '';
          
          // Suggestion intelligente pour certains attributs connus
          if (attr.name === 'sAMAccountName' && csvColumns.some(col => /prenom|nom/i.test(col))) {
            const prenomCol = csvColumns.find(col => /prenom/i.test(col)) || '';
            const nomCol = csvColumns.find(col => /nom/i.test(col)) || '';
            if (prenomCol && nomCol) {
              initialValue = `%${prenomCol}:first%%${nomCol}:lowercase%`;
            }
          } else if (attr.name === 'mail' && csvColumns.some(col => /mail|email/i.test(col))) {
            const emailCol = csvColumns.find(col => /mail|email/i.test(col)) || '';
            initialValue = `%${emailCol}%`;
          } else if (attr.name === 'displayName' && csvColumns.some(col => /prenom|nom/i.test(col))) {
            const prenomCol = csvColumns.find(col => /prenom/i.test(col)) || '';
            const nomCol = csvColumns.find(col => /nom/i.test(col)) || '';
            if (prenomCol && nomCol) {
              initialValue = `%${prenomCol}:capitalize% %${nomCol}:uppercase%`;
            }
          } else {
            // Chercher une colonne CSV avec un nom similaire
            const matchingColumn = csvColumns.find(col => 
              col.toLowerCase().includes(attr.name.toLowerCase()) || 
              attr.name.toLowerCase().includes(col.toLowerCase())
            );
            initialValue = matchingColumn ? `%${matchingColumn}%` : '';
          }
          
          updatedMappings.push({
            attribute: attr.name,
            mappingType: 'template',
            mappingValue: initialValue,
            isRequired: true
          });
          hasChange = true;
        }
      }
    });

    if (hasChange) {
      form.setFieldsValue({ mappings: updatedMappings });
    }
  }, [allAttributes, csvColumns, form]);

  const handleSuggestMappings = () => {
    const current = form.getFieldValue('mappings') || [];
    const updated = [...current];
    
    // Suggestions intelligentes basées sur les noms d'attributs et de colonnes
    allAttributes.forEach((attr) => {
      if (!updated.some((m: any) => m && m.attribute === attr.name)) {
        // Recherche de correspondance par nom
        const foundCol = csvColumns.find((col) => {
          const c = col.toLowerCase();
          const a = attr.name.toLowerCase();
          return c === a || c.includes(a) || a.includes(c);
        });
        
        // Suggestions spécifiques pour certains attributs
        if (attr.name === 'sAMAccountName') {
          const prenomCol = csvColumns.find(col => /prenom/i.test(col));
          const nomCol = csvColumns.find(col => /nom/i.test(col));
          
          if (prenomCol && nomCol) {
            updated.push({
              attribute: attr.name,
              mappingType: 'template',
              mappingValue: `%${prenomCol}:first%%${nomCol}:lowercase%`,
              isRequired: attr.isRequired
            });
            return;
          }
        }
        
        if (foundCol) {
          updated.push({
            attribute: attr.name,
            mappingType: 'template',
            mappingValue: `%${foundCol}%`,
            isRequired: attr.isRequired
          });
        }
      }
    });
    
    form.setFieldsValue({ mappings: updated });
    message.success('Mappages suggérés appliqués');
  };

  return (
    <div style={{ padding: 16, backgroundColor: '#fff', borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f9fafc', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {(mappingsWatch || []).length} mappages définis
            </Typography.Title>
          </Col>
          <Col>
            <Space>
              <Tooltip title="Suggérer des mappages automatiquement">
                <Button 
                  icon={<SyncOutlined />} 
                  onClick={handleSuggestMappings} 
                  disabled={isLoading || csvColumns.length === 0}
                >
                  Suggérer
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </div>
      
      {missingRequiredAttributes.length > 0 && (
        <Alert
          message="Attributs obligatoires manquants"
          description={
            <div>
              <p>Les attributs suivants sont obligatoires et doivent être mappés :</p>
              <ul>
                {missingRequiredAttributes.map((attr, idx) => (
                  <li key={idx}>
                    <Text strong>{attr}</Text>
                    {' - '}
                    {allAttributes.find(a => a.name === attr)?.description || ''}
                  </li>
                ))}
              </ul>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Form form={form} layout="vertical">
          <Form.List name="mappings">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Collapse
                    bordered={false}
                    style={{ marginBottom: 8 }}
                    defaultActiveKey={[field.key.toString()]}
                    key={field.key.toString()}
                  >
                    <Panel
                      key={field.key.toString()}
                      header={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <span>
                              Mappage: {form.getFieldValue(['mappings', field.name, 'attribute']) || 'Non défini'}
                            </span>
                            {allAttributes.some(
                              attr => attr.isRequired && attr.name === form.getFieldValue(['mappings', field.name, 'attribute'])
                            ) && (
                              <Tag color="red">Obligatoire</Tag>
                            )}
                          </Space>
                          
                          <Space>
                            {!form.getFieldValue(['mappings', field.name, 'attribute']) && (
                              <Tooltip title="Mapping incomplet">
                                <WarningOutlined style={{ color: 'orange' }} />
                              </Tooltip>
                            )}
                          </Space>
                        </div>
                      }
                    >
                      <FieldMappingRow
                        field={field}
                        availableAttributes={allAttributes}
                        availableCsvColumns={csvColumns}
                        remove={remove}
                        form={form}
                        attributesLoading={isLoading}
                        csvData={csvData}
                      />
                    </Panel>
                  </Collapse>
                ))}
                
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() =>
                      add({
                        attribute: '',
                        mappingType: 'template',
                        mappingValue: ''
                      })
                    }
                    block
                    icon={<PlusOutlined />}
                  >
                    Ajouter un mappage
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </div>
    </div>
  );
};

export default FieldMappingEditor; 