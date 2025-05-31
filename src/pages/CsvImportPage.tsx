// src/pages/CsvImportPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Card,
    Upload,
    Button,
    Select,
    Progress,
    Table,
    Tabs,
    List,
    Tag,
    Space,
    Alert,
    Spin,
    Typography,
    Divider,
    message,
    Statistic,
    Badge,
    Modal,
    Switch,
    Empty,
    Input,
    Tooltip
} from 'antd';
import {
    UploadOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined,
    SyncOutlined,
    FolderAddOutlined,
    UserAddOutlined,
    EditOutlined,
    DeleteOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';
import { csvImportService } from '../services/csvImportService';
import { importSystemMigrator } from '../services/importSystemMigrator';
import { throttle } from 'lodash';
// Types importés depuis le fichier centralisé models/CsvImport.ts
import {
    ImportConfig,
    CsvAnalysisResult,
    ImportResult,
    ActionItem,
    ActionType,
    ImportProgress,
    LogEntry,
    ImportAction,
    ImportSummary
} from '../models/CsvImport';

const { Title, Text } = Typography;
const { Option } = Select;

// Style global pour assurer le défilement
const pageStyle = {
    overflow: 'auto',
    height: 'auto',
    minHeight: '80vh',
    maxHeight: '85vh',
    padding: '0',
    margin: '0',
};

// Style pour le contenu des onglets
const tabContentStyle = {
    padding: '16px 0',
    overflow: 'auto',
    maxHeight: 'calc(85vh - 120px)', // Hauteur maximale pour les onglets
};

// Style pour le conteneur de logs
const logsContainerStyle = {
    overflow: 'auto',
    maxHeight: '300px',
    border: '1px solid #d9d9d9',
    padding: '8px',
    borderRadius: '2px',
    marginBottom: '16px',
};

const CsvImportPage: React.FC = () => {
    // États
    const [configs, setConfigs] = useState<ImportConfig[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState<string>('');
    const [file, setFile] = useState<RcFile | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [analyzing, setAnalyzing] = useState<boolean>(false);
    const [importing, setImporting] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<CsvAnalysisResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [progress, setProgress] = useState<ImportProgress | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeTab, setActiveTab] = useState<string>('upload');
    const [configsLoading, setConfigsLoading] = useState<boolean>(true);
    const [connectionMode, setConnectionMode] = useState<'websocket' | 'signalr'>('signalr');
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [serviceInitialized, setServiceInitialized] = useState<boolean>(false);
    const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);
    const [batchedLogs, setBatchedLogs] = useState<LogEntry[]>([]);
    const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');

    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);
    
    // Limiter la fréquence des mises à jour d'état React avec throttle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const throttledSetProgress = useRef(throttle((progressData: ImportProgress) => {
        setProgress(progressData);
    }, 200)).current; // Limite à une mise à jour toutes les 200ms
    
    // Fonction pour accumuler les logs et les traiter par lots
    const batchLogs = (newLog: LogEntry) => {
        setBatchedLogs(prev => [...prev, newLog]);
    };
    
    // Effet pour traiter les logs par lots
    useEffect(() => {
        const logBatchInterval = setInterval(() => {
            setBatchedLogs(currentBatch => {
                if (currentBatch.length === 0) return currentBatch;
                
                // Ajouter le lot actuel aux logs et vider le lot
                setLogs(prevLogs => [...prevLogs, ...currentBatch]);
                return [];
            });
        }, 500); // Traiter les logs par lots toutes les 500ms
        
        return () => clearInterval(logBatchInterval);
    }, []);

    // Effet pour initialiser le service et charger les configurations
    useEffect(() => {
        const initializeService = async () => {
            try {
                console.log('Initialisation du service pour la page CSV Import');
                // Activer la reconnexion automatique pour cette page
                csvImportService.setAutoReconnect(true);
                
                // Utiliser l'utilitaire de migration pour initialiser le service
                await importSystemMigrator.initializeService();
                setConnectionMode(importSystemMigrator.currentMode);
                setServerStatus('online');
                setServiceInitialized(true);
                
                loadConfigs();
            } catch (error) {
                console.error('Erreur lors de l\'initialisation:', error);
                setServerStatus('offline');
                message.warning('Connexion au service en temps réel impossible. Les fonctionnalités avancées peuvent être limitées.');
                
                handleLog({
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Impossible de se connecter au serveur. Vérifiez que le service est bien démarré.'
                });
                
                // Continuer à charger les configurations même si l'initialisation échoue
                loadConfigs();
            }
        };

        initializeService();

        // S'abonner aux événements de progression et de logs
        csvImportService.subscribeToProgress(handleProgress);
        csvImportService.subscribeToLogs(handleLog);

        // Vérifier périodiquement l'état du serveur
        const serverCheckInterval = setInterval(() => {
            // Utiliser l'API interne du service plutôt que d'accéder directement à signalR
            const isConnected = csvImportService._signalRService.isConnected('csvImportHub');
            if (isConnected) {
                if (serverStatus !== 'online') {
                    setServerStatus('online');
                }
            } else if (serverStatus === 'online') {
                setServerStatus('offline');
                handleLog({
                    timestamp: new Date().toISOString(),
                    level: 'warning',
                    message: 'Connexion au serveur perdue. Tentative de reconnexion...'
                });
            }
        }, 5000);

        // Nettoyage lors du démontage du composant
        return () => {
            console.log('Démontage de la page CSV Import, déconnexion du service');
            csvImportService.unsubscribeFromProgress(handleProgress);
            csvImportService.unsubscribeFromLogs(handleLog);
            
            // Désactiver la reconnexion automatique et se déconnecter proprement
            csvImportService.setAutoReconnect(false);
            csvImportService.disconnect().catch(error => {
                console.error('Erreur lors de la déconnexion:', error);
                // Ne pas afficher de message à l'utilisateur lors de la déconnexion
            });
            
            clearInterval(serverCheckInterval);
        };
    }, []);

    // Effet pour faire défiler automatiquement les logs vers le bas seulement si autoScrollLogs est activé
    useEffect(() => {
        if (autoScrollLogs && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScrollLogs]);

    // Effet pour convertir les actions d'analyse en éléments sélectionnables
    useEffect(() => {
        if (analysisResult?.analysis?.actions) {
            const actionItems: ActionItem[] = analysisResult.analysis.actions.map((action, index) => ({
                id: `action-${index}`,
                actionType: action.actionType as ActionType,
                objectName: action.objectName,
                path: action.path,
                message: action.message,
                attributes: action.attributes,
                selected: true
            }));
            setActions(actionItems);
        }
    }, [analysisResult]);

    // Observer les changements de mode de connexion
    useEffect(() => {
        const handleConnectionModeChange = () => {
            setConnectionMode(importSystemMigrator.currentMode);
            
            // Ajouter un message pour informer l'utilisateur
            const newMode = importSystemMigrator.currentMode;
            handleLog({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Mode de connexion passé à ${newMode === 'signalr' ? 'SignalR' : 'WebSocket'}`
            });
        };

        // Exécuter au montage pour synchroniser l'état avec la configuration
        handleConnectionModeChange();
        
        // Créer un intervalle pour vérifier périodiquement le mode de connexion
        const intervalId = setInterval(() => {
            const currentMode = importSystemMigrator.currentMode;
            if (currentMode !== connectionMode) {
                handleConnectionModeChange();
            }
        }, 2000);
        
        return () => {
            clearInterval(intervalId);
        };
    }, [connectionMode]);

    // Charger les configurations d'import
    const loadConfigs = async () => {
        try {
            setConfigsLoading(true);
            const configs = await csvImportService.getImportConfigs();
            setConfigs(configs);
            if (configs.length > 0) {
                setSelectedConfigId(configs[0].id || '');
                console.log('Configurations chargées:', configs);
            } else {
                console.log('Aucune configuration trouvée');
                message.warning('Aucune configuration d\'import disponible. Veuillez en créer une.');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des configurations:', error);
            message.error('Erreur lors du chargement des configurations d\'import');
        } finally {
            setConfigsLoading(false);
        }
    };

    // Gérer le changement de fichier
    const handleFileChange = (info: any) => {
        console.log('Info de fichier reçue:', info);
        
        if (info.file.status === 'done') {
            message.success(`${info.file.name} téléchargé avec succès`);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} échec du téléchargement.`);
        }

        let fileToUse = null;
        
        // Déterminer le fichier à utiliser en fonction de la structure
        if (info.file instanceof File) {
            // Cas 1: info.file est directement un objet File
            fileToUse = info.file;
            console.log('Cas 1: info.file est un objet File');
        } else if (info.file.originFileObj) {
            // Cas 2: structure classique avec originFileObj
            fileToUse = info.file.originFileObj;
            console.log('Cas 2: utilisation de originFileObj');
        } else if (info.fileList && info.fileList.length > 0) {
            // Cas 3: utiliser le dernier fichier de la liste
            const lastFile = info.fileList[info.fileList.length - 1];
            
            if (lastFile.originFileObj) {
                fileToUse = lastFile.originFileObj;
                console.log('Cas 3a: utilisation du dernier fichier avec originFileObj');
            } else if (lastFile instanceof File) {
                fileToUse = lastFile;
                console.log('Cas 3b: le dernier fichier est un objet File');
            }
        }
        
        if (fileToUse) {
            console.log('Fichier sélectionné:', fileToUse);
            setFile(fileToUse);

            // Lire le contenu du fichier
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setFileContent(content);
                message.info('Contenu du fichier chargé, sélectionnez une configuration');
            };
            
            try {
                reader.readAsText(fileToUse);
            } catch (error: any) {
                console.error('Erreur lors de la lecture du fichier:', error);
                message.error(`Impossible de lire le fichier: ${error.message}`);
                setFileContent('');
            }
        } else {
            console.error('Structure de fichier non reconnue:', info);
            message.warning('Format de fichier non reconnu. Veuillez réessayer.');
            setFile(null);
            setFileContent('');
        }
    };

    // Effet pour sélectionner automatiquement la première configuration
    useEffect(() => {
        if (configs.length > 0 && !selectedConfigId) {
            console.log('Sélection automatique de la première configuration:', configs[0].id);
            setSelectedConfigId(configs[0].id || '');
        }
    }, [configs, selectedConfigId]);

    // Gérer le changement de configuration
    const handleConfigChange = (value: string) => {
        console.log('Configuration sélectionnée:', value);
        setSelectedConfigId(value);
    };

    // Démarrer l'analyse du fichier CSV
    const handleAnalyze = async () => {
        if (!file) {
            message.warning('Veuillez d\'abord sélectionner un fichier CSV.');
            return;
        }
        if (!selectedConfigId) {
            message.warning('Veuillez sélectionner une configuration d\'import.');
            return;
        }
        
        // Vérifier l'état du serveur avant de tenter l'analyse
        if (serverStatus === 'offline') {
            message.error('Impossible de se connecter au serveur. Vérifiez que le service est bien démarré.');
            handleLog({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Tentative d\'analyse impossible : le serveur n\'est pas accessible.'
            });
            return;
        }

        setAnalyzing(true);
        setAnalysisResult(null); // Réinitialiser l'ancien résultat
        setActions([]); // Réinitialiser les actions
        setImportResult(null);
        setLogs([]); // Réinitialiser les logs pour une nouvelle analyse
        
        setProgress({ progress: 0, status: 'analyzing', message: 'Démarrage de l\'analyse...' });
        setActiveTab('analysis'); // Passer à l'onglet d'analyse

        try {
            handleLog({ timestamp: new Date().toISOString(), level: 'info', message: `Lancement de l\'analyse pour le fichier ${file.name} avec la config ${selectedConfigId}` });
            
            // La promesse se résoudra lorsque l'événement SignalR 'analyzed' sera reçu par handleProgress
            // et mettra à jour analysisResult et actions.
            await csvImportService.uploadAndAnalyzeCsv(file, selectedConfigId);
            
            // Plus besoin de setAnalysisResult ou setProgress ici pour 'analyzed'
            // car handleProgress s'en charge.
            // message.success('Analyse du fichier terminée avec succès.'); // Ce message est aussi dans handleProgress

        } catch (error: any) {
            const errorMessage = error.message || 'Erreur inconnue lors de l\'analyse';
            console.error('Erreur lors de l\'analyse:', error);
            handleLog({ timestamp: new Date().toISOString(), level: 'error', message: `Erreur lors de l\'analyse: ${errorMessage}` });
            message.error(`Erreur lors de l\'analyse: ${errorMessage}`);
            setProgress(prev => ({ ...(prev || { progress: 0, status: 'idle' }), status: 'error', message: `Erreur: ${errorMessage}` }));
            setActiveTab('logs'); // Afficher les logs en cas d'erreur
            setAnalyzing(false); // Assurer que analyzing est false en cas d'erreur ici
        }
        // setAnalyzing(false) sera géré par handleProgress quand status != 'analyzing'
    };

    // Démarrer l'import des actions sélectionnées
    const handleImport = async () => {
        if (!analysisResult || !selectedConfigId) {
            message.error('Veuillez d\'abord analyser le fichier');
            return;
        }

        setImporting(true);

        try {
            const config = configs.find(c => c.id === selectedConfigId);
            if (!config) {
                throw new Error('Configuration non trouvée');
            }

            const selectedActions = actions.filter(a => a.selected);
            const result = await csvImportService.executeImport(
                analysisResult.csvData || [],
                config,
                selectedActions
            );

            setImportResult(result);

            if (result.success) {
                message.success('Import terminé avec succès');
                setActiveTab('results');
            } else {
                message.error('Des erreurs sont survenues lors de l\'import');
                // Rester sur l'onglet d'analyse en cas d'erreur pour voir les logs
            }
        } catch (error) {
            console.error('Erreur lors de l\'import:', error);
            message.error('Erreur lors de l\'exécution de l\'import');
        } finally {
            setImporting(false);
        }
    };

    // Démarrer l'import direct sans sélection d'actions
    const handleDirectImport = async () => {
        if (!analysisResult || !selectedConfigId) {
            message.error('Veuillez d\'abord analyser le fichier');
            return;
        }

        setImporting(true);

        try {
            const config = configs.find(c => c.id === selectedConfigId);
            if (!config) {
                throw new Error('Configuration non trouvée');
            }
            
            handleLog({ timestamp: new Date().toISOString(), level: 'info', message: 'Démarrage de l\'import automatique...' });

            // Utiliser la nouvelle méthode pour l'import direct
            const result = await csvImportService.executeDirectImport(
                analysisResult.csvData || [],
                config
            );

            setImportResult(result);

            if (result.success) {
                message.success('Import direct terminé avec succès');
                setActiveTab('results');
            } else {
                message.error('Des erreurs sont survenues lors de l\'import direct');
            }
        } catch (error) {
            console.error('Erreur lors de l\'import direct:', error);
            message.error('Erreur lors de l\'exécution de l\'import direct');
        } finally {
            setImporting(false);
        }
    };

    // Gérer la progression de l'import/analyse avec throttling
    const handleProgress = (progressData: ImportProgress) => {
        console.log('Progression reçue:', progressData);
        throttledSetProgress(progressData); // Utiliser la version limitée
        
        if (progressData.status === 'analyzing') {
            if (activeTab !== 'analysis') setActiveTab('analysis');
            setAnalyzing(true);
        } else {
            setAnalyzing(false);
        }

        // Mettre à jour les résultats de l'analyse et les actions sans throttling car moins fréquent
        if (progressData.status === 'analyzed') {
            if (progressData.analysis) {
                console.log('Analyse terminée, données d\'analyse:', progressData.analysis);
                setAnalysisResult({
                    success: true, 
                    analysis: progressData.analysis, 
                    csvData: progressData.analysis.csvData,
                    summary: {
                        totalRows: progressData.analysis.csvData?.length || 0,
                        actionsCount: progressData.analysis.actions?.length || 0,
                        createCount: progressData.analysis.summary?.createCount || 0,
                        updateCount: progressData.analysis.summary?.updateCount || 0,
                        errorCount: progressData.analysis.summary?.errorCount || 0
                    }
                });
                
                const actionItems: ActionItem[] = progressData.analysis.actions.map((action, index) => ({
                    id: `action-${index}`,
                    actionType: action.actionType as ActionType,
                    objectName: action.objectName,
                    path: action.path,
                    message: action.message,
                    attributes: action.attributes,
                    selected: true
                }));
                setActions(actionItems);
                message.success('Analyse terminée avec succès et actions prêtes.');
            } else {
                console.warn('Analyse marquée comme terminée, mais aucune donnée d\'analyse reçue.');
                message.warning('L\'analyse est terminée mais aucune donnée exploitable n\'a été retournée.');
                setAnalysisResult({ success: true, analysis: undefined });
                setActions([]);
            }
            setActiveTab('analysis');
        } 
        else if (progressData.status === 'completed' && progressData.result) {
            console.log('Import terminé via SignalR, résultat:', progressData.result);
            setImportResult(progressData.result);
            setImporting(false);
            message.success('Import terminé avec succès');
            setActiveTab('results');
        }
        else if (progressData.status === 'error') {
            message.error(`Erreur: ${progressData.message}`);
            setAnalysisResult({ success: false, errorMessage: progressData.message });
            setActions([]);
            setActiveTab('logs');
        }
    };

    // Gérer les logs avec mise en lot
    const handleLog = (log: LogEntry) => {
        const logEntry = {
            ...log,
            timestamp: log.timestamp ? log.timestamp : new Date().toISOString()
        };
        
        // Ajouter le log au lot plutôt que directement à l'état
        batchLogs(logEntry);
        
        // Afficher les messages importants immédiatement
        if (log.level === 'error') {
            message.error(log.message);
        } else if (log.level === 'warning') {
            message.warning(log.message);
        } else if (log.level === 'success') {
            message.success(log.message);
        }
    };

    // Gérer la sélection/désélection de toutes les actions
    const handleSelectAllActions = (selected: boolean) => {
        setActions(actions.map(action => ({
            ...action,
            selected
        })));
    };

    // Gérer la sélection/désélection d'une action
    const handleSelectAction = (id: string, selected: boolean) => {
        setActions(actions.map(action =>
            action.id === id ? { ...action, selected } : action
        ));
    };

    // Obtenir la couleur du tag en fonction du type d'action
    const getActionTypeColor = (actionType: ActionType) => {
        // Convertir en chaîne si c'est un nombre
        const actionTypeStr = typeof actionType === 'number'
            ? Object.values(ActionType)[actionType] || ''
            : String(actionType);
            
        switch (actionTypeStr) {
            case ActionType.CREATE_USER:
                return 'green';
            case ActionType.UPDATE_USER:
                return 'blue';
            case ActionType.DELETE_USER:
                return 'red';
            case ActionType.MOVE_USER:
                return 'orange';
            case ActionType.CREATE_OU:
                return 'purple';
            case ActionType.DELETE_OU:
                return 'volcano';
            case ActionType.ERROR:
                return 'red';
            default:
                return 'default';
        }
    };

    // Obtenir l'icône en fonction du niveau de log
    const getLogLevelIcon = (level: string) => {
        switch (level) {
            case 'info':
                return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
            case 'warning':
                return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'error':
                return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
            case 'success':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            default:
                return <InfoCircleOutlined />;
        }
    };

    // Rendu des colonnes pour la table des actions
    const actionColumns = [
        {
            title: 'Type',
            dataIndex: 'actionType',
            key: 'actionType',
            render: (actionType: ActionType) => {
                // Vérifier si actionType est un nombre ou une chaîne
                const actionTypeStr = typeof actionType === 'number' 
                    ? Object.values(ActionType)[actionType] || 'UNKNOWN'
                    : String(actionType);
                
                return (
                    <Tag color={getActionTypeColor(actionType)}>
                        {actionTypeStr.replace('_', ' ')}
                    </Tag>
                );
            }
        },
        {
            title: 'Objet',
            dataIndex: 'objectName',
            key: 'objectName'
        },
        {
            title: 'Chemin',
            dataIndex: 'path',
            key: 'path'
        },
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message'
        },
        {
            title: 'Sélectionné',
            dataIndex: 'selected',
            key: 'selected',
            render: (selected: boolean, record: ActionItem) => (
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => handleSelectAction(record.id, e.target.checked)}
                />
            )
        }
    ];

    // Rendu des colonnes pour la table des résultats
    const resultColumns = [
        {
            title: 'Type',
            dataIndex: 'actionType',
            key: 'actionType',
            render: (actionType: ActionType) => {
                // Vérifier si actionType est un nombre ou une chaîne
                const actionTypeStr = typeof actionType === 'number' 
                    ? Object.values(ActionType)[actionType] || 'UNKNOWN'
                    : String(actionType);
                
                return (
                    <Tag color={getActionTypeColor(actionType)}>
                        {actionTypeStr.replace('_', ' ')}
                    </Tag>
                );
            }
        },
        {
            title: 'Objet',
            dataIndex: 'objectName',
            key: 'objectName'
        },
        {
            title: 'Chemin',
            dataIndex: 'path',
            key: 'path'
        },
        {
            title: 'Statut',
            dataIndex: 'success',
            key: 'success',
            render: (success: boolean) => (
                success ?
                <Tag color="green" icon={<CheckCircleOutlined />}>Succès</Tag> :
                <Tag color="red" icon={<CloseCircleOutlined />}>Échec</Tag>
            )
        },
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message'
        }
    ];

    // Optimiser le rendu de la liste des logs
    const renderLogItem = useCallback((log: LogEntry) => (
        <List.Item key={`${log.timestamp}-${log.message.substring(0, 20)}`}>
            <Space>
                {getLogLevelIcon(log.level || 'info')}
                <Text type="secondary">{new Date(log.timestamp).toLocaleTimeString()}</Text>
                <Text>{log.message}</Text>
            </Space>
        </List.Item>
    ), []);

    // Fonction pour rendre le composant des logs
    const LogsPanel = ({ logs, height = '250px', title = 'Logs en temps réel' }: { logs: LogEntry[], height?: string, title?: string }) => (
        <>
            <Title level={5}>{title}</Title>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button onClick={() => setLogs([])}>
                    Effacer les logs
                </Button>
                <div>
                    <Switch 
                        checked={autoScrollLogs}
                        onChange={setAutoScrollLogs}
                        checkedChildren="Défilement auto activé"
                        unCheckedChildren="Défilement auto désactivé"
                        style={{ marginRight: '8px' }}
                    />
                    <Tooltip title="Le défilement automatique suit les nouveaux logs. Désactivez cette option pour naviguer librement dans les logs.">
                        <InfoCircleOutlined />
                    </Tooltip>
                </div>
            </div>
            <div 
                ref={logsContainerRef}
                style={{ 
                    ...logsContainerStyle,
                    height 
                }}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={logs}
                    renderItem={renderLogItem}
                    locale={{ emptyText: 'Aucun log disponible' }}
                />
                <div ref={logsEndRef} />
            </div>
        </>
    );

    // Fonction pour afficher la progression de l'import
    const renderProgressStatus = () => {
        if (!progress) return null;

        let statusText = '';
        let statusColor = '#52c41a'; // Vert par défaut
        let statusIcon = null;
        let percent = progress.progress || 0;

        switch (progress.status) {
            case 'analyzing':
                statusText = 'Analyse en cours';
                statusColor = '#1890ff'; // Bleu
                statusIcon = <LoadingOutlined />;
                break;
            case 'analyzed':
                statusText = 'Analyse terminée';
                statusColor = '#52c41a'; // Vert
                statusIcon = <CheckCircleOutlined />;
                percent = 100; // Forcé à 100%
                break;
            case 'importing':
                statusText = 'Import en cours';
                statusColor = '#1890ff'; // Bleu
                statusIcon = <LoadingOutlined />;
                break;
            case 'creating_ous':
                statusText = 'Création des unités organisationnelles';
                statusColor = '#fa8c16'; // Orange
                statusIcon = <LoadingOutlined />;
                break;
            case 'processing_users':
                statusText = 'Traitement des utilisateurs';
                statusColor = '#1890ff'; // Bleu
                statusIcon = <LoadingOutlined />;
                break;
            case 'completed':
                statusText = 'Import terminé avec succès';
                statusColor = '#52c41a'; // Vert
                statusIcon = <CheckCircleOutlined />;
                percent = 100; // Forcé à 100%
                break;
            case 'completed_with_errors':
                statusText = 'Import terminé avec des erreurs';
                statusColor = '#faad14'; // Jaune
                statusIcon = <WarningOutlined />;
                percent = 100; // Forcé à 100%
                break;
            case 'error':
                statusText = 'Erreur';
                statusColor = '#f5222d'; // Rouge
                statusIcon = <CloseCircleOutlined />;
                break;
            default:
                statusText = 'En attente';
                statusColor = '#d9d9d9'; // Gris
                break;
        }

        // Calculer les statistiques de progression, si disponibles
        let progressStats = null;
        if (progress.analysis?.summary) {
            const summary = progress.analysis.summary;
            const processedCount = summary.processedCount || 0;
            const totalObjects = summary.totalObjects || 0;
            const processedPercent = totalObjects > 0 ? Math.round((processedCount / totalObjects) * 100) : 0;
            
            progressStats = (
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <Statistic 
                        title="Traités" 
                        value={processedCount} 
                        suffix={`/ ${totalObjects}`} 
                        valueStyle={{ fontSize: '14px' }} 
                    />
                    <Statistic 
                        title="Créations" 
                        value={summary.createCount} 
                        valueStyle={{ fontSize: '14px', color: '#52c41a' }} 
                    />
                    <Statistic 
                        title="Mises à jour" 
                        value={summary.updateCount} 
                        valueStyle={{ fontSize: '14px', color: '#1890ff' }} 
                    />
                    <Statistic 
                        title="Erreurs" 
                        value={summary.errorCount} 
                        valueStyle={{ fontSize: '14px', color: summary.errorCount > 0 ? '#f5222d' : '#52c41a' }} 
                    />
                </div>
            );
        }

        return (
            <Card title="Progression" variant="borderless" className="progress-card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    {statusIcon && <span style={{ marginRight: '10px', fontSize: '20px', color: statusColor }}>{statusIcon}</span>}
                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>{statusText}</div>
                        <div>{progress.message}</div>
                    </div>
                </div>
                
                <Progress percent={percent} status={progress.status === 'error' ? 'exception' : undefined} strokeColor={statusColor} />
                
                {progressStats}
            </Card>
        );
    };

    // Fonction pour afficher le statut de connexion au serveur
    const renderServerStatus = () => {
        let statusIcon = null;
        let statusText = '';
        let statusColor = '';

        switch (serverStatus) {
            case 'online':
                statusIcon = <CheckCircleOutlined />;
                statusText = 'Serveur connecté';
                statusColor = '#52c41a'; // vert
                break;
            case 'offline':
                statusIcon = <CloseCircleOutlined />;
                statusText = 'Serveur non accessible';
                statusColor = '#f5222d'; // rouge
                break;
            case 'checking':
                statusIcon = <SyncOutlined spin />;
                statusText = 'Vérification de la connexion...';
                statusColor = '#faad14'; // jaune
                break;
        }

        return (
            <div style={{ marginBottom: '16px' }}>
                <Alert
                    message={
                        <Space>
                            <span style={{ color: statusColor }}>{statusIcon}</span>
                            <span>{statusText}</span>
                        </Space>
                    }
                    type={serverStatus === 'online' ? 'success' : serverStatus === 'offline' ? 'error' : 'warning'}
                    showIcon={false}
                    action={
                        serverStatus === 'offline' && (
                            <Button 
                                size="small" 
                                onClick={async () => {
                                    try {
                                        setServerStatus('checking');
                                        await importSystemMigrator.initializeService();
                                        setServerStatus('online');
                                        message.success('Connexion au serveur établie');
                                    } catch (error) {
                                        console.error('Échec de reconnexion:', error);
                                        setServerStatus('offline');
                                        message.error('Impossible de se connecter au serveur');
                                    }
                                }}
                            >
                                Reconnecter
                            </Button>
                        )
                    }
                />
                {serverStatus === 'offline' && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                        <p>Le serveur d'importation n'est pas accessible. Certaines fonctionnalités sont limitées.</p>
                        <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                            <li>Vérifiez que le service ADManagerAPI est démarré</li>
                            <li>Vérifiez les paramètres réseau et les pare-feu</li>
                            <li>Essayez de recharger la page après avoir résolu le problème</li>
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    // Définition des éléments pour le composant Tabs
    const tabItems = [
        {
            key: 'upload',
            label: 'Téléchargement',
            children: (
                <div style={tabContentStyle}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {renderServerStatus()}
                        
                        <Title level={4}>Étape 1: Sélectionner un fichier (CSV ou Excel)</Title>
                        <Space direction="horizontal" style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                            <Upload
                                accept=".csv,.xls,.xlsx"
                                beforeUpload={(file) => {
                                    console.log('beforeUpload appelé avec fichier:', file);
                                    return false; // Empêche l'upload automatique
                                }}
                                onChange={handleFileChange}
                                maxCount={1}
                                customRequest={({ file, onSuccess }) => {
                                    console.log('customRequest appelé avec fichier:', file);
                                    setTimeout(() => {
                                        onSuccess && onSuccess("ok");
                                    }, 0);
                                }}
                                showUploadList={true}
                            >
                                <Button icon={<UploadOutlined />}>Sélectionner un fichier (CSV, Excel)</Button>
                            </Upload>
                            
                            <Button 
                                type="link" 
                                icon={<InfoCircleOutlined />}
                                onClick={() => {
                                    message.info({
                                        content: (
                                            <div>
                                                <p>Le fichier (CSV ou Excel) doit avoir les colonnes suivantes (la première feuille sera lue pour Excel) :</p>
                                                <ul>
                                                    <li>Nom</li>
                                                    <li>Prénom</li>
                                                    <li>Email</li>
                                                    <li>Groupe (optionnel)</li>
                                                    <li>Chemin OU (optionnel)</li>
                                                </ul>
                                                <p>Si vous rencontrez des problèmes, vérifiez que :</p>
                                                <ul>
                                                    <li>Votre fichier CSV est encodé en UTF-8</li>
                                                    <li>Les délimiteurs CSV correspondent à votre configuration</li>
                                                    <li>La première ligne contient les en-têtes des colonnes</li>
                                                </ul>
                                            </div>
                                        ),
                                        duration: 0,
                                        icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
                                    });
                                }}
                            >
                                Aide sur le format du fichier
                            </Button>
                        </Space>

                        {file && (
                            <Alert
                                message={`Fichier sélectionné: ${file.name}`}
                                type="success"
                                showIcon
                            />
                        )}

                        <Divider />

                        <Title level={4}>Étape 2: Sélectionner une configuration d'import</Title>
                        <Select
                            style={{ width: 500 }}
                            placeholder={configsLoading ? "Chargement des configurations..." : "Sélectionner une configuration"}
                            onChange={handleConfigChange}
                            value={selectedConfigId}
                            optionLabelProp="label"
                            styles={{ popup: { root: { padding: '8px' } } }}
                            loading={configsLoading}
                            disabled={configsLoading}
                            notFoundContent={
                                configsLoading ? 
                                    <Spin size="small" /> : 
                                    "Aucune configuration disponible. Veuillez en créer une dans la section Paramètres."
                            }
                        >
                            {configs.map(config => (
                                <Option 
                                    key={config.id} 
                                    value={config.id || ''}
                                    label={config.name}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                                            {config.name}
                                        </div>
                                        {config.description && (
                                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                                {config.description}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '12px', color: '#999', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            <span>Délimiteur CSV: {config.csvDelimiter}</span>
                                            <span>OU par défaut: {config.defaultOU || 'Non défini'}</span>
                                            <span>Créer OUs manquantes: {config.createMissingOUs ? 'Oui' : 'Non'}</span>
                                        </div>
                                    </div>
                                </Option>
                            ))}
                        </Select>

                        {configs.length === 0 && !configsLoading && (
                            <Alert
                                style={{ marginTop: '8px' }}
                                message="Aucune configuration disponible"
                                description={
                                    <span>
                                        Veuillez créer une configuration d'import dans la section{' '}
                                        <a href="/settings/imports">Paramètres d'importation</a>.
                                    </span>
                                }
                                type="warning"
                                showIcon
                            />
                        )}

                        {configs.length > 0 && (
                            <div style={{ marginTop: '8px', textAlign: 'right' }}>
                                <a href="/settings/imports">
                                    Gérer les configurations d'importation
                                </a>
                            </div>
                        )}

                        <Divider />

                        <Button
                            type="primary"
                            onClick={handleAnalyze}
                            disabled={!file || !selectedConfigId || analyzing}
                            loading={analyzing}
                        >
                            Analyser le fichier
                        </Button>
                        
                        <div style={{ marginTop: 10 }}>
                            <Text type="secondary">État actuel: </Text>
                            <Tag color={file ? 'success' : 'error'}>Fichier: {file ? 'Présent' : 'Absent'}</Tag>
                            <Tag color={selectedConfigId ? 'success' : 'error'}>Configuration: {selectedConfigId || 'Non sélectionnée'}</Tag>
                            <Tag color={analyzing ? 'processing' : 'default'}>Analyse: {analyzing ? 'En cours' : 'Inactif'}</Tag>
                            
                            {!file && !selectedConfigId && (
                                <Alert
                                    style={{ marginTop: 8 }}
                                    message="Pour activer l'analyse, vous devez sélectionner un fichier (CSV ou Excel) et une configuration"
                                    type="info"
                                    showIcon
                                />
                            )}
                            
                            {file && !selectedConfigId && (
                                <Alert
                                    style={{ marginTop: 8 }}
                                    message="Sélectionnez une configuration pour activer l'analyse"
                                    type="warning"
                                    showIcon
                                />
                            )}
                            
                            {!file && selectedConfigId && (
                                <Alert
                                    style={{ marginTop: 8 }}
                                    message="Sélectionnez un fichier (CSV ou Excel) pour activer l'analyse"
                                    type="warning"
                                    showIcon
                                />
                            )}
                        </div>
                    </Space>
                </div>
            ),
        },
        {
            key: 'analysis',
            label: 'Analyse',
            disabled: !analyzing && !analysisResult && !progress,
            children: (
                <div style={tabContentStyle}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Title level={4}>Analyse du fichier</Title>

                        {progress && renderProgressStatus()}

                        {analyzing && !progress && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: '20px' }}>Initialisation de l'analyse, veuillez patienter...</div>
                            </div>
                        )}

                        {analysisResult && (
                            <>
                                {!analysisResult.success ? (
                                    <Alert
                                        message="Erreur d'analyse"
                                        description={analysisResult.errorMessage}
                                        type="error"
                                        showIcon
                                    />
                                ) : (
                                    <>
                                        <Alert
                                            message="Analyse réussie"
                                            description={`${analysisResult.summary?.totalRows} lignes analysées`}
                                            type="success"
                                            showIcon
                                        />

                                        <Card title="Résumé des actions" style={{ marginTop: 16 }}>
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                                                    <Statistic
                                                        title="Total des actions"
                                                        value={analysisResult.summary?.actionsCount || 0}
                                                        prefix={<InfoCircleOutlined />}
                                                    />
                                                    <Statistic
                                                        title="OUs à créer"
                                                        value={analysisResult.analysis?.summary.createOUCount || 0}
                                                        valueStyle={{ color: '#722ed1' }}
                                                        prefix={<FolderAddOutlined />}
                                                    />
                                                    <Statistic
                                                        title="OUs à supprimer"
                                                        value={analysisResult.analysis?.summary.deleteOUCount || 0}
                                                        valueStyle={{ color: '#d4380d' }}
                                                        prefix={<DeleteOutlined />}
                                                    />
                                                </div>
                                                
                                                <Divider orientation="left">Actions sur les utilisateurs</Divider>
                                                
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                                    <Statistic
                                                        title="Utilisateurs à créer"
                                                        value={analysisResult.analysis?.summary.createCount || 0}
                                                        valueStyle={{ color: '#3f8600' }}
                                                        prefix={<UserAddOutlined />}
                                                    />
                                                    <Statistic
                                                        title="Utilisateurs à mettre à jour"
                                                        value={analysisResult.analysis?.summary.updateCount || 0}
                                                        valueStyle={{ color: '#1890ff' }}
                                                        prefix={<EditOutlined />}
                                                    />
                                                    <Statistic
                                                        title="Utilisateurs à supprimer"
                                                        value={analysisResult.analysis?.summary.deleteCount || 0}
                                                        valueStyle={{ color: '#cf1322' }}
                                                        prefix={<DeleteOutlined />}
                                                    />
                                                    <Statistic
                                                        title="Erreurs détectées"
                                                        value={analysisResult.analysis?.summary.errorCount || 0}
                                                        valueStyle={{ color: '#fa8c16' }}
                                                        prefix={<WarningOutlined />}
                                                    />
                                                </div>
                                            </Space>
                                        </Card>

                                        <div style={{ marginTop: 16 }}>
                                            <Space style={{ marginBottom: 16 }}>
                                                <Button onClick={() => handleSelectAllActions(true)}>
                                                    Tout sélectionner
                                                </Button>
                                                <Button onClick={() => handleSelectAllActions(false)}>
                                                    Tout désélectionner
                                                </Button>
                                            </Space>

                                            <Table
                                                columns={actionColumns}
                                                dataSource={actions}
                                                rowKey="id"
                                                pagination={{ pageSize: 10 }}
                                                scroll={{ x: 'max-content' }}
                                            />
                                        </div>

                                        <Button
                                            type="primary"
                                            onClick={handleImport}
                                            disabled={importing || actions.filter(a => a.selected).length === 0}
                                            loading={importing}
                                            style={{ marginTop: 16, marginRight: 8 }}
                                        >
                                            Exécuter l'import
                                        </Button>

                                        <Button
                                            onClick={handleDirectImport}
                                            disabled={importing}
                                            loading={importing}
                                            style={{ marginTop: 16 }}
                                            icon={<SyncOutlined />}
                                        >
                                            Import automatique
                                        </Button>

                                        <Text style={{ marginLeft: 8, fontSize: '12px', display: 'block', marginTop: 8 }}>
                                            L'import automatique analyse et exécute directement sans sélection manuelle des actions.
                                        </Text>
                                    </>
                                )}
                            </>
                        )}

                        <Divider />
                        <LogsPanel logs={logs} height="300px" title="Logs de l'analyse" />
                    </Space>
                </div>
            ),
        },
        {
            key: 'results',
            label: 'Résultats',
            disabled: !importResult,
            children: importResult && (
                <div style={tabContentStyle}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Title level={4}>Résultat de l'import</Title>

                        {importResult.success ? (
                            <Alert
                                message="Import réussi"
                                description={`${importResult.summary.totalObjects} objets traités avec succès`}
                                type="success"
                                showIcon
                            />
                        ) : (
                            <Alert
                                message="Erreur durant l'import"
                                description="Une erreur s'est produite durant l'import"
                                type="error"
                                showIcon
                            />
                        )}

                        <Card title="Résumé" style={{ marginTop: 16 }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                                    <Statistic
                                        title="Total des actions"
                                        value={importResult.summary.totalObjects || 0}
                                        prefix={<InfoCircleOutlined />}
                                    />
                                    <Statistic
                                        title="OUs créées"
                                        value={importResult.summary.createOUCount || 0}
                                        valueStyle={{ color: '#722ed1' }}
                                        prefix={<FolderAddOutlined />}
                                    />
                                    <Statistic
                                        title="OUs supprimées"
                                        value={importResult.summary.deleteOUCount || 0}
                                        valueStyle={{ color: '#d4380d' }}
                                        prefix={<DeleteOutlined />}
                                    />
                                </div>
                                
                                <Divider orientation="left">Actions effectuées sur les utilisateurs</Divider>
                                
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                    <Statistic
                                        title="Utilisateurs créés"
                                        value={importResult.summary.createCount || 0}
                                        valueStyle={{ color: '#3f8600' }}
                                        prefix={<UserAddOutlined />}
                                    />
                                    <Statistic
                                        title="Utilisateurs mis à jour"
                                        value={importResult.summary.updateCount || 0}
                                        valueStyle={{ color: '#1890ff' }}
                                        prefix={<EditOutlined />}
                                    />
                                    <Statistic
                                        title="Utilisateurs supprimés"
                                        value={importResult.summary.deleteCount || 0}
                                        valueStyle={{ color: '#cf1322' }}
                                        prefix={<DeleteOutlined />}
                                    />
                                    <Statistic
                                        title="Erreurs"
                                        value={importResult.summary.errorCount || 0}
                                        valueStyle={{ color: '#fa8c16' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </div>
                            </Space>
                        </Card>

                        <Title level={5} style={{ marginTop: 16 }}>Détails des actions</Title>
                        <Table
                            columns={resultColumns}
                            dataSource={importResult.details || []}
                            rowKey={(record) => `${record.objectName || ''}-${record.actionType || ''}`}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                        
                        <Divider />
                        <LogsPanel logs={logs} height="200px" title="Logs de l'import" />
                    </Space>
                </div>
            ),
        }
    ];

    return (
        <Card 
            title="Import de Fichier (CSV/Excel)" 
            style={pageStyle}
        >
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab} 
                items={tabItems}
                style={{ width: '100%' }}
            />
        </Card>
    );
};

export default CsvImportPage;
