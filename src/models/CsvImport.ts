// src/models/CsvImport.ts

export enum ActionType {
    CREATE_USER = 'CREATE_USER',
    UPDATE_USER = 'UPDATE_USER',
    DELETE_USER = 'DELETE_USER',
    MOVE_USER = 'MOVE_USER',
    CREATE_OU = 'CREATE_OU',
    UPDATE_OU = 'UPDATE_OU',
    DELETE_OU = 'DELETE_OU',
    CREATE_GROUP = 'CREATE_GROUP',
    DELETE_GROUP = 'DELETE_GROUP',
    CREATE_STUDENT_FOLDER = 'CREATE_STUDENT_FOLDER',
    CREATE_TEAM = 'CREATE_TEAM',
    CREATE_CLASS_GROUP_FOLDER = 'CREATE_CLASS_GROUP_FOLDER',
    ADD_USER_TO_GROUP = 'ADD_USER_TO_GROUP',
    CREATE_SECURITY_GROUP = 'CREATE_SECURITY_GROUP',
    CREATE_DISTRIBUTION_GROUP = 'CREATE_DISTRIBUTION_GROUP',
    ERROR = 'ERROR'
}

export interface ImportConfig {
    id?: string;
    name: string;
    description?: string;
    csvDelimiter: string;
    defaultOU: string;
    ouColumn?: string;
    createMissingOUs: boolean;
    headerMapping: Record<string, string>;
    manualColumns?: string[];
    disabledActionTypes?: ActionType[];
}

export interface ImportAction {
    actionType: ActionType;
    objectName: string;
    path: string;
    message: string;
    attributes: Record<string, string>;
}

export interface ActionItem {
    id: string;
    actionType: ActionType;
    objectName: string;
    path: string;
    message: string;
    attributes: Record<string, string>;
    selected: boolean;
}

// Interface compatible avec le backend ImportActionItem
export interface ImportActionItem {
    id: string;
    actionType: ActionType;
    objectName: string;
    path: string;
    message: string;
    attributes: Record<string, string>;
    selected: boolean;
}

export interface ImportSummary {
    totalObjects: number;
    createCount: number;
    createOUCount?: number;
    updateCount: number;
    deleteCount: number;
    deleteOUCount?: number;
    moveCount?: number;
    errorCount: number;
    processedCount?: number;
    createStudentFolderCount?: number;
    createClassGroupFolderCount?: number;
    createTeamGroupCount?: number;
    provisionUserShareCount?: number;
}

export interface ImportAnalysis {
    actions: ImportAction[];
    summary: ImportSummary;
    csvData?: Record<string, string>[];
}

export interface CsvAnalysisResult {
    success: boolean;
    errorMessage?: string;
    csvData?: Record<string, string>[];
    csvHeaders?: string[];
    previewData?: any[];
    tableData?: Record<string, string>[];
    errors?: string[];
    isValid?: boolean;
    analysis?: ImportAnalysis;
    summary?: {
        totalRows: number;
        actionsCount: number;
        createCount: number;
        updateCount: number;
        errorCount: number;
    };
}

export interface ImportActionResult {
    actionType: ActionType;
    objectName: string;
    path?: string;
    success: boolean;
    message: string;
}

export interface ImportResult {
    success: boolean;
    summary: ImportSummary;
    details: ImportActionResult[];
}

export interface ImportProgress {
    status: 'initializing' | 'validating' | 'selecting-parser' | 'reading-file' | 'parsing' | 'data-loaded' | 'preparing' | 'validating-config' | 'extracting-headers' | 'preparing-result' | 'analyzing-actions' | 'processing-ous' | 'analyzing-ous' | 'ous-processed' | 'processing-users' | 'users-processed' | 'cleanup-orphans' | 'orphans-found' | 'cleanup-empty-ous' | 'filtering-actions' | 'finalizing' | 'preloading-ldap' | 'loading-users-batch' | 'users-loaded' | 'users-fallback' | 'loading-ous-batch' | 'ous-loaded' | 'ous-fallback' | 'processing-ous-optimized' | 'ous-optimized-done' | 'processing-users-optimized' | 'processing-users-progress' | 'users-processing-complete' | 'cleanup-orphans-optimized' | 'orphans-optimized-found' | 'cleanup-empty-ous-optimized' | 'filtering-actions-optimized' | 'finalizing-optimized' | 'uploading' | 'analyzing' | 'analyzed' | 'importing' | 'creating_ous' | 'processing_users' | 'completed' | 'completed_with_errors' | 'error' | 'idle';
    message: string;
    progress: number;
    timestamp?: string;
    currentAction?: ImportAction;
    result?: ImportResult | null;
    analysis?: ImportAnalysis | null;
}

export interface LogEntry {
    timestamp?: string;
    level?: 'info' | 'warning' | 'error' | 'success';
    message: string;
}

export const getActionTypeDetails = (actionType: ActionType) => {
    switch (actionType) {
        case ActionType.CREATE_USER:
            return { label: 'Créer Utilisateur', description: 'Crée un nouvel utilisateur dans l\'annuaire.' };
        case ActionType.UPDATE_USER:
            return { label: 'Mettre à jour Utilisateur', description: 'Met à jour les attributs d\'un utilisateur existant.' };
        case ActionType.DELETE_USER:
            return { label: 'Supprimer Utilisateur', description: 'Supprime un utilisateur (souvent un orphelin).' };
        case ActionType.MOVE_USER:
            return { label: 'Déplacer Utilisateur', description: 'Déplace un utilisateur vers une autre unité organisationnelle.' };
        case ActionType.CREATE_OU:
            return { label: 'Créer OU', description: 'Crée une nouvelle unité organisationnelle.' };
        case ActionType.DELETE_OU:
            return { label: 'Supprimer OU', description: 'Supprime une unité organisationnelle (si vide).' };
        case ActionType.CREATE_STUDENT_FOLDER:
            return { label: 'Créer Dossier Élève', description: 'Crée un dossier personnel pour un élève.' };
        case ActionType.CREATE_CLASS_GROUP_FOLDER:
            return { label: 'Créer Dossier Groupe Classe', description: 'Crée un dossier pour un groupe classe.' };
        case ActionType.CREATE_TEAM:
            return { label: 'Créer Équipe Teams', description: 'Crée une nouvelle équipe dans Microsoft Teams.' };
        case ActionType.ADD_USER_TO_GROUP:
            return { label: 'Ajouter à un groupe', description: 'Ajoute un utilisateur à un groupe de sécurité ou de distribution.' };
        default:
            return { label: actionType, description: 'Action non spécifiée.' };
    }
};
