import {httpService} from './httpService';

// Interface pour les données utilisateur
export interface User {
    id: number;
    username: string;
    email: string;
    // Ajoutez d'autres propriétés selon vos besoins
}

// Interface pour les données de connexion
export interface LoginRequest {
    username: string;
    password: string;
}

// Interface pour la réponse de connexion
export interface LoginResponse {
    token: string;
    user: User;
}

// Service pour gérer les opérations liées aux utilisateurs
class UserService {
    private readonly BASE_PATH = '/users';

    // Méthode pour récupérer tous les utilisateurs
    public async getUsers(): Promise<User[]> {
        const response = await httpService.get<User[]>(this.BASE_PATH);
        return response.data;
    }

    // Méthode pour récupérer un utilisateur par son ID
    public async getUserById(id: number): Promise<User> {
        const response = await httpService.get<User>(`${this.BASE_PATH}/${id}`);
        return response.data;
    }

    // Méthode pour créer un nouvel utilisateur
    public async createUser(user: Omit<User, 'id'>): Promise<User> {
        const response = await httpService.post<User>(this.BASE_PATH, user);
        return response.data;
    }

    // Méthode pour mettre à jour un utilisateur
    public async updateUser(id: number, user: Partial<User>): Promise<User> {
        const response = await httpService.put<User>(`${this.BASE_PATH}/${id}`, user);
        return response.data;
    }

    // Méthode pour supprimer un utilisateur
    public async deleteUser(id: number): Promise<void> {
        await httpService.delete(`${this.BASE_PATH}/${id}`);
    }

    // Méthode pour se connecter
    public async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await httpService.post<LoginResponse>('/auth/login', credentials);

        // Stocker le token d'authentification
        if (response.data.token) {
            localStorage.setItem('auth_token', response.data.token);
        }

        return response.data;
    }

    // Méthode pour se déconnecter
    public logout(): void {
        localStorage.removeItem('auth_token');
    }

    // Méthode pour vérifier si l'utilisateur est connecté
    public isAuthenticated(): boolean {
        return !!localStorage.getItem('auth_token');
    }
}

// Exporter une instance unique du service utilisateur
export const userService = new UserService();
