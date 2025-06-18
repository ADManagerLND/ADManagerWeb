// src/services/api/httpService.ts – v3 : compatibilité AxiosHeaders (TS 5 / axios ≥1)
// -----------------------------------------------------------------------------
import axios, {AxiosHeaders, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig} from 'axios';
import {API_CONFIG} from './config';
import authService from '../auth/authService';

const isFormData = (d: unknown): d is FormData => typeof FormData !== 'undefined' && d instanceof FormData;

// Petit utilitaire pour poser un header quelle que soit la forme (plain object
// ou instance AxiosHeaders)
function setHeader(headers: unknown, key: string, value: string | undefined) {
    if (!value) return;
    if (headers instanceof AxiosHeaders) {
        headers.set(key, value);
    } else if (headers && typeof headers === 'object') {
        (headers as any)[key] = value;
    }
}

function deleteHeader(headers: unknown, key: string) {
    if (headers instanceof AxiosHeaders) {
        headers.delete(key);
    } else if (headers && typeof headers === 'object') {
        delete (headers as any)[key];
    }
}

// -----------------------------------------------------------------------------
// Instance Axios --------------------------------------------------------------
// -----------------------------------------------------------------------------
// Instance Axios (withCredentials=true pour CORS + cookies éventuels) ---------
const instance: AxiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    withCredentials: true // ← important pour CORS credentials
});

// -----------------------------------------------------------------------------
// Intercepteur REQUEST --------------------------------------------------------
instance.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
    console.log(`[HttpService] → ${cfg.method?.toUpperCase()} ${cfg.url}`);


    try {
        const token = await authService.getAccessToken();
        if (token) {
            cfg.headers = cfg.headers ?? new AxiosHeaders();
            setHeader(cfg.headers, 'Authorization', `Bearer ${token}`);
        }
    } catch (e) {
        console.warn('[HttpService]   token KO', e);
    }


    // — FormData : remove Content‑Type -----------------------------------------
    if (isFormData(cfg.data)) {
        deleteHeader(cfg.headers, 'Content-Type');
        console.log('[HttpService]   Content-Type supprimé (FormData)');
    }

    // — Anti‑cache GET ----------------------------------------------------------
    if (cfg.method === 'get') {
        setHeader(cfg.headers, 'Cache-Control', 'no-cache');
        setHeader(cfg.headers, 'Pragma', 'no-cache');
        setHeader(cfg.headers, 'Expires', '0');
    }

    return cfg;
});

// -----------------------------------------------------------------------------
// Intercepteur RESPONSE -------------------------------------------------------
instance.interceptors.response.use(
    (res) => {
        console.log(`[HttpService] ← ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`);
        return res;
    },
    (err) => {
        console.error('[HttpService] ← ERR', err.response?.status, err.config?.url);
        return Promise.reject(err);
    }
);

// -----------------------------------------------------------------------------
// Helper CRUD -----------------------------------------------------------------
class HttpService {
    get<T = unknown>(url: string, cfg?: AxiosRequestConfig) {
        return instance.get<T>(url, cfg);
    }

    post<T = unknown>(url: string, data?: any, cfg?: AxiosRequestConfig) {
        return instance.post<T>(url, data, cfg);
    }

    put<T = unknown>(url: string, data?: any, cfg?: AxiosRequestConfig) {
        return instance.put<T>(url, data, cfg);
    }

    patch<T = unknown>(url: string, data?: any, cfg?: AxiosRequestConfig) {
        return instance.patch<T>(url, data, cfg);
    }

    delete<T = unknown>(url: string, cfg?: AxiosRequestConfig) {
        return instance.delete<T>(url, cfg);
    }
}

export const httpService = new HttpService();
export default httpService;
