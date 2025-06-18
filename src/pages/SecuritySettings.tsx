// src/pages/SecuritySettings.tsx
import React from 'react';
import {Button, Card, Form, Input} from 'antd';

const SecuritySettings: React.FC = () => {
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        console.log('Données de sécurité soumises :', values);
        // TODO: appeler votre API pour changer le mot de passe
    };

    return (
        <Card title="Sécurité">
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    label="Mot de passe actuel"
                    name="currentPassword"
                    rules={[{required: true, message: 'Entrez votre mot de passe actuel'}]}
                >
                    <Input.Password placeholder="Mot de passe actuel"/>
                </Form.Item>

                <Form.Item
                    label="Nouveau mot de passe"
                    name="newPassword"
                    rules={[{required: true, message: 'Entrez un nouveau mot de passe'}]}
                >
                    <Input.Password placeholder="Nouveau mot de passe"/>
                </Form.Item>

                <Form.Item
                    label="Confirmer le nouveau mot de passe"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                        {required: true, message: 'Confirmez le nouveau mot de passe'},
                        ({getFieldValue}) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                            },
                        }),
                    ]}
                >
                    <Input.Password placeholder="Confirmer mot de passe"/>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Mettre à jour
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default SecuritySettings;
