import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface AnalyticsFilters {
    year?: number;
    department?: string;
    verified_only?: boolean;
    start_date?: string;
    end_date?: string;
    status?: string;
    campus_type?: string;
}

// Params: Key for query caching
const getQueryKey = (key: string, filters: AnalyticsFilters) => [key, filters];

// Fix #7: Routes now match blueprint prefix /api/analytics + short path
// e.g., api.get('/analytics/kpis') → proxy → /api/analytics/kpis → blueprint /kpis

// --- KPIs ---
export const useKPIs = (filters: AnalyticsFilters) => {
    return useQuery({
        queryKey: getQueryKey('kpis', filters),
        queryFn: async () => {
            const { data } = await api.get('/analytics/kpis', { params: filters });
            return data.data;
        },
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });
};

// --- Distribution ---
export const useEventDistribution = (filters: AnalyticsFilters) => {
    return useQuery({
        queryKey: getQueryKey('distribution', filters),
        queryFn: async () => {
            const { data } = await api.get('/analytics/distribution', { params: filters });
            return data.data;
        },
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });
};

// --- Department Participation ---
export const useDeptParticipation = (filters: AnalyticsFilters) => {
    return useQuery({
        queryKey: getQueryKey('dept-participation', filters),
        queryFn: async () => {
            const { data } = await api.get('/analytics/department-participation', { params: filters });
            return data.data;
        },
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });
};

// --- Yearly Trend ---
export const useYearlyTrend = (filters: AnalyticsFilters) => {
    return useQuery({
        queryKey: getQueryKey('yearly-trend', filters),
        queryFn: async () => {
            const { data } = await api.get('/analytics/yearly-trend', { params: filters });
            return data.data;
        },
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });
};

// --- Metadata (Dropdowns) ---
export const useDashboardMeta = () => {
    return useQuery({
        queryKey: ['meta'],
        queryFn: async () => {
            const { data } = await api.get('/analytics/meta');
            return data.data;
        },
        staleTime: 30 * 60 * 1000,
    });
};

// --- Admin Insights ---
export const useAdminInsights = (filters: AnalyticsFilters) => {
    return useQuery({
        queryKey: getQueryKey('admin-insights', filters),
        queryFn: async () => {
            const { data } = await api.get('/analytics/insights', { params: filters });
            return data.data;
        },
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });
};
