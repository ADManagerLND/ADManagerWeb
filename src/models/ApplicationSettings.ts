// src/models/ApplicationSettings.ts

/**
 * Interface pour les paramètres API
 */
export interface ApiSettings {
    apiUrl: string;
    apiVersion: string;
    apiTimeout: number;
    apiRateLimit: number;
    enableLogging: boolean;
    language: string;
    theme: string;
    itemsPerPage: number;
    sessionTimeout: number;
    enableNotifications: boolean;
}

/**
 * Interface pour les paramètres LDAP
 */
export interface LdapSettings {
    LdapServer: string;
    LdapDomain: string;
    LdapPort: number;
    LdapBaseDn: string;
    LdapUsername: string;
    LdapPassword: string;
    LdapSsl: boolean;
    LdapPageSize: number;
    netBiosDomainName: string;
}

/**
 * Interface pour les paramètres de sécurité
 */
export interface SecuritySettings {
    requireMfa: boolean;
    passwordMinLength: number;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordExpiryDays: number;
    sessionTimeoutMinutes: number;
    lockoutThreshold: number;
    lockoutDurationMinutes: number;
}

/**
 * Interface représentant une catégorie de paramètres
 */
export interface SettingsCategory {
    key: string;
    label: string;
    icon?: string;
    description?: string;
    order?: number;
    isEnabled: boolean;
}

/**
 * Interface pour la configuration d'import
 */
export interface ImportConfig {
    id: string;
    name: string;
    description: string;
    delimiter: string;
    hasHeaders: boolean;
    skipRows: number;
    mapping: Record<string, string>;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    groupPrefix?: string;
}

/**
 * Interface pour tous les paramètres de l'application
 */
export interface ApplicationSettings {
    api: ApiSettings;
    ldap: LdapSettings;
    security: SecuritySettings;
    importConfigs: ImportConfig[];
    userAttributes: UserAttributes;
    imports: any[];
    folderManagementSettings: any;
    fsrmSettings: any;
}

/**
 * Interface pour la définition d'un attribut utilisateur
 */
export interface UserAttribute {
    id: string;
    name: string;
    displayName: string;
    description: string;
    dataType: 'string' | 'number' | 'boolean' | 'date' | 'array';
    isRequired: boolean;
    isEditable: boolean;
    isVisible: boolean;
    isSearchable: boolean;
    validationRule?: string;
    defaultValue?: any;
}

/**
 * Interface pour le profil utilisateur
 */
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
    avatar?: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UserAttributes {
    attributes: AttributeDefinition[];
}

export interface AttributeDefinition {
    name: string;
    description: string;
    syntax: string;
    isRequired: boolean;
}
