import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UploadCloud, CheckCircle, AlertTriangle, Users, CalendarDays, Lock, Eye } from 'lucide-react';
import DragDropUpload from '@/components/ui/DragDropUpload';
import EventDetailsModal from './EventDetailsModal';

interface ActivityType {
    id: number;
    name: string;
    description: string;
    default_campus_type: string;
    faculty_incharge_name: string | null;
}

interface UploadSummary {
    created: number;
    not_found: string[];
    already_exists: string[];
}

interface ManagedEvent {
    title: string;
    start_date: string | null;
    total_students: number;
    uploaded_count: number;
    pending_count: number;
    is_owner?: boolean;
}

const AttendanceUpload = () => {
    const [types, setTypes] = useState<ActivityType[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [summary, setSummary] = useState<UploadSummary | null>(null);
    const [events, setEvents] = useState<ManagedEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);

    // Modal state
    const [selectedEvent, setSelectedEvent] = useState<ManagedEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [title, setTitle] = useState('');
    const [conductedBy, setConductedBy] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Derived: selected activity type object
    const selectedType = types.find(t => t.id.toString() === selectedTypeId);
    const isOther = selectedTypeId === 'other';
    const isTypeSelected = !!selectedTypeId && selectedTypeId !== '';

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const response = await api.get('/admin/activity-types');
                if (Array.isArray(response.data)) {
                    setTypes(response.data);
                }
            } catch (error) {
                console.error("Failed to load types", error);
            }
        };
        fetchTypes();
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setEventsLoading(true);
        try {
            const response = await api.get('/faculty/managed-events');
            if (Array.isArray(response.data)) {
                setEvents(response.data);
            }
        } catch (error) {
            console.error("Failed to load managed events", error);
        } finally {
            setEventsLoading(false);
        }
    };

    const handleTypeChange = (value: string) => {
        setSelectedTypeId(value);
        setSummary(null);

        // Auto-fill from admin-configured type
        if (value !== 'other' && value !== '') {
            const type = types.find(t => t.id.toString() === value);
            if (type) {
                setConductedBy(type.faculty_incharge_name || '');
                setTitle(type.name); // Auto-fill event title
            }
        } else {
            // "Other" — clear for manual entry
            setConductedBy('');
            setTitle('');
        }
    };

    const handleSubmit = async () => {
        if (!file) return alert("Please select a CSV file");
        if (!title) return alert("Event title is required");
        if (!startDate) return alert("Start date is required");
        if (!selectedTypeId) return alert("Please select an event type");

        setSubmitting(true);
        setSummary(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('activity_type_id', isOther ? '' : selectedTypeId);
        formData.append('conducted_by', conductedBy);
        formData.append('start_date', startDate);
        formData.append('end_date', endDate);
        formData.append('file', file);

        try {
            const response = await api.post('/faculty/upload-attendance', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                setSummary(response.data.summary);
                setTitle('');
                setFile(null);
                setConductedBy('');
                setStartDate('');
                setEndDate('');
                setSelectedTypeId('');
                fetchEvents();
            } else {
                alert(response.data.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            const msg = error?.response?.data?.error || error?.message || 'Upload failed. Check server connection.';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to get campus type label
    const getCampusLabel = () => {
        if (isOther) return null;
        if (selectedType) {
            return selectedType.default_campus_type === 'in_campus' ? 'In Campus' : 'Off Campus';
        }
        return null;
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            {/* Upload Form */}
            <Card className="border-indigo-100 dark:border-indigo-900/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-indigo-600" />
                        Upload In-Campus Attendance
                    </CardTitle>
                    <CardDescription>
                        Select an event type configured by admin, fill in the event details,
                        and upload a CSV with student roll numbers.
                        Students will be notified to upload their certificates.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Step 1: Select Event Type */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Select Event Type *</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950"
                                value={selectedTypeId}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                required
                            >
                                <option value="">Select Event Type...</option>
                                {types.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                                <option value="other">— Other (Not Listed) —</option>
                            </select>
                        </div>

                        {/* Show auto-filled info for admin-configured types */}
                        {isTypeSelected && selectedType && !isOther && (
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded-lg space-y-2">
                                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-sm font-semibold">
                                    <Lock className="h-4 w-4" />
                                    Auto-filled from Admin Configuration
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Category:</span>
                                        <span className="ml-2 font-medium text-slate-900 dark:text-white">{selectedType.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Campus Type:</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold ${selectedType.default_campus_type === 'in_campus'
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                            }`}>
                                            {getCampusLabel()}
                                        </span>
                                    </div>
                                    {selectedType.faculty_incharge_name && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500 dark:text-slate-400">Conducted By:</span>
                                            <span className="ml-2 font-medium text-slate-900 dark:text-white">{selectedType.faculty_incharge_name}</span>
                                        </div>
                                    )}
                                    {selectedType.description && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500 dark:text-slate-400">Description:</span>
                                            <span className="ml-2 text-slate-700 dark:text-slate-300">{selectedType.description}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Manual fields for "Other" */}
                        {isOther && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg space-y-4">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                                    <AlertTriangle className="h-4 w-4" />
                                    Manual Entry — This event type is not configured by admin
                                </div>
                                <div className="space-y-2">
                                    <Label>Conducted By</Label>
                                    <Input
                                        placeholder="e.g. CSE Department, External Org..."
                                        value={conductedBy}
                                        onChange={e => setConductedBy(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Event details — always editable */}
                        {isTypeSelected && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Event Title *</Label>
                                    <Input
                                        placeholder="e.g. Web Development Workshop"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        readOnly={!isOther && !!selectedType}
                                        className={!isOther && selectedType ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : ''}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Date *</Label>
                                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date</Label>
                                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    </div>
                                </div>

                                {/* CSV Upload */}
                                <div className="space-y-2">
                                    <Label>Attendance CSV File *</Label>
                                    <DragDropUpload
                                        accept=".csv"
                                        file={file}
                                        onFileChange={setFile}
                                        label="Click to upload or drag & drop CSV file"
                                        hint="CSV with column: roll_number, institution_id, or student_id"
                                        required
                                    />
                                </div>

                                <Button type="button" onClick={handleSubmit} disabled={submitting} className="w-full">
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Upload Attendance & Notify Students
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Results Summary */}
                    {summary && (
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-green-800 dark:text-green-400">
                                    {summary.created} student record(s) created & notified
                                </span>
                            </div>

                            {summary.not_found.length > 0 && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
                                            Roll numbers not found ({summary.not_found.length}):
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-700 dark:text-amber-500 pl-6">
                                        {summary.not_found.join(', ')}
                                    </p>
                                </div>
                            )}

                            {summary.already_exists.length > 0 && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg">
                                    <span className="text-xs text-blue-700 dark:text-blue-400">
                                        Already recorded ({summary.already_exists.length}): {summary.already_exists.join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Managed Events Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarDays className="h-5 w-5 text-indigo-600" />
                        Your In-Campus Events
                    </CardTitle>
                    <CardDescription>Track certificate upload status for events you manage.</CardDescription>
                </CardHeader>
                <CardContent>
                    {eventsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No in-campus events uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {events.map((event, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => { setSelectedEvent(event); setIsModalOpen(true); }}
                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
                                >
                                    <div>
                                        <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                            {event.title}
                                            <Eye className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No date'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="text-center">
                                            <div className="font-bold text-slate-900 dark:text-white">{event.total_students}</div>
                                            <div className="text-[0.65rem] text-slate-500 uppercase tracking-wider">Total</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-green-600">{event.uploaded_count}</div>
                                            <div className="text-[0.65rem] text-slate-500 uppercase tracking-wider">Uploaded</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`font-bold ${event.pending_count > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                {event.pending_count}
                                            </div>
                                            <div className="text-[0.65rem] text-slate-500 uppercase tracking-wider">Pending</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <EventDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                event={selectedEvent}
                onRosterChanged={fetchEvents}
            />
        </div>
    );
};

export default AttendanceUpload;
