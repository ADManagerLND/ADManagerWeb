import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {httpService} from './httpService';
// Import après le mock pour obtenir la version mockée
import apiClient from './apiClient';

// Mock d'axios
vi.mock('./apiClient', () => {
    return {
        default: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            patch: vi.fn()
        }
    };
});

describe('HttpService', () => {
    // Données de test
    const mockData = {id: 1, name: 'Test'};
    const mockResponse = {
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
    };
    const mockError = new Error('Test error');

    // Espion sur console.log et console.error
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {
        });
        vi.spyOn(console, 'error').mockImplementation(() => {
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('get', () => {
        it('doit appeler apiClient.get avec les bons paramètres et retourner la réponse', async () => {
            // Configurer le mock pour retourner une promesse résolue
            (apiClient.get as any).mockResolvedValueOnce(mockResponse);

            // Appeler la méthode
            const result = await httpService.get('/test');

            // Vérifier que apiClient.get a été appelé avec les bons arguments
            expect(apiClient.get).toHaveBeenCalledWith('/test', undefined);

            // Vérifier que la réponse est correcte
            expect(result).toEqual(mockResponse);
        });

        it('doit gérer les erreurs de apiClient.get', async () => {
            // Configurer le mock pour rejeter la promesse
            (apiClient.get as any).mockRejectedValueOnce(mockError);

            // Vérifier que la méthode rejette la promesse
            await expect(httpService.get('/test')).rejects.toThrow('Test error');

            // Vérifier que apiClient.get a été appelé
            expect(apiClient.get).toHaveBeenCalledWith('/test', undefined);
        });
    });

    describe('post', () => {
        it('doit appeler apiClient.post avec les bons paramètres et retourner la réponse', async () => {
            // Configurer le mock
            (apiClient.post as any).mockResolvedValueOnce(mockResponse);

            // Appeler la méthode
            const result = await httpService.post('/test', mockData);

            // Vérifier les appels
            expect(apiClient.post).toHaveBeenCalledWith('/test', mockData, undefined);
            expect(result).toEqual(mockResponse);
        });

        it('doit gérer les erreurs de apiClient.post', async () => {
            // Configurer le mock
            (apiClient.post as any).mockRejectedValueOnce(mockError);

            // Vérifier la gestion d'erreur
            await expect(httpService.post('/test', mockData)).rejects.toThrow('Test error');
            expect(apiClient.post).toHaveBeenCalledWith('/test', mockData, undefined);
        });
    });

    // Tests similaires pour put, delete et patch
    describe('put', () => {
        it('doit appeler apiClient.put correctement', async () => {
            (apiClient.put as any).mockResolvedValueOnce(mockResponse);
            const result = await httpService.put('/test', mockData);
            expect(apiClient.put).toHaveBeenCalledWith('/test', mockData, undefined);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('delete', () => {
        it('doit appeler apiClient.delete correctement', async () => {
            (apiClient.delete as any).mockResolvedValueOnce(mockResponse);
            const result = await httpService.delete('/test');
            expect(apiClient.delete).toHaveBeenCalledWith('/test', undefined);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('patch', () => {
        it('doit appeler apiClient.patch correctement', async () => {
            (apiClient.patch as any).mockResolvedValueOnce(mockResponse);
            const result = await httpService.patch('/test', mockData);
            expect(apiClient.patch).toHaveBeenCalledWith('/test', mockData, undefined);
            expect(result).toEqual(mockResponse);
        });
    });
}); 