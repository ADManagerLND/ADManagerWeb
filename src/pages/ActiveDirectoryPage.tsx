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
    Typography,
    message
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
    UserOutlined,
    FolderOutlined,
    TeamOutlined,
    DownOutlined
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

    // État local pour contourner le problème du hook
    const [localSelectedUsers, setLocalSelectedUsers] = useState<ActiveDirectoryNode[]>([]);
    
    // Synchroniser avec le hook
    useEffect(() => {
        setLocalSelectedUsers(selectedUsers);
    }, [selectedUsers]);

    // Fonction pour ajouter plusieurs utilisateurs d'un coup - SOLUTION SIMPLE ET ROBUSTE
    const addMultipleUsers = (users: ActiveDirectoryNode[]) => {
        // Filtrer les doublons dans la liste d'entrée
        const uniqueUsers = users.filter((user, index, arr) => 
            arr.findIndex(u => u.distinguishedName === user.distinguishedName) === index
        );
        
        // Obtenir la liste actuelle
        const currentUsers = localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers;
        
        // Filtrer les utilisateurs déjà sélectionnés
        const newUsers = uniqueUsers.filter(user => 
            !currentUsers.some(selected => selected.distinguishedName === user.distinguishedName)
        );
        
        console.log(`📊 ${newUsers.length} nouveaux utilisateurs à ajouter (${uniqueUsers.length} total, ${currentUsers.length} déjà sélectionnés)`);
        
        if (newUsers.length === 0) {
            console.log("ℹ️ Tous les utilisateurs sont déjà sélectionnés");
            return;
        }
        
        // SOLUTION FINALE : Mettre à jour SEULEMENT l'état local pour éviter les conflits
        const updatedUsers = [...currentUsers, ...newUsers];
        setLocalSelectedUsers(updatedUsers);
        
        // NE PAS appeler addSelectedUser en boucle - cela cause les conflits !
        // L'état local suffit pour l'affichage, la synchronisation se fera au moment des actions
        
        console.log(`✅ ${newUsers.length} nouveaux utilisateurs ajoutés immédiatement (total: ${updatedUsers.length})`);
    };

    /* ----------------------------- état local */
    const [treeData, setTreeData] = useState<MyNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [bulkVisible, setBulkVisible] = useState(false);
    const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
    const [form] = Form.useForm();
    
    /* ----------------------------- Sélection multiple */
    const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
    const [halfCheckedKeys, setHalfCheckedKeys] = useState<React.Key[]>([]);
    const [lastSelectedKey, setLastSelectedKey] = useState<React.Key | null>(null);
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});
    const [contextMenuNode, setContextMenuNode] = useState<MyNode | null>(null);

    /* ----------------------------- (re-)formate les nœuds */
    useEffect(() => {
        const list = searchResults.length ? searchResults : rootNodes;
        setTreeData(format(list));
    }, [rootNodes, searchResults]);

    /* ----------------------------- Fermer menu contextuel sur clic ailleurs */
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenuVisible) {
                setContextMenuVisible(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener('contextmenu', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('contextmenu', handleClickOutside);
        };
    }, [contextMenuVisible]);

    const format = (nodes: ActiveDirectoryNode[]): MyNode[] =>
        nodes.map((n, index) => {
            // Générer une clé unique pour éviter les doublons
            const key = n.distinguishedName || `empty-dn-${n.name}-${index}`;
            
            // Log d'avertissement pour les nœuds sans DN
            if (!n.distinguishedName) {
                console.warn('[AD Tree] Nœud sans distinguishedName:', n);
            }
            
            return {
                            title: (
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        {!n.objectClasses.includes('user') && n.hasChildren && (
                            <span style={{fontSize: '14px'}}>📁</span>
                        )}
                        {n.objectClasses.includes('user') && (
                            <span style={{fontSize: '14px'}}>👤</span>
                        )}
                        <span style={{fontWeight: n.objectClasses.includes('user') ? 'normal' : 500}}>
                            {n.name}
                        </span>
                    </div>
                ),
                key,
            isLeaf: !n.hasChildren,
            data: n
            };
        });

    /* ----------------------------- helpers UI */
    const icon = (n: ActiveDirectoryNode) => {
        if (n.objectClasses.includes('domain')) return <GlobalOutlined style={{color: '#1890ff'}}/>;
        if (n.objectClasses.includes('organizationalUnit')) return <FolderOutlined style={{color: '#faad14'}}/>;
        if (n.objectClasses.includes('container')) {
            if (n.name.toLowerCase().includes('users')) return <TeamOutlined style={{color: '#52c41a'}}/>;
            if (n.name.toLowerCase().includes('computers')) return <ApartmentOutlined style={{color: '#13c2c2'}}/>;
            return <FolderOutlined style={{color: '#722ed1'}}/>;
        }
        return <UserOutlined style={{color: '#096dd9'}}/>;
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
        
        console.log(`🔄 Chargement des enfants pour: ${node.key}`);
        const startTime = Date.now();
        
        const kids = await loadChildren(node.key as string);
        const mapped = format(kids);
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ ${kids.length} enfants chargés en ${loadTime}ms pour: ${node.key}`);
        
        setTreeData(o => updateTree(o, node.key, mapped));
    };

    /* ----------------------------- Sélection et interactions */
    
    // Récupère tous les utilisateurs d'un nœud et de ses enfants
    const getAllUsersFromNode = (node: MyNode): ActiveDirectoryNode[] => {
        const users: ActiveDirectoryNode[] = [];
        
        const collectUsers = (n: MyNode) => {
            if (n.data?.objectClasses.includes('user')) {
                users.push(n.data);
            }
            if (n.children) {
                n.children.forEach(child => collectUsers(child as MyNode));
            }
        };
        
        collectUsers(node);
        return users;
    };

    // Gestion des checkboxes avec logique parent-enfant
    const onCheck = async (checkedKeysValue: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
        const keys = Array.isArray(checkedKeysValue) ? checkedKeysValue : checkedKeysValue.checked;
        const halfKeys = Array.isArray(checkedKeysValue) ? [] : checkedKeysValue.halfChecked;
        
        // Identifier les clés qui ont été décochées
        const previousKeys = checkedKeys;
        const uncheckedKeys = previousKeys.filter(key => !keys.includes(key));
        
        setCheckedKeys(keys);
        setHalfCheckedKeys(halfKeys);
        
        const findNodeByKey = (nodes: MyNode[], key: React.Key): MyNode | null => {
            for (const node of nodes) {
                if (node.key === key) return node;
                if (node.children) {
                    const found = findNodeByKey(node.children as MyNode[], key);
                    if (found) return found;
                }
            }
            return null;
        };
        
        // DÉCOCHER : Supprimer les utilisateurs des OUs décochées ou utilisateurs individuels
        if (uncheckedKeys.length > 0) {
            console.log(`🗑️ Suppression pour ${uncheckedKeys.length} élément(s) décoché(s)`);
            
            const currentUsers = localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers;
            let filteredUsers = [...currentUsers];
            
            for (const uncheckedKey of uncheckedKeys) {
                const node = findNodeByKey(treeData, uncheckedKey);
                if (node?.data) {
                    if (node.data.objectClasses.includes('user')) {
                        // Si c'est un utilisateur individuel, le supprimer directement
                        filteredUsers = filteredUsers.filter(user => 
                            user.distinguishedName !== node.data!.distinguishedName
                        );
                        console.log(`👤🗑️ Utilisateur supprimé: ${node.data.name}`);
                    } else {
                        // Si c'est une OU/Container, supprimer ses utilisateurs
                        if (node.children && node.children.length > 0) {
                            // Les enfants sont déjà chargés, identifier les utilisateurs à supprimer
                            const usersToRemove = (node.children as MyNode[])
                                .filter(child => child.data?.objectClasses.includes('user'))
                                .map(child => child.data!.distinguishedName)
                                .filter(Boolean);
                            
                            // Supprimer ces utilisateurs de la liste
                            filteredUsers = filteredUsers.filter(user => 
                                !usersToRemove.includes(user.distinguishedName)
                            );
                            
                            console.log(`📁🗑️ ${usersToRemove.length} utilisateurs supprimés de l'OU: ${node.data.name}`);
                        }
                    }
                }
            }
            
            setLocalSelectedUsers(filteredUsers);
        }
        
        // COCHER : Ajouter les utilisateurs des OUs nouvellement cochées
        const newlyCheckedKeys = keys.filter(key => !previousKeys.includes(key));
        if (newlyCheckedKeys.length > 0) {
            const allSelectedNodes: ActiveDirectoryNode[] = [];
            
            // Traiter chaque clé nouvellement cochée
            for (const key of newlyCheckedKeys) {
                const node = findNodeByKey(treeData, key);
                if (node?.data) {
                    if (node.data.objectClasses.includes('user')) {
                        // Si c'est un utilisateur, l'ajouter directement
                        allSelectedNodes.push(node.data);
                        console.log(`👤 Utilisateur ajouté: ${node.data.name}`);
                    } else {
                        // Si c'est une OU/Container, charger ses enfants si nécessaire
                        console.log(`📁 Traitement de l'OU: ${node.data.name}`);
                        
                        if (!node.children || node.children.length === 0) {
                            console.log(`🔄 Chargement des enfants pour l'OU: ${node.data.name}`);
                            try {
                                const children = await loadChildren(key as string);
                                const mappedChildren = format(children);
                                
                                // Mettre à jour l'arbre avec les nouveaux enfants
                                setTreeData(prevTreeData => updateTree(prevTreeData, key, mappedChildren));
                                
                                // Récupérer SEULEMENT les utilisateurs directs (pas les sous-OUs)
                                const users = children.filter(child => child.objectClasses.includes('user'));
                                allSelectedNodes.push(...users);
                                
                                console.log(`✅ ${users.length} utilisateurs chargés depuis l'API pour l'OU: ${node.data.name}`);
                            } catch (error) {
                                console.error(`❌ Erreur lors du chargement de l'OU: ${node.data.name}`, error);
                            }
                        } else {
                            // Les enfants sont déjà chargés, récupérer seulement les utilisateurs directs
                            const directUsers = (node.children as MyNode[])
                                .filter(child => child.data?.objectClasses.includes('user'))
                                .map(child => child.data!)
                                .filter(Boolean);
                            
                            allSelectedNodes.push(...directUsers);
                            console.log(`✅ ${directUsers.length} utilisateurs récupérés de l'arbre pour l'OU: ${node.data.name}`);
                        }
                    }
                }
            }
            
            // Utiliser la fonction pour ajouter plusieurs utilisateurs
            if (allSelectedNodes.length > 0) {
                console.log(`📊 Ajout de ${allSelectedNodes.length} utilisateurs à la sélection`);
                addMultipleUsers(allSelectedNodes);
            }
        }
    };

    // Double-clic pour développer/réduire
    const onDblClick = (_e: React.MouseEvent, info: EventDataNode<MyNode>) => {
        const cls = info.data?.objectClasses.map(c => c.toLowerCase()) ?? [];
        if (cls.includes('domain') || cls.includes('organizationalunit') || cls.includes('container')) {
            if (!expandedKeys.includes(info.key)) {
                onLoadData(info);
                setExpandedKeys(k => [...k, info.key]);
            } else {
                setExpandedKeys(k => k.filter(key => key !== info.key));
            }
        }
    };

    // Clic droit pour menu contextuel
    const onRightClick = (info: { event: React.MouseEvent; node: EventDataNode<MyNode> }) => {
        info.event.preventDefault();
        setContextMenuPosition({
            x: info.event.clientX,
            y: info.event.clientY
        });
        setContextMenuNode(info.node);
        setContextMenuVisible(true);
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
        
        // Utiliser l'état local qui contient tous les utilisateurs réellement sélectionnés
        const usersToProcess = localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers;
        
        const pay: BulkActionPayload = {
            action: selectedAction,
            users: usersToProcess.map(u => u.distinguishedName),
            ...v  // newPassword / description / targetOU
        };
        await executeBulkAction(pay);
        setBulkVisible(false);
        clearSelectedUsers();
        setLocalSelectedUsers([]);
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

    /* ----------------------------- Menu contextuel */
    const contextMenuItems: MenuProps['items'] = [
        {
            key: 'expand',
            icon: <DownOutlined />,
            label: 'Développer',
            disabled: contextMenuNode?.isLeaf
        },
        {
            key: 'refresh',
            icon: <ReloadOutlined />,
            label: 'Actualiser'
        },
        {
            type: 'divider'
        },
        {
            key: 'selectAll',
            icon: <TeamOutlined />,
            label: 'Sélectionner tous les utilisateurs',
            disabled: contextMenuNode?.data?.objectClasses.includes('user')
        },
        {
            key: 'properties',
            icon: <SettingOutlined />,
            label: 'Propriétés'
        }
    ];

    const handleContextMenuClick = async (menuInfo: { key: string }) => {
        if (!contextMenuNode) return;
        
        setContextMenuVisible(false);
        
        switch (menuInfo.key) {
            case 'expand':
                if (!contextMenuNode.isLeaf) {
                    await onLoadData(contextMenuNode);
                    setExpandedKeys(k => [...k, contextMenuNode.key]);
                }
                break;
                
            case 'refresh':
                if (contextMenuNode.children) {
                    // Force reload des enfants
                    const kids = await loadChildren(contextMenuNode.key as string);
                    const mapped = format(kids);
                    setTreeData(o => updateTree(o, contextMenuNode.key, mapped));
                }
                break;
                
            case 'selectAll':
                if (contextMenuNode.data && !contextMenuNode.data.objectClasses.includes('user')) {
                    // Sélectionner cette OU/Container
                    const newCheckedKeys = [...checkedKeys];
                    if (!newCheckedKeys.includes(contextMenuNode.key)) {
                        newCheckedKeys.push(contextMenuNode.key);
                        onCheck(newCheckedKeys);
                    }
                }
                break;
                
            case 'properties':
                Modal.info({
                    title: 'Propriétés de l\'objet',
                    content: (
                        <div>
                            <p><strong>Nom :</strong> {contextMenuNode.data?.name}</p>
                            <p><strong>DN :</strong> {contextMenuNode.data?.distinguishedName}</p>
                            <p><strong>Classes :</strong> {contextMenuNode.data?.objectClasses.join(', ')}</p>
                            {contextMenuNode.data?.description && (
                                <p><strong>Description :</strong> {contextMenuNode.data.description}</p>
                            )}
                        </div>
                    ),
                    width: 600
                });
                break;
        }
    };

    /* ================================================================== */
    return (
        <Content style={{background: '#fff', height: '100%', padding: 24}}>
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
                            
                            <div style={{fontSize: '12px', color: '#666', marginBottom: 8}}>
                                💡 <strong>Astuce :</strong> Cochez une OU pour sélectionner tous ses utilisateurs • Clic droit pour le menu contextuel
                            </div>
                            
                            <Divider/>
                            <Spin spinning={loading || searchLoading}>
                                {treeData.length ? (
                                    <div
                                        style={{position: 'relative'}}
                                        onClick={() => setContextMenuVisible(false)}
                                    >
                                    <Tree
                                        treeData={treeData}
                                            checkable
                                            height={400}
                                        loadData={onLoadData}
                                        expandedKeys={expandedKeys}
                                        onExpand={setExpandedKeys}
                                        onDoubleClick={onDblClick}
                                            onRightClick={onRightClick}
                                            checkedKeys={{
                                                checked: checkedKeys,
                                                halfChecked: halfCheckedKeys
                                            }}
                                            onCheck={onCheck}
                                            virtual
                                            style={{
                                                border: '1px solid #d9d9d9',
                                                borderRadius: 6,
                                                padding: 8
                                            }}
                                        />
                                        
                                        {/* Menu contextuel */}
                                        {contextMenuVisible && (
                                            <div
                                                style={{
                                                    position: 'fixed',
                                                    left: contextMenuPosition.x,
                                                    top: contextMenuPosition.y,
                                                    zIndex: 1000,
                                                    background: '#fff',
                                                    border: '1px solid #d9d9d9',
                                                    borderRadius: 6,
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                                }}
                                            >
                                                <Dropdown
                                                    menu={{
                                                        items: contextMenuItems,
                                                        onClick: handleContextMenuClick
                                                    }}
                                                    trigger={['click']}
                                                    open={true}
                                                    placement="bottomLeft"
                                                >
                                                    <div style={{ width: 1, height: 1 }} />
                                                </Dropdown>
                                            </div>
                                        )}
                                    </div>
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
                                {(localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers).length > 0 &&
                                    <Tag color="blue">{localSelectedUsers.length > 0 ? localSelectedUsers.length : selectedUsers.length}</Tag>}
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
                                    disabled={!(localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers).length}>
                                    <Button type="primary">Actions en masse</Button>
                                </Dropdown>
                                <Button danger onClick={() => {
                                    clearSelectedUsers();
                                    setLocalSelectedUsers([]);
                                }} disabled={!(localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers).length}>Vider</Button>
                            </Space>}>
                        {(localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers).length ? (
                            <Table
                                rowKey="distinguishedName"
                                dataSource={localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers}
                                pagination={{pageSize: 10}}
                                size="small"
                                columns={[
                                    {title: 'Nom', dataIndex: 'name', key: 'name'},
                                    {
                                        title: '', key: 'act', width: 50,
                                        render: (_: any, r) =>
                                            <Button type="text" danger size="small"
                                                    icon={<DeleteOutlined/>}
                                                    onClick={() => {
                                                        removeSelectedUser(r.distinguishedName);
                                                        setLocalSelectedUsers(prev => 
                                                            prev.filter(u => u.distinguishedName !== r.distinguishedName)
                                                        );
                                                    }}/>
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
                    {(localSelectedUsers.length > 0 ? localSelectedUsers : selectedUsers).length} utilisateur(s) seront affectés.
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
