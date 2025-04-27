import React from 'react';
import { Card, Form, Input, Button } from 'antd';

interface SettingsFormValues {
    appName: string;
}

const Settings: React.FC = () => {
    const [form] = Form.useForm<SettingsFormValues>();

    const onFinish = (values: SettingsFormValues) => {
        console.log('Paramètres enregistrés :', values);
    };

    return (
        <Card title="Paramètres de l'application">
            <Form<SettingsFormValues>
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ appName: 'Mon App' }}
            >
                <Form.Item name="appName" label="Nom de l'application">
                    <Input />
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

export default Settings;
