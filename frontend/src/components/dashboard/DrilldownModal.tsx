import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { DataTable } from './DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { studentColumns } from './StudentListColumns';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface DrilldownModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: string | null;
    filters: any;
}

// --- Columns for Event List ---
const eventColumns: ColumnDef<any>[] = [
    {
        accessorKey: 'title',
        header: 'Event Name',
    },
    {
        accessorKey: 'start_date',
        header: 'Date',
        cell: ({ row }) => row.original.start_date ? new Date(row.original.start_date).toLocaleDateString() : 'N/A',
    },
    {
        accessorKey: 'unique_students',
        header: 'Unique Students',
    },
    {
        accessorKey: 'participation_count',
        header: 'Total Participations',
    },
    {
        id: 'actions',
        cell: ({ row, table }) => (
            <Button
                variant="outline"
                size="sm"
                onClick={() => (table.options.meta as any)?.onViewStudents(row.original)}
            >
                View Students
            </Button>
        )
    }
];

const DrilldownModal: React.FC<DrilldownModalProps> = ({ isOpen, onClose, category, filters }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    // Fetch Events for Category
    const { data: events, isLoading: eventsLoading } = useQuery({
        queryKey: ['events', category, filters],
        queryFn: async () => {
            if (!category) return [];

            const endpoint = category === 'ALL_EVENTS'
                ? '/analytics/events-summary'
                : '/analytics/events-by-category';

            const params = category === 'ALL_EVENTS'
                ? { ...filters }
                : { ...filters, category };

            const { data } = await api.get(endpoint, { params });
            return data.data;
        },
        enabled: !!category && !selectedEvent,
    });

    // Fetch Students for Event
    const { data: students, isLoading: studentsLoading } = useQuery({
        queryKey: ['students', selectedEvent?.id],
        queryFn: async () => {
            if (!selectedEvent) return [];
            const { data } = await api.get(`/analytics/event/${selectedEvent.id}/students`);
            return data.data;
        },
        enabled: !!selectedEvent,
    });

    const handleBack = () => {
        setSelectedEvent(null);
    };

    const handleDeleteActivity = async (activity: any) => {
        const confirmMsg = user?.role === 'admin'
            ? `Admin: Are you sure you want to delete student activity '${activity.title}'?`
            : `Are you sure you want to delete student activity '${activity.title}'? This action is permanent.`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        const reason = window.prompt("Reason for deletion (Optional but recommended):", "Incorrect or fraudulent submission");
        if (reason === null) return; // User cancelled prompt

        try {
            // Use the admin delete endpoint which now supports faculty in-charges too
            await api.post(`/admin/student-activities/delete/${activity.id}`, { reason });
            // Invalidate all related analytics queries
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['global-students'] });
            queryClient.invalidateQueries({ queryKey: ['global-students-widget'] });
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['kpi-summary'] });
            toast.success("Activity deleted.");
        } catch (error: any) {
            toast.error(error.error || "Deletion failed");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-xl gap-0">
                <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>Events</span>
                        <span>/</span>
                        <span className={cn(selectedEvent ? "" : "font-semibold text-primary")}>
                            {category === 'ALL_EVENTS' ? 'All Events' : category}
                        </span>
                        {selectedEvent && (
                            <>
                                <span>/</span>
                                <span className="font-semibold text-primary truncate max-w-[200px]">{selectedEvent.title}</span>
                            </>
                        )}
                    </div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {selectedEvent && (
                            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 -ml-2 mr-1">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        {selectedEvent ? 'Student Participants' : (category === 'ALL_EVENTS' ? 'All Events' : `${category} Events`)}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedEvent
                            ? "List of students who participated in this event. Verification status is indicated."
                            : category === 'ALL_EVENTS'
                                ? 'Complete list of all events. Click on an event to view its student participants.'
                                : `Browse all events under ${category}. Select an event to view detailed student lists.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {selectedEvent ? (
                        <DataTable
                            columns={studentColumns}
                            data={students || []}
                            loading={studentsLoading}
                            pageCount={1}
                            pagination={{ pageIndex: 0, pageSize: 10 }}
                            onPaginationChange={() => { }}
                            sorting={[]}
                            onSortingChange={() => { }}
                            options={{
                                meta: {
                                    onDelete: (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'faculty') ? handleDeleteActivity : undefined,
                                    user
                                }
                            }}
                        />
                    ) : (
                        <DataTable
                            columns={eventColumns}
                            data={events || []}
                            loading={eventsLoading}
                            pageCount={1}
                            pagination={{ pageIndex: 0, pageSize: 10 }}
                            onPaginationChange={() => { }}
                            sorting={[]}
                            onSortingChange={() => { }}
                            // Pass handler to table meta
                            options={{
                                meta: {
                                    onViewStudents: (event: any) => setSelectedEvent(event)
                                }
                            }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DrilldownModal;
