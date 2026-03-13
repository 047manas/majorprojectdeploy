import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { TrendingUp, AlertTriangle, CheckCircle, Award, Star, ListFilter } from 'lucide-react';
import { useAdminInsights, AnalyticsFilters } from '@/hooks/useAnalytics';

interface InsightsPanelProps {
    filters: AnalyticsFilters;
    data?: any;
    isLoading?: boolean;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ filters, data: preFetchedData, isLoading: preFetchedLoading }) => {
    const { data: hookedData, isLoading: hookedLoading } = useAdminInsights(filters, { enabled: !preFetchedData });
    const data = preFetchedData || hookedData;
    const isLoading = preFetchedData ? preFetchedLoading : hookedLoading;
    const [deptModalOpen, setDeptModalOpen] = React.useState(false);
    const [catModalOpen, setCatModalOpen] = React.useState(false);

    if (isLoading) {
        return (
            <Card className="col-span-full lg:col-span-1">
                <CardHeader className="pb-2">
                    <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 shimmer rounded-lg" />
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800 shimmer rounded-xl" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    return (
        <>
            <Card className="col-span-full lg:col-span-1 border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                            <Star className="h-4 w-4 text-white fill-white" />
                        </div>
                        Strategic Insights
                    </CardTitle>
                    <CardDescription>Automated performance analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">

                    {/* Top Performance */}
                    <div
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/40 cursor-pointer hover:border-teal-400/50 hover:shadow-md hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-all group"
                        onClick={() => setDeptModalOpen(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-400 rounded-xl shadow-sm">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Top Department</p>
                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                    {data.top_dept} ({data.top_dept_val}%)
                                </p>
                                {data.top_dept_list?.length > 3 && (
                                    <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5 font-medium group-hover:underline flex items-center gap-1">
                                        <ListFilter size={10} /> Click to see names
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Most Popular */}
                    <div
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/40 cursor-pointer hover:border-sky-400/50 hover:shadow-md hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-all group"
                        onClick={() => setCatModalOpen(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-400 rounded-xl shadow-sm">
                                <Award className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Top Category</p>
                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                    {data.top_category} ({data.top_category_events || 0} {data.top_category_events === 1 ? 'event' : 'events'})
                                </p>
                                <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5 font-medium">
                                    {data.top_category_val} participants
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Verification Efficiency */}
                    <div
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/40"
                        title={data.integrity_impact > 0 ? `${data.integrity_impact} fake/invalid records removed (Integrity Impact)` : ''}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl shadow-sm">
                                <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Verification Rate</p>
                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                    {data.verification_efficiency}% of total submissions
                                </p>
                                {data.integrity_impact > 0 && (
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">
                                        Impact: {data.integrity_impact} fake items cleared
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Alerts */}
                    {(data.risk_events?.length > 0 || data.low_engagement_depts?.length > 0) && (
                        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-200/50 dark:border-rose-900/30">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg">
                                    <AlertTriangle className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Attention Needed</span>
                            </div>
                            <ul className="text-xs ml-6 list-disc space-y-1 text-slate-700 dark:text-slate-300">
                                {data.low_engagement_depts.slice(0, 2).map((d: string) => (
                                    <li key={d}>Low engagement in {d}</li>
                                ))}
                                {data.risk_events.slice(0, 2).map((e: string) => (
                                    <li key={e}>High pending requests in "{e}"</li>
                                ))}
                            </ul>
                        </div>
                    )}

                </CardContent>
            </Card>

            {/* Department Modal */}
            <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            Top Performing Branches
                        </DialogTitle>
                        <DialogDescription>
                            These branches have achieved a {data.top_dept_val}% engagement score.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {(data.top_dept_list?.length > 0 ? data.top_dept_list : [data.top_dept]).map((dept: string) => (
                            dept !== 'N/A' && !dept.includes('Depts') && (
                                <div key={dept} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                                    {dept}
                                </div>
                            )
                        ))}
                        {(!data.top_dept_list || data.top_dept_list.length === 0) && data.top_dept.includes('Depts') && (
                            <div className="col-span-2 p-4 text-center text-slate-500 text-sm italic">
                                Loading full list...
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Category Modal */}
            <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-sky-500 to-blue-400">
                                <Award className="h-4 w-4 text-white" />
                            </div>
                            Top Performing Categories
                        </DialogTitle>
                        <DialogDescription>
                            Most popular categories with {data.top_category_val} total participations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-2">
                        {data.top_category_list?.map((cat: string) => (
                            <div key={cat} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>{cat}</span>
                                <span className="text-xs bg-gradient-to-r from-sky-500 to-blue-400 text-white px-2.5 py-0.5 rounded-full font-semibold">{data.top_category_val} events</span>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default InsightsPanel;
