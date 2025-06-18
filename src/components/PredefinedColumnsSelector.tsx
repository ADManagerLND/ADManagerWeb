import React, {useEffect, useState} from 'react';
import {Button, Card, Checkbox, Col, Divider, Input, Row, Select, Space, Tag, Tooltip, Typography} from 'antd';
import {InfoCircleOutlined, PlusOutlined} from '@ant-design/icons';
import {httpService} from '../services/api/httpService';

const {Title, Text} = Typography;
const {Option} = Select;

interface PredefinedColumn {
    key: string;
    label: string;
    description: string;
    category: string;
    dataType: string;
    examples: string[];
    isPopular: boolean;
    validation?: {
        pattern?: string;
        errorMessage?: string;
    };
    defaultTransformation?: string;
}

interface PredefinedColumnsSelectorProps {
    selectedColumns: string[];
    onColumnsChange: (columns: string[]) => void;
    allowCustomColumns?: boolean;
}

const PredefinedColumnsSelector: React.FC<PredefinedColumnsSelectorProps> = ({
                                                                                 selectedColumns,
                                                                                 onColumnsChange,
                                                                                 allowCustomColumns = true
                                                                             }) => {
    const [predefinedColumns, setPredefinedColumns] = useState<PredefinedColumn[]>([]);
    const [loading, setLoading] = useState(false);
    const [customColumnName, setCustomColumnName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Charger les colonnes prédéfinies
    useEffect(() => {
        loadPredefinedColumns();
    }, []);

    const loadPredefinedColumns = async () => {
        setLoading(true);
        try {
            const response = await httpService.get<PredefinedColumn[]>('/api/Config/predefined-columns');
            setPredefinedColumns(response.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des colonnes prédéfinies:', error);
        } finally {
            setLoading(false);
        }
    };

    // Ajouter une colonne personnalisée
    const addCustomColumn = () => {
        if (customColumnName && !selectedColumns.includes(customColumnName)) {
            onColumnsChange([...selectedColumns, customColumnName]);
            setCustomColumnName('');
        }
    };

    // Gérer la sélection d'une colonne
    const handleColumnToggle = (columnKey: string, checked: boolean) => {
        if (checked) {
            onColumnsChange([...selectedColumns, columnKey]);
        } else {
            onColumnsChange(selectedColumns.filter(col => col !== columnKey));
        }
    };

    // Sélectionner toutes les colonnes populaires
    const selectPopularColumns = () => {
        const popularColumns = predefinedColumns
            .filter(col => col.isPopular)
            .map(col => col.key);

        const newColumns = [...new Set([...selectedColumns, ...popularColumns])];
        onColumnsChange(newColumns);
    };

    // Filtrer par catégorie
    const filteredColumns = selectedCategory === 'all'
        ? predefinedColumns
        : predefinedColumns.filter(col => col.category.toLowerCase() === selectedCategory.toLowerCase());

    // Grouper par catégorie
    const categorizedColumns = predefinedColumns.reduce((acc, column) => {
        const category = column.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(column);
        return acc;
    }, {} as Record<string, PredefinedColumn[]>);

    const categories = [
        {value: 'all', label: 'Toutes les catégories'},
        {value: 'identity', label: '👤 Identité'},
        {value: 'contact', label: '📞 Contact'},
        {value: 'personal', label: '🏠 Personnel'},
        {value: 'organization', label: '🏢 Organisation'},
        {value: 'academic', label: '🎓 Académique'},
        {value: 'system', label: '⚙️ Système'}
    ];

    return (
        <Card
            title={
                <Space>
                    <span>Sélection des colonnes</span>
                    <Text type="secondary">({selectedColumns.length} sélectionnées)</Text>
                </Space>
            }
            loading={loading}
            extra={
                <Space>
                    <Select
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        style={{width: 200}}
                        size="small"
                    >
                        {categories.map(cat => (
                            <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                        ))}
                    </Select>
                    <Button size="small" onClick={selectPopularColumns}>
                        Sélectionner les populaires
                    </Button>
                </Space>
            }
        >
            {/* Colonnes sélectionnées */}
            {selectedColumns.length > 0 && (
                <>
                    <div style={{marginBottom: 16}}>
                        <Text strong>Colonnes sélectionnées :</Text>
                        <div style={{marginTop: 8}}>
                            <Space wrap>
                                {selectedColumns.map(column => {
                                    const predefinedCol = predefinedColumns.find(col => col.key === column);
                                    return (
                                        <Tag
                                            key={column}
                                            closable
                                            onClose={() => handleColumnToggle(column, false)}
                                            color={predefinedCol ? 'blue' : 'default'}
                                        >
                                            {predefinedCol ? predefinedCol.label : column}
                                            {predefinedCol?.isPopular && ' ⭐'}
                                        </Tag>
                                    );
                                })}
                            </Space>
                        </div>
                    </div>
                    <Divider/>
                </>
            )}

            {/* Filtre par catégorie ou liste complète */}
            {selectedCategory === 'all' ? (
                // Vue par catégories
                Object.entries(categorizedColumns).map(([category, columns]) => (
                    <div key={category} style={{marginBottom: 24}}>
                        <Title level={5} style={{marginBottom: 12}}>
                            {categories.find(c => c.value === category.toLowerCase())?.label || category}
                        </Title>
                        <Row gutter={[16, 8]}>
                            {columns.map(column => (
                                <Col span={12} key={column.key}>
                                    <Card size="small" style={{height: '100%'}}>
                                        <Space direction="vertical" size="small" style={{width: '100%'}}>
                                            <Space align="start">
                                                <Checkbox
                                                    checked={selectedColumns.includes(column.key)}
                                                    onChange={(e) => handleColumnToggle(column.key, e.target.checked)}
                                                />
                                                <div style={{flex: 1}}>
                                                    <Space>
                                                        <Text strong>{column.label}</Text>
                                                        {column.isPopular &&
                                                            <Tag color="gold" size="small">Populaire</Tag>}
                                                        <Tooltip title={column.description}>
                                                            <InfoCircleOutlined style={{color: '#1890ff'}}/>
                                                        </Tooltip>
                                                    </Space>
                                                    <div>
                                                        <Text type="secondary" style={{fontSize: '12px'}}>
                                                            {column.description}
                                                        </Text>
                                                    </div>
                                                    {column.examples.length > 0 && (
                                                        <div style={{marginTop: 4}}>
                                                            <Text type="secondary" style={{fontSize: '11px'}}>
                                                                Ex: {column.examples.slice(0, 2).join(', ')}
                                                            </Text>
                                                        </div>
                                                    )}
                                                </div>
                                            </Space>
                                        </Space>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                ))
            ) : (
                // Vue filtrée
                <Row gutter={[16, 8]}>
                    {filteredColumns.map(column => (
                        <Col span={12} key={column.key}>
                            <Card size="small" style={{height: '100%'}}>
                                <Space direction="vertical" size="small" style={{width: '100%'}}>
                                    <Space align="start">
                                        <Checkbox
                                            checked={selectedColumns.includes(column.key)}
                                            onChange={(e) => handleColumnToggle(column.key, e.target.checked)}
                                        />
                                        <div style={{flex: 1}}>
                                            <Space>
                                                <Text strong>{column.label}</Text>
                                                {column.isPopular && <Tag color="gold" size="small">Populaire</Tag>}
                                                <Tooltip title={column.description}>
                                                    <InfoCircleOutlined style={{color: '#1890ff'}}/>
                                                </Tooltip>
                                            </Space>
                                            <div>
                                                <Text type="secondary" style={{fontSize: '12px'}}>
                                                    {column.description}
                                                </Text>
                                            </div>
                                            {column.examples.length > 0 && (
                                                <div style={{marginTop: 4}}>
                                                    <Text type="secondary" style={{fontSize: '11px'}}>
                                                        Ex: {column.examples.slice(0, 2).join(', ')}
                                                    </Text>
                                                </div>
                                            )}
                                        </div>
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Ajouter une colonne personnalisée */}
            {allowCustomColumns && (
                <>
                    <Divider/>
                    <Space>
                        <Input
                            placeholder="Nom de colonne personnalisée"
                            value={customColumnName}
                            onChange={(e) => setCustomColumnName(e.target.value)}
                            onPressEnter={addCustomColumn}
                            style={{width: 200}}
                        />
                        <Button
                            type="dashed"
                            icon={<PlusOutlined/>}
                            onClick={addCustomColumn}
                            disabled={!customColumnName || selectedColumns.includes(customColumnName)}
                        >
                            Ajouter
                        </Button>
                    </Space>
                </>
            )}
        </Card>
    );
};

export default PredefinedColumnsSelector;
