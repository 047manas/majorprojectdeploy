import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    PaginationState,
    OnChangeFn,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ArrowUpDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
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
    options?: any;
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
        ...options,
    });

    return (
        <div className="w-full space-y-4">
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 overflow-hidden bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left relative min-w-full table-fixed md:table-auto">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="border-b border-slate-200/60 dark:border-slate-700/40">
                                    {headerGroup.headers.map((header) => {
                                        const meta = header.column.columnDef.meta as any;
                                        return (
                                            <th
                                                key={header.id}
                                                className={cn(
                                                    "h-12 px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400",
                                                    meta?.className
                                                )}
                                                style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <div
                                                        className={cn(
                                                            "flex items-center space-x-1.5 cursor-pointer select-none group",
                                                            header.column.getCanSort() ? "hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" : ""
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
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {columns.map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-slate-100 dark:bg-slate-800 shimmer rounded-lg"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
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
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                                <ChevronsRight className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-base font-semibold text-slate-600 dark:text-slate-400">No results found</p>
                                            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                </span>
                <div className="flex items-center space-x-2">
                    <button
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronsLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 disabled:opacity-40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronsRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
            </div>
        </div>
    );
}
