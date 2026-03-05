import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CheckCircle2, AlertCircle, Clock, Plus, Trash2, UserPlus } from 'lucide-react';
import api from '@/services/api';

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: { title: string; start_date: string | null; is_owner?: boolean } | null;
    onRosterChanged?: () => void;
}

interface StudentRecord {
    activity_id: number;
    student_name: string;
    student_roll: string;
    student_department?: string;
    status: string;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ isOpen, onClose, event, onRosterChanged }) => {
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);

    // Add student state
    const [addRoll, setAddRoll] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState<string | null>(null);

    // Remove state
    const [removingId, setRemovingId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen && event && event.start_date) {
            fetchStudents();
        } else {
            setStudents([]);
            setError(null);
            setCanEdit(false);
            setAddRoll('');
            setAddError(null);
            setAddSuccess(null);
        }
    }, [isOpen, event]);

    const fetchStudents = async () => {
        setLoading(true);
        setError(null);
        try {
            const encodedTitle = encodeURIComponent(event!.title);
            const date = event!.start_date!.split('T')[0];
            const response = await api.get(`/faculty/event/${encodedTitle}/${date}`);
            // Handle both old format (array) and new format ({ students, can_edit })
            if (Array.isArray(response.data)) {
                setStudents(response.data);
                setCanEdit(false);
            } else {
                setStudents(response.data.students || []);
                setCanEdit(response.data.can_edit || false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to load attendees");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async () => {
        if (!addRoll.trim()) return;
        setAddLoading(true);
        setAddError(null);
        setAddSuccess(null);
        try {
            const date = event!.start_date!.split('T')[0];
            const response = await api.post('/faculty/event/add-student', {
                title: event!.title,
                start_date: date,
                roll_number: addRoll.trim()
            });
            if (response.data.success) {
                setAddSuccess(response.data.message);
                setAddRoll('');
                fetchStudents();
                onRosterChanged?.();
            }
        } catch (err: any) {
            setAddError(err.response?.data?.error || 'Failed to add student');
        } finally {
            setAddLoading(false);
        }
    };

    const handleRemoveStudent = async (activityId: number) => {
        if (!window.confirm('Remove this student from the event roster?')) return;
        setRemovingId(activityId);
        try {
            await api.delete(`/faculty/event/remove-student/${activityId}`);
            fetchStudents();
            onRosterChanged?.();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to remove student');
        } finally {
            setRemovingId(null);
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

    const uploadedCount = students.filter(s => s.status !== 'pending_upload').length;
    const pendingCount = students.filter(s => s.status === 'pending_upload').length;

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

                {/* Summary Stats */}
                {!loading && students.length > 0 && (
                    <div className="flex gap-4 mb-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            <Users className="h-4 w-4" />
                            <span className="font-semibold text-slate-900 dark:text-white">{students.length}</span> Total
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-semibold">{uploadedCount}</span> Uploaded
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-semibold">{pendingCount}</span> Pending
                        </div>
                    </div>
                )}

                {/* Add Student (only for event in-charge) */}
                {canEdit && (
                    <div className="mb-3 p-3 bg-indigo-50/80 dark:bg-indigo-900/10 border border-indigo-200/60 dark:border-indigo-900/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                            <UserPlus className="h-4 w-4" />
                            Add Student to Roster
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter Roll Number..."
                                value={addRoll}
                                onChange={e => { setAddRoll(e.target.value); setAddError(null); setAddSuccess(null); }}
                                onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                                className="flex-1"
                            />
                            <Button size="sm" onClick={handleAddStudent} disabled={addLoading || !addRoll.trim()}>
                                {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>
                        {addError && <p className="text-xs text-rose-600 mt-1.5">{addError}</p>}
                        {addSuccess && <p className="text-xs text-emerald-600 mt-1.5">{addSuccess}</p>}
                    </div>
                )}

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
                                    <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Dept</TableHead>
                                    <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-right">Status</TableHead>
                                    {canEdit && (
                                        <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-center w-16"></TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.activity_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                        <TableCell className="font-medium text-slate-900 dark:text-slate-200">
                                            {student.student_roll}
                                        </TableCell>
                                        <TableCell>{student.student_name}</TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{student.student_department || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <StatusBadge status={student.status} />
                                        </TableCell>
                                        {canEdit && (
                                            <TableCell className="text-center">
                                                {student.status === 'pending_upload' ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                                        onClick={() => handleRemoveStudent(student.activity_id)}
                                                        disabled={removingId === student.activity_id}
                                                        title="Remove from roster"
                                                    >
                                                        {removingId === student.activity_id
                                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            : <Trash2 className="h-3.5 w-3.5" />
                                                        }
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </TableCell>
                                        )}
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
