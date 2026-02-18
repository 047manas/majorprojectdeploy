import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/services/api';
import { DataTable } from '@/components/dashboard/DataTable';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileDown, Pencil, Trash2 } from 'lucide-react';
import ActivityEditModal from '@/components/dashboard/ActivityEditModal';

interface Activity {
    id: number;
    title: string;
    issuer_name: string;
    start_date: string;
    end_date?: string;
    status: string;
    certificate_url: string;
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

    // Edit state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

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
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {row.getValue('activity_type_name') as string}
                    </span>
                )
            },
            {
                accessorKey: 'title',
                header: 'Title',
                cell: ({ row }) => (
                    <span className="font-semibold text-slate-900 dark:text-white">{row.getValue('title') as string}</span>
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
                    let color = 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
                    let label = status.replace('_', ' ');

                    if (status === 'auto_verified') {
                        color = 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
                        label = 'Auto Verified';
                    } else if (status === 'faculty_verified') {
                        color = 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
                        label = 'Verified';
                    } else if (status === 'rejected') {
                        color = 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
                        label = 'Rejected';
                    }

                    const modeLabel = getVerificationModeLabel(mode);

                    return (
                        <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} capitalize`}>
                                {label}
                            </span>
                            {status.includes('verified') && modeLabel && (
                                <div className="text-[0.7rem] text-slate-400 mt-1">{modeLabel}</div>
                            )}
                            {status === 'faculty_verified' && (
                                <div className="text-[0.7rem] text-slate-400 mt-1">By Faculty</div>
                            )}
                        </div>
                    );
                }
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        {/* View/Download Certificate */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(row.original.certificate_url, '_blank')}
                            title="View Certificate"
                        >
                            <Download className="h-4 w-4 text-blue-600" />
                        </Button>

                        {/* Public Verification Link */}
                        {row.original.verification_token && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/verify/${row.original.verification_token}`, '_blank')}
                                title="Public Verification Link"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        )}

                        {/* Edit Button - Only for non-verified or allow all? User asked for edit feature. */}
                        {/* Let's allow edit for all, but backend resets it. */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(row.original)}
                            title="Edit Activity"
                        >
                            <Pencil className="h-4 w-4 text-slate-600" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(row.original)}
                            title="Delete Activity"
                            className="hover:bg-red-50 hover:text-red-600 border-slate-200"
                        >
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                )
            }
        ],
        [fetchData] // Added fetchData to dependencies for stable columns
    );

    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return data.slice(start, start + pagination.pageSize);
    }, [data, pagination]);

    const pageCount = Math.ceil(data.length / pagination.pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Portfolio</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        View all your recorded certificates and their verification status.
                    </p>
                </div>
                <Button
                    onClick={handleDownloadPDF}
                    disabled={pdfLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
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
