import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { theme } from '@/lib/theme';

interface CategoryChartProps {
    data: any[];
    loading?: boolean;
    onClick?: (data: any) => void;
}

const COLORS = [
    theme.colors.primary.DEFAULT,   // Indigo 600
    theme.colors.success.DEFAULT,   // Emerald 500
    '#0ea5e9',                      // Sky 500
    theme.colors.warning.DEFAULT,   // Amber 500
    '#ec4899',                      // Pink 500
    '#8b5cf6',                      // Violet 500
    '#6366f1'                       // Indigo 500
];

const CategoryChart: React.FC<CategoryChartProps> = ({ data, loading, onClick }) => {
    if (loading) {
        return <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-800 animate-pulse rounded-lg bg-opacity-50"></div>;
    }

    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-slate-400">No category data</div>;
    }

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        onClick={(data) => onClick && onClick(data)}
                        cursor="pointer"
                    >
                        {data.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#1e293b' }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CategoryChart;
