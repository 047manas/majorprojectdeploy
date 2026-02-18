import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { theme } from '@/lib/theme';

interface TrendChartProps {
    data: any[];
    dataKey?: string;
    category?: string;
    loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg text-sm">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const TrendChart: React.FC<TrendChartProps> = ({ data, loading }) => {
    if (loading) {
        return <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-800 animate-pulse rounded-lg"></div>;
    }

    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-slate-400">No trend data available</div>;
    }

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
                    <Legend iconType="circle" />
                    <Line
                        type="monotone"
                        dataKey="count"
                        name="Participation"
                        stroke={theme.colors.primary.DEFAULT}
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#fff', strokeWidth: 3, stroke: theme.colors.primary.DEFAULT }}
                        activeDot={{ r: 8, strokeWidth: 0, fill: theme.colors.primary.dark }}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
