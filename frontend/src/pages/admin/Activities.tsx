import { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import { DataTable } from '@/components/dashboard/DataTable';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ActivityType {
    id: number;
    name: string;
    description: string;
    faculty_incharge_id: number | null;
    faculty_incharge_name: string | null;
}

interface User {
    id: number;
    full_name: string;
    role: string;
}

const Activities = () => {
    const [data, setData] = useState<ActivityType[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'name', desc: false }
    ]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [facultyList, setFacultyList] = useState<User[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        faculty_id: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/activity-types');
            if (Array.isArray(response.data)) {
                setData(response.data);
            } else if (response.data.data && Array.isArray(response.data.data)) {
                setData(response.data.data);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("Failed to fetch activity types", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Fetch Faculty for Dropdown
        const fetchFaculty = async () => {
            try {
                const response = await api.get('/admin/users');
                if (Array.isArray(response.data)) {
                    const faculty = response.data.filter((u: User) => u.role === 'faculty');
                    setFacultyList(faculty);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };
        fetchFaculty();
    }, []);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ name: '', description: '', faculty_id: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (at: ActivityType) => {
        setEditingId(at.id);
        setFormData({
            name: at.name,
            description: at.description,
            faculty_id: at.faculty_incharge_id?.toString() || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number, name: string) => {
        try {
            // Professional check: How many activities use this?
            const usageRes = await api.get(`/admin/activity-types/${id}/usage`);
            const { count } = usageRes.data;

            let message = `Are you sure you want to delete the "${name}" activity type?`;
            if (count > 0) {
                message = `The category "${name}" is currently used by ${count} student submission(s).\n\nDeleting it will move these submissions to "Other". Are you sure you want to proceed?`;
            }

            if (!window.confirm(message)) {
                return;
            }

            await api.post(`/admin/activity-types/delete/${id}`);
            fetchData();
        } catch (error: any) {
            console.error("Failed to delete activity type", error);
            alert(error.response?.data?.error || "Failed to delete activity type");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await api.post(`/admin/activity-types/${editingId}/edit`, formData);
            } else {
                await api.post('/admin/activity-types', formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to save activity type");
        } finally {
            setSubmitting(false);
        }
    };

    const columns = useMemo<ColumnDef<ActivityType>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Activity Name',
                size: 250,
            },
            {
                accessorKey: 'description',
                header: 'Description',
                meta: {
                    nowrap: false,
                },
            },
            {
                accessorKey: 'faculty_incharge_name',
                header: 'Faculty In-Charge',
                cell: ({ row }) => row.getValue('faculty_incharge_name') || 'Unassigned',
                size: 200,
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                            onClick={() => handleOpenEdit(row.original)}
                            title="Edit Category"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                            onClick={() => handleDelete(row.original.id, row.original.name)}
                            title="Delete Category"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ),
                size: 100,
            },
        ],
        []
    );

    const paginatedData = useMemo(() => {
        const sorted = [...data].sort((a, b) => {
            const field = sorting[0]?.id as keyof ActivityType || 'name';
            const desc = sorting[0]?.desc;

            const valA = (a[field] || '').toString().toLowerCase();
            const valB = (b[field] || '').toString().toLowerCase();

            if (valA < valB) return desc ? 1 : -1;
            if (valA > valB) return desc ? -1 : 1;
            return 0;
        });

        const start = pagination.pageIndex * pagination.pageSize;
        return sorted.slice(start, start + pagination.pageSize);
    }, [data, pagination, sorting]);

    const pageCount = Math.ceil(data.length / pagination.pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Types</h1>
                    <p className="text-slate-500 dark:text-slate-400">Configure activity categories and faculty responsibilities.</p>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="mr-2 h-4 w-4" /> Add Activity Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Activity Type' : 'Add New Activity Type'}</DialogTitle>
                            <DialogDescription>
                                {editingId
                                    ? 'Update the activity category name, description, or faculty in-charge.'
                                    : 'Create a new category for student activities and assign a faculty in-charge.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Activity Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Input
                                    id="desc"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Faculty In-Charge</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                                    value={formData.faculty_id}
                                    onChange={e => setFormData({ ...formData, faculty_id: e.target.value })}
                                >
                                    <option value="">Select Faculty...</option>
                                    {facultyList.map(f => (
                                        <option key={f.id} value={f.id}>{f.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingId ? 'Update Type' : 'Create Type'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
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
        </div>
    );
};

export default Activities;
