import { useState } from 'react';
import api from '@/services/api';
import { Loader2, Shield, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });

            if (response.data.success) {
                const user = response.data.user;
                if (!user) throw new Error("No user data returned");

                let targetPath = '/';
                if (user.role === 'admin') targetPath = '/admin/dashboard';
                else if (user.role === 'faculty') targetPath = '/faculty/dashboard';
                else if (user.role === 'student') targetPath = '/student/upload';

                window.location.href = targetPath;
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.error || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 animated-gradient-bg relative overflow-hidden">
            {/* Floating decorative elements */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

            <div className="w-full max-w-md animate-scale-in relative z-10">
                <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-slate-200/40 dark:border-slate-700/30 shadow-2xl">
                    <CardHeader className="space-y-4 text-center pb-2">
                        {/* Logo */}
                        <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-extrabold gradient-text-brand">
                                Welcome to CertifyX
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Enter your credentials to access your dashboard
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4 pt-4">
                            {error && (
                                <div className="p-3.5 text-sm text-rose-600 bg-rose-50/80 dark:bg-rose-900/20 rounded-xl border border-rose-200/60 dark:border-rose-800/40 flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-3">
                            <Button className="w-full h-11 text-base" type="submit" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                )}
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                            <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                                Secure authentication powered by CertifyX
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Login;
