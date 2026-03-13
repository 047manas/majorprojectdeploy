import axios, { AxiosError } from 'axios';

// API Response Interface matches Backend Standardization
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    error: string | null;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
        : '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach CSRF Token if available
api.interceptors.request.use((config) => {
    const metaCsrf = document.querySelector('meta[name="csrf-token"]');
    if (metaCsrf) {
        const token = metaCsrf.getAttribute('content');
        if (token) {
            config.headers['X-CSRFToken'] = token;
        }
    }
    return config;
});

// Response Interceptor: Global Error Handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse>) => {
        const status = error.response?.status;
        const errorMsg = error.response?.data?.error || "An unexpected error occurred";

        if (status === 401 && !error.config?.url?.includes('/login') && !error.config?.url?.includes('/auth/me')) {
            // Unauthorized: Redirect to login (handled by AuthProvider usually, but fail-safe here)
            window.location.href = '/login';
        } else if (status === 403) {
            // Forbidden: Toast notification (handled by UI components via event or updated state)
            console.error("Access Forbidden:", errorMsg);
        }

        return Promise.reject(error.response?.data || { error: errorMsg });
    }
);

export default api;
