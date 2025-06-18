// src/components/teams/constants.ts
import { AdConfigEnhanced, PresetTemplate } from './types';

export const DEFAULT_AZURE_CONFIG = {
    clientId: "00000000-0000-0000-0000-000000000000",
    tenantId: "00000000-0000-0000-0000-000000000000",
    clientSecret: "[SECRET_NON_CONFIGURE]"
};

export const DEFAULT_TEAMS_CONFIG = {
    enabled: true,
    autoCreateTeamsForOUs: true,
    autoAddUsersToTeams: true,
    defaultTeacherUserId: "00000000-0000-0000-0000-000000000000",
    excludedOUs: [],
    teamNamingTemplate: "Classe {OUName}",
    teamDescriptionTemplate: "Équipe pour la classe {OUName}",
    graphApiTimeoutSeconds: 30,
    maxRetryAttempts: 3,
    retryDelayMs: 5000
};

export const defaultConfig: AdConfigEnhanced = {
    teamsIntegration: {
        enabled: DEFAULT_TEAMS_CONFIG.enabled,
        excludedOUs: DEFAULT_TEAMS_CONFIG.excludedOUs,
    },
    graphApiConfig: {
        maxRetryAttempts: DEFAULT_TEAMS_CONFIG.maxRetryAttempts,
        retryDelayMs: DEFAULT_TEAMS_CONFIG.retryDelayMs,
        timeoutSeconds: DEFAULT_TEAMS_CONFIG.graphApiTimeoutSeconds
    },
    defaultTeamsImportConfig: {
        autoCreateTeamsForOUs: DEFAULT_TEAMS_CONFIG.autoCreateTeamsForOUs,
        autoAddUsersToTeams: DEFAULT_TEAMS_CONFIG.autoAddUsersToTeams,
        defaultTeacherUserId: DEFAULT_TEAMS_CONFIG.defaultTeacherUserId,
        teamNamingTemplate: DEFAULT_TEAMS_CONFIG.teamNamingTemplate,
        teamDescriptionTemplate: DEFAULT_TEAMS_CONFIG.teamDescriptionTemplate,
        ouTeacherMappings: {},
        folderMappings: [
            {
                "folderName": "📚 Documents de classe",
                "description": "Dossier pour tous les documents partagés de la classe",
                "order": 1,
                "enabled": true,
            },
            {
                "folderName": "📝 Devoirs et Exercices",
                "description": "Dossier pour les devoirs à rendre et exercices",
                "parentFolder": "📚 Documents de classe",
                "order": 2,
                "enabled": true,
            },
            {
                "folderName": "🔬 Projets de Groupe",
                "description": "Espace collaboratif pour les projets d'équipe",
                "order": 3,
                "enabled": true,
            }
        ]
    }
};

export const presetTemplates: PresetTemplate[] = [
    {
        name: 'Éducation Primaire',
        folders: [
            { folderName: '📚 Ressources Pédagogiques', description: 'Documents et supports de cours', order: 1, enabled: true },
            { folderName: '📝 Devoirs et Évaluations', description: 'Exercices et contrôles', order: 2, enabled: true },
            { folderName: '🎨 Projets Créatifs', description: 'Travaux artistiques et créatifs', order: 3, enabled: true },
            { folderName: '📋 Administration', description: 'Documents administratifs', order: 4, enabled: true }
        ]
    },
    {
        name: 'Enseignement Secondaire',
        folders: [
            { folderName: '📖 Cours et Leçons', description: 'Supports de cours', order: 1, enabled: true },
            { folderName: '🧪 Travaux Pratiques', description: 'Expériences et manipulations', order: 2, enabled: true },
            { folderName: '📊 Évaluations', description: 'Contrôles et examens', order: 3, enabled: true },
            { folderName: '🎯 Projets de Groupe', description: 'Travaux collaboratifs', order: 4, enabled: true }
        ]
    },
    {
        name: 'Formation Professionnelle',
        folders: [
            { folderName: '💼 Modules de Formation', description: 'Contenus pédagogiques', order: 1, enabled: true },
            { folderName: '🔧 Ateliers Pratiques', description: 'Exercices professionnels', order: 2, enabled: true },
            { folderName: '📈 Évaluations Compétences', description: 'Tests et certifications', order: 3, enabled: true },
            { folderName: '🤝 Stages et Projets', description: 'Expérience professionnelle', order: 4, enabled: true }
        ]
    }
];
