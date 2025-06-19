// src/services/api/activeDirectoryService.ts
import httpService from './httpService';
import {API_CONFIG} from './config';

// Interface représentant un nœud Active Directory
export interface ActiveDirectoryNode {
    name: string;
    distinguishedName: string;
    hasChildren: boolean;
    objectClasses: string[];
    userAccountControl?: number;
    lastLogon?: string;
    description?: string;
    email?: string;
}

// Types d'actions en masse
export type BulkAction =
    'resetPassword'
    | 'disableAccounts'
    | 'enableAccounts'
    | 'unlockAccounts'
    | 'moveToOU'
    | 'addDescription';

// Payload pour les actions en masse
export interface BulkActionPayload {
    action: BulkAction;
    users: string[];
    newPassword?: string;
    description?: string;
    targetOU?: string;
}

// Interface pour la réponse des actions en masse
export interface BulkActionResponse {
    action: string;
    totalCount: number;
    successCount: number;
    failureCount: number;
    results: Array<{
        userDistinguishedName: string;
        success: boolean;
        message: string;
        errorDetails?: string;
    }>;
}

// Interface pour la réponse de recherche
export interface SearchResponse {
    results: ActiveDirectoryNode[];
    totalCount: number;
    hasMore: boolean;
}

// Interface pour les détails d'un utilisateur
export interface UserDetails extends ActiveDirectoryNode {
    whenCreated?: string;
    whenChanged?: string;
    memberOf?: string[];
    accountExpires?: string;
    badPwdCount?: number;
    lockoutTime?: string;
}

class ActiveDirectoryService {
    /**
     * Détermine le statut d'un utilisateur basé sur userAccountControl
     */
    static getUserStatus(userAccountControl?: number): { status: string; color: string; isActive: boolean } {
        if (!userAccountControl) {
            return {status: 'Inconnu', color: 'default', isActive: false};
        }

        const isDisabled = (userAccountControl & 0x2) !== 0;
        const isLocked = (userAccountControl & 0x10) !== 0;
        const isExpired = (userAccountControl & 0x800000) !== 0;

        if (isDisabled) {
            return {status: 'Désactivé', color: 'error', isActive: false};
        }
        if (isLocked) {
            return {status: 'Verrouillé', color: 'warning', isActive: false};
        }
        if (isExpired) {
            return {status: 'Expiré', color: 'orange', isActive: false};
        }

        return {status: 'Actif', color: 'success', isActive: true};
    }

    /**
     * Valide un Distinguished Name
     */
    static isValidDistinguishedName(dn: string): boolean {
        const dnPattern = /^([A-Za-z]+=[^,=]+,?)+$/;
        return dnPattern.test(dn);
    }

    /**
     * Extrait le nom commun d'un Distinguished Name
     */
    static extractCommonName(dn: string): string {
        const match = dn.match(/CN=([^,]+)/i);
        return match ? match[1] : dn;
    }

    /**
     * Formate un Distinguished Name pour l'affichage
     */
    static formatDistinguishedName(dn: string): string {
        return dn.split(',').map(part => part.trim()).join(' > ');
    }

    /**
     * Récupère les nœuds racines de l'Active Directory
     */
    async getRootNodes(): Promise<ActiveDirectoryNode[]> {
        try {
            console.log('🌐 [AD Service] Récupération des nœuds racines');
            const response = await httpService.get<ActiveDirectoryNode[]>(
                API_CONFIG.ENDPOINTS.ACTIVE_DIRECTORY.ROOT
            );
            console.log('✅ [AD Service] Nœuds racines récupérés:', response.data.length);
            return response.data;
        } catch (error) {
            console.error('❌ [AD Service] Erreur lors de la récupération des nœuds racines:', error);
            // Fallback vers des données de simulation
            return this.getMockRootNodes();
        }
    }

    /**
     * Récupère les enfants d'un nœud spécifique
     */
    async getChildren(distinguishedName: string): Promise<ActiveDirectoryNode[]> {
        try {
            console.log('🌐 [AD Service] Récupération des enfants pour:', distinguishedName);
            const response = await httpService.get<ActiveDirectoryNode[]>(
                API_CONFIG.ENDPOINTS.ACTIVE_DIRECTORY.CHILDREN,
                {
                    params: {distinguishedName}
                }
            );
            console.log('✅ [AD Service] Enfants récupérés:', response.data.length);
            return response.data;
        } catch (error) {
            console.error('❌ [AD Service] Erreur lors de la récupération des enfants:', error);
            return this.getMockChildren();
        }
    }

    /**
     * Effectue une recherche dans l'Active Directory
     */
    async search(query: string, maxResults: number = 50): Promise<ActiveDirectoryNode[]> {
        try {
            console.log('🌐 [AD Service] Recherche pour:', query);
            const response = await httpService.get<SearchResponse>(
                API_CONFIG.ENDPOINTS.ACTIVE_DIRECTORY.SEARCH,
                {
                    params: {
                        query,
                        maxResults
                    }
                }
            );
            console.log('✅ [AD Service] Résultats de recherche:', response.data.results.length);
            return response.data.results || response.data as any; // Compatibilité avec l'ancienne API
        } catch (error) {
            console.error('❌ [AD Service] Erreur lors de la recherche:', error);
            return this.getMockSearchResults(query);
        }
    }

    // ========================================
    // MÉTHODES DE DONNÉES DE SIMULATION
    // ========================================

    /**
     * Récupère les détails complets d'un utilisateur
     */
    async getUserDetails(distinguishedName: string): Promise<UserDetails> {
        try {
            console.log('🌐 [AD Service] Récupération des détails utilisateur:', distinguishedName);
            const response = await httpService.get<UserDetails>(
                `${API_CONFIG.ENDPOINTS.ACTIVE_DIRECTORY.USER}/${encodeURIComponent(distinguishedName)}`
            );
            console.log('✅ [AD Service] Détails utilisateur récupérés');
            return response.data;
        } catch (error) {
            console.error('❌ [AD Service] Erreur lors de la récupération des détails utilisateur:', error);
            throw error;
        }
    }

    /**
     * Exécute une action en masse sur plusieurs utilisateurs
     */
    async executeBulkAction(payload: BulkActionPayload): Promise<BulkActionResponse> {
        try {
            console.log('🌐 [AD Service] Exécution action en masse:', payload.action, 'sur', payload.users.length, 'utilisateurs');
            const response = await httpService.post<BulkActionResponse>(
                API_CONFIG.ENDPOINTS.ACTIVE_DIRECTORY.BULK_ACTION,
                payload
            );
            console.log('✅ [AD Service] Action en masse terminée:', response.data.successCount, '/', response.data.totalCount);
            return response.data;
        } catch (error) {
            console.error('❌ [AD Service] Erreur lors de l\'action en masse:', error);
            return this.getMockBulkActionResponse(payload);
        }
    }

    /**
     * Teste la connectivité avec le contrôleur de domaine
     */
    async testConnection(): Promise<{ isHealthy: boolean; details?: any }> {
        try {
            console.log('🌐 [AD Service] Test de connectivité AD');
            const response = await httpService.get<{ isHealthy: boolean; details: any }>(
                API_CONFIG.ENDPOINTS.ACTIVE_DIRECTORY.HEALTH
            );
            console.log('✅ [AD Service] Test de connectivité:', response.data.isHealthy ? 'OK' : 'KO');
            return response.data;
        } catch (error) {
            console.error('❌ [AD Service] Erreur test de connectivité:', error);
            return { isHealthy: false };
        }
    }

    /**
     * Actualise la cache du service (si utilisée côté backend)
     */
    async refreshCache(): Promise<void> {
        try {
            console.log('🌐 [AD Service] Actualisation du cache');
            await httpService.post(`${API_CONFIG.ENDPOINTS.ACTIVE_DIRECTORY.ROOT}/refresh-cache`);
            console.log('✅ [AD Service] Cache actualisé');
        } catch (error) {
            console.error('❌ [AD Service] Erreur actualisation cache:', error);
            throw error;
        }
    }

    // ========================================
    // MÉTHODES UTILITAIRES
    // ========================================

    private getMockRootNodes(): ActiveDirectoryNode[] {
        console.warn('⚠️ [AD Service] Utilisation des données de simulation - nœuds racines');
        return [
            {
                name: "Contoso.com",
                distinguishedName: "DC=contoso,DC=com",
                hasChildren: true,
                objectClasses: ["domain"]
            },
            {
                name: "Users",
                distinguishedName: "CN=Users,DC=contoso,DC=com",
                hasChildren: true,
                objectClasses: ["container"]
            },
            {
                name: "Computers",
                distinguishedName: "CN=Computers,DC=contoso,DC=com",
                hasChildren: true,
                objectClasses: ["container"]
            }
        ];
    }

    private getMockChildren(): ActiveDirectoryNode[] {
        console.warn('⚠️ [AD Service] Utilisation des données de simulation - enfants');
        return [
            {
                name: "John Doe",
                distinguishedName: "CN=John Doe,CN=Users,DC=contoso,DC=com",
                hasChildren: false,
                objectClasses: ["user"],
                userAccountControl: 512, // Compte actif
                email: "john.doe@contoso.com",
                description: "Administrateur système"
            },
            {
                name: "Jane Smith",
                distinguishedName: "CN=Jane Smith,CN=Users,DC=contoso,DC=com",
                hasChildren: false,
                objectClasses: ["user"],
                userAccountControl: 514, // Compte désactivé
                email: "jane.smith@contoso.com",
                description: "Développeuse"
            },
            {
                name: "Mike Wilson",
                distinguishedName: "CN=Mike Wilson,CN=Users,DC=contoso,DC=com",
                hasChildren: false,
                objectClasses: ["user"],
                userAccountControl: 528, // Compte verrouillé
                email: "mike.wilson@contoso.com"
            },
            {
                name: "IT Department",
                distinguishedName: "OU=IT,CN=Users,DC=contoso,DC=com",
                hasChildren: true,
                objectClasses: ["organizationalUnit"],
                description: "Département informatique"
            },
            {
                name: "Sales Department",
                distinguishedName: "OU=Sales,CN=Users,DC=contoso,DC=com",
                hasChildren: true,
                objectClasses: ["organizationalUnit"],
                description: "Département commercial"
            }
        ];
    }

    private getMockSearchResults(query: string): ActiveDirectoryNode[] {
        console.warn('⚠️ [AD Service] Utilisation des données de simulation - recherche');
        const searchTermLower = query.toLowerCase();
        const allMockUsers = [
            {
                name: "Search Result User",
                distinguishedName: "CN=Search Result User,CN=Users,DC=contoso,DC=com",
                hasChildren: false,
                objectClasses: ["user"],
                userAccountControl: 512,
                email: "search@contoso.com",
                description: `Résultat pour "${query}"`
            },
            {
                name: "Admin User",
                distinguishedName: "CN=Admin User,CN=Users,DC=contoso,DC=com",
                hasChildren: false,
                objectClasses: ["user"],
                userAccountControl: 512,
                email: "admin@contoso.com",
                description: "Administrateur"
            },
            {
                name: "Test User",
                distinguishedName: "CN=Test User,CN=Users,DC=contoso,DC=com",
                hasChildren: false,
                objectClasses: ["user"],
                userAccountControl: 514,
                email: "test@contoso.com"
            }
        ];

        // Filtrer les résultats selon le terme de recherche
        return allMockUsers.filter(user =>
            user.name.toLowerCase().includes(searchTermLower) ||
            user.email.toLowerCase().includes(searchTermLower) ||
            (user.description && user.description.toLowerCase().includes(searchTermLower))
        );
    }

    private getMockBulkActionResponse(payload: BulkActionPayload): BulkActionResponse {
        console.warn('⚠️ [AD Service] Utilisation des données de simulation - action en masse');

        // Simuler quelques échecs pour plus de réalisme
        const successCount = Math.max(1, payload.users.length - Math.floor(payload.users.length * 0.1));
        const failureCount = payload.users.length - successCount;

        return {
            action: payload.action,
            totalCount: payload.users.length,
            successCount,
            failureCount,
            results: payload.users.map((user, index) => {
                const isSuccess = index < successCount;
                return {
                    userDistinguishedName: user,
                    success: isSuccess,
                    message: isSuccess
                        ? `Action '${payload.action}' exécutée avec succès`
                        : `Échec de l'action '${payload.action}'`,
                    errorDetails: isSuccess ? undefined : "Erreur de simulation pour test"
                };
            })
        };
    }
}

// Export de l'instance singleton
const activeDirectoryService = new ActiveDirectoryService();
export default activeDirectoryService;