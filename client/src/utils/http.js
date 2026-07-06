import axios from 'axios';

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

const RETRYABLE = new Set(['ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT']);

function shouldRetryRequest(error) {
    if (!error.config || error.config.__retryCount >= 2) return false;
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 || status === 408 || status === 429;
}

function attachAuthRequestInterceptor(client) {
    client.interceptors.request.use(
        (config) => {
            const token = getCookie('jwtToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
}

function attachRetryInterceptor(client) {
    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error.config;
            const isRetryable = shouldRetryRequest(error) || RETRYABLE.has(error.code);
            if (config && isRetryable) {
                config.__retryCount = (config.__retryCount || 0) + 1;
                await new Promise((r) => setTimeout(r, 350 * config.__retryCount));
                return client(config);
            }
            return Promise.reject(error);
        }
    );
}

export function createApiClient(baseURL = import.meta.env.VITE_API || '/api') {
    const client = axios.create({
        baseURL,
        withCredentials: true,
        timeout: 20000,
    });
    attachAuthRequestInterceptor(client);
    attachRetryInterceptor(client);
    return client;
}

/** İşçi maaş — yalnız işçi JWT, admin cookie tokeni göndərilmir */
export function createEmployeeApiClient(token, baseURL = import.meta.env.VITE_API || '/api') {
    const client = axios.create({
        baseURL,
        withCredentials: true,
        timeout: 20000,
    });
    client.interceptors.request.use((config) => {
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    });
    attachRetryInterceptor(client);
    return client;
}

export const publicApi = createApiClient();

export async function fetchAllSettled(requests) {
    const results = await Promise.allSettled(requests);
    return results.map((result, index) => ({
        index,
        ok: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value?.data : null,
        error: result.status === 'rejected' ? result.reason : null,
    }));
}
