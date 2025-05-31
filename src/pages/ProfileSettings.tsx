// src/pages/ProfileSettings.tsx
import React from 'react';
import { Card, Form, Input, Button } from 'antd';

const ProfileSettings: React.FC = () => {
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        console.log('Données de profil soumises :', values);
        // TODO: appeler votre API pour mettre à jour le profil
    };

    return (
        <Card title="Profil">
            <Form
                form={form}
                layout="vertical"
                initialValues={{ name: '', email: '' }}
                onFinish={onFinish}
            >
                <Form.Item
                    label="Nom"
                    name="name"
                    rules={[{ required: true, message: 'Veuillez entrer votre nom' }]}
                >
                    <Input placeholder="Votre nom" />
                </Form.Item>

                <Form.Item
                    label="Adresse email"
                    name="email"
                    rules={[
                        { required: true, message: 'Veuillez entrer votre email' },
                        { type: 'email', message: 'Format d’email invalide' },
                    ]}
                >
                    <Input placeholder="Votre email" />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Enregistrer
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default ProfileSettings;
