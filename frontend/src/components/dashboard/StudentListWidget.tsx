import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { DataTable } from './DataTable';
import { studentColumns } from './StudentListColumns';
import { AnalyticsFilters } from '@/hooks/useAnalytics';
import { Search, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface StudentListWidgetProps {
    filters: AnalyticsFilters;
    onFilterChange: (filters: Partial<AnalyticsFilters>) => void;
}

const StudentListWidget: React.FC<StudentListWidgetProps> = ({ filters, onFilterChange }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Handle Status Tab Click
    const handleStatusChange = (status: string) => {
        if (status === 'all') {
            onFilterChange({ status: undefined, verified_only: undefined });
        } else if (status === 'verified') {
            onFilterChange({ verified_only: true, status: undefined });
        } else {
            onFilterChange({ status: status, verified_only: undefined });
        }
    };

    // Determine current active tab
    const currentTab = filters.verified_only ? 'verified' : (filters.status || 'all');

    // Handle Export
    const handleExport = async () => {
        setExportLoading(true);
        try {
            const response = await api.get('/analytics/export-students-table', {
                params: {
                    ...filters,
                    search: debouncedSearch,
                },
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Student_List_${currentTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Success feedback
            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setExportLoading(false);
        }
    };

    const handleDeleteActivity = async (activity: any) => {
        const confirmMsg = user?.role?.toLowerCase() === 'admin'
            ? `Admin: Are you sure you want to delete student activity '${activity.title}'?`
            : `Are you sure you want to delete student activity '${activity.title}'? This action is permanent.`;

        if (!window.confirm(confirmMsg)) {
            return;
        }

        const reason = window.prompt("Reason for deletion (Optional but recommended):", "Incorrect or fraudulent submission");
        if (reason === null) return; // User cancelled prompt

        try {
            await api.post(`/admin/student-activities/delete/${activity.id}`, { reason });
            queryClient.invalidateQueries({ queryKey: ['global-students-widget'] });
            queryClient.invalidateQueries({ queryKey: ['global-students'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['kpi-summary'] });
            toast.success("Activity deleted.");
        } catch (error: any) {
            toast.error(error.error || "Deletion failed");
        }
    };

    const handleRejectActivity = async (activity: any) => {
        const confirmMsg = `Are you sure you want to undo approval for '${activity.title}'? This will notify the student to re-upload.`;
        
        if (!window.confirm(confirmMsg)) {
            return;
        }

        const reason = window.prompt("Reason for rejection:", "Incorrect document or blurry image");
        if (reason === null) return;

        try {
            await api.post(`/faculty/reject/${activity.id}`, { faculty_comment: reason });
            queryClient.invalidateQueries({ queryKey: ['global-students-widget'] });
            queryClient.invalidateQueries({ queryKey: ['global-students'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['kpi-summary'] });
            toast.success("Approval undone. Activity rejected.");
        } catch (error: any) {
            toast.error(error.error || "Rejection failed");
        }
    };

    // Fetch Global Student List
    const { data: students, isLoading } = useQuery({
        queryKey: ['global-students-widget', filters, debouncedSearch],
        queryFn: async () => {
            const { data } = await api.get('/analytics/student-list', {
                params: {
                    ...filters,
                    search: debouncedSearch,
                    per_page: 1000 // Increased limit for demo/professional feel
                }
            });
            return data.data.students || [];
        },
    });

    return (
        <Card id="student-list-widget" className="col-span-full scroll-mt-24 transition-all duration-500">
            <CardHeader className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Student Participation
                        </CardTitle>
                        <CardDescription>
                            View and manage student activities.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search by name, roll no, or title..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={exportLoading || exportSuccess}
                            className={cn(
                                "transition-all duration-300 w-32",
                                exportSuccess ? "bg-green-100 text-green-700 border-green-300" : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                            )}
                        >
                            {exportLoading ? (
                                <span className="animate-spin mr-2">⏳</span>
                            ) : exportSuccess ? (
                                <CheckCircle className="mr-2 h-4 w-4" />
                            ) : (
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                            )}
                            {exportSuccess ? "Done" : "Export"}
                        </Button>
                    </div>
                </div>

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        variant={currentTab === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange('all')}
                        className="rounded-full"
                    >
                        All Records
                    </Button>
                    <Button
                        variant={currentTab === 'verified' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange('verified')}
                        className={cn("rounded-full", currentTab === 'verified' && "bg-emerald-600 hover:bg-emerald-700")}
                    >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Verified
                    </Button>
                    <Button
                        variant={currentTab === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange('pending')}
                        className={cn("rounded-full", currentTab === 'pending' && "bg-amber-500 hover:bg-amber-600")}
                    >
                        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                        Pending
                    </Button>
                    <Button
                        variant={currentTab === 'rejected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange('rejected')}
                        className={cn("rounded-full", currentTab === 'rejected' && "bg-red-500 hover:bg-red-600")}
                    >
                        Rejected
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <DataTable
                    columns={studentColumns}
                    data={students || []}
                    loading={isLoading}
                    pageCount={1}
                    pagination={{ pageIndex: 0, pageSize: 15 }}
                    onPaginationChange={() => { }}
                    sorting={[]}
                    onSortingChange={() => { }}
                    options={{
                        meta: {
                            onDelete: (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'faculty') ? handleDeleteActivity : undefined,
                            onReject: (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'faculty') ? handleRejectActivity : undefined,
                            user
                        },
                        emptyState: {
                            icon: <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />,
                            title: search ? "No matches found" : "No results",
                            description: search
                                ? `We couldn't find any activities matching "${search}". Try a different keyword.`
                                : "No activities found for the selected filters."
                        }
                    }}
                />
            </CardContent>
        </Card>
    );
};

export default StudentListWidget;
