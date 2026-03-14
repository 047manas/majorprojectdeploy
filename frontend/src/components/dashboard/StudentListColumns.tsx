import { ColumnDef } from '@tanstack/react-table';
import { FileText, Download, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const studentColumns: ColumnDef<any>[] = [
    {
        accessorKey: 'student_name',
        header: 'Name',
    },
    {
        accessorKey: 'roll_number',
        header: 'USN/Roll No',
    },
    {
        accessorKey: 'department',
        header: 'Dept',
    },
    {
        accessorKey: 'title',
        header: 'Activity/Event',
        meta: {
            nowrap: false,
        },
    },
    {
        accessorKey: 'category',
        header: 'Category',
    },
    {
        accessorKey: 'date',
        header: 'Date',
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.original.status;
            const isVerified = status === 'faculty_verified' || status === 'auto_verified' || status === 'hod_approved';

            return (
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                )}>
                    {status === 'faculty_verified' || status === 'hod_approved' ? 'Verified' :
                        status === 'auto_verified' ? 'Auto Verified' :
                            status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </span>
            );
        }
    },
    {
        accessorKey: 'certificate_url',
        header: 'Certificate',
        cell: ({ row }) => row.original.certificate_url ? (
            <div className="flex items-center gap-1.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    asChild
                    title="View Certificate"
                >
                    <a href={row.original.certificate_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4" />
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    asChild
                    title="Download"
                >
                    <a href={row.original.certificate_url} download onClick={(e) => e.stopPropagation()}>
                        <Download className="h-4 w-4" />
                    </a>
                </Button>
            </div>
        ) : (
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pl-2">None</span>
        )
    },
    {
        id: 'actions',
        header: 'Actions',
        cell: ({ row, table }) => {
            const meta = table.options.meta as any;
            const user = meta?.user;
            const activity = row.original;

            // Robust check: handling number/string mismatch and case sensitivity
            const isAdmin = user?.role?.toLowerCase() === 'admin';
            const isFaculty = user?.role?.toLowerCase() === 'faculty';
            const isOwner = String(activity.faculty_incharge_id) === String(user?.id);

            const canDelete = isAdmin || (isFaculty && isOwner);

            if (!meta?.onDelete || !canDelete) return null;

            return (
                <div className="flex items-center gap-1.5 min-w-[80px]">
                    {/* Reject Action */}
                    {activity.status !== 'pending_upload' && activity.status !== 'rejected' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                meta.onReject?.(activity);
                            }}
                            title="Undo Approval / Reject"
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    )}

                    {/* Delete Action */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            meta.onDelete(activity);
                        }}
                        title="Delete Permanently"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            );
        }
    }
];
