import React from 'react';
import { Activity, Users, CheckCircle, AlertTriangle, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
    title: string;
    value: any;
    icon: React.ElementType;
    color: string;
    borderColor: string;
    loading: boolean;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, loading, onClick }) => (
    <Card
        className={cn(
            "rounded-2xl shadow-lg border-0 bg-white dark:bg-slate-800 transition-all duration-300 relative overflow-hidden group",
            onClick ? "cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-95" : ""
        )}
        onClick={onClick}
    >
        {/* Top Gradient Line */}
        <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", color.replace('text-', 'from-').replace('600', '500').replace('500', '400') + " to-transparent opacity-50")} />

        <CardContent className="p-6 flex items-start justify-between">
            <div className="space-y-4">
                <div className={cn("p-3 rounded-xl w-fit bg-opacity-10 dark:bg-opacity-20", color.replace('text-', 'bg-'))}>
                    <Icon className={cn("w-6 h-6", color)} />
                </div>
                <div>
                    {loading ? (
                        <div className="h-9 w-24 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-md"></div>
                    ) : (
                        <h3 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {value !== undefined ? value : "-"}
                        </h3>
                    )}
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{title}</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

interface KPIProps {
    data: any;
    loading: boolean;
    onCardClick?: (type: string) => void;
}

const KPICards: React.FC<KPIProps> = ({ data, loading, onCardClick }) => {
    return (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
                title="Total Students"
                value={data?.total_students}
                icon={GraduationCap}
                color="text-blue-600"
                borderColor="border-blue-600"
                loading={loading}
                onClick={() => onCardClick?.('TOTAL_STUDENTS')}
            />
            <StatCard
                title="Total Events"
                value={data?.total_events}
                icon={Activity}
                color="text-indigo-600"
                borderColor="border-indigo-600"
                loading={loading}
                onClick={() => onCardClick?.('TOTAL_EVENTS')}
            />
            <StatCard
                title="Total Participations" // Or "Active Students" if changed
                value={data?.total_participations}
                icon={Users}
                color="text-emerald-500" // Emerald 500 as Accent
                borderColor="border-emerald-500"
                loading={loading}
            />
            <StatCard
                title="Verified Certificates"
                value={data?.verified_count}
                icon={CheckCircle}
                color="text-teal-600"
                borderColor="border-teal-600"
                loading={loading}
                onClick={() => onCardClick?.('VERIFIED')}
            />
            <StatCard
                title="Pending Verification"
                value={data?.pending_count}
                icon={AlertTriangle}
                color="text-amber-500"
                borderColor="border-amber-500"
                loading={loading}
                onClick={() => onCardClick?.('PENDING')}
            />
        </div>
    );
};

export default KPICards;
