import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/services/api';
import { DataTable } from '@/components/dashboard/DataTable';
import { toast } from 'sonner';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, ExternalLink, FileDown, Pencil, Trash2, Loader2, UploadCloud, BookOpen } from 'lucide-react';
import ActivityEditModal from '@/components/dashboard/ActivityEditModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';
import { TierBadge } from '@/components/ui/TierBadge';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Activity {
    id: number;
    title: string;
    issuer_name: string;
    start_date: string;
    end_date?: string;
    status: string;
    campus_type?: string;
    is_attendance_uploaded?: boolean;
    certificate_url: string | null;
    verification_token: string | null;
    verification_mode: string | null;
    activity_type_name: string;
    activity_type_id?: number;
    organizer?: string;
}

const getVerificationModeLabel = (mode: string | null): string | null => {
    if (!mode) return null;
    if (mode.includes('qr')) return 'via QR Code';
    if (mode === 'link_only') return 'via Certificate Link';
    return 'via Text Analysis';
};

const MyPortfolio = () => {
    const { user } = useAuth();
    const [data, setData] = useState<Activity[]>([]);
    const [totalPoints, setTotalPoints] = useState<number>(0);
    const [gamificationCutoffs, setGamificationCutoffs] = useState<{ bronze: number, silver: number, gold: number, platinum: number } | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [uploadingId, setUploadingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/student/portfolio');
            if (Array.isArray(response.data)) {
                setData(response.data);
                setTotalPoints(0);
            } else {
                setData(response.data.activities || []);
                setTotalPoints(response.data.total_points || 0);
                if (response.data.gamification) {
                    setGamificationCutoffs(response.data.gamification);
                }
            }
        } catch (error) {
            console.error("Failed to fetch portfolio", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        try {
            const verifiedActivities = data.filter(a => ['auto_verified', 'hod_approved'].includes(a.status));

            const doc = new jsPDF();

            // Header Background
            doc.setFillColor(79, 70, 229); // Indigo 600
            doc.rect(0, 0, 210, 45, 'F');

            // Header Text
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont("helvetica", "bold");
            doc.text('CertifyX', 14, 22);
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text('Official Verified e-Portfolio', 14, 32);

            // Determine Tier
            let tier = "Bronze";
            const platinum = gamificationCutoffs?.platinum || 250;
            const gold = gamificationCutoffs?.gold || 120;
            const silver = gamificationCutoffs?.silver || 50;

            if (totalPoints >= platinum) tier = "Platinum";
            else if (totalPoints >= gold) tier = "Gold";
            else if (totalPoints >= silver) tier = "Silver";

            // Tier & Points Badge in Header
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`Tier: ${tier}`, 150, 22);
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`Total Points: ${totalPoints}`, 150, 32);

            // Student Info Section
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('Student Information', 14, 58);

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`Name: ${user?.full_name || 'Student'}`, 14, 66);
            doc.text(`ID/Roll No: ${user?.institution_id || 'N/A'}`, 14, 73);
            doc.text(`Department: ${user?.department || 'N/A'}`, 14, 80);
            doc.text(`Email: ${user?.email || 'N/A'}`, 14, 87);

            // Generation Date
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            const now = new Date();
            doc.text(`Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 130, 87);

            // Description
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(10);
            doc.text('This document contains a cryptographically verified record of extracurricular activities.', 14, 98);

            // Generate Table
            const tableData = verifiedActivities.map(a => [
                a.title,
                a.activity_type_name,
                a.issuer_name || 'N/A',
                new Date(a.start_date).toLocaleDateString(),
                a.verification_token ? `Token: ${a.verification_token}` : 'Manual Verification'
            ]);

            autoTable(doc, {
                startY: 105,
                head: [['Activity Title', 'Category', 'Issuer', 'Date', 'Verification']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 5 },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 45, textColor: [79, 70, 229] } // Highlight verification text
                }
            });

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(9);
                doc.setTextColor(150);

                // Add a line above footer
                doc.setDrawColor(200, 200, 200);
                doc.line(14, doc.internal.pageSize.height - 15, 196, doc.internal.pageSize.height - 15);

                doc.text(
                    `Page ${i} of ${pageCount} — CertifyX Institutional e-Portfolio System`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 8,
                    { align: 'center' }
                );
            }

            doc.save(`Verified_Portfolio_${user?.institution_id || 'Student'}.pdf`);
        } catch (error) {
            console.error("Failed to download PDF", error);
            toast.error("Failed to generate PDF. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleEdit = (activity: Activity) => {
        setSelectedActivity(activity);
        setEditModalOpen(true);
    };

    const handleDelete = async (activity: Activity) => {
        if (!window.confirm(`Are you sure you want to delete '${activity.title}'? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/student/activity/${activity.id}`);
            toast.success(`Deleted ${activity.title}`);
            fetchData();
        } catch (error: any) {
            toast.error(error.error || "Deletion failed");
        }
    };

    const handleUploadForAttendance = async (activityId: number, file: File) => {
        setUploadingId(activityId);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/student/upload-for-attendance/${activityId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchData();
            }
        } catch (error: any) {
            toast.error(error.error || "Upload failed");
        } finally {
            setUploadingId(null);
        }
    };

    const columns = useMemo<ColumnDef<Activity>[]>(
        () => [
            {
                accessorKey: 'start_date',
                header: 'Date',
                cell: ({ row }) => row.getValue('start_date') ? new Date(row.getValue('start_date')).toLocaleDateString() : 'N/A'
            },
            {
                accessorKey: 'activity_type_name',
                header: 'Activity Type',
                cell: ({ row }) => (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100/80 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
                        {row.getValue('activity_type_name') as string}
                    </span>
                )
            },
            {
                accessorKey: 'title',
                header: 'Title',
                cell: ({ row }) => (
                    <span className="font-bold text-slate-900 dark:text-white">{row.getValue('title') as string}</span>
                )
            },
            {
                accessorKey: 'issuer_name',
                header: 'Issuer',
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const status = row.getValue('status') as string;
                    const mode = row.original.verification_mode;
                    let color = 'text-amber-700 bg-amber-100/80 dark:text-amber-400 dark:bg-amber-900/30';
                    let label = status.replace('_', ' ');

                    if (status === 'auto_verified') {
                        color = 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-400 dark:bg-emerald-900/30';
                        label = 'Auto Verified';
                    } else if (status === 'hod_approved' || status === 'faculty_verified') {
                        color = 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-400 dark:bg-emerald-900/30';
                        label = 'Verified';
                    } else if (status === 'rejected') {
                        color = 'text-rose-700 bg-rose-100/80 dark:text-rose-400 dark:bg-rose-900/30';
                        label = 'Rejected';
                    } else if (status === 'pending_upload') {
                        color = 'text-amber-700 bg-amber-100/80 dark:text-amber-400 dark:bg-amber-900/30';
                        label = 'Upload Required';
                    }

                    const modeLabel = getVerificationModeLabel(mode);

                    return (
                        <div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${color} capitalize`}>
                                {label}
                            </span>
                            {(status.includes('verified') || status === 'hod_approved') && modeLabel && (
                                <div className="text-[0.65rem] text-slate-400 mt-1 font-medium">{modeLabel}</div>
                            )}
                        </div>
                    );
                }
            },
            {
                accessorKey: 'campus_type',
                header: 'Campus',
                cell: ({ row }) => {
                    const ct = row.getValue('campus_type') as string;
                    if (ct === 'in_campus') {
                        return <span className="px-2.5 py-0.5 rounded-lg text-[0.65rem] font-bold bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">In Campus</span>;
                    }
                    return <span className="px-2.5 py-0.5 rounded-lg text-[0.65rem] font-bold bg-slate-100/80 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">Off Campus</span>;
                }
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1.5">
                        {row.original.status === 'pending_upload' ? (
                            <label className="relative cursor-pointer">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadForAttendance(row.original.id, f);
                                    }}
                                />
                                <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-sm"
                                    disabled={uploadingId === row.original.id}
                                >
                                    {uploadingId === row.original.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                        <UploadCloud className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Upload
                                </Button>
                            </label>
                        ) : (
                            <>
                                {row.original.certificate_url && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(row.original.certificate_url!, '_blank')}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Download className="h-3.5 w-3.5 text-sky-600" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>View Certificate</TooltipContent>
                                    </Tooltip>
                                )}

                                {row.original.verification_token && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(`/verify/${row.original.verification_token}`, '_blank')}
                                                className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Public Verification Link</TooltipContent>
                                    </Tooltip>
                                )}

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit(row.original)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Activity</TooltipContent>
                                </Tooltip>
                            </>
                        )}

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(row.original)}
                            title="Delete Activity"
                            className="h-8 w-8 p-0 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 hover:border-rose-200"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                        </Button>
                    </div>
                )
            }
        ],
        [fetchData]
    );

    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return data.slice(start, start + pagination.pageSize);
    }, [data, pagination]);

    const pageCount = Math.ceil(data.length / pagination.pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                        <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My Portfolio</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                            View all your recorded certificates and their verification status.
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleDownloadPDF}
                    disabled={pdfLoading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20"
                >
                    <FileDown className="h-4 w-4 mr-2" />
                    {pdfLoading ? 'Generating...' : 'Download Portfolio'}
                </Button>
            </div>

            {/* Score & Badge Hero */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="col-span-1 md:col-span-1 border-indigo-100 dark:border-indigo-900/40 bg-white/60 dark:bg-slate-900/40 relative overflow-hidden backdrop-blur-xl shrink-0 h-48">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <CardContent className="h-full flex flex-col justify-center items-center py-6">
                        <TierBadge points={totalPoints} size="lg" cutoffs={gamificationCutoffs} />
                        <div className="mt-4 text-center">
                            <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Verified Points</span>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white mt-1 leading-none">{totalPoints}</h2>
                        </div>
                    </CardContent>
                </Card>

                <div className="col-span-1 md:col-span-3">
                    <Card className="border-indigo-100 dark:border-indigo-900/40 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm h-full flex flex-col justify-between">
                        <CardContent className="pt-6 h-full flex items-center mb-0 pb-6">
                            <div className="w-full">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Gamification Status</h3>
                                <div className="space-y-4 w-full text-sm font-medium text-slate-600 dark:text-slate-400">
                                    <div className="flex justify-between w-full">
                                        <span>Bronze (0)</span>
                                        <span>Silver ({gamificationCutoffs?.silver || 50})</span>
                                        <span>Gold ({gamificationCutoffs?.gold || 120})</span>
                                        <span>Platinum ({gamificationCutoffs?.platinum || 250})</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((totalPoints / (gamificationCutoffs?.platinum || 250)) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={paginatedData}
                pageCount={pageCount}
                pagination={pagination}
                onPaginationChange={setPagination}
                sorting={sorting}
                onSortingChange={setSorting}
                loading={loading}
                options={{
                    manualPagination: true,
                    emptyState: {
                        icon: <BookOpen className="h-8 w-8 text-indigo-300 dark:text-indigo-600" />,
                        title: "No activities found",
                        description: "You haven't uploaded any certificates yet. Start building your verified portfolio today!",
                        action: (
                            <Button
                                onClick={() => window.location.href = '/student/upload'}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <UploadCloud className="h-4 w-4 mr-2" />
                                Upload Now
                            </Button>
                        )
                    }
                }}
            />

            <ActivityEditModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                activity={selectedActivity}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default MyPortfolio;
