import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CheckCircle2, AlertCircle, Clock, Plus, Trash2, UserPlus, Eye, Edit2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

import { ReasonModal } from '@/components/dashboard/ReasonModal';

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: { title: string; start_date: string | null; is_owner?: boolean; activity_type_id?: number } | null;
    onRosterChanged?: (updatedEvent?: { title: string, start_date: string }) => void;
}

interface Activity {
    activity_id: number;
    student_name: string;
    student_roll: string;
    student_department?: string;
    status: string;
    certificate_file?: string;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ isOpen, onClose, event, onRosterChanged }) => {
    const [students, setStudents] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
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

    // Modal states for ReasonModal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [activeActivity, setActiveActivity] = useState<number | null>(null);
    const [activeActivityName, setActiveActivityName] = useState<string>('');

    useEffect(() => {
        if (isOpen && event && event.start_date) {
            fetchStudents();
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
            setLoading(true);
        }
    }, [isOpen, event]);

    const fetchStudents = async () => {
        setLoading(true);
        setError(null);
        try {
            const encodedTitle = encodeURIComponent(event!.title);
            const date = event!.start_date!.split('T')[0];
            const response = await api.get(`/faculty/event/${encodedTitle}/${date}`);
            
            const studentList = response.data.students || [];
            setStudents(studentList);
            setCanEdit(response.data.can_edit || false);

            if (response.data.metadata) {
                const meta = response.data.metadata;
                setEditTitle(meta.title || event!.title);
                setEditIssuer(meta.issuer_name || '');
                setEditStartDate(meta.start_date || event!.start_date!.split('T')[0]);
                setEditEndDate(meta.end_date || '');
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

    const handleRemoveStudentClick = (activityId: number, studentName: string) => {
        setActiveActivity(activityId);
        setActiveActivityName(studentName);
        setIsDeleteModalOpen(true);
    };

    const confirmRemoveStudent = async (reason: string) => {
        if (!activeActivity) return;
        setRemovingId(activeActivity);
        try {
            await api.delete(`/faculty/event/remove-student/${activeActivity}`);
            toast.success('Student removed from roster');
            fetchStudents();
            onRosterChanged?.();
        } catch (err: any) {
            toast.error(err.error || 'Failed to remove student');
            throw err;
        } finally {
            setRemovingId(null);
        }
    };

    const handleUndoApprovalClick = (activityId: number, studentName: string) => {
        setActiveActivity(activityId);
        setActiveActivityName(studentName);
        setIsRejectModalOpen(true);
    };

    const confirmUndoApproval = async (reason: string) => {
        if (!activeActivity) return;
        try {
            await api.post(`/faculty/reject/${activeActivity}`, { faculty_comment: reason });
            toast.success("Approval undone. Record set to rejected.");
            fetchStudents();
            onRosterChanged?.();
        } catch (err: any) {
            toast.error(err.error || "Failed to undo approval");
            throw err;
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
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950 border-none shadow-2xl">
                {/* Custom Header Section */}
                <div className="shrink-0 p-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 min-w-0">
                            <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 dark:text-white">
                                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                Attendance Roster
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                {event.title} • {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pr-6">
                            {canEdit && !isEditingEvent && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs gap-2 border-slate-200 dark:border-slate-800"
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
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {/* Bulk Actions & Stats */}
                    {!isEditingEvent && !loading && students.length > 0 && (
                        <div className="flex flex-wrap items-center gap-6 mb-6">
                            <div className="flex gap-4">
                                <div className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-500 mb-0.5">Total</div>
                                    <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300 leading-none">{students.length}</div>
                                </div>
                                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 mb-0.5">Uploaded</div>
                                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 leading-none">{uploadedCount}</div>
                                </div>
                                <div className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-orange-500 mb-0.5">Missing</div>
                                    <div className="text-lg font-bold text-orange-700 dark:text-orange-300 leading-none">{pendingCount}</div>
                                </div>
                            </div>

                            {canEdit && students.some(s => s.status === 'pending') && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                                    onClick={handleBulkApprove}
                                    disabled={bulkApproving}
                                >
                                    {bulkApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                    Approve All Pending
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Edit Event Details Form */}
                    {isEditingEvent && (
                        <div className="mb-8 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                                        <Edit2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    Event Identity Details
                                </h4>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsEditingEvent(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2.5 col-span-2">
                                    <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Official Title</Label>
                                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-10" />
                                </div>
                                <div className="space-y-2.5 col-span-2">
                                    <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Issued By (Organization)</Label>
                                    <Input value={editIssuer} onChange={e => setEditIssuer(e.target.value)} />
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Starts On</Label>
                                    <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-xs uppercase tracking-wider font-bold text-slate-500">Ends On</Label>
                                    <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="ghost" onClick={() => setIsEditingEvent(false)}>Cancel</Button>
                                <Button className="min-w-[140px] bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleUpdateEventDetails} disabled={savingDetails}>
                                    {savingDetails ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Updates
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Attendance Controller */}
                    {!isEditingEvent && (
                        <div className="space-y-6">
                            {/* Add Student Input */}
                            {canEdit && (
                                <div className="flex items-center gap-3 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm pr-3">
                                    <div className="pl-4">
                                        <UserPlus className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <Input
                                        placeholder="Enter Roll Number to add student..."
                                        value={addRoll}
                                        onChange={e => { setAddRoll(e.target.value); setAddError(null); setAddSuccess(null); }}
                                        onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                                        className="border-none shadow-none focus-visible:ring-0 bg-transparent h-11 text-base p-0"
                                    />
                                    <Button
                                        size="sm"
                                        className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/10"
                                        onClick={handleAddStudent}
                                        disabled={addLoading || !addRoll.trim()}
                                    >
                                        {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Attendee'}
                                    </Button>
                                </div>
                            )}

                            {/* List Content */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 dark:bg-slate-900/30">
                                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4 opacity-50" />
                                        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Loading Roster...</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-100/50 dark:bg-slate-900/80">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="h-12 font-bold px-6 text-slate-500 uppercase text-[10px] tracking-widest">Attendee</TableHead>
                                                <TableHead className="h-12 font-bold px-4 text-slate-500 uppercase text-[10px] tracking-widest">Department</TableHead>
                                                <TableHead className="h-12 font-bold px-4 text-slate-500 uppercase text-[10px] tracking-widest text-right">Status</TableHead>
                                                <TableHead className="h-12 font-bold px-6 text-slate-500 uppercase text-[10px] tracking-widest text-center w-36">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-white dark:bg-slate-950">
                                            {students.map((student) => (
                                                <TableRow key={student.activity_id} className="group border-slate-100 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <TableCell className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white leading-tight">{student.student_name}</span>
                                                            <span className="text-xs text-slate-400 font-medium">{student.student_roll}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4">
                                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase">{student.student_department || '-'}</span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 text-right">
                                                        <StatusBadge status={student.status} />
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                            {student.status !== 'pending_upload' && student.certificate_file && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                                    onClick={() => window.open(api.defaults.baseURL + '/public/certificate/' + student.certificate_file, '_blank')}
                                                                    title="View Document"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {canEdit && (
                                                                <>
                                                                    {student.status !== 'pending_upload' && student.status !== 'rejected' && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                                            onClick={() => handleUndoApprovalClick(student.activity_id, student.student_name)}
                                                                            title="Reject Submission"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                                        onClick={() => handleRemoveStudentClick(student.activity_id, student.student_name)}
                                                                        disabled={removingId === student.activity_id}
                                                                        title="Remove from Roster"
                                                                    >
                                                                        {removingId === student.activity_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                    </Button>
                                                                </>
                                                            )}
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
                </div>

                {/* Overlaid Reason Modals */}
                <ReasonModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => { setIsDeleteModalOpen(false); setActiveActivity(null); }}
                    onConfirm={confirmRemoveStudent}
                    title="Remove from Roster"
                    description={`Delete "${activeActivityName}" from the roster? This clears their participation record and any uploaded certificate.`}
                    variant="destructive"
                    icon="delete"
                    confirmLabel="Remove Attendee"
                    placeholder="Reason (e.g. Mistaken entry, absent student)..."
                />

                <ReasonModal
                    isOpen={isRejectModalOpen}
                    onClose={() => { setIsRejectModalOpen(false); setActiveActivity(null); }}
                    onConfirm={confirmUndoApproval}
                    title="Reject Submission"
                    description={`Invalidate "${activeActivityName}"'s certificate? They will be notified to re-upload while remaining on the roster.`}
                    variant="warning"
                    icon="reject"
                    confirmLabel="Reject & Notify Student"
                    placeholder="Describe the issue (e.g. Blurry photo, incorrect dates)..."
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventDetailsModal;
