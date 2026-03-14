import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { AuditTimeline } from '@/components/dashboard/AuditTimeline';
import { Loader2 } from 'lucide-react';
import api from '@/services/api';

interface Activity {
    id: number;
    title: string;
    issuer_name: string;
    organizer?: string;
    start_date: string;
    end_date?: string;
    activity_type_id?: number;
    custom_category?: string;
    activity_type_name?: string;
    audit_trail?: any[];
    is_attendance_uploaded?: boolean;
}

interface ActivityType {
    id: number;
    name: string;
}

interface ActivityEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: Activity | null;
    onSuccess: () => void;
}

const ActivityEditModal: React.FC<ActivityEditModalProps> = ({ isOpen, onClose, activity, onSuccess }) => {
    const [formData, setFormData] = useState<any>({
        title: '',
        issuer_name: '',
        organizer: '',
        activity_type_id: '',
        custom_category: '',
        start_date: '',
        end_date: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const response = await api.get('/admin/activities');
                if (Array.isArray(response.data)) {
                    setActivityTypes(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch activity types", error);
            }
        };
        fetchTypes();
    }, []);

    useEffect(() => {
        if (activity) {
            setFormData({
                title: activity.title || '',
                issuer_name: activity.issuer_name || '',
                organizer: activity.organizer || '',
                activity_type_id: activity.activity_type_id || '',
                custom_category: activity.custom_category || '',
                start_date: activity.start_date || '',
                end_date: activity.end_date || ''
            });
            setFile(null);
        }
    }, [activity, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activity) return;

        setLoading(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) data.append(key, formData[key]);
        });
        if (file) {
            data.append('certificate', file);
        }

        try {
            await api.put(`/student/activity/${activity.id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.error || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Activity</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Activity Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Workshop on Robotics"
                            className="h-11 rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                            required
                            disabled={activity?.is_attendance_uploaded}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="issuer_name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Issue By</Label>
                            <Input
                                id="issuer_name"
                                value={formData.issuer_name}
                                onChange={handleChange}
                                placeholder="e.g. Google, IEEE"
                                className="h-11 rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="activity_type_id" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Organizer Type</Label>
                            <select
                                id="activity_type_id"
                                className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900/50"
                                value={formData.activity_type_id}
                                onChange={handleChange}
                                disabled={activity?.is_attendance_uploaded}
                            >
                                <option value="">Select Category</option>
                                {activityTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Start Date</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className="h-11 rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                                required
                                disabled={activity?.is_attendance_uploaded}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">End Date</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={handleChange}
                                className="h-11 rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
                                disabled={activity?.is_attendance_uploaded}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="certificate" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Update Certificate</Label>
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                            <Input
                                id="certificate"
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="text-[0.65rem] text-slate-400 mt-2 italic flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                Leave blank to keep existing certificate file
                            </p>
                        </div>
                    </div>

                    {/* Timeline UI */}
                    {activity?.audit_trail && activity.audit_trail.length > 0 && (
                        <div className="mt-4 p-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900/50 dark:to-indigo-900/10 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                Activity Timeline
                            </h4>
                            <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                <AuditTimeline events={activity.audit_trail} />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-4 gap-3">
                        <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6 rounded-xl border-slate-200 hover:bg-slate-50">Cancel</Button>
                        <Button type="submit" disabled={loading} className="h-11 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 border-none transition-all hover:scale-[1.02] active:scale-[0.98]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ActivityEditModal;
