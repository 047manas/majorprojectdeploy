import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, AlertTriangle, Lock, ExternalLink } from 'lucide-react';

interface VerificationData {
    student_name: string;
    institution_id: string;
    title: string;
    activity_type: string;
    start_date: string | null;
    status: string;
    verified_by: string;
    certificate_hash: string;
    hash_match: boolean | null;
    recomputed_hash: string | null;
}

const VerifyPublic = () => {
    const { token } = useParams<{ token: string }>();
    const [data, setData] = useState<VerificationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVerification = async () => {
            try {
                const response = await fetch(`/api/verify/${token}`);
                const json = await response.json();
                if (!response.ok) {
                    setError(json.error || 'Verification failed.');
                } else {
                    setData(json);
                }
            } catch {
                setError('Could not connect to verification server.');
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchVerification();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen animated-gradient-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen animated-gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
            {/* Floating decorative elements */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

            <div className="w-full max-w-lg relative z-10 animate-scale-in">
                {/* Header */}
                <div className="text-center mb-6">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
                            <Shield size={18} className="text-white" />
                        </div>
                        <span className="font-extrabold text-2xl gradient-text-brand">CertifyX</span>
                    </Link>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Certificate Verification Portal</p>
                </div>

                {error ? (
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/40 dark:border-slate-700/30 p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
                            <XCircle className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mb-2">Verification Failed</h2>
                        <p className="text-slate-500 dark:text-slate-400">{error}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-4">
                            If you believe this is an error, please contact the institution.
                        </p>
                    </div>
                ) : data && (
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/40 dark:border-slate-700/30 overflow-hidden">
                        {/* Verified Header */}
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-center text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent" />
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-lg relative z-10">
                                <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-xl font-extrabold relative z-10">Certificate Verified</h2>
                            <p className="text-emerald-100 text-sm mt-1 relative z-10">This certificate has been securely verified by the institution.</p>
                        </div>

                        {/* Certificate Details */}
                        <div className="p-6 space-y-0">
                            <DetailRow label="Student Name" value={data.student_name} />
                            <DetailRow label="Institution ID" value={data.institution_id} />
                            <DetailRow label="Activity Title" value={data.title} />
                            <DetailRow label="Activity Type" value={data.activity_type} />
                            <DetailRow label="Activity Date" value={data.start_date ? new Date(data.start_date).toLocaleDateString() : 'N/A'} />
                            <DetailRow label="Verified By" value={data.verified_by} />
                        </div>

                        {/* Tamper-Proof Integrity */}
                        <div className="border-t border-slate-100 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                                    <Lock className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">Tamper-Proof Verification</h4>
                                    <p className="text-slate-400 text-xs">SHA-256 Digital Fingerprint</p>
                                </div>
                            </div>

                            {/* Hash Display */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 break-all mb-4 border border-slate-200/60 dark:border-slate-700/40">
                                {data.certificate_hash || 'No hash available'}
                            </div>

                            {/* Integrity Status */}
                            {data.hash_match === true && (
                                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
                                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <strong className="text-emerald-700 dark:text-emerald-400 font-bold">Untampered</strong>
                                        <div className="text-emerald-600 dark:text-emerald-500 text-sm">Hash verification successful</div>
                                    </div>
                                </div>
                            )}
                            {data.hash_match === false && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40">
                                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
                                            <AlertTriangle className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <strong className="text-rose-700 dark:text-rose-400 font-bold">Possible Tampering Detected</strong>
                                            <div className="text-rose-600 dark:text-rose-500 text-sm">Hash mismatch — file may have been modified</div>
                                        </div>
                                    </div>
                                    <details className="text-sm">
                                        <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                                            <ExternalLink className="h-3.5 w-3.5" /> View comparison
                                        </summary>
                                        <div className="mt-3 space-y-2">
                                            <div>
                                                <strong className="text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Expected Hash:</strong>
                                                <div className="font-mono text-xs break-all text-slate-500 mt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">{data.certificate_hash}</div>
                                            </div>
                                            <div>
                                                <strong className="text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Actual Hash:</strong>
                                                <div className="font-mono text-xs break-all text-slate-500 mt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">{data.recomputed_hash}</div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            )}
                            {data.hash_match === null && (
                                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
                                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                                        <AlertTriangle className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <strong className="text-amber-700 dark:text-amber-400 font-bold">Cannot Verify File</strong>
                                        <div className="text-amber-600 dark:text-amber-500 text-sm">Original file not found for comparison</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-100/60 dark:border-slate-800/50 last:border-0">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{label}</span>
        <span className="text-slate-800 dark:text-white font-semibold text-sm">{value}</span>
    </div>
);

export default VerifyPublic;
