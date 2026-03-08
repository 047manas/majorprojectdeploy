import { useState } from 'react';
import FilterBar from '@/components/dashboard/FilterBar';
import KPICards from '@/components/dashboard/KPICards';
import ExportButtons from '@/components/dashboard/ExportButtons';
import DrilldownModal from '@/components/dashboard/DrilldownModal';
import TrendChart from '@/components/charts/TrendChart';
import CategoryChart from '@/components/charts/CategoryChart';
import { useKPIs, AnalyticsFilters, useEventDistribution, useYearlyTrend, useDeptParticipation } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import StudentListWidget from '@/components/dashboard/StudentListWidget';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import { Building2 } from 'lucide-react';

const AnalyticsDashboard = () => {
    // const { user } = useAuth(); // Unused here
    const [filters, setFilters] = useState<AnalyticsFilters>({
        year: undefined // Default to All Years to ensure data visibility
    });

    // Drilldown State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Data Fetching
    const { data: kpiData, isLoading: kpiLoading, isError: kpiError } = useKPIs(filters);
    const { data: trendData, isLoading: trendLoading } = useYearlyTrend(filters);
    const { data: distData, isLoading: distLoading } = useEventDistribution(filters);
    const { data: deptData, isLoading: deptLoading } = useDeptParticipation(filters);

    // Transform Data for Charts (Recharts expects array of objects)
    const pieData = Array.isArray(distData)
        ? distData.map((item: any) => ({
            name: item.category,
            value: item.count
        }))
        : [];

    const lineData = Array.isArray(trendData)
        ? trendData.map((item: any) => ({
            month: item.year?.toString() || 'Unknown', // TrendChart uses 'month' as XKey
            count: item.total_participations
        }))
        : [];

    const handleFilterChange = (newFilters: AnalyticsFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const handleDrilldown = (data: any) => {
        if (data && data.name) {
            setSelectedCategory(data.name);
            setModalOpen(true);
        }
    };

    const handleKPIClick = (type: string) => {
        if (type === 'TOTAL_EVENTS') {
            setSelectedCategory('ALL_EVENTS');
            setModalOpen(true);
        } else if (type === 'TOTAL_STUDENTS') {
            const element = document.getElementById('student-list-widget');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (type === 'VERIFIED') {
            setFilters(prev => ({ ...prev, verified_only: true, status: undefined }));
        } else if (type === 'PENDING') {
            setFilters(prev => ({ ...prev, status: 'pending', verified_only: false }));
        }
    };



    if (kpiError) {
        return <div className="p-6 text-red-500">Error loading dashboard data. Please try again.</div>;
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Analytics Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Deep dive into institution-wide performance metrics.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButtons filters={filters} />
                </div>
            </div>

            {/* Filters */}
            <FilterBar onFilterChange={handleFilterChange} filters={filters} />

            {/* KPIs */}
            <KPICards data={kpiData} loading={kpiLoading} onCardClick={handleKPIClick} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Participation Trend</CardTitle>
                        <CardDescription>Student engagement over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TrendChart data={lineData} loading={trendLoading} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Event Categories</CardTitle>
                        <CardDescription>Distribution of events by type</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CategoryChart
                            data={pieData}
                            loading={distLoading}
                            onClick={handleDrilldown}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Department Performance & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Department Performance</CardTitle>
                        <CardDescription>Engagement rates across departments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {deptLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
                                </div>
                            ) : deptData?.map((dept: any) => (
                                <div key={dept.department} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                                            {dept.department.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{dept.department}</p>
                                            <p className="text-xs text-slate-500">{dept.total} Students</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{dept.engagement_percent}%</p>
                                        <div className="w-24 h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full"
                                                style={{ width: `${dept.engagement_percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!deptLoading && (!deptData || deptData.length === 0) && (
                                <div className="py-12 text-center text-slate-500">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                                        <Building2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p className="text-sm font-medium">No department data available</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>


                <InsightsPanel filters={filters} />
            </div>
            {/* Modals */}
            <DrilldownModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                category={selectedCategory}
                filters={filters}
            />

            {/* Student List Widget (Directly on Dashboard) */}
            <StudentListWidget
                filters={filters}
                onFilterChange={handleFilterChange}
            />
        </div>
    );
};

export default AnalyticsDashboard;
