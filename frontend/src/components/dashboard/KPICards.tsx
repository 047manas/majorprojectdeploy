import React from 'react';
import { Activity, Users, CheckCircle, AlertTriangle, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: any;
    icon: React.ElementType;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    loading: boolean;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, gradientFrom, gradientTo, loading, onClick }) => (
    <div
        className={cn(
            "relative rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm overflow-hidden group transition-all duration-300",
            onClick ? "cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]" : "hover:shadow-md"
        )}
        onClick={onClick}
    >
        {/* Top Gradient Accent */}
        <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", gradientFrom, gradientTo)} />

        {/* Decorative gradient blob */}
        <div className={cn("absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.07] dark:opacity-[0.05] bg-gradient-to-br group-hover:opacity-[0.12] transition-opacity duration-500", gradientFrom, gradientTo)} />

        <div className="p-6 flex items-start justify-between relative z-10">
            <div className="space-y-4">
                <div className={cn("p-3 rounded-xl w-fit bg-gradient-to-br shadow-sm", gradientFrom, gradientTo)}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    {loading ? (
                        <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 shimmer rounded-lg"></div>
                    ) : (
                        <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {value !== undefined ? value : "-"}
                        </h3>
                    )}
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{title}</p>
                </div>
            </div>
        </div>
    </div>
);

interface KPIProps {
    data: any;
    loading: boolean;
    onCardClick?: (type: string) => void;
}

const KPICards: React.FC<KPIProps> = ({ data, loading, onCardClick }) => {
    return (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
                title="Total Students"
                value={data?.total_students}
                icon={GraduationCap}
                color="text-sky-600"
                gradientFrom="from-sky-500"
                gradientTo="to-cyan-400"
                loading={loading}
                onClick={() => onCardClick?.('TOTAL_STUDENTS')}
            />
            <StatCard
                title="Total Events"
                value={data?.total_events}
                icon={Activity}
                color="text-indigo-600"
                gradientFrom="from-indigo-500"
                gradientTo="to-violet-500"
                loading={loading}
                onClick={() => onCardClick?.('TOTAL_EVENTS')}
            />
            <StatCard
                title="Total Participations"
                value={data?.total_participations}
                icon={Users}
                color="text-teal-600"
                gradientFrom="from-teal-500"
                gradientTo="to-emerald-400"
                loading={loading}
            />
            <StatCard
                title="Verified Certificates"
                value={data?.verified_count}
                icon={CheckCircle}
                color="text-emerald-600"
                gradientFrom="from-emerald-500"
                gradientTo="to-green-400"
                loading={loading}
                onClick={() => onCardClick?.('VERIFIED')}
            />
            <StatCard
                title="Pending Verification"
                value={data?.pending_count}
                icon={AlertTriangle}
                color="text-rose-500"
                gradientFrom="from-rose-500"
                gradientTo="to-pink-400"
                loading={loading}
                onClick={() => onCardClick?.('PENDING')}
            />
        </div>
    );
};

export default KPICards;
