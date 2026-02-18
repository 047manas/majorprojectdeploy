import { useState } from 'react';
import KPICards from '@/components/dashboard/KPICards';
import { useKPIs, AnalyticsFilters } from '@/hooks/useAnalytics';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Users, FileCheck, Upload, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [filters] = useState<AnalyticsFilters>({});

    // Fetch KPI Data only
    const { data: kpis, isLoading: kpiLoading, isError: kpiError } = useKPIs(filters);

    if (kpiError) {
        return <div className="p-6 text-red-500">Error loading dashboard data.</div>;
    }

    return (
        <div className="pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Administrative Dashboard
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Welcome back, {user?.full_name || 'Admin'}
                </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => navigate('/admin/users')}>
                    <Users className="h-8 w-8 text-blue-600" />
                    <span>Manage Users</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => navigate('/admin/activities')}>
                    <FileCheck className="h-8 w-8 text-green-600" />
                    <span>Activity Types</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => navigate('/admin/analytics')}>
                    <BarChart2 className="h-8 w-8 text-purple-600" />
                    <span>Deep Analytics</span>
                </Button>
                {/* Placeholder for future feature */}
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 opacity-50 cursor-not-allowed">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <span>Bulk Upload (Coming Soon)</span>
                </Button>
            </div>

            {/* KPI Summary */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Key Performance Indicators</h2>
                <KPICards data={kpis} loading={kpiLoading} />
            </div>

            {/* Maybe a recent activity placeholder or just end here for simplicity */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg p-6">
                <h3 className="text-blue-800 dark:text-blue-300 font-semibold mb-2">System Status</h3>
                <p className="text-blue-600 dark:text-blue-400 text-sm">
                    System is running normally. All synchronization tasks are up to date.
                </p>
            </div>
        </div>
    );
};

export default AdminDashboard;
