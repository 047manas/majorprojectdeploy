import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-6">
                    <Link to="/" className="inline-block">
                        <span className="font-bold text-2xl text-indigo-600">CertifyX</span>
                    </Link>
                    <p className="text-slate-500 text-sm mt-1">Certificate Verification Portal</p>
                </div>

                {error ? (
                    /* Error State */
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl text-red-500">✗</span>
                        </div>
                        <h2 className="text-xl font-bold text-red-600 mb-2">Verification Failed</h2>
                        <p className="text-slate-500">{error}</p>
                        <p className="text-slate-400 text-sm mt-4">
                            If you believe this is an error, please contact the institution.
                        </p>
                    </div>
                ) : data && (
                    /* Success State */
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
                        {/* Verified Header */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center text-white">
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                                <span className="text-3xl">✓</span>
                            </div>
                            <h2 className="text-xl font-bold">Certificate Verified</h2>
                            <p className="text-green-100 text-sm mt-1">This certificate has been securely verified by the institution.</p>
                        </div>

                        {/* Certificate Details */}
                        <div className="p-6 space-y-4">
                            <DetailRow label="Student Name" value={data.student_name} />
                            <DetailRow label="Institution ID" value={data.institution_id} />
                            <DetailRow label="Activity Title" value={data.title} />
                            <DetailRow label="Activity Type" value={data.activity_type} />
                            <DetailRow label="Activity Date" value={data.start_date ? new Date(data.start_date).toLocaleDateString() : 'N/A'} />
                            <DetailRow label="Verified By" value={data.verified_by} />
                        </div>

                        {/* Tamper-Proof Integrity */}
                        <div className="border-t border-slate-100 dark:border-slate-700 p-6">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                                🔐 Tamper-Proof Verification
                            </h4>
                            <p className="text-slate-400 text-sm mb-4">SHA-256 Digital Fingerprint</p>

                            {/* Hash Display */}
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-600 dark:text-slate-400 break-all mb-4">
                                {data.certificate_hash || 'No hash available'}
                            </div>

                            {/* Integrity Status */}
                            {data.hash_match === true && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                    <span className="text-green-600 text-xl">✓</span>
                                    <div>
                                        <strong className="text-green-700 dark:text-green-400">Untampered</strong>
                                        <div className="text-green-600 dark:text-green-500 text-sm">Hash verification successful</div>
                                    </div>
                                </div>
                            )}
                            {data.hash_match === false && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                        <span className="text-red-600 text-xl">⚠</span>
                                        <div>
                                            <strong className="text-red-700 dark:text-red-400">Possible Tampering Detected</strong>
                                            <div className="text-red-600 dark:text-red-500 text-sm">Hash mismatch — file may have been modified</div>
                                        </div>
                                    </div>
                                    {/* Hash Comparison */}
                                    <details className="text-sm">
                                        <summary className="cursor-pointer text-indigo-600 font-semibold">View comparison</summary>
                                        <div className="mt-3 space-y-2">
                                            <div>
                                                <strong className="text-slate-600 dark:text-slate-300">Expected Hash:</strong>
                                                <div className="font-mono text-xs break-all text-slate-500">{data.certificate_hash}</div>
                                            </div>
                                            <div>
                                                <strong className="text-slate-600 dark:text-slate-300">Actual Hash:</strong>
                                                <div className="font-mono text-xs break-all text-slate-500">{data.recomputed_hash}</div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            )}
                            {data.hash_match === null && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                    <span className="text-yellow-600 text-xl">?</span>
                                    <div>
                                        <strong className="text-yellow-700 dark:text-yellow-400">Cannot Verify File</strong>
                                        <div className="text-yellow-600 dark:text-yellow-500 text-sm">Original file not found for comparison</div>
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
    <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
        <span className="text-slate-500 text-sm">{label}</span>
        <span className="text-slate-800 dark:text-white font-medium text-sm">{value}</span>
    </div>
);

export default VerifyPublic;
