// src/components/teams/TemplateModal.tsx
import React from 'react';
import { Form, Input, InputNumber, Modal, Row, Col, Switch, Select } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { TeamsFolderMapping } from './types';

const { Option } = Select;

interface TemplateModalProps {
    visible: boolean;
    editingTemplate: { index?: number; template?: TeamsFolderMapping } | null;
    folderTemplates: TeamsFolderMapping[];
    onSave: (values: TeamsFolderMapping) => void;
    onCancel: () => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({
    visible,
    editingTemplate,
    folderTemplates,
    onSave,
    onCancel
}) => {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSave(values);
            form.resetFields();
        });
    };

    const handleCancel = () => {
        onCancel();
        form.resetFields();
    };

    return (
        <Modal
            title={`${editingTemplate?.index !== undefined ? 'Modifier' : 'Nouveau'} Template de Dossier`}
            open={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            width={600}
            okText="Sauvegarder"
            cancelText="Annuler"
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={editingTemplate?.template || { enabled: true, order: folderTemplates.length + 1 }}
            >
                <Form.Item
                    name="folderName"
                    label="Nom du dossier"
                    rules={[{ required: true, message: 'Le nom du dossier est requis' }]}
                >
                    <Input prefix={<FolderOutlined />} placeholder="📚 Nom du dossier" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true, message: 'La description est requise' }]}
                >
                    <Input.TextArea rows={3} placeholder="Description détaillée du dossier" />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="order"
                            label="Ordre d'affichage"
                            rules={[{ required: true, message: 'L\'ordre est requis' }]}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="enabled"
                            label="Activé"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="parentFolder"
                    label="Dossier parent (optionnel)"
                >
                    <Select
                        placeholder="Sélectionner un dossier parent"
                        allowClear
                        showSearch
                    >
                        {folderTemplates.map((folder, index) => (
                            <Option key={index} value={folder.folderName}>
                                {folder.folderName}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default TemplateModal;
