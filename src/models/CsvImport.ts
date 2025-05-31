// src/models/CsvImport.ts

export enum ActionType {
    CREATE_USER = 'CREATE_USER',
    UPDATE_USER = 'UPDATE_USER',
    DELETE_USER = 'DELETE_USER',
    MOVE_USER = 'MOVE_USER',
    CREATE_OU = 'CREATE_OU',
    DELETE_OU = 'DELETE_OU',
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
    createOUCount: number;
    updateCount: number;
    deleteCount: number;
    deleteOUCount?: number;
    moveCount: number;
    errorCount: number;
    processedCount?: number;
}

export interface ImportAnalysis {
    actions: ImportAction[];
    summary: ImportSummary;
    csvData: Record<string, string>[];
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
    status: 'analyzing' | 'analyzed' | 'importing' | 'creating_ous' | 'processing_users' | 'completed' | 'completed_with_errors' | 'error' | 'idle';
    message: string;
    progress: number;
    currentAction?: ImportAction;
    result?: ImportResult;
    analysis?: ImportAnalysis;
}

export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
}
