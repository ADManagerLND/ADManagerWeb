import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';

const Dashboard: React.FC = () => (
    <div style={{ padding: 0, margin: 0 }}>
        <Row gutter={[16, 16]}>
            <Col span={8}>
                <Card>
                    <Statistic title="Utilisateurs" value={1128} />
                </Card>
            </Col>
            <Col span={8}>
                <Card>
                    <Statistic title="Ventes" value={93} />
                </Card>
            </Col>
            <Col span={8}>
                <Card>
                    <Statistic title="Revenu" value={12400} prefix="$" />
                </Card>
            </Col>
        </Row>
    </div>
);

export default Dashboard;
