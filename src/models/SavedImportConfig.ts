// src/models/SavedImportConfig.ts

/**
 * Interface pour les configurations d'import sauvegardées
 */
export interface SavedImportConfig {
    id: string;
    name: string;
    description?: string;
    source?: string;
    configData?: ImportConfig;
    isEnabled?: boolean;
    lastUsed?: string;
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
}

/**
 * Interface pour les données de configuration d'import (format du backend)
 */
export interface ImportConfig {
    objectTypeStr?: string;
    csvDelimiter?: string;
    hasHeaders?: boolean;
    skipRows?: number;
    manualColumns?: string[];
    attributeMappings?: Record<string, string>;
    defaultValues?: Record<string, string>;
    validators?: ImportValidator[];
}

/**
 * Interface pour les validateurs d'import
 */
export interface ImportValidator {
    attributeName: string; 
    validationType: string;
    validationParams?: string;
    errorMessage?: string;
}

/**
 * Interface pour les DTOs de configuration d'import
 */
export interface SavedImportConfigDto {
    id?: string; 
    name: string;
    description?: string;
    configData?: ImportConfig;
    source?: string;
    isEnabled?: boolean;
}

/**
 * Interface pour la création d'une nouvelle configuration d'import
 */
export interface NewImportConfig {
    name: string;
    description?: string;
    source?: string;
    delimiter?: string;
    hasHeaders?: boolean;
    skipRows?: number;
    mappingConfig?: Record<string, string>;
    isEnabled?: boolean;
}

/**
 * Type pour les résultats d'import
 */
export interface ImportResult {
    success: boolean;
    totalProcessed: number;
    totalSucceeded: number;
    totalFailed: number;
    errors?: ImportError[];
    warnings?: string[];
    details?: string;
}

/**
 * Interface pour les erreurs d'import
 */
export interface ImportError {
    row: number;
    field?: string;
    message: string;
    value?: string;
}
