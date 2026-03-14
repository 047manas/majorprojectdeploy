import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, XCircle, Trash2, Loader2 } from 'lucide-react';

interface ReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    title: string;
    description: string;
    placeholder?: string;
    confirmLabel?: string;
    variant?: 'destructive' | 'warning' | 'default';
    icon?: 'delete' | 'reject' | 'info';
}

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

export const ReasonModal: React.FC<ReasonModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    placeholder = "Type your reason here...",
    confirmLabel = "Confirm Action",
    variant = 'default',
    icon = 'info'
}) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) return;
        setLoading(true);
        try {
            await onConfirm(reason);
            setReason('');
            onClose();
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = () => {
        switch (icon) {
            case 'delete': return <Trash2 className="h-5 w-5 text-rose-500" />;
            case 'reject': return <XCircle className="h-5 w-5 text-amber-500" />;
            default: return <AlertTriangle className="h-5 w-5 text-indigo-500" />;
        }
    };

    // Map custom variants to valid Button variants
    const getButtonVariant = (): ButtonVariant => {
        if (variant === 'destructive') return 'destructive';
        if (variant === 'warning') return 'secondary';
        return 'default';
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                            variant === 'destructive' ? 'bg-rose-100 dark:bg-rose-900/30' : 
                            variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' : 
                            'bg-indigo-100 dark:bg-indigo-900/30'
                        }`}>
                            {getIcon()}
                        </div>
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <Label htmlFor="reason" className="text-xs uppercase tracking-wider font-bold text-slate-500">
                        Reason Details
                    </Label>
                    <Textarea
                        id="reason"
                        placeholder={placeholder}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-[100px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 focus:ring-indigo-500/20"
                        autoFocus
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button 
                        variant={getButtonVariant()} 
                        onClick={handleConfirm} 
                        disabled={loading || !reason.trim()}
                        className={`min-w-[120px] ${variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : ''}`}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
