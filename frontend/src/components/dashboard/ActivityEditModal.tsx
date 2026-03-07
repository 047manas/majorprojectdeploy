import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { AuditTimeline } from '@/components/dashboard/AuditTimeline';
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
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={formData.title} onChange={handleChange} className="col-span-3" required />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="issuer_name" className="text-right">Issuer</Label>
                        <Input id="issuer_name" value={formData.issuer_name} onChange={handleChange} className="col-span-3" required />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="organizer" className="text-right">Organizer</Label>
                        <Input id="organizer" value={formData.organizer} onChange={handleChange} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="activity_type_id" className="text-right">Type</Label>
                        <select
                            id="activity_type_id"
                            className="col-span-3 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                            value={formData.activity_type_id}
                            onChange={handleChange}
                        >
                            <option value="">Select Activity Type</option>
                            {activityTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start_date" className="text-right">Start Date</Label>
                        <Input id="start_date" type="date" value={formData.start_date} onChange={handleChange} className="col-span-3" required />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end_date" className="text-right">End Date</Label>
                        <Input id="end_date" type="date" value={formData.end_date} onChange={handleChange} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="certificate" className="text-right">Certificate</Label>
                        <div className="col-span-3">
                            <Input id="certificate" type="file" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
                            <p className="text-[0.7rem] text-slate-500 mt-1">Leave blank to keep existing file</p>
                        </div>
                    </div>

                    {/* Timeline UI */}
                    {activity?.audit_trail && activity.audit_trail.length > 0 && (
                        <div className="col-span-4 mt-2 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Activity Timeline</h4>
                            <div className="max-h-[200px] overflow-y-auto pr-2">
                                <AuditTimeline events={activity.audit_trail} />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ActivityEditModal;
