import { useState } from 'react';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Award, GraduationCap, Building2, Calendar, FileCheck, ExternalLink, ClipboardCheck } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';

interface StudentProfile {
    full_name: string;
    institution_id: string;
    department: string | null;
    batch_year: string | null;
    email: string;
}

interface Activity {
    id: number;
    title: string;
    activity_type_name: string;
    weightage: number;
    start_date: string | null;
    issuer_name: string | null;
    status: string;
    verification_mode: string | null;
    certificate_url: string | null;
}

const TpoDashboard = () => {
    const [searchRoll, setSearchRoll] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [student, setStudent] = useState<StudentProfile | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [totalPoints, setTotalPoints] = useState<number>(0);
    const [gamificationCutoffs, setGamificationCutoffs] = useState<{ bronze: number, silver: number, gold: number, platinum: number } | undefined>(undefined);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchRoll.trim()) return;

        setLoading(true);
        setError(null);
        setStudent(null);
        setActivities([]);

        try {
            const response = await api.get(`/tpo/student/${searchRoll.trim()}`);
            setStudent(response.data.student);
            setActivities(response.data.activities);
            setTotalPoints(response.data.total_points);
            if (response.data.gamification) {
                setGamificationCutoffs(response.data.gamification);
            }
        } catch (err: any) {
            setError(err.error || "Failed to fetch student profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                    <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Central Activity Hub (TPO)</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Search and evaluate student comprehensive activity profiles.
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <Card className="border-indigo-100 dark:border-indigo-900/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-md">
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Student Roll Number / ID
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    placeholder="Enter Roll No (e.g. 21BCE...)"
                                    className="pl-10 h-12 text-lg shadow-sm"
                                    value={searchRoll}
                                    onChange={(e) => setSearchRoll(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Search Profile'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-400 font-medium text-center">
                    {error}
                </div>
            )}

            {student && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                    {/* Student Info Card */}
                    <Card className="lg:col-span-1 border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700 shadow-inner">
                                <span className="text-3xl font-extrabold text-slate-400">{student.full_name[0]?.toUpperCase()}</span>
                            </div>
                            <CardTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{student.full_name}</CardTitle>
                            <CardDescription className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-center gap-1.5 uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                {student.email}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="mt-4 space-y-4 divide-y divide-slate-100 dark:divide-slate-800/50">
                                <div className="pt-3 flex items-center justify-between">
                                    <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        <GraduationCap className="h-4 w-4" /> Roll No
                                    </dt>
                                    <dd className="font-bold text-slate-900 dark:text-white uppercase">{student.institution_id}</dd>
                                </div>
                                <div className="pt-3 flex items-center justify-between">
                                    <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        <Building2 className="h-4 w-4" /> Dept
                                    </dt>
                                    <dd className="font-bold text-slate-900 dark:text-white">{student.department || 'N/A'}</dd>
                                </div>
                                <div className="pt-3 flex items-center justify-between">
                                    <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        <Calendar className="h-4 w-4" /> Batch
                                    </dt>
                                    <dd className="font-bold text-slate-900 dark:text-white">{student.batch_year || 'N/A'}</dd>
                                </div>
                            </dl>

                            <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/50 shadow-inner overflow-hidden">
                                <div className="flex justify-between items-start w-full gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-1">Total Activity Score</span>
                                    <TierBadge points={totalPoints} size="sm" showLabel={true} cutoffs={gamificationCutoffs} />
                                </div>
                                <div className="flex flex-col items-center justify-center mt-2 mb-2">
                                    <span className="text-5xl font-black text-emerald-700 dark:text-emerald-500 tracking-tighter">{totalPoints}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Verified Activities Timeline/List */}
                    <Card className="lg:col-span-2 border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-indigo-500" />
                                Verified Portfolio Records
                            </CardTitle>
                            <CardDescription>
                                Only fully approved achievements that contribute to the total score.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-auto max-h-[600px]">
                            {activities.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                        <ClipboardCheck className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">No verified records</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">
                                        This student hasn't had any portfolio items approved yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {activities.map((act) => (
                                        <div key={act.id} className="p-4 sm:px-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{act.title}</h4>
                                                <span className="flex-shrink-0 inline-flex items-center justify-center px-2.5 py-1 rounded-full text-sm font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                    +{act.weightage} pts
                                                </span>
                                            </div>
                                            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                    {act.activity_type_name}
                                                </span>
                                                {act.issuer_name && <span>• {act.issuer_name}</span>}
                                                {act.start_date && <span>• {new Date(act.start_date).toLocaleDateString()}</span>}
                                            </div>
                                            {act.certificate_url && (
                                                <div className="mt-4">
                                                    <a
                                                        href={act.certificate_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded transition-colors"
                                                    >
                                                        View Authenticity Proof <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default TpoDashboard;
