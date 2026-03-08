import React from 'react';
import { Shield, Medal, Award, Crown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TierBadgeProps {
    points: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    cutoffs?: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
    };
}

export const getTierDetails = (points: number, cutoffs?: TierBadgeProps['cutoffs']) => {
    const defaultCutoffs = {
        bronze: 0,
        silver: 50,
        gold: 120,
        platinum: 250
    };
    const activeCutoffs = cutoffs || defaultCutoffs;

    if (points >= activeCutoffs.platinum) {
        return {
            name: 'Platinum Tier',
            icon: Crown,
            color: 'text-indigo-500',
            bg: 'bg-indigo-100 dark:bg-indigo-900/30',
            border: 'border-indigo-200 dark:border-indigo-800',
            gradient: 'from-indigo-400 to-violet-500'
        };
    } else if (points >= activeCutoffs.gold) {
        return {
            name: 'Gold Tier',
            icon: Award,
            color: 'text-amber-500',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            border: 'border-amber-200 dark:border-amber-800',
            gradient: 'from-amber-400 to-orange-500'
        };
    } else if (points >= activeCutoffs.silver) {
        return {
            name: 'Silver Tier',
            icon: Shield,
            color: 'text-slate-500 dark:text-slate-400',
            bg: 'bg-slate-100 dark:bg-slate-800',
            border: 'border-slate-200 dark:border-slate-700',
            gradient: 'from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600'
        };
    } else {
        return {
            name: 'Bronze Tier',
            icon: Medal,
            color: 'text-orange-700 dark:text-orange-600',
            bg: 'bg-orange-100 dark:bg-orange-900/30',
            border: 'border-orange-200 dark:border-orange-900/50',
            gradient: 'from-orange-700 to-amber-700 dark:from-orange-600 dark:to-amber-600'
        };
    }
};

const sizeClasses = {
    sm: { container: 'p-1', icon: 'h-3 w-3', text: 'text-[10px]' },
    md: { container: 'p-1.5', icon: 'h-4 w-4', text: 'text-xs' },
    lg: { container: 'p-2', icon: 'h-6 w-6', text: 'text-sm' },
};

export const TierBadge: React.FC<TierBadgeProps> = ({ points, size = 'md', showLabel = false, cutoffs }) => {
    const tier = getTierDetails(points, cutoffs);
    const Icon = tier.icon;
    const s = sizeClasses[size];

    const content = (
        <div className={`inline-flex items-center gap-1.5 ${showLabel ? 'pr-2.5' : ''} rounded-full border shadow-sm ${tier.bg} ${tier.border}`}>
            <div className={`rounded-full shadow-inner bg-gradient-to-br ${tier.gradient} ${s.container}`}>
                <Icon className={`${s.icon} text-white`} />
            </div>
            {showLabel && (
                <span className={`font-bold ${tier.color} ${s.text}`}>
                    {tier.name}
                </span>
            )}
        </div>
    );

    if (showLabel) return content;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-semibold">{tier.name}</p>
                    <p className="text-xs text-slate-500">{points} verified points</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
