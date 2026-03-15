import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Bell, CheckCircle, Info, AlertTriangle, AlertCircle, Clock, Inbox, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    is_read: boolean;
    is_completed?: boolean;
    action_url: string | null;
    action_data: string | null;
    created_at: string;
}

const FacultyNotifications = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const navigate = useNavigate();

    const fetchNotifications = async (pageNum = 1, append = false) => {
        try {
            const response = await api.get(`/faculty/notifications?page=${pageNum}&per_page=50`);
            const data = response.data;
            if (Array.isArray(data)) {
                setNotifications(data);
                setHasMore(false);
            } else {
                if (append) {
                    setNotifications(prev => [...prev, ...data.notifications]);
                } else {
                    setNotifications(data.notifications);
                }
                setHasMore(data.has_next || false);
                setPage(data.page || 1);
            }
        } catch (error) {
            console.error("Error fetching notifications", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        markAllRead(); // Clearing badges on entry
        const interval = setInterval(() => fetchNotifications(), 30000);
        return () => clearInterval(interval);
    }, []);

    const markAllRead = async () => {
        try {
            await api.post('/faculty/notifications/read-all');
            window.dispatchEvent(new Event('notificationsRead'));
            fetchNotifications();
        } catch (error) {
            console.error("Error marking all read", error);
        }
    };

    const handleNotificationClick = async (n: NotificationItem) => {
        if (!n.is_read) {
            try {
                await api.post('/faculty/notifications/read-all');
                setNotifications(prev =>
                    prev.map(item => item.id === n.id ? { ...item, is_read: true } : item)
                );
            } catch (_) { /* ignore */ }
        }

        if (n.action_url) {
            let targetUrl = n.action_url;
            if (n.action_data) {
                try {
                    const data = JSON.parse(n.action_data);
                    const params = new URLSearchParams();
                    Object.entries(data).forEach(([key, value]) => {
                        params.set(key, String(value));
                    });

                    // Prevent appending `?` to `targetUrl` if it already contains one.
                    const hasQueryParams = targetUrl.includes('?');
                    targetUrl += `${hasQueryParams ? '&' : '?'}${params.toString()}`;
                } catch (_) { /* ignore bad JSON */ }
            }
            navigate(targetUrl);
        }
    };

    const getIcon = (type: string) => {
        const iconClass = "h-5 w-5";
        switch (type) {
            case 'success': return <CheckCircle className={`${iconClass} text-emerald-500`} />;
            case 'warning': return <AlertTriangle className={`${iconClass} text-amber-500`} />;
            case 'error': return <AlertCircle className={`${iconClass} text-rose-500`} />;
            default: return <Info className={`${iconClass} text-sky-500`} />;
        }
    };

    const getIconBg = (type: string) => {
        switch (type) {
            case 'success': return 'bg-emerald-100/80 dark:bg-emerald-900/30';
            case 'warning': return 'bg-amber-100/80 dark:bg-amber-900/30';
            case 'error': return 'bg-rose-100/80 dark:bg-rose-900/30';
            default: return 'bg-sky-100/80 dark:bg-sky-900/30';
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                        <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            Notifications
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Stay updated with your account and activity changes</p>
                    </div>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <Button variant="outline" size="sm" onClick={markAllRead}>
                        Mark all as read
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-slate-500 font-medium">Loading alerts...</p>
                </div>
            ) : notifications.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                            <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="font-semibold text-lg text-slate-500 dark:text-slate-400">No notifications yet</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">We'll notify you when there are updates</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n, index) => {
                        const isClickable = !!n.action_url && !n.is_completed;
                        return (
                            <Card
                                key={n.id}
                                className={`transition-all duration-300 ${!n.is_read ? 'border-l-4 border-l-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/5' : ''} ${n.is_completed ? 'opacity-70 border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-900/5' : ''} ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5' : ''}`}
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => isClickable && handleNotificationClick(n)}
                            >
                                <CardContent className="pt-4 flex gap-4">
                                    <div className={`mt-0.5 p-2 rounded-xl ${getIconBg(n.type)} shrink-0`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <h3 className={`font-bold truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {n.title}
                                            </h3>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {n.is_completed && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shrink-0">
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Done
                                                    </Badge>
                                                )}
                                                {!n.is_read && !n.is_completed && <Badge className="shrink-0">New</Badge>}
                                                {isClickable && (
                                                    <ArrowRight className="h-4 w-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                            {n.message}
                                        </p>
                                        <div className="mt-2.5 flex items-center justify-between">
                                            <div className="flex items-center text-[0.7rem] text-slate-400 dark:text-slate-500 gap-1.5 font-medium">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(n.created_at), 'PPPp')}
                                            </div>
                                            {isClickable && (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                    View <ArrowRight className="h-3 w-3" />
                                                </span>
                                            )}
                                            {n.is_completed && (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                    Completed ✓
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setLoadingMore(true);
                            fetchNotifications(page + 1, true);
                        }}
                        disabled={loadingMore}
                        className="bg-white/50 dark:bg-slate-900/50"
                    >
                        {loadingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Load More
                    </Button>
                </div>
            )}
        </div>
    );
};

export default FacultyNotifications;
