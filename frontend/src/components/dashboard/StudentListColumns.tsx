import { ColumnDef } from '@tanstack/react-table';
import { FileText, Download, Trash2 } from 'lucide-react';
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
        cell: ({ row }) => (
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border",
                row.original.status === 'faculty_verified' || row.original.status === 'auto_verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    row.original.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
            )}>
                {row.original.status === 'faculty_verified' ? 'Verified' :
                    row.original.status === 'auto_verified' ? 'Auto Verified' :
                        row.original.status}
            </span>
        )
    },
    {
        accessorKey: 'certificate_url',
        header: 'Certificate',
        cell: ({ row }) => row.original.certificate_url ? (
            <div className="flex items-center gap-2">
                <a
                    href={row.original.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    onClick={(e) => e.stopPropagation()}
                    title="View Certificate"
                >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs underline">View</span>
                </a>
                <a
                    href={row.original.certificate_url}
                    download
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
                    onClick={(e) => e.stopPropagation()}
                    title="Download Certificate"
                >
                    <Download className="h-4 w-4" />
                </a>
            </div>
        ) : (
            <span className="text-xs text-muted-foreground">-</span>
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
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
                        onClick={(e) => {
                            e.stopPropagation();
                            meta.onDelete(activity);
                        }}
                        title="Delete Activity"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Delete</span>
                    </Button>
                </div>
            );
        }
    }
];
