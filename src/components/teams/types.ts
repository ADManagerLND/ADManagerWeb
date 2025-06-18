// src/components/teams/types.ts

export interface TeamsIntegrationConfig {
    enabled: boolean;
    excludedOUs: string[];
}

export interface GraphApiConfig {
    maxRetryAttempts: number;
    retryDelayMs: number;
    timeoutSeconds: number;
}

export interface TeamsImportConfig {
    autoCreateTeamsForOUs: boolean;
    autoAddUsersToTeams: boolean;
    defaultTeacherUserId: string;
    teamNamingTemplate: string;
    teamDescriptionTemplate: string;
    ouTeacherMappings: Record<string, string>;
    folderMappings: TeamsFolderMapping[];
}

export interface TeamsFolderMapping {
    folderName: string;
    description: string;
    enabled: boolean;
    order: number;
    parentFolder?: string;
}

export interface AdConfigEnhanced {
    teamsIntegration: TeamsIntegrationConfig;
    graphApiConfig: GraphApiConfig;
    defaultTeamsImportConfig: TeamsImportConfig;
}

export interface PresetTemplate {
    name: string;
    folders: TeamsFolderMapping[];
}

export type ConnectionStatus = 'unknown' | 'success' | 'error';
export type ConfigStatus = 'complete' | 'partial' | 'disabled';
