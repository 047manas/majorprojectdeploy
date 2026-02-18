import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    PaginationState,
    OnChangeFn,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    pageCount: number;
    pagination: PaginationState;
    onPaginationChange: OnChangeFn<PaginationState>;
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
    loading?: boolean;
    options?: any; // Allow passing extra table options like meta
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    loading,
    options,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: {
            pagination,
            sorting,
        },
        onPaginationChange,
        onSortingChange,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        ...options, // Spread extra options
    });

    return (
        <div className="w-full">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-lg bg-white dark:bg-slate-900">
                <table className="w-full text-sm text-left relative min-w-full table-fixed md:table-auto">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 shadow-sm">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const meta = header.column.columnDef.meta as any;
                                    return (
                                        <th
                                            key={header.id}
                                            className={cn(
                                                "h-12 px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500",
                                                meta?.className
                                            )}
                                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    className={cn(
                                                        "flex items-center space-x-1 cursor-pointer select-none group",
                                                        header.column.getCanSort() ? "hover:text-indigo-600 transition-colors" : ""
                                                    )}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    <span>
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    </span>
                                                    {{
                                                        asc: <ArrowUpDown className="ml-1 h-3 w-3 text-indigo-500" />,
                                                        desc: <ArrowUpDown className="ml-1 h-3 w-3 text-indigo-500" />,
                                                    }[header.column.getIsSorted() as string] ?? (
                                                            <ArrowUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                        )}
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {columns.map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors odd:bg-white even:bg-slate-50/50"
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        const meta = cell.column.columnDef.meta as any;
                                        return (
                                            <td
                                                key={cell.id}
                                                className={cn(
                                                    "px-6 py-4 text-sm text-slate-700 dark:text-slate-300",
                                                    meta?.nowrap !== false ? "whitespace-nowrap" : "whitespace-normal min-w-[200px]",
                                                    meta?.className
                                                )}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="h-32 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <p className="text-base font-medium">No results found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <button
                    className="p-2 border rounded-md disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                </span>
                <button
                    className="p-2 border rounded-md disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
