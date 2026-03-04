import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/services/api';
import { DataTable } from '@/components/dashboard/DataTable';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileDown, Pencil, Trash2, Loader2, UploadCloud, BookOpen } from 'lucide-react';
import ActivityEditModal from '@/components/dashboard/ActivityEditModal';

interface Activity {
    id: number;
    title: string;
    issuer_name: string;
    start_date: string;
    end_date?: string;
    status: string;
    campus_type?: string;
    is_attendance_uploaded?: boolean;
    certificate_url: string | null;
    verification_token: string | null;
    verification_mode: string | null;
    activity_type_name: string;
    activity_type_id?: number;
    organizer?: string;
}

const getVerificationModeLabel = (mode: string | null): string | null => {
    if (!mode) return null;
    if (mode.includes('qr')) return 'via QR Code';
    if (mode === 'link_only') return 'via Certificate Link';
    return 'via Text Analysis';
};

const MyPortfolio = () => {
    const [data, setData] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [uploadingId, setUploadingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/student/portfolio');
            if (Array.isArray(response.data)) {
                setData(response.data);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("Failed to fetch portfolio", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        try {
            const response = await api.get('/student/portfolio.pdf?mode=verified', {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'portfolio.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download PDF", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleEdit = (activity: Activity) => {
        setSelectedActivity(activity);
        setEditModalOpen(true);
    };

    const handleDelete = async (activity: Activity) => {
        if (!window.confirm(`Are you sure you want to delete '${activity.title}'? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/student/activity/${activity.id}`);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || "Deletion failed");
        }
    };

    const handleUploadForAttendance = async (activityId: number, file: File) => {
        setUploadingId(activityId);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/student/upload-for-attendance/${activityId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                alert(response.data.message);
                fetchData();
            }
        } catch (error: any) {
            alert(error.error || error.response?.data?.error || "Upload failed");
        } finally {
            setUploadingId(null);
        }
    };

    const columns = useMemo<ColumnDef<Activity>[]>(
        () => [
            {
                accessorKey: 'start_date',
                header: 'Date',
                cell: ({ row }) => row.getValue('start_date') ? new Date(row.getValue('start_date')).toLocaleDateString() : 'N/A'
            },
            {
                accessorKey: 'activity_type_name',
                header: 'Activity Type',
                cell: ({ row }) => (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100/80 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
                        {row.getValue('activity_type_name') as string}
                    </span>
                )
            },
            {
                accessorKey: 'title',
                header: 'Title',
                cell: ({ row }) => (
                    <span className="font-bold text-slate-900 dark:text-white">{row.getValue('title') as string}</span>
                )
            },
            {
                accessorKey: 'issuer_name',
                header: 'Issuer',
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const status = row.getValue('status') as string;
                    const mode = row.original.verification_mode;
                    let color = 'text-amber-700 bg-amber-100/80 dark:text-amber-400 dark:bg-amber-900/30';
                    let label = status.replace('_', ' ');

                    if (status === 'auto_verified') {
                        color = 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-400 dark:bg-emerald-900/30';
                        label = 'Auto Verified';
                    } else if (status === 'faculty_verified') {
                        color = 'text-sky-700 bg-sky-100/80 dark:text-sky-400 dark:bg-sky-900/30';
                        label = 'Verified';
                    } else if (status === 'rejected') {
                        color = 'text-rose-700 bg-rose-100/80 dark:text-rose-400 dark:bg-rose-900/30';
                        label = 'Rejected';
                    } else if (status === 'pending_upload') {
                        color = 'text-orange-700 bg-orange-100/80 dark:text-orange-400 dark:bg-orange-900/30';
                        label = 'Upload Required';
                    }

                    const modeLabel = getVerificationModeLabel(mode);

                    return (
                        <div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${color} capitalize`}>
                                {label}
                            </span>
                            {status.includes('verified') && modeLabel && (
                                <div className="text-[0.65rem] text-slate-400 mt-1 font-medium">{modeLabel}</div>
                            )}
                            {status === 'faculty_verified' && (
                                <div className="text-[0.65rem] text-slate-400 mt-1 font-medium">By Faculty</div>
                            )}
                        </div>
                    );
                }
            },
            {
                accessorKey: 'campus_type',
                header: 'Campus',
                cell: ({ row }) => {
                    const ct = row.getValue('campus_type') as string;
                    if (ct === 'in_campus') {
                        return <span className="px-2.5 py-0.5 rounded-lg text-[0.65rem] font-bold bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">In Campus</span>;
                    }
                    return <span className="px-2.5 py-0.5 rounded-lg text-[0.65rem] font-bold bg-slate-100/80 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">Off Campus</span>;
                }
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1.5">
                        {row.original.status === 'pending_upload' ? (
                            <label className="relative cursor-pointer">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadForAttendance(row.original.id, f);
                                    }}
                                />
                                <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-sm"
                                    disabled={uploadingId === row.original.id}
                                >
                                    {uploadingId === row.original.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                        <UploadCloud className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Upload
                                </Button>
                            </label>
                        ) : (
                            <>
                                {row.original.certificate_url && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(row.original.certificate_url!, '_blank')}
                                        title="View Certificate"
                                        className="h-8 w-8 p-0"
                                    >
                                        <Download className="h-3.5 w-3.5 text-sky-600" />
                                    </Button>
                                )}

                                {row.original.verification_token && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(`/verify/${row.original.verification_token}`, '_blank')}
                                        title="Public Verification Link"
                                        className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                )}

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(row.original)}
                                    title="Edit Activity"
                                    className="h-8 w-8 p-0"
                                >
                                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                            </>
                        )}

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(row.original)}
                            title="Delete Activity"
                            className="h-8 w-8 p-0 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 hover:border-rose-200"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        </Button>
                    </div>
                )
            }
        ],
        [fetchData]
    );

    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return data.slice(start, start + pagination.pageSize);
    }, [data, pagination]);

    const pageCount = Math.ceil(data.length / pagination.pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                        <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My Portfolio</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                            View all your recorded certificates and their verification status.
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleDownloadPDF}
                    disabled={pdfLoading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20"
                >
                    <FileDown className="h-4 w-4 mr-2" />
                    {pdfLoading ? 'Generating...' : 'Download Portfolio'}
                </Button>
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

            <ActivityEditModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                activity={selectedActivity}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default MyPortfolio;
