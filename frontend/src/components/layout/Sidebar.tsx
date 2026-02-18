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
    ChevronLeft,
    ChevronRight,
    Bell,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkItem {
    name: string;
    icon: React.ElementType;
    path: string;
    badgeKey?: string; // key to look up badge count
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

    // Fetch pending count for faculty
    const fetchPendingCount = useCallback(async () => {
        if (user?.role !== 'faculty') return;
        try {
            const response = await api.get('/faculty/');
            if (Array.isArray(response.data)) {
                setPendingCount(response.data.length);
            }
        } catch {
            // Silently fail
        }
    }, [user?.role]);

    // Fetch unread notifications for students
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
        // Auto-refresh every 30 seconds
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
                    { name: 'Analytics', icon: BarChart2, path: '/admin/analytics' },
                    { name: 'Users', icon: Users, path: '/admin/users' },
                    { name: 'Activities', icon: FileText, path: '/admin/activities' },
                ];
            case 'faculty':
                return [
                    { name: 'Dashboard', icon: LayoutDashboard, path: '/faculty/dashboard' },
                    { name: 'Verification Queue', icon: CheckSquare, path: '/faculty/queue', badgeKey: 'pending' },
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
                "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col fixed z-50 h-full",
                // Mobile behavior: slide from left
                isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full w-64",
                // Desktop behavior (>= 768px): fixed with collapse
                "md:translate-x-0 md:z-20",
                isCollapsed ? "md:w-20" : "md:w-64"
            )}
        >
            {/* Toggle Button (Desktop Only) */}
            <button
                onClick={toggleCollapse}
                className="hidden md:flex absolute -right-3 top-6 bg-indigo-600 text-white p-1 rounded-full shadow-md hover:bg-indigo-700 focus:outline-none z-10"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Brand */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
                <span className={cn("font-bold text-xl text-indigo-600", isCollapsed ? "md:text-2xl" : "")}>
                    {isCollapsed ? (isMobileOpen ? "CertifyX" : "CX") : "CertifyX"}
                </span>
                {/* Close button for mobile */}
                <button onClick={onCloseMobile} className="p-1 md:hidden text-slate-500 hover:text-slate-800 focus:outline-none">
                    <X size={20} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {links.map((link) => {
                    const badgeCount = getBadgeCount(link.badgeKey);
                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={() => isMobileOpen && onCloseMobile?.()}
                            className={({ isActive }) => cn(
                                "flex items-center px-3 py-2.5 rounded-lg transition-colors group relative",
                                isActive
                                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <link.icon size={20} className={cn("shrink-0", (isCollapsed && !isMobileOpen) ? "md:mx-auto" : "mr-3")} />
                            {(!isCollapsed || isMobileOpen) && <span className="font-medium">{link.name}</span>}

                            {/* Badge */}
                            {badgeCount > 0 && (
                                <span className={cn(
                                    "flex items-center justify-center text-white text-[0.65rem] font-bold rounded-full bg-red-500 animate-pulse",
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
        </aside>
    );
};

export default Sidebar;
