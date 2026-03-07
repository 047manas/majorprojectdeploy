import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/dashboard/DataTable';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { Plus, Pencil, Trash2, Users as UsersIcon } from 'lucide-react';
import UserModal from '@/components/dashboard/UserModal';
import { useAuth } from '@/context/AuthContext';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';

interface User {
    id: number;
    email: string;
    role: string;
    full_name: string;
    department?: string;
    is_active: boolean;
    institution_id?: string;
    position?: string;
}

const Users = () => {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [filtering, setFiltering] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { data: users, isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data } = await api.get('/admin/users');
            return data;
        },
    });

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (user: User) => {
        if (user.id === currentUser?.id) {
            toast.error("Security: You cannot delete your own account.");
            return;
        }

        if (user.email === 'admin@example.com') {
            toast.error("Security: Default admin account cannot be deleted.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete user ${user.full_name} (${user.email})? This action is permanent.`)) {
            return;
        }

        const reason = window.prompt("Reason for deletion (Optional but recommended):", "Account no longer required");
        if (reason === null) return; // User cancelled prompt

        try {
            await api.post(`/admin/users/${user.id}/delete`, { reason });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success("User deleted successfully.");
        } catch (error: any) {
            console.error("Deletion failed", error);
            toast.error(error.error || "Failed to delete user.");
        }
    };

    const handleAdd = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const columns = useMemo<ColumnDef<User>[]>(
        () => [
            {
                accessorKey: 'full_name',
                header: 'Name',
            },
            {
                accessorKey: 'email',
                header: 'Email',
            },
            {
                accessorKey: 'role',
                header: 'Role',
                cell: ({ row }) => (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold
                        ${row.original.role === 'admin' ? 'bg-violet-100/80 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                            row.original.role === 'faculty' ? 'bg-sky-100/80 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                                'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {row.original.role.toUpperCase()}
                    </span>
                ),
            },
            {
                accessorKey: 'department',
                header: 'Dept',
            },
            {
                accessorKey: 'is_active',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={`px-2.5 py-0.5 rounded-lg text-[0.65rem] font-bold ${row.original.is_active ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {row.original.is_active ? 'Active' : 'Inactive'}
                    </span>
                )
            },
            {
                id: 'actions',
                cell: ({ row }) => (
                    <div className="flex gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit User</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteUser(row.original)}
                                    disabled={row.original.id === currentUser?.id || row.original.email === 'admin@example.com'}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete User</TooltipContent>
                        </Tooltip>
                    </div>
                )
            }
        ],
        [currentUser]
    );

    // Client-side filtering/pagination logic
    const filteredData = useMemo(() => {
        if (!users) return [];
        return users.filter((u: User) =>
            u.full_name.toLowerCase().includes(filtering.toLowerCase()) ||
            u.email.toLowerCase().includes(filtering.toLowerCase())
        );
    }, [users, filtering]);

    const paginatedData = useMemo(() => {
        const start = page * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, page, pageSize]);

    if (isError) return <div>Failed to load users.</div>;

    return (
        <div className="pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                        <UsersIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">User Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage system users, roles, and permissions.</p>
                    </div>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>

            <div className="mb-4">
                <Input
                    placeholder="Search users..."
                    value={filtering}
                    onChange={(e) => setFiltering(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <DataTable
                columns={columns}
                data={paginatedData}
                loading={isLoading}
                pageCount={Math.ceil(filteredData.length / pageSize)}
                pagination={{ pageIndex: page, pageSize }}
                onPaginationChange={(updater) => {
                    if (typeof updater === 'function') {
                        const newState = updater({ pageIndex: page, pageSize });
                        setPage(newState.pageIndex);
                        setPageSize(newState.pageSize);
                    } else {
                        setPage(updater.pageIndex);
                        setPageSize(updater.pageSize);
                    }
                }}
                sorting={sorting}
                onSortingChange={setSorting}
            />

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={selectedUser}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
            />
        </div>
    );
};

export default Users;
