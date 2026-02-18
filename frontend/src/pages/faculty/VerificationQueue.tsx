import { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import { DataTable } from '@/components/dashboard/DataTable';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

interface PendingActivity {
    id: number;
    title: string;
    student_name: string;
    student_id: string;
    category: string;
    created_at: string;
    status: string;
}

const VerificationQueue = () => {
    const [data, setData] = useState<PendingActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [selectedActivity, setSelectedActivity] = useState<PendingActivity | null>(null);

    // Fetch Data
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

    const handleReview = (activity: PendingActivity) => {
        // For now, prompt or simple modal placeholder
        // In real app, open a detailed review modal
        const approve = window.confirm(`Approve '${activity.title}' by ${activity.student_name}?`);
        if (approve) {
            handleAction(activity.id, 'approve');
        } else {
            // Logic for reject?
        }
    };

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await api.post(`/faculty/${action}/${id}`, { faculty_comment: 'Verified via Quick Action' });
            fetchData(); // Refresh list
        } catch (error) {
            alert("Action failed");
        }
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
                accessorKey: 'category',
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
                cell: ({ row }) => (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleReview(row.original)}>
                            <Eye className="h-4 w-4 mr-1" /> Review
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(row.original.id, 'approve')}>
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(row.original.id, 'reject')}>
                            <XCircle className="h-4 w-4" />
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
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verification Queue</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Review pending student activity submissions.</p>

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
        </div>
    );
};

export default VerificationQueue;
