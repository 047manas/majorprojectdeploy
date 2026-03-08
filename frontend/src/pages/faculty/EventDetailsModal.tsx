import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CheckCircle2, AlertCircle, Clock, Plus, Trash2, UserPlus, Eye, Edit2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: { title: string; start_date: string | null; is_owner?: boolean; activity_type_id?: number } | null;
    onRosterChanged?: (updatedEvent?: { title: string, start_date: string }) => void;
}

interface StudentRecord {
    activity_id: number;
    student_name: string;
    student_roll: string;
    student_department?: string;
    status: string;
    certificate_file?: string;
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
    const [bulkApproving, setBulkApproving] = useState(false);

    // Edit Event state
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editIssuer, setEditIssuer] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [savingDetails, setSavingDetails] = useState(false);

    useEffect(() => {
        if (isOpen && event && event.start_date) {
            fetchStudents();
            // Reset edit state
            setEditTitle(event.title);
            setEditStartDate(event.start_date.split('T')[0]);
            setIsEditingEvent(false);
        } else {
            setStudents([]);
            setError(null);
            setCanEdit(false);
            setAddRoll('');
            setAddError(null);
            setAddSuccess(null);
            setIsEditingEvent(false);
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
                const studentList = response.data.students || [];
                setStudents(studentList);
                setCanEdit(response.data.can_edit || false);

                // Pre-fill edit fields from backend metadata
                if (response.data.metadata) {
                    const meta = response.data.metadata;
                    setEditTitle(meta.title || event!.title);
                    setEditIssuer(meta.issuer_name || '');
                    setEditStartDate(meta.start_date || event!.start_date!.split('T')[0]);
                    setEditEndDate(meta.end_date || '');
                }
            }
        } catch (err: any) {
            setError(err.error || "Failed to load attendees");
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
            setAddError(err.error || 'Failed to add student');
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
            toast.error(err.error || 'Failed to remove student');
        } finally {
            setRemovingId(null);
        }
    };

    const handleBulkApprove = async () => {
        if (!students.some(s => s.status === 'pending')) {
            toast.error("No pending certificates to approve.");
            return;
        }

        if (!window.confirm(`Are you sure you want to approve all pending certificates for "${event!.title}"?`)) return;

        setBulkApproving(true);
        try {
            const date = event!.start_date!.split('T')[0];
            const response = await api.post('/faculty/event/bulk-approve', {
                title: event!.title,
                start_date: date
            });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchStudents();
                onRosterChanged?.();
            }
        } catch (err: any) {
            toast.error(err.error || 'Bulk approval failed');
        } finally {
            setBulkApproving(false);
        }
    };

    const handleUpdateEventDetails = async () => {
        if (!editTitle || !editStartDate) {
            toast.error("Title and Start Date are required.");
            return;
        }

        setSavingDetails(true);
        try {
            const date = event!.start_date!.split('T')[0];
            const response = await api.patch('/faculty/event/update-details', {
                old_title: event!.title,
                old_start_date: date,
                title: editTitle,
                issuer_name: editIssuer,
                start_date: editStartDate,
                end_date: editEndDate
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setIsEditingEvent(false);
                // Notify parent to refresh list with NEW title/date
                onRosterChanged?.({
                    title: editTitle,
                    start_date: editStartDate
                });
            }
        } catch (err: any) {
            toast.error(err.error || 'Failed to update event details');
        } finally {
            setSavingDetails(false);
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
                <DialogHeader className="shrink-0 mb-4 pr-12">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <Users className="h-5 w-5 text-indigo-600" />
                                Attendance Roster
                            </DialogTitle>
                            <DialogDescription>
                                {event.title} • {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'N/A'}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {canEdit && !isEditingEvent && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                    onClick={() => {
                                        setEditTitle(event.title);
                                        setEditStartDate(event.start_date?.split('T')[0] || '');
                                        setIsEditingEvent(true);
                                    }}
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit Details
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* Edit Event Details Form */}
                {isEditingEvent && (
                    <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Edit2 className="h-4 w-4 text-indigo-500" />
                                Edit Event Details
                            </h4>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingEvent(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label className="text-xs">Event Title</Label>
                                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Event Title" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label className="text-xs">Issued By (Organization)</Label>
                                <Input value={editIssuer} onChange={e => setEditIssuer(e.target.value)} placeholder="Organization Name" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Start Date</Label>
                                <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">End Date</Label>
                                <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingEvent(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleUpdateEventDetails} disabled={savingDetails}>
                                {savingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}

                {/* Attendance Management - Only shown when NOT editing event details */}
                {!isEditingEvent && (
                    <div className="flex-1 flex flex-col min-h-0">
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

                                {canEdit && students.some(s => s.status === 'pending') && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="ml-auto h-8 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                                        onClick={handleBulkApprove}
                                        disabled={bulkApproving}
                                    >
                                        {bulkApproving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                                        Verify All Pending
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Add Student (only for event in-charge) */}
                        {canEdit && (
                            <div className="mb-4 p-4 bg-indigo-50/40 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
                                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                                    <UserPlus className="h-4 w-4" />
                                    Add Student to Roster
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Enter Roll Number (e.g. stuCSE1)..."
                                        value={addRoll}
                                        onChange={e => { setAddRoll(e.target.value); setAddError(null); setAddSuccess(null); }}
                                        onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                                        className="h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                    <Button
                                        size="sm"
                                        className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-sm"
                                        onClick={handleAddStudent}
                                        disabled={addLoading || !addRoll.trim()}
                                    >
                                        {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                                        Add student
                                    </Button>
                                </div>
                                {addError && <p className="text-xs text-rose-600 font-medium mt-2">{addError}</p>}
                                {addSuccess && <p className="text-xs text-emerald-600 font-medium mt-2">{addSuccess}</p>}
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
                                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-center w-24">Actions</TableHead>
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
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {student.status !== 'pending_upload' && student.certificate_file && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-indigo-500 hover:text-indigo-700"
                                                                onClick={() => window.open(api.defaults.baseURL + '/public/certificate/' + student.certificate_file, '_blank')}
                                                                title="View Certificate"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}

                                                        {canEdit && student.status === 'pending_upload' && (
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
                                                        )}

                                                        {!canEdit && <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EventDetailsModal;
