
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Bell, CheckCircle, Info, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
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
        switch (type) {
            case 'success': return <CheckCircle className="text-green-500" />;
            case 'warning': return <AlertTriangle className="text-amber-500" />;
            case 'error': return <AlertCircle className="text-red-500" />;
            default: return <Info className="text-blue-500" />;
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Bell className="h-6 w-6 text-indigo-600" />
                        Notifications
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Stay updated with your account and activity changes</p>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <Button variant="outline" size="sm" onClick={markAllRead}>
                        Mark all as read
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-slate-500">Loading alerts...</p>
                </div>
            ) : notifications.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Bell className="h-12 w-12 mb-4 opacity-20" />
                        <p>No notifications yet</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {notifications.map((n) => (
                        <Card key={n.id} className={`${!n.is_read ? 'border-l-4 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                            <CardContent className="pt-4 flex gap-4">
                                <div className="mt-1">{getIcon(n.type)}</div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`font-semibold ${!n.is_read ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-900 dark:text-slate-100'}`}>
                                            {n.title}
                                        </h3>
                                        {!n.is_read && <Badge className="bg-indigo-500 hover:bg-indigo-600">New</Badge>}
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        {n.message}
                                    </p>
                                    <div className="mt-2 flex items-center text-[0.7rem] text-slate-400 gap-1">
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
