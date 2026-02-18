import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ActivityType {
    id: number;
    name: string;
}

const UploadActivity = () => {
    const { user } = useAuth();
    const [types, setTypes] = useState<ActivityType[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [typeId, setTypeId] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [issuer, setIssuer] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                // Fetch types from student dashboard endpoint or admin endpoint
                // Student dashboard '/' returns types_data
                const response = await api.get('/student/');
                if (response.data.activity_types) {
                    setTypes(response.data.activity_types);
                }
            } catch (error) {
                console.error("Failed to load types", error);
            }
        };
        fetchTypes();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return alert("Please select a file");

        setSubmitting(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('activity_type_id', typeId);
        if (typeId === 'other') formData.append('custom_category', customCategory);
        formData.append('issuer_name', issuer);
        formData.append('start_date', startDate);
        formData.append('end_date', endDate);
        formData.append('file', file);
        if (user?.institution_id) formData.append('roll_number', user.institution_id);

        try {
            const response = await api.post('/student/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                alert("Upload Successful!");
                // Reset form
                setTitle('');
                setFile(null);
                setIssuer('');
                // Redirect to portfolio?
                window.location.href = '/student/portfolio';
            }
        } catch (error: any) {
            alert(error.response?.data?.error || "Upload failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Upload Activity Certificate</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Activity Type</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                                    value={typeId}
                                    onChange={(e) => setTypeId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Category...</option>
                                    {types.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                    <option value="other">Other / Custom</option>
                                </select>
                            </div>

                            {typeId === 'other' && (
                                <div className="space-y-2">
                                    <Label>Custom Category Name</Label>
                                    <Input value={customCategory} onChange={e => setCustomCategory(e.target.value)} required />
                                </div>
                            )}

                            <div className="space-y-2 col-span-2">
                                <Label>Activity Title</Label>
                                <Input placeholder="e.g. Winner in Hackathon" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <Label>Issued By (Organization)</Label>
                                <Input placeholder="e.g. Google, IEEE" value={issuer} onChange={e => setIssuer(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Certificate File (PDF/Image)</Label>
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    required
                                />
                                <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                    {file ? file.name : "Click to upload or drag and drop"}
                                </span>
                                <span className="text-xs text-slate-500 mt-1">PDF, PNG, JPG up to 5MB</span>
                            </div>
                        </div>

                        <Button type="submit" disabled={submitting} className="w-full">
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Activity
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default UploadActivity;
