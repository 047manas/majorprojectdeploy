import React from 'react';
import { useDashboardMeta, AnalyticsFilters } from '@/hooks/useAnalytics';
import { Filter, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterBarProps {
    filters?: AnalyticsFilters;
    onFilterChange: (filters: Partial<AnalyticsFilters>) => void;
    setFilters?: React.Dispatch<React.SetStateAction<AnalyticsFilters>>; // Optional back-compat or remove
}

const FilterBar: React.FC<FilterBarProps> = ({ filters = {}, onFilterChange }) => {
    const { data: meta, isLoading } = useDashboardMeta();

    const handleChange = (key: keyof AnalyticsFilters, value: any) => {
        onFilterChange({ [key]: value === 'all' ? undefined : value });
    };

    if (isLoading) return <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl"></div>;

    return (
        <Card className="rounded-xl shadow-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mb-8">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-200">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Filter size={18} />
                    </div>
                    <span className="font-semibold text-lg">Filter Data</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Year Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
                        <Select
                            value={filters.year?.toString() || 'all'}
                            onValueChange={(val) => handleChange('year', val === 'all' ? undefined : Number(val))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Years" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {meta?.years?.map((year: number) => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Department Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Department</label>
                        <Select
                            value={filters.department || 'all'}
                            onValueChange={(val) => handleChange('department', val === 'all' ? undefined : val)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {meta?.departments?.map((dept: string) => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Campus Type Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Campus</label>
                        <Select
                            value={filters.campus_type || 'all'}
                            onValueChange={(val) => handleChange('campus_type', val === 'all' ? undefined : val)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Campuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Campuses</SelectItem>
                                <SelectItem value="in_campus">In Campus</SelectItem>
                                <SelectItem value="off_campus">Off Campus</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Selectors */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                        <input
                            type="date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            value={filters.start_date || ''}
                            onChange={(e) => handleChange('start_date', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">End Date</label>
                        <input
                            type="date"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                            value={filters.end_date || ''}
                            onChange={(e) => handleChange('end_date', e.target.value)}
                        />
                    </div>

                    {/* Verified Only Toggle */}
                    <div className="space-y-2 flex flex-col justify-end h-full pt-6">
                        <label className="inline-flex items-center cursor-pointer p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={filters.verified_only || false}
                                onChange={(e) => handleChange('verified_only', e.target.checked)}
                            />
                            <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Verified Only</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 flex items-end justify-end">
                        <Button
                            variant="outline"
                            onClick={() => onFilterChange({
                                year: undefined,
                                department: undefined,
                                verified_only: undefined,
                                start_date: undefined,
                                end_date: undefined,
                                campus_type: undefined
                            })}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full md:w-auto"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Reset Filters
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FilterBar;
