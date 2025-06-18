import { ActionType } from '../models/CsvImport';

export interface ActionDisplay {
    name: string;
    icon: string;
    color: string;
}

/**
 * Obtenir l'affichage d'un type d'action avec son nom, icône et couleur
 */
export function getActionDisplay(actionType: ActionType | string | number): ActionDisplay {
    const actionTypeStr = typeof actionType === 'string' ? actionType : String(actionType);
    const numericMatch = actionTypeStr.match(/^(\d+)/);
    const numericType = numericMatch ? numericMatch[1] : null;
    const normalizedType = actionTypeStr.toUpperCase().replace(/\s+/g, '_');
    if (numericType) {
        switch (numericType) {
            case '0':
                return { name: 'Créer Groupe', icon: '👥', color: 'cyan' };
            case '1':
                return { name: 'Créer Utilisateur', icon: '👤', color: 'green' };
            case '2':
                return { name: 'Modifier Utilisateur', icon: '✏️', color: 'blue' };
            case '3':
                return { name: 'Supprimer Utilisateur', icon: '🗑️', color: 'red' };
            case '4':
                return { name: 'Déplacer Utilisateur', icon: '📁', color: 'orange' };
            case '5':
                return { name: 'Créer OU', icon: '📂', color: 'purple' };
            case '6':
                return { name: 'Modifier OU', icon: '📝', color: 'orange' };
            case '7':
                return { name: 'Supprimer OU', icon: '🗂️', color: 'volcano' };
            case '8':
                return { name: 'Créer Dossier Étudiant', icon: '📁', color: 'geekblue' };
            case '9':
                return { name: 'Créer Équipe', icon: '🏆', color: 'gold' };
            case '10':
                return { name: 'Créer Dossier Groupe Classe', icon: '📂', color: 'lime' };
            case '11':
                return { name: 'Ajouter Utilisateur au Groupe', icon: '👤➕', color: 'cyan' };
            case '12':
                return { name: 'Erreur', icon: '❌', color: 'red' };
            // Codes étendus pour compatibilité avec des formats complexes
            case '41':
            case '42':
                return { name: 'Créer OU', icon: '📂', color: 'purple' };
            case '13':
                return { name: 'Créer Groupe de Distribution', icon: '📧', color: 'blue' };
            case '99':
                return { name: 'Erreur', icon: '❌', color: 'red' };
            default:
                return { name: `Action ${numericType}`, icon: '⚙️', color: 'default' };
        }
    }

    // Utiliser le switch normal pour les formats string
    switch (normalizedType) {
        case 'CREATE_USER':
        case 'CREATEUSER':
            return { name: 'Créer Utilisateur', icon: '👤', color: 'green' };
        case 'UPDATE_USER':
        case 'UPDATEUSER':
            return { name: 'Modifier Utilisateur', icon: '✏️', color: 'blue' };
        case 'DELETE_USER':
        case 'DELETEUSER':
            return { name: 'Supprimer Utilisateur', icon: '🗑️', color: 'red' };
        case 'MOVE_USER':
        case 'MOVEUSER':
            return { name: 'Déplacer Utilisateur', icon: '📁', color: 'orange' };
        case 'CREATE_OU':
        case 'CREATEOU':
        case 'CREATE_ORGANIZATIONAL_UNIT':
            return { name: 'Créer OU', icon: '📂', color: 'purple' };
        case 'UPDATE_OU':
        case 'UPDATEOU':
        case 'UPDATE_ORGANIZATIONAL_UNIT':
            return { name: 'Modifier OU', icon: '📝', color: 'orange' };
        case 'DELETE_OU':
        case 'DELETEOU':
        case 'DELETE_ORGANIZATIONAL_UNIT':
            return { name: 'Supprimer OU', icon: '🗂️', color: 'volcano' };
        case 'CREATE_GROUP':
        case 'CREATEGROUP':
            return { name: 'Créer Groupe', icon: '👥', color: 'cyan' };
        case 'DELETE_GROUP':
        case 'DELETEGROUP':
            return { name: 'Supprimer Groupe', icon: '🗑️', color: 'red' };
        case 'CREATE_STUDENT_FOLDER':
        case 'CREATESTUDENTFOLDER':
            return { name: 'Créer Dossier Étudiant', icon: '📁', color: 'geekblue' };
        case 'CREATE_TEAM':
        case 'CREATETEAM':
            return { name: 'Créer Équipe', icon: '🏆', color: 'gold' };
        case 'CREATE_CLASS_GROUP_FOLDER':
        case 'CREATECLASSGROUPFOLDER':
            return { name: 'Créer Dossier Groupe Classe', icon: '📂', color: 'lime' };
        case 'ADD_USER_TO_GROUP':
        case 'ADDUSERTOGROUP':
            return { name: 'Ajouter Utilisateur au Groupe', icon: '👤➕', color: 'cyan' };
        case 'CREATE_SECURITY_GROUP':
        case 'CREATESECURITYGROUP':
            return { name: 'Créer Groupe de Sécurité', icon: '🛡️', color: 'purple' };
        case 'CREATE_DISTRIBUTION_GROUP':
        case 'CREATEDISTRIBUTIONGROUP':
            return { name: 'Créer Groupe de Distribution', icon: '📧', color: 'blue' };
        case 'ERROR':
            return { name: 'Erreur', icon: '❌', color: 'red' };
        default:
            console.warn('[getActionDisplay] Type d\'action non reconnu:', actionTypeStr, 'normalisé:', normalizedType);
            return { 
                name: actionTypeStr.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(), 
                icon: '⚙️', 
                color: 'default' 
            };
    }
}

/**
 * Obtenir seulement la couleur d'un type d'action (pour compatibilité)
 */
export function getActionTypeColor(actionType: ActionType | string | number): string {
    return getActionDisplay(actionType).color;
}

/**
 * Obtenir seulement l'icône d'un type d'action (pour compatibilité)
 */
export function getActionTypeIcon(actionType: ActionType | string | number): string {
    return getActionDisplay(actionType).icon;
}

/**
 * Obtenir seulement le nom d'un type d'action (pour compatibilité)
 */
export function getActionTypeName(actionType: ActionType | string | number): string {
    return getActionDisplay(actionType).name;
} 