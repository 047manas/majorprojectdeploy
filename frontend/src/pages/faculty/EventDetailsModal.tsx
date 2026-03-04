import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import api from '@/services/api';

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: { title: string; start_date: string | null } | null;
}

interface StudentRecord {
    activity_id: number;
    student_name: string;
    student_roll: string;
    status: string;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ isOpen, onClose, event }) => {
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && event && event.start_date) {
            fetchStudents();
        } else {
            setStudents([]);
            setError(null);
        }
    }, [isOpen, event]);

    const fetchStudents = async () => {
        setLoading(true);
        setError(null);
        try {
            const encodedTitle = encodeURIComponent(event!.title);
            const date = event!.start_date!.split('T')[0]; // Ensure correct format
            const response = await api.get(`/faculty/event/${encodedTitle}/${date}`);
            if (Array.isArray(response.data)) {
                setStudents(response.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to load attendees");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        if (status === 'pending_upload') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100/80 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Upload Pending
                </span>
            );
        }
        if (status === 'pending') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5" />
                    In Queue
                </span>
            );
        }
        if (status.includes('verified') || status === 'hod_approved') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (!event) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader className="shrink-0 mb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-5 w-5 text-indigo-600" />
                        Attendance Roster
                    </DialogTitle>
                    <DialogDescription>
                        {event.title} • {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'N/A'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                            <p>Loading attendee list...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-rose-500">
                            <p>{error}</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <p>No students found for this event.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Roll No.</TableHead>
                                    <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Student Name</TableHead>
                                    <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-right">Upload Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.activity_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                        <TableCell className="font-medium text-slate-900 dark:text-slate-200">
                                            {student.student_roll}
                                        </TableCell>
                                        <TableCell>{student.student_name}</TableCell>
                                        <TableCell className="text-right">
                                            <StatusBadge status={student.status} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EventDetailsModal;
