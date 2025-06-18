// src/models/ADMappingIntegration.ts

/**
 * Modèles TypeScript pour l'intégration Active Directory avec le système existant d'imports
 */

// Reprise du modèle SavedImportConfig existant
export interface SavedImportConfig {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    configData: ImportConfig;
    createdAt: string;
}

// Extension du modèle ImportConfig existant
export interface ImportConfig {
    createMissingOUs: boolean;
    defaultOU: string;
    overwriteExisting: boolean;
    moveObjects: boolean;
    deleteNotInImport: boolean;
    csvDelimiter: string;
    headerMapping: HeaderMapping;
    skipErrors: boolean;
    manualColumns: string[];
    ouColumn: string;
    samAccountNameColumn?: string;
    groupPrefix?: string;

    // Nouvelles propriétés pour les paramètres d'intégration AD
    adMappingSettings?: ADMappingSettings;

    // Propriétés existantes
    classGroupFolderCreationConfig?: any;
    teamGroupCreationConfig?: any;
    folders?: FolderSettings;
    netBiosDomainName?: string;
}

// Type pour headerMapping (le cœur du système existant)
export type HeaderMapping = Record<string, string>;

// Paramètres spécifiques à l'intégration AD
export interface ADMappingSettings {
    isADMappingEnabled: boolean;
    targetOU: string;
    conflictBehavior: ConflictBehavior;
    synchronizationSettings: SynchronizationSettings;
    validationRules: Record<string, string>;
    customTransformations: Record<string, string>;
}

export enum ConflictBehavior {
    Update = 'Update',
    Skip = 'Skip',
    Error = 'Error',
    CreateNew = 'CreateNew'
}

export interface SynchronizationSettings {
    enableAutoSync: boolean;
    syncInterval: SyncInterval;
    enableNotifications: boolean;
    maxBatchSize: number;
}

export enum SyncInterval {
    Manual = 'Manual',
    Hourly = 'Hourly',
    Daily = 'Daily',
    Weekly = 'Weekly',
    Monthly = 'Monthly'
}

export interface FolderSettings {
    HomeDirectoryTemplate: string;
    HomeDriveLetter: string;
    DefaultDivisionValue?: string;
    TargetServerName: string;
    ShareNameForUserFolders: string;
    LocalPathForUserShareOnServer: string;
    EnableShareProvisioning: boolean;
    DefaultShareSubfolders: string[];
}

// Interface pour l'affichage des mappages
export interface MappingDisplayItem {
    adAttribute: string;
    template: string;
    isTemplate: boolean;
    estimatedColumns: string[];
    isRequired?: boolean;
    validation?: ValidationResult;
}

// Interface pour la validation
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// Interface pour la prévisualisation des mappages
export interface MappingPreview {
    adAttribute: string;
    template: string;
    sampleValue: string;
    transformedValue: string;
    isValid: boolean;
    error?: string;
    warnings?: string[];
}

/**
 * Utilitaires pour l'intégration Active Directory
 */
export class ADMappingIntegrationUtils {
    /**
     * Convertit un SavedImportConfig en format d'affichage pour l'intégration AD
     */
    static convertImportConfigToMappingDisplay(config: SavedImportConfig): MappingDisplayItem[] {
        const headerMapping = config.configData.headerMapping;
        return Object.entries(headerMapping).map(([adAttribute, template]) => ({
            adAttribute,
            template,
            isTemplate: template.includes('%'),
            estimatedColumns: this.extractColumnsFromTemplate(template)
        }));
    }

    /**
     * Extrait les noms de colonnes d'un template
     */
    static extractColumnsFromTemplate(template: string): string[] {
        const matches = template.match(/%([^%:]+)(?::[^%]*)?%/g);
        if (!matches) return [];

        return matches.map(match => {
            const columnName = match.replace(/%/g, '').split(':')[0];
            return columnName;
        }).filter((value, index, self) => self.indexOf(value) === index);
    }

    /**
     * Applique un template avec les données CSV (compatible avec le système existant)
     */
    static applyTemplate(template: string, data: Record<string, any>): string {
        if (!template) return '';

        return template.replace(/%([^%]+)%/g, (match, group1) => {
            const [colName, transform] = group1.split(':');
            let value = data[colName] || '';

            if (typeof value !== 'string') {
                value = String(value ?? '');
            }

            // Application des transformations (compatible avec l'existant)
            if (transform) {
                switch (transform.toLowerCase()) {
                    case 'uppercase':
                        value = value.toUpperCase();
                        break;
                    case 'lowercase':
                        value = value.toLowerCase();
                        break;
                    case 'trim':
                        value = value.trim();
                        break;
                    case 'capitalize':
                        value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                        break;
                    case 'first':
                        value = value.charAt(0);
                        break;
                    default:
                        break;
                }
            }

            return value;
        });
    }

    /**
     * Convertit un tableau de MappingDisplayItem en HeaderMapping
     */
    static convertDisplayItemsToHeaderMapping(displayItems: MappingDisplayItem[]): HeaderMapping {
        return displayItems.reduce((acc, item) => {
            if (item.adAttribute && item.template) {
                acc[item.adAttribute] = item.template;
            }
            return acc;
        }, {} as HeaderMapping);
    }

    /**
     * Extrait la transformation d'un template (ex: %nom:uppercase% -> uppercase)
     */
    static extractTransformationFromTemplate(template: string): string | undefined {
        const match = template.match(/%[^%]+:([^%]+)%/);
        return match ? match[1].toLowerCase() : undefined;
    }

    /**
     * Applique ou supprime une transformation d'un template
     */
    static applyTransformationToTemplate(template: string, transformation: string | undefined): string {
        const baseTemplate = template.replace(/%([^%]+)(?::[^%]+)?%/, '%$1%');
        if (transformation) {
            const match = baseTemplate.match(/%([^%]+)%/);
            if (match) {
                return `%${match[1]}:${transformation}%`;
            }
        }
        return baseTemplate;
    }

    /**
     * Valide un headerMapping (validation globale)
     */
    static validateHeaderMapping(headerMapping: HeaderMapping, requiredAttributes: string[] = []): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Vérifier les attributs obligatoires
        requiredAttributes.forEach(attr => {
            if (!headerMapping[attr] || headerMapping[attr].trim() === '') {
                errors.push(`L'attribut obligatoire '${attr}' est manquant ou vide`);
            }
        });

        // Vérifier la syntaxe des templates
        Object.entries(headerMapping).forEach(([attr, template]) => {
            if (template.includes('%')) {
                const validation = this.validateTemplate(template);
                if (!validation.isValid) {
                    errors.push(`Template invalide pour '${attr}': ${validation.error}`);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Génère un aperçu de la validation pour chaque mappage individuel.
     * Utilisé pour afficher l'état de validation par attribut AD.
     */
    static generateMappingPreviews(headerMapping: HeaderMapping, sampleData: Record<string, any>, userAttributes: any[]): MappingPreview[] {
        return Object.entries(headerMapping).map(([adAttribute, template]) => {
            const transformedValue = this.applyTemplate(template, sampleData);
            const errors: string[] = [];
            const warnings: string[] = [];

            // Valider la syntaxe du template
            const templateValidation = this.validateTemplate(template);
            if (!templateValidation.isValid) {
                errors.push(templateValidation.error || 'Syntaxe de template invalide');
            }

            // Vérifier si l'attribut AD est un attribut connu et s'il est requis
            const attributeDef = userAttributes.find(attr => attr.name === adAttribute);
            if (!attributeDef) {
                warnings.push(`L'attribut AD '${adAttribute}' n'est pas un attribut utilisateur connu.`);
            } else if (attributeDef.isRequired && !transformedValue) {
                errors.push(`L'attribut obligatoire '${adAttribute}' ne peut pas être vide.`);
            }

            return {
                adAttribute,
                template,
                sampleValue: sampleData[this.extractColumnsFromTemplate(template)[0]] || '', // Utilise la première colonne extraite
                transformedValue,
                isValid: errors.length === 0,
                error: errors.length > 0 ? errors.join('; ') : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        });
    }

    /**
     * Crée une configuration d'import par défaut pour les mappages AD
     */
    static createDefaultImportConfig(): Partial<SavedImportConfig> {
        return {
            name: 'Nouvelle configuration Teams',
            description: 'Configuration de mapping Active Directory pour Teams',
            createdBy: 'Utilisateur',
            configData: {
                createMissingOUs: true,
                defaultOU: 'OU=Utilisateurs,DC=domain,DC=local',
                overwriteExisting: true,
                moveObjects: false,
                deleteNotInImport: false,
                csvDelimiter: ';',
                headerMapping: {
                    'sAMAccountName': '%prenom:lowercase%.%nom:lowercase%',
                    'givenName': '%prenom%',
                    'sn': '%nom:uppercase%',
                    'mail': '%prenom:lowercase%.%nom:lowercase%@entreprise.com',
                    'userPrincipalName': '%prenom:lowercase%.%nom:lowercase%@entreprise.com',
                    'displayName': '%prenom% %nom:uppercase%',
                    'cn': '%prenom% %nom%'
                },
                skipErrors: false,
                manualColumns: ['prenom', 'nom'],
                ouColumn: 'departement',
                adMappingSettings: {
                    isADMappingEnabled: true,
                    targetOU: 'OU=Utilisateurs,DC=domain,DC=local',
                    conflictBehavior: ConflictBehavior.Update,
                    synchronizationSettings: {
                        enableAutoSync: false,
                        syncInterval: SyncInterval.Manual,
                        enableNotifications: true,
                        maxBatchSize: 100
                    },
                    validationRules: {},
                    customTransformations: {}
                }
            }
        };
    }

    /**
     * Valide la syntaxe d'un template
     */
    private static validateTemplate(template: string): { isValid: boolean; error?: string } {
        try {
            // Vérifier que les % sont bien appairés
            const percentCount = (template.match(/%/g) || []).length;
            if (percentCount % 2 !== 0) {
                return {isValid: false, error: 'Nombre impair de caractères % dans le template'};
            }

            // Vérifier la syntaxe des transformations
            const tokens = this.extractTemplateTokens(template);
            for (const token of tokens) {
                const parts = token.split(':');
                if (parts.length > 2) {
                    return {isValid: false, error: `Syntaxe de transformation invalide: ${token}`};
                }

                if (parts.length === 2) {
                    const transformation = parts[1].toLowerCase();
                    const validTransformations = ['uppercase', 'lowercase', 'capitalize', 'trim', 'first'];
                    if (!validTransformations.includes(transformation)) {
                        return {isValid: false, error: `Transformation inconnue: ${transformation}`};
                    }
                }
            }

            return {isValid: true};
        } catch (ex) {
            return {isValid: false, error: `Erreur de validation: ${ex}`};
        }
    }

    /**
     * Extrait les tokens d'un template
     */
    private static extractTemplateTokens(template: string): string[] {
        const matches = template.match(/%([^%]+)%/g);
        if (!matches) return [];

        return matches.map(match => match.replace(/%/g, ''));
    }
}
