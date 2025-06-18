// src/services/apiClient.ts
import {httpService} from './api/httpService';

// Ce fichier sert d'adaptateur pour maintenir la compatibilité avec le code existant
// qui utilise apiClient directement au lieu de httpService

// Exporter httpService comme apiClient par défaut
const apiClient = httpService;

export default apiClient;
