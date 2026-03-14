import { useState } from 'react';
import KPICards from '@/components/dashboard/KPICards';
import { useKPIs, AnalyticsFilters } from '@/hooks/useAnalytics';
import { useAuth } from '@/context/AuthContext';
import { Users, FileCheck, Upload, BarChart2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [filters] = useState<AnalyticsFilters>({});

    const { data: kpis, isLoading: kpiLoading, isError: kpiError } = useKPIs(filters);

    if (kpiError) {
        return <div className="p-6 text-red-500">Error loading dashboard data.</div>;
    }

    const quickActions = [
        {
            label: 'Manage Users',
            icon: Users,
            path: '/admin/users',
            gradient: 'from-sky-500 to-blue-500',
            shadow: 'shadow-sky-500/20',
        },
        {
            label: 'Activity Types',
            icon: FileCheck,
            path: '/admin/activities',
            gradient: 'from-emerald-500 to-teal-500',
            shadow: 'shadow-emerald-500/20',
        },
        {
            label: 'Deep Analytics',
            icon: BarChart2,
            path: '/admin/analytics',
            gradient: 'from-violet-500 to-purple-500',
            shadow: 'shadow-violet-500/20',
        },
        {
            label: 'Bulk Upload',
            icon: Upload,
            gradient: 'from-slate-400 to-slate-500',
            shadow: 'shadow-slate-500/10',
            disabled: true,
            soon: true,
        },
    ];

    return (
        <div className="pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Welcome back, <span className="gradient-text-brand">{user?.full_name || 'Admin'}</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1.5">
                    Here's an overview of your institution's activity
                </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {quickActions.map((action) => (
                    <button
                        key={action.label}
                        className={`relative h-28 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 transition-all duration-300 group overflow-hidden ${action.disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer'
                            }`}
                        onClick={() => !action.disabled && action.path && navigate(action.path)}
                        disabled={action.disabled}
                    >
                        {/* Background gradient on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

                        <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg ${action.shadow}`}>
                            <action.icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {action.label}
                        </span>
                        {action.soon && (
                            <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md">
                                Soon
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* KPI Summary */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Key Performance Indicators</h2>
                </div>
                <KPICards data={kpis} loading={kpiLoading} />
            </div>

            {/* System Status */}
            <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-800/30 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 dark:from-indigo-900/20 dark:to-violet-900/20 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-indigo-800 dark:text-indigo-300 font-bold">System Status</h3>
                </div>
                <p className="text-indigo-700 dark:text-indigo-400 text-sm ml-11">
                    System is running normally. All synchronization tasks are up to date.
                </p>
            </div>
        </div>
    );
};

export default AdminDashboard;
