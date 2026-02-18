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
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ filters }) => {
    const { data, isLoading } = useAdminInsights(filters);
    const [deptModalOpen, setDeptModalOpen] = React.useState(false);
    const [catModalOpen, setCatModalOpen] = React.useState(false);

    if (isLoading) {
        return (
            <Card className="col-span-full lg:col-span-1 border-l-4 border-l-slate-200">
                <CardHeader className="pb-2">
                    <div className="h-6 w-32 bg-slate-100 animate-pulse rounded" />
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-lg" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    return (
        <>
            <Card className="col-span-full lg:col-span-1 border-l-4 border-l-indigo-500 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Star className="h-5 w-5 text-indigo-500 fill-indigo-500" />
                        Strategic Insights
                    </CardTitle>
                    <CardDescription>Automated performance analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">

                    {/* Top Performance */}
                    <div
                        className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30 cursor-pointer hover:bg-emerald-100/50 transition-all group scale-[0.99] hover:scale-100"
                        onClick={() => setDeptModalOpen(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full group-hover:bg-emerald-200 transition-colors">
                                <TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Top Department</p>
                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                    {data.top_dept} ({data.top_dept_val}%)
                                </p>
                                {data.top_dept_list?.length > 3 && (
                                    <p className="text-[10px] text-emerald-600 mt-0.5 font-medium group-hover:underline flex items-center gap-1">
                                        <ListFilter size={10} /> Click to see names
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Most Popular */}
                    <div
                        className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 cursor-pointer hover:bg-blue-100/50 transition-all group scale-[0.99] hover:scale-100"
                        onClick={() => setCatModalOpen(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full group-hover:bg-blue-200 transition-colors">
                                <Award className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">Top Category</p>
                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                    {data.top_category} ({data.top_category_events || 0} {data.top_category_events === 1 ? 'event' : 'events'})
                                </p>
                                <p className="text-[10px] text-blue-600 mt-0.5 font-medium">
                                    {data.top_category_val} participants
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Verification Efficiency */}
                    <div
                        className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/10 rounded-lg border border-violet-100 dark:border-violet-900/30"
                        title={data.integrity_impact > 0 ? `${data.integrity_impact} fake/invalid records removed (Integrity Impact)` : ''}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-100 dark:bg-violet-800 rounded-full">
                                <CheckCircle className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-400">Verification Rate</p>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                    {data.verification_efficiency}% of total submissions
                                </p>
                                {data.integrity_impact > 0 && (
                                    <p className="text-[10px] text-violet-600 mt-0.5 font-medium">
                                        Impact: {data.integrity_impact} fake items cleared
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Alerts (Only if exists) */}
                    {(data.risk_events?.length > 0 || data.low_engagement_depts?.length > 0) && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">Attention Needed</span>
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
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            Top Performing Branches
                        </DialogTitle>
                        <DialogDescription>
                            These branches have achieved a {data.top_dept_val}% engagement score.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {(data.top_dept_list?.length > 0 ? data.top_dept_list : [data.top_dept]).map((dept: string) => (
                            dept !== 'N/A' && !dept.includes('Depts') && (
                                <div key={dept} className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
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
                            <Award className="h-5 w-5 text-blue-600" />
                            Top Performing Categories
                        </DialogTitle>
                        <DialogDescription>
                            Most popular categories with {data.top_category_val} total participations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-2">
                        {data.top_category_list?.map((cat: string) => (
                            <div key={cat} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span>{cat}</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{data.top_category_val} events</span>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default InsightsPanel;
