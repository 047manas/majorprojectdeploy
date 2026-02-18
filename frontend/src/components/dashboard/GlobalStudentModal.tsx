import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { DataTable } from './DataTable';
import { studentColumns } from './StudentListColumns';
import { AnalyticsFilters } from '@/hooks/useAnalytics';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

interface GlobalStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: AnalyticsFilters;
}

const GlobalStudentModal: React.FC<GlobalStudentModalProps> = ({ isOpen, onClose, filters }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch Global Student List
    const { data: students, isLoading } = useQuery({
        queryKey: ['global-students', filters, debouncedSearch],
        queryFn: async () => {
            const { data } = await api.get('/analytics/student-list', {
                params: {
                    ...filters,
                    search: debouncedSearch,
                    per_page: 100
                }
            });
            // API returns { students: [], total_pages: ... }
            return data.data.students || [];
        },
        enabled: isOpen,
    });

    const handleDeleteActivity = async (activity: any) => {
        const confirmMsg = user?.role === 'admin'
            ? `Admin: Are you sure you want to delete student activity '${activity.title}'?`
            : `Are you sure you want to delete student activity '${activity.title}'? This action is permanent.`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        const reason = window.prompt("Reason for deletion (Optional but recommended):", "Incorrect or fraudulent submission");
        if (reason === null) return; // User cancelled prompt

        try {
            await api.post(`/admin/student-activities/delete/${activity.id}`, { reason });
            queryClient.invalidateQueries({ queryKey: ['global-students'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['kpi-summary'] });
        } catch (error: any) {
            alert(error.response?.data?.error || "Deletion failed");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-xl gap-0">
                <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold">All Student Activities</DialogTitle>
                            <DialogDescription>
                                Complete list of student participations based on current filters.
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by Name, USN, or Event..."
                            className="pl-9 bg-white dark:bg-slate-950"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <DataTable
                        columns={studentColumns}
                        data={students || []}
                        loading={isLoading}
                        pageCount={1}
                        pagination={{ pageIndex: 0, pageSize: 20 }}
                        onPaginationChange={() => { }}
                        sorting={[]}
                        onSortingChange={() => { }}
                        options={{
                            meta: {
                                onDelete: (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'faculty') ? handleDeleteActivity : undefined,
                                user
                            }
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GlobalStudentModal;
