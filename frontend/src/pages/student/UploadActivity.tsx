import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Upload, FileText } from 'lucide-react';
import DragDropUpload from '@/components/ui/DragDropUpload';
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
    const [campusType, setCampusType] = useState('off_campus');

    useEffect(() => {
        const fetchTypes = async () => {
            try {
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
        formData.append('campus_type', campusType);
        formData.append('file', file);
        if (user?.institution_id) formData.append('roll_number', user.institution_id);

        try {
            const response = await api.post('/student/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                alert("Upload Successful!");
                setTitle('');
                setFile(null);
                setIssuer('');
                window.location.href = '/student/portfolio';
            }
        } catch (error: any) {
            alert(error.response?.data?.error || "Upload failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto animate-fade-in">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                            <Upload className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle>Upload Activity Certificate</CardTitle>
                            <CardDescription className="mt-0.5">Submit your certificate for verification</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Campus Type Selector */}
                        <div className="flex items-center gap-6 p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                            <Label className="text-sm font-bold">Campus Type:</Label>
                            <label className="inline-flex items-center cursor-pointer gap-2">
                                <input
                                    type="radio"
                                    name="campus_type"
                                    value="off_campus"
                                    checked={campusType === 'off_campus'}
                                    onChange={() => setCampusType('off_campus')}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm font-medium">Off Campus</span>
                            </label>
                            <label className="inline-flex items-center cursor-pointer gap-2">
                                <input
                                    type="radio"
                                    name="campus_type"
                                    value="in_campus"
                                    checked={campusType === 'in_campus'}
                                    onChange={() => setCampusType('in_campus')}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm font-medium">In Campus</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-semibold">Activity Type</Label>
                                <select
                                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm px-3.5 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400 dark:focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
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
                                    <Label className="font-semibold">Custom Category Name</Label>
                                    <Input value={customCategory} onChange={e => setCustomCategory(e.target.value)} required />
                                </div>
                            )}

                            <div className="space-y-2 col-span-2">
                                <Label className="font-semibold">Activity Title</Label>
                                <Input placeholder="e.g. Winner in Hackathon" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold">Issued By (Organization)</Label>
                                <Input placeholder="e.g. Google, IEEE" value={issuer} onChange={e => setIssuer(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold">Start Date</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-semibold">Certificate File (PDF/Image)</Label>
                            <DragDropUpload
                                accept=".pdf,.png,.jpg,.jpeg"
                                file={file}
                                onFileChange={setFile}
                                label="Click to upload or drag & drop certificate"
                                hint="PDF, PNG, JPG up to 5MB"
                                required
                            />
                        </div>

                        <Button type="submit" disabled={submitting} className="w-full h-11">
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
