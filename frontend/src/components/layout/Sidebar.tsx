import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { NavLink } from 'react-router-dom';
import api from '@/services/api';
import {
    LayoutDashboard,
    Users,
    FileText,
    BarChart2,
    Upload,
    BookOpen,
    CheckSquare,
    PanelLeftClose,
    PanelLeftOpen,
    Bell,
    X,
    Shield,
    Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkItem {
    name: string;
    icon: React.ElementType;
    path: string;
    badgeKey?: string;
}

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse, isMobileOpen, onCloseMobile }) => {
    const { user } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [notifCount, setNotifCount] = useState(0);

    const fetchPendingCount = useCallback(async () => {
        if (user?.role !== 'faculty') return;
        try {
            const response = await api.get('/faculty/pending-count');
            if (response.data && typeof response.data.count === 'number') {
                setPendingCount(response.data.count);
            }
        } catch {
            // Silently fail
        }
    }, [user?.role]);

    const fetchNotifCount = useCallback(async () => {
        if (user?.role !== 'student') return;
        try {
            const response = await api.get('/student/notifications');
            if (Array.isArray(response.data)) {
                setNotifCount(response.data.filter((n: any) => !n.is_read).length);
            }
        } catch {
            // Silently fail
        }
    }, [user?.role]);

    useEffect(() => {
        fetchPendingCount();
        fetchNotifCount();
        const interval = setInterval(() => {
            fetchPendingCount();
            fetchNotifCount();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchPendingCount, fetchNotifCount]);

    if (!user) return null;

    const getLinks = (role: string): NavLinkItem[] => {
        switch (role) {
            case 'admin':
                return [
                    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
                    { name: 'TPO View', icon: Award, path: '/admin/tpo' },
                    { name: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
                    { name: 'Users', icon: Users, path: '/admin/users' },
                    { name: 'Activities', icon: FileText, path: '/admin/activities' },
                ];
            case 'faculty':
                return [
                    { name: 'Dashboard', icon: LayoutDashboard, path: '/faculty/dashboard' },
                    { name: 'Verification Queue', icon: CheckSquare, path: '/faculty/queue', badgeKey: 'pending' },
                    { name: 'Upload Attendance', icon: Upload, path: '/faculty/attendance' },
                    { name: 'Analytics', icon: BarChart2, path: '/faculty/analytics' },
                ];
            case 'student':
                return [
                    { name: 'Upload Activity', icon: Upload, path: '/student/upload' },
                    { name: 'My Portfolio', icon: BookOpen, path: '/student/portfolio' },
                    { name: 'Notifications', icon: Bell, path: '/student/notifications', badgeKey: 'notifications' },
                ];
            default:
                return [];
        }
    };

    const links = getLinks(user.role);

    const getBadgeCount = (badgeKey?: string): number => {
        if (badgeKey === 'pending') return pendingCount;
        if (badgeKey === 'notifications') return notifCount;
        return 0;
    };

    return (
        <aside
            className={cn(
                "glass-strong border-r border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 ease-in-out flex flex-col fixed z-50 h-full overflow-visible",
                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
                isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full w-64",
                "md:translate-x-0 md:z-40",
                isCollapsed ? "md:w-20" : "md:w-64"
            )}
        >
            {/* Toggle Button (Desktop Only) */}
            <button
                onClick={toggleCollapse}
                className="hidden md:flex items-center justify-center absolute -right-3.5 top-8 -translate-y-1/2 h-7 w-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md shadow-sm hover:shadow hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 z-50 transition-all"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <PanelLeftOpen size={14} strokeWidth={2.5} /> : <PanelLeftClose size={14} strokeWidth={2.5} />}
            </button>

            {/* Brand */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 flex-shrink-0">
                        <Shield size={16} className="text-white" />
                    </div>
                    {(!isCollapsed || isMobileOpen) && (
                        <span className="font-extrabold text-xl gradient-text-brand tracking-tight">
                            CertifyX
                        </span>
                    )}
                </div>
                <button onClick={onCloseMobile} className="p-1 md:hidden text-slate-500 hover:text-slate-800 focus:outline-none">
                    <X size={20} />
                </button>
            </div>

            {/* Role indicator */}
            {(!isCollapsed || isMobileOpen) && (
                <div className="px-4 pt-4 pb-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        {user.role} Panel
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 space-y-1">
                {links.map((link) => {
                    const badgeCount = getBadgeCount(link.badgeKey);
                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={() => isMobileOpen && onCloseMobile?.()}
                            className={({ isActive }) => cn(
                                "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            {/* Active indicator bar */}
                            <NavLink
                                to={link.path}
                                className={({ isActive }) =>
                                    cn(
                                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300",
                                        isActive ? "h-6 bg-gradient-to-b from-indigo-500 to-violet-500" : "h-0"
                                    )
                                }
                                tabIndex={-1}
                                aria-hidden
                            >
                                {() => null}
                            </NavLink>

                            <link.icon size={20} className={cn("shrink-0", (isCollapsed && !isMobileOpen) ? "md:mx-auto" : "mr-3")} />
                            {(!isCollapsed || isMobileOpen) && <span className="font-medium text-sm">{link.name}</span>}

                            {/* Badge */}
                            {badgeCount > 0 && (
                                <span className={cn(
                                    "flex items-center justify-center text-white text-[0.6rem] font-bold rounded-full bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30",
                                    (isCollapsed && !isMobileOpen)
                                        ? "absolute -top-1 -right-1 h-5 w-5"
                                        : "ml-auto h-5 min-w-[20px] px-1.5"
                                )}>
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom user info */}
            {(!isCollapsed || isMobileOpen) && (
                <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold shadow-sm">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.full_name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
