import { ColumnDef } from '@tanstack/react-table';
import { FileText, Download, Trash2, XCircle, MoreVertical, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 group rounded-md"
                    asChild
                >
                    <a href={row.original.certificate_url} target="_blank" rel="noopener noreferrer">
                        <Badge variant="secondary" className="bg-blue-50/50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/40 gap-1.5 py-1 px-2.5 transition-all">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-bold uppercase tracking-tight">Certificate</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 -ml-0.5 transition-opacity" />
                        </Badge>
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md"
                    asChild
                    title="Download Copy"
                >
                    <a href={row.original.certificate_url} download onClick={(e) => e.stopPropagation()}>
                        <Download className="h-3.5 w-3.5" />
                    </a>
                </Button>
            </div>
        ) : (
            <div className="pl-3">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Missing</span>
            </div>
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
            const isOwner = String(activity.faculty_incharge_id) === String(user?.id) || 
                          String(activity.attendance_uploaded_by) === String(user?.id);

            const canDelete = isAdmin || (isFaculty && isOwner);

            if (!meta?.onDelete || !canDelete) return null;

            return (
                <div className="flex items-center justify-end pr-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Quick Actions
                            </div>
                            
                            {activity.status !== 'pending_upload' && activity.status !== 'rejected' && (
                                <DropdownMenuItem
                                    className="text-amber-600 focus:text-amber-700 focus:bg-amber-50 gap-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        meta.onReject?.(activity);
                                    }}
                                >
                                    <XCircle className="h-4 w-4" />
                                    <span>Undo Approval</span>
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 gap-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    meta.onDelete(activity);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete Record</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        }
    }
];
