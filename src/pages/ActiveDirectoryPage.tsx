// pages/ActiveDirectoryPage.tsx
import React, {useEffect, useState} from 'react';
import type {MenuProps} from 'antd';
import {
    Button,
    Card,
    Col,
    Divider,
    Dropdown,
    Empty,
    Form,
    Input,
    Layout,
    Modal,
    Row,
    Space,
    Spin,
    Table,
    Tag,
    Tooltip,
    Tree,
    Typography
} from 'antd';
import {
    ApartmentOutlined,
    DeleteOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    GlobalOutlined,
    LockOutlined,
    ReloadOutlined,
    SearchOutlined,
    SettingOutlined,
    SwapOutlined,
    UnlockOutlined,
    UserOutlined
} from '@ant-design/icons';
import type {DataNode, EventDataNode} from 'antd/es/tree';

import {useActiveDirectory} from '../hooks/useActiveDirectory';
import {ActiveDirectoryNode, BulkAction, BulkActionPayload} from '../services/api/activeDirectoryService';

/* ------------------------------------------------------------------ */
const {Content} = Layout;
const {Title, Text} = Typography;
const {Search} = Input;

/* ------------------------------------------------------------------ */
// étend DataNode pour stocker notre node AD
type MyNode = DataNode & { data?: ActiveDirectoryNode };

const updateTree = (
    list: MyNode[], key: React.Key, children: MyNode[]
): MyNode[] =>
    list.map(n => n.key === key
        ? {...n, children}
        : {...n, children: n.children ? updateTree(n.children as MyNode[], key, children) : n.children});

/* ================================================================== */
const ActiveDirectoryPage: React.FC = () => {
    const {
        rootNodes, searchResults, selectedUsers,
        loading, searchLoading, bulkActionLoading,
        loadChildren, search, clearSearch,
        addSelectedUser, removeSelectedUser,
        clearSelectedUsers, executeBulkAction,
        refresh
    } = useActiveDirectory({autoLoadRoot: true, showNotifications: true});

    /* ----------------------------- état local */
    const [treeData, setTreeData] = useState<MyNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [bulkVisible, setBulkVisible] = useState(false);
    const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
    const [form] = Form.useForm();

    /* ----------------------------- (re-)formate les nœuds */
    useEffect(() => {
        const list = searchResults.length ? searchResults : rootNodes;
        setTreeData(format(list));
    }, [rootNodes, searchResults]);

    const format = (nodes: ActiveDirectoryNode[]): MyNode[] =>
        nodes.map(n => ({
            title: (
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span>{n.name}</span>
                    {n.objectClasses.includes('user') && (
                        <Tag color={status(n).color}>{status(n).text}</Tag>
                    )}
                </div>
            ),
            key: n.distinguishedName,
            icon: icon(n),
            isLeaf: !n.hasChildren,
            data: n
        }));

    /* ----------------------------- helpers UI */
    const icon = (n: ActiveDirectoryNode) => {
        if (n.objectClasses.includes('domain')) return <GlobalOutlined/>;
        if (n.objectClasses.includes('organizationalUnit')) return <ApartmentOutlined/>;
        if (n.objectClasses.includes('container')) return <ApartmentOutlined/>;
        return <UserOutlined/>;
    };

    const status = (n: ActiveDirectoryNode) => {
        if (n.objectClasses.includes('user') && n.userAccountControl != null) {
            const uac = n.userAccountControl;
            if ((uac & 0x2) !== 0) return {text: 'Désactivé', color: 'error'};
            if ((uac & 0x10) !== 0) return {text: 'Verrouillé', color: 'warning'};
            return {text: 'Actif', color: 'success'};
        }
        return {text: '—', color: 'default'};
    };

    /* ----------------------------- Lazy-load children */
    const onLoadData = async (node: MyNode) => {
        if (node.children?.length) return;
        const kids = await loadChildren(node.key as string);
        const mapped = format(kids);
        setTreeData(o => updateTree(o, node.key, mapped));
    };

    /* ----------------------------- Double-clic */
    const onDblClick = (_e: React.MouseEvent, info: EventDataNode<MyNode>) => {
        const cls = info.data?.objectClasses.map(c => c.toLowerCase()) ?? [];
        if (cls.includes('domain') || cls.includes('organizationalunit') || cls.includes('container')) {
            if (!expandedKeys.includes(info.key)) {
                onLoadData(info);
                setExpandedKeys(k => [...k, info.key]);
            }
        } else if (cls.includes('user') && info.data)
            addSelectedUser(info.data);
    };

    /* ----------------------------- Search */
    const doSearch = async (val: string) => {
        setSearchValue(val);
        if (val.trim()) await search(val);
        else clearSearch();
    };

    /* ----------------------------- Bulk handling */
    const runBulk = async () => {
        if (!selectedAction) return;
        const v = await form.validateFields();
        const pay: BulkActionPayload = {
            action: selectedAction,
            users: selectedUsers.map(u => u.distinguishedName),
            ...v  // newPassword / description / targetOU
        };
        await executeBulkAction(pay);
        setBulkVisible(false);
        clearSelectedUsers();
    };

    const bulkMenu: MenuProps['items'] = [
        {key: 'resetPassword', icon: <LockOutlined/>, label: 'Réinitialiser mot de passe'},
        {key: 'disableAccounts', icon: <EyeInvisibleOutlined/>, label: 'Désactiver comptes'},
        {key: 'enableAccounts', icon: <EyeOutlined/>, label: 'Activer comptes'},
        {key: 'unlockAccounts', icon: <UnlockOutlined/>, label: 'Débloquer comptes'},
        {key: 'moveToOU', icon: <SwapOutlined/>, label: 'Déplacer vers OU'},
        {key: 'addDescription', icon: <SettingOutlined/>, label: 'Ajouter description'}
    ];

    const bulkLabel = (a: BulkAction) => {
        const item = bulkMenu.find(i => i!.key === a);
        return (item && 'label' in item) ? item.label as string : '';
    };

    /* ================================================================== */
    return (
        <Content style={{background: '#fff', minHeight: '100vh', padding: 24}}>
            <Row gutter={24}>
                {/* ---------- TREE ------------------------------------------------ */}
                <Col xs={24} lg={12}>
                    <Card
                        title={<Space><ApartmentOutlined/> Arbre AD</Space>}
                        extra={
                            <Tooltip title="Actualiser">
                                <Button icon={<ReloadOutlined/>} onClick={refresh} loading={loading}/>
                            </Tooltip>
                        }>
                        <Space direction="vertical" style={{width: '100%'}}>
                            <Search
                                placeholder="Rechercher..."
                                enterButton={<SearchOutlined/>}
                                onSearch={doSearch}
                                allowClear
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                loading={searchLoading}
                            />
                            <Divider/>
                            <Spin spinning={loading || searchLoading}>
                                {treeData.length ? (
                                    <Tree
                                        treeData={treeData}
                                        showIcon
                                        loadData={onLoadData}
                                        expandedKeys={expandedKeys}
                                        onExpand={setExpandedKeys}
                                        onDoubleClick={onDblClick}
                                    />
                                ) : (
                                    <Empty description="Aucune donnée"/>
                                )}
                            </Spin>
                        </Space>
                    </Card>
                </Col>

                {/* ---------- SELECTED USERS ------------------------------------- */}
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <UserOutlined/> Utilisateurs sélectionnés
                                {selectedUsers.length > 0 &&
                                    <Tag color="blue">{selectedUsers.length}</Tag>}
                            </Space>}
                        extra={
                            <Space>
                                <Dropdown
                                    menu={{
                                        items: bulkMenu, onClick: ({key}) => {
                                            setSelectedAction(key as BulkAction);
                                            form.resetFields();
                                            setBulkVisible(true);
                                        }
                                    }}
                                    trigger={['click']}
                                    disabled={!selectedUsers.length}>
                                    <Button type="primary">Actions en masse</Button>
                                </Dropdown>
                                <Button danger onClick={clearSelectedUsers}
                                        disabled={!selectedUsers.length}>Vider</Button>
                            </Space>}>
                        {selectedUsers.length ? (
                            <Table
                                rowKey="distinguishedName"
                                dataSource={selectedUsers}
                                pagination={{pageSize: 10}}
                                size="small"
                                columns={[
                                    {title: 'Nom', dataIndex: 'name', key: 'name'},
                                    {
                                        title: 'Statut', key: 'status',
                                        render: (_: any, r) => <Tag color={status(r).color}>{status(r).text}</Tag>
                                    },
                                    {
                                        title: '', key: 'act', width: 50,
                                        render: (_: any, r) =>
                                            <Button type="text" danger size="small"
                                                    icon={<DeleteOutlined/>}
                                                    onClick={() => removeSelectedUser(r.distinguishedName)}/>
                                    }
                                ]}
                            />
                        ) : <Empty description="—"/>}
                    </Card>
                </Col>
            </Row>

            {/* ---------- BULK MODAL ------------------------------------------- */}
            <Modal
                title={selectedAction ? bulkLabel(selectedAction) : ''}
                open={bulkVisible}
                onOk={runBulk}
                onCancel={() => setBulkVisible(false)}
                confirmLoading={bulkActionLoading}
                okText="Exécuter" cancelText="Annuler">
                <Text type="secondary">
                    {selectedUsers.length} utilisateur(s) seront affectés.
                </Text>

                <Form form={form} layout="vertical" style={{marginTop: 16}}>
                    {selectedAction === 'resetPassword' && (
                        <Form.Item name="newPassword" label="Nouveau mot de passe"
                                   rules={[{required: true, min: 8}]}>
                            <Input.Password/>
                        </Form.Item>
                    )}
                    {selectedAction === 'addDescription' && (
                        <Form.Item name="description" label="Description"
                                   rules={[{required: true}]}>
                            <Input.TextArea rows={3}/>
                        </Form.Item>
                    )}
                    {selectedAction === 'moveToOU' && (
                        <Form.Item name="targetOU" label="OU cible"
                                   rules={[{required: true}]}>
                            <Input placeholder="OU=Departement,DC=contoso,DC=com"/>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </Content>
    );
};

export default ActiveDirectoryPage;
