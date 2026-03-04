
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Bell, CheckCircle, Info, AlertTriangle, AlertCircle, Clock, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    is_read: boolean;
    created_at: string;
}

const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/student/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error("Error fetching notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAllRead = async () => {
        try {
            await api.post('/student/notifications/read-all');
            fetchNotifications();
        } catch (error) {
            console.error("Error marking all read", error);
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
                    {notifications.map((n, index) => (
                        <Card
                            key={n.id}
                            className={`transition-all duration-300 ${!n.is_read ? 'border-l-4 border-l-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/5' : ''}`}
                            style={{ animationDelay: `${index * 50}ms` }}
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
                                        {!n.is_read && <Badge className="shrink-0">New</Badge>}
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        {n.message}
                                    </p>
                                    <div className="mt-2.5 flex items-center text-[0.7rem] text-slate-400 dark:text-slate-500 gap-1.5 font-medium">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(n.created_at), 'PPPp')}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
