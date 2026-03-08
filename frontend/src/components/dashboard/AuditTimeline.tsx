import React from 'react';
import { CheckCircle2, UploadCloud, FileEdit, UserCheck, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export interface AuditEvent {
    timestamp: string;
    actor: string;
    action: string;
    details: string;
}

interface AuditTimelineProps {
    events: AuditEvent[];
}

const getIconForAction = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('upload') && !act.includes('edit')) return <UploadCloud className="h-4 w-4 text-sky-500" />;
    if (act.includes('edit') || act.includes('re-upload')) return <FileEdit className="h-4 w-4 text-amber-500" />;
    if (act.includes('auto')) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (act.includes('faculty') || act.includes('hod') || act.includes('approv')) return <UserCheck className="h-4 w-4 text-indigo-500" />;
    if (act.includes('reject')) return <AlertCircle className="h-4 w-4 text-rose-500" />;
    return <Clock className="h-4 w-4 text-slate-400" />;
};

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
    if (!events || events.length === 0) {
        return <div className="text-sm text-slate-500 py-4 text-center italic">No audit history available.</div>;
    }

    return (
        <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:z-0 py-2">
            {events.map((evt, idx) => (
                <div key={idx} className="relative z-10">
                    <div className="absolute -left-6 bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                        {getIconForAction(evt.action)}
                    </div>
                    <div className="flex flex-col ml-3">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{evt.action}</span>
                            <span className="text-[0.65rem] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
                                {format(new Date(evt.timestamp), 'MMM d, h:mm a')}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            By <span className="font-semibold text-slate-700 dark:text-slate-300">{evt.actor}</span>
                        </p>
                        {evt.details && (
                            <div className="mt-2 p-2.5 bg-white/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[0.7rem] text-slate-500 dark:text-slate-400 leading-normal shadow-sm">
                                {evt.details}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
