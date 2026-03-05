import { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import { DataTable } from '@/components/dashboard/DataTable';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, FileText, User, Calendar, Tag, Loader2, ExternalLink, ClipboardCheck } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { AuditTimeline } from '@/components/dashboard/AuditTimeline';

interface PendingActivity {
    id: number;
    title: string;
    student_name: string;
    student_id: string;
    activity_type_name: string;
    created_at: string;
    status: string;
}

interface ReviewData {
    id: number;
    title: string;
    student_name: string;
    student_roll: string;
    student_department: string;
    category: string;
    issuer_name: string;
    organizer: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    verification_mode: string | null;
    certificate_url: string | null;
    certificate_file: string | null;
    created_at: string;
    audit_trail?: any[];
}

const VerificationQueue = () => {
    const [data, setData] = useState<PendingActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Review Modal State
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState<ReviewData | null>(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [comment, setComment] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/faculty/');
            if (Array.isArray(response.data)) {
                setData(response.data);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("Failed to fetch pending activities", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleReview = async (activity: PendingActivity) => {
        setReviewOpen(true);
        setReviewLoading(true);
        setComment('');
        try {
            const response = await api.get(`/faculty/review/${activity.id}`);
            setReviewData(response.data);
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to load review details");
            setReviewOpen(false);
        } finally {
            setReviewLoading(false);
        }
    };

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        setActionLoading(true);
        try {
            await api.post(`/faculty/${action}/${id}`, { faculty_comment: comment || `${action === 'approve' ? 'Approved' : 'Rejected'} via Review` });
            setReviewOpen(false);
            setReviewData(null);
            fetchData();
        } catch (error) {
            alert("Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    // Determine if certificate is an image or PDF
    const isImage = (filename: string | null) => {
        if (!filename) return false;
        return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
    };

    const columns = useMemo<ColumnDef<PendingActivity>[]>(
        () => [
            {
                accessorKey: 'student_name',
                header: 'Student Name',
            },
            {
                accessorKey: 'student_id',
                header: 'Roll No',
            },
            {
                accessorKey: 'activity_type_name',
                header: 'Category',
            },
            {
                accessorKey: 'title',
                header: 'Activity Title',
            },
            {
                accessorKey: 'created_at',
                header: 'Date',
                cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleDateString()
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handleReview(row.original)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Review
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-sm" onClick={() => handleAction(row.original.id, 'approve')}>
                            <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(row.original.id, 'reject')}>
                            <XCircle className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )
            }
        ],
        []
    );

    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return data.slice(start, start + pagination.pageSize);
    }, [data, pagination]);

    const pageCount = Math.ceil(data.length / pagination.pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                    <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Verification Queue</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Review pending student activity submissions.</p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={paginatedData}
                pageCount={pageCount}
                pagination={pagination}
                onPaginationChange={setPagination}
                sorting={sorting}
                onSortingChange={setSorting}
                loading={loading}
                options={{ manualPagination: true }}
            />

            {/* ===== REVIEW MODAL ===== */}
            <Dialog open={reviewOpen} onOpenChange={(open) => { if (!open) { setReviewOpen(false); setReviewData(null); } }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Eye className="h-5 w-5 text-indigo-600" />
                            Review Activity
                        </DialogTitle>
                        <DialogDescription>
                            View the certificate and activity details before approving or rejecting.
                        </DialogDescription>
                    </DialogHeader>

                    {reviewLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : reviewData ? (
                        <div className="space-y-5 mt-2">
                            {/* Activity Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl">
                                    <User className="h-4 w-4 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Student</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{reviewData.student_name}</p>
                                        <p className="text-xs text-slate-500">{reviewData.student_roll} · {reviewData.student_department}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl">
                                    <Tag className="h-4 w-4 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Category</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{reviewData.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl">
                                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Activity</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{reviewData.title}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl">
                                    <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Date</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {reviewData.start_date || new Date(reviewData.created_at).toLocaleDateString()}
                                            {reviewData.end_date && ` — ${reviewData.end_date}`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Issuer / Organizer */}
                            {(reviewData.issuer_name || reviewData.organizer) && (
                                <div className="p-3.5 bg-sky-50/80 dark:bg-sky-900/10 rounded-xl border border-sky-200/60 dark:border-sky-900/30">
                                    {reviewData.issuer_name && (
                                        <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Issuer:</span> {reviewData.issuer_name}</p>
                                    )}
                                    {reviewData.organizer && (
                                        <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Organizer:</span> {reviewData.organizer}</p>
                                    )}
                                </div>
                            )}

                            {/* Certificate Viewer */}
                            <div className="border border-slate-200/60 dark:border-slate-700/40 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/40">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Certificate / Proof</span>
                                    {reviewData.certificate_url && (
                                        <a
                                            href={reviewData.certificate_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            <ExternalLink className="h-3 w-3" /> Open in new tab
                                        </a>
                                    )}
                                </div>
                                {reviewData.certificate_url ? (
                                    isImage(reviewData.certificate_file) ? (
                                        <img
                                            src={reviewData.certificate_url}
                                            alt="Certificate"
                                            className="w-full max-h-[400px] object-contain bg-white"
                                        />
                                    ) : (
                                        <iframe
                                            src={reviewData.certificate_url}
                                            className="w-full h-[400px] bg-white"
                                            title="Certificate Preview"
                                        />
                                    )
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No certificate file uploaded</p>
                                    </div>
                                )}
                            </div>

                            {/* Audit Trail Timeline */}
                            {reviewData.audit_trail && reviewData.audit_trail.length > 0 && (
                                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/40 mt-4">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Activity History</h4>
                                    <div className="max-h-[200px] overflow-y-auto pr-2">
                                        <AuditTimeline events={reviewData.audit_trail} />
                                    </div>
                                </div>
                            )}

                            {/* Comment Field */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                                    Faculty Comment (optional)
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add a note for the student..."
                                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 min-h-[80px] resize-none transition-all duration-200"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20"
                                    onClick={() => handleAction(reviewData.id, 'approve')}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => handleAction(reviewData.id, 'reject')}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                    Reject
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VerificationQueue;
