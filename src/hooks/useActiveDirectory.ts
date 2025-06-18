// src/hooks/useActiveDirectory.ts
import {useCallback, useEffect, useState} from 'react';
import {message} from 'antd';
import activeDirectoryService, {
    ActiveDirectoryNode,
    BulkActionPayload,
    BulkActionResponse
} from '../services/api/activeDirectoryService';

// Interface pour l'état du hook
interface UseActiveDirectoryState {
    // Données
    rootNodes: ActiveDirectoryNode[];
    searchResults: ActiveDirectoryNode[];
    selectedUsers: ActiveDirectoryNode[];

    // États de chargement
    loading: boolean;
    searchLoading: boolean;
    bulkActionLoading: boolean;

    // Erreurs
    error: string | null;
    searchError: string | null;
}

// Interface pour les options du hook
interface UseActiveDirectoryOptions {
    autoLoadRoot?: boolean;
    showNotifications?: boolean;
    onError?: (error: Error) => void;
    onSuccess?: (message: string) => void;
}

// Type de retour du hook
interface UseActiveDirectoryReturn extends UseActiveDirectoryState {
    // Actions principales
    loadRootNodes: () => Promise<void>;
    loadChildren: (distinguishedName: string) => Promise<ActiveDirectoryNode[]>;
    search: (query: string) => Promise<void>;
    clearSearch: () => void;

    // Gestion des utilisateurs sélectionnés
    addSelectedUser: (user: ActiveDirectoryNode) => boolean;
    removeSelectedUser: (distinguishedName: string) => void;
    clearSelectedUsers: () => void;
    isUserSelected: (distinguishedName: string) => boolean;

    // Actions en masse
    executeBulkAction: (payload: BulkActionPayload) => Promise<BulkActionResponse | null>;

    // Utilitaires
    refresh: () => Promise<void>;
    testConnection: () => Promise<boolean>;
}

/**
 * Hook personnalisé pour gérer les interactions avec Active Directory
 */
export const useActiveDirectory = (options: UseActiveDirectoryOptions = {}): UseActiveDirectoryReturn => {
    const {
        autoLoadRoot = true,
        showNotifications = true,
        onError,
        onSuccess
    } = options;

    // État principal
    const [state, setState] = useState<UseActiveDirectoryState>({
        rootNodes: [],
        searchResults: [],
        selectedUsers: [],
        loading: false,
        searchLoading: false,
        bulkActionLoading: false,
        error: null,
        searchError: null
    });

    // Fonction utilitaire pour mettre à jour l'état
    const updateState = useCallback((updates: Partial<UseActiveDirectoryState>) => {
        setState(prevState => ({...prevState, ...updates}));
    }, []);

    // Fonction utilitaire pour gérer les erreurs
    const handleError = useCallback((error: Error, context: string) => {
        const errorMessage = `${context}: ${error.message}`;
        updateState({error: errorMessage});

        if (showNotifications) {
            message.error(errorMessage);
        }

        if (onError) {
            onError(error);
        }

        console.error(`[useActiveDirectory] ${context}:`, error);
    }, [showNotifications, onError, updateState]);

    // Fonction utilitaire pour gérer les succès
    const handleSuccess = useCallback((successMessage: string) => {
        if (showNotifications) {
            message.success(successMessage);
        }

        if (onSuccess) {
            onSuccess(successMessage);
        }
    }, [showNotifications, onSuccess]);

    // Charger les nœuds racines
    const loadRootNodes = useCallback(async () => {
        try {
            updateState({loading: true, error: null});
            const nodes = await activeDirectoryService.getRootNodes();
            updateState({rootNodes: nodes, loading: false});
        } catch (error) {
            updateState({loading: false});
            handleError(error as Error, 'Erreur lors du chargement des nœuds racines');
        }
    }, [updateState, handleError]);

    // Charger les enfants d'un nœud
    const loadChildren = useCallback(async (distinguishedName: string): Promise<ActiveDirectoryNode[]> => {
        try {
            const children = await activeDirectoryService.getChildren(distinguishedName);
            return children;
        } catch (error) {
            handleError(error as Error, 'Erreur lors du chargement des enfants');
            return [];
        }
    }, [handleError]);

    // Effectuer une recherche
    const search = useCallback(async (query: string) => {
        if (!query.trim()) {
            updateState({searchResults: [], searchError: null});
            return;
        }

        try {
            updateState({searchLoading: true, searchError: null});
            const results = await activeDirectoryService.search(query);
            updateState({
                searchResults: results,
                searchLoading: false
            });

            if (results.length === 0 && showNotifications) {
                message.info("Aucun résultat trouvé pour ce terme de recherche.");
            }
        } catch (error) {
            updateState({searchLoading: false});
            const errorMessage = 'Erreur lors de la recherche';
            updateState({searchError: errorMessage});
            handleError(error as Error, errorMessage);
        }
    }, [updateState, handleError, showNotifications]);

    // Vider les résultats de recherche
    const clearSearch = useCallback(() => {
        updateState({searchResults: [], searchError: null});
    }, [updateState]);

    // Ajouter un utilisateur à la sélection
    const addSelectedUser = useCallback((user: ActiveDirectoryNode): boolean => {
        const isAlreadySelected = state.selectedUsers.some(
            selected => selected.distinguishedName === user.distinguishedName
        );

        if (!isAlreadySelected) {
            updateState({
                selectedUsers: [...state.selectedUsers, user]
            });

            if (showNotifications) {
                message.success(`Utilisateur ${user.name} ajouté à la sélection`);
            }
            return true;
        } else {
            if (showNotifications) {
                message.info(`Utilisateur ${user.name} déjà sélectionné`);
            }
            return false;
        }
    }, [state.selectedUsers, updateState, showNotifications]);

    // Retirer un utilisateur de la sélection
    const removeSelectedUser = useCallback((distinguishedName: string) => {
        updateState({
            selectedUsers: state.selectedUsers.filter(
                user => user.distinguishedName !== distinguishedName
            )
        });
    }, [state.selectedUsers, updateState]);

    // Vider la sélection d'utilisateurs
    const clearSelectedUsers = useCallback(() => {
        updateState({selectedUsers: []});
        if (showNotifications) {
            message.info("Sélection vidée");
        }
    }, [updateState, showNotifications]);

    // Vérifier si un utilisateur est sélectionné
    const isUserSelected = useCallback((distinguishedName: string): boolean => {
        return state.selectedUsers.some(
            user => user.distinguishedName === distinguishedName
        );
    }, [state.selectedUsers]);

    // Exécuter une action en masse
    const executeBulkAction = useCallback(async (payload: BulkActionPayload): Promise<BulkActionResponse | null> => {
        if (payload.users.length === 0) {
            if (showNotifications) {
                message.warning("Aucun utilisateur sélectionné");
            }
            return null;
        }

        try {
            updateState({bulkActionLoading: true});
            const response = await activeDirectoryService.executeBulkAction(payload);
            updateState({bulkActionLoading: false});

            // Message de succès
            const successMessage = `Action "${payload.action}" exécutée: ${response.successCount}/${response.totalCount} utilisateurs traités`;
            handleSuccess(successMessage);

            // Avertissement pour les échecs
            if (response.failureCount > 0 && showNotifications) {
                message.warning(`${response.failureCount} utilisateurs n'ont pas pu être traités`);
            }

            return response;
        } catch (error) {
            updateState({bulkActionLoading: false});
            handleError(error as Error, 'Erreur lors de l\'exécution de l\'action en masse');
            return null;
        }
    }, [updateState, handleError, handleSuccess, showNotifications]);

    // Actualiser toutes les données
    const refresh = useCallback(async () => {
        await loadRootNodes();
        clearSearch();
        clearSelectedUsers();
        if (showNotifications) {
            message.success("Données actualisées");
        }
    }, [loadRootNodes, clearSearch, clearSelectedUsers, showNotifications]);

    // Tester la connexion
    const testConnection = useCallback(async (): Promise<boolean> => {
        try {
            const isConnected = await activeDirectoryService.testConnection();

            if (showNotifications) {
                if (isConnected) {
                    message.success("Connexion AD établie");
                } else {
                    message.error("Impossible de se connecter à l'AD");
                }
            }

            return isConnected;
        } catch (error) {
            handleError(error as Error, 'Erreur lors du test de connexion');
            return false;
        }
    }, [handleError, showNotifications]);

    // Chargement automatique des nœuds racines
    useEffect(() => {
        if (autoLoadRoot) {
            loadRootNodes();
        }
    }, [autoLoadRoot, loadRootNodes]);

    return {
        // État
        ...state,

        // Actions principales
        loadRootNodes,
        loadChildren,
        search,
        clearSearch,

        // Gestion des utilisateurs sélectionnés
        addSelectedUser,
        removeSelectedUser,
        clearSelectedUsers,
        isUserSelected,

        // Actions en masse
        executeBulkAction,

        // Utilitaires
        refresh,
        testConnection
    };
};

export default useActiveDirectory;