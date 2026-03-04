import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm",
                secondary:
                    "border-slate-200/60 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm text-slate-700 dark:text-slate-300",
                destructive:
                    "border-transparent bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm",
                outline: "text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
