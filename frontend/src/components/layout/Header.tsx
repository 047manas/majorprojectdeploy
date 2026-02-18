import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Bell, LogOut, User as UserIcon, Moon, Sun, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
    onToggleMobileMenu?: () => void;
}

// Simple Breadcrumb logic based on path
const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <nav className="flex items-center text-sm text-slate-500">
            <span className="hover:text-slate-700">Home</span>
            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;
                return (
                    <React.Fragment key={to}>
                        <span className="mx-2">/</span>
                        <span className={cn("capitalize", isLast ? "text-indigo-600 font-medium" : "")}>
                            {value.replace('-', ' ')}
                        </span>
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = React.useState(false);
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [notifCount, setNotifCount] = React.useState(0);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Toggle dark mode (basic implementation, assumes 'dark' class on HTML)
    const toggleTheme = () => {
        const html = document.documentElement;
        if (isDark) {
            html.classList.remove('dark');
        } else {
            html.classList.add('dark');
        }
        setIsDark(!isDark);
    };

    // Fetch unread notifications for students
    React.useEffect(() => {
        const fetchNotifCount = async () => {
            if (user?.role !== 'student') return;
            try {
                const response = await api.get('/student/notifications');
                if (Array.isArray(response.data)) {
                    setNotifCount(response.data.filter((n: any) => !n.is_read).length);
                }
            } catch { /* Silent fail */ }
        };

        fetchNotifCount();
        const interval = setInterval(fetchNotifCount, 30000);
        return () => clearInterval(interval);
    }, [user?.role]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 w-full">
            {/* Left: Breadcrumbs/Logo */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleMobileMenu}
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden sm:block">
                    <Breadcrumbs />
                </div>
                <div className="sm:hidden font-bold text-indigo-600">
                    CertifyX
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Notifications Link for Students */}
                <button
                    onClick={() => user?.role === 'student' && navigate('/student/notifications')}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative group"
                >
                    <Bell size={20} />
                    {notifCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                    )}
                    {user?.role === 'student' && (
                        <div className="hidden group-hover:block absolute top-full right-0 mt-2 p-2 bg-white dark:bg-slate-800 shadow-lg rounded border border-slate-200 dark:border-slate-700 text-xs whitespace-nowrap z-50">
                            {notifCount > 0 ? `${notifCount} Unread Alerts` : 'View Notifications'}
                        </div>
                    )}
                </button>

                {/* User Profile */}
                <div className="border-l border-slate-200 dark:border-slate-700 pl-4 flex items-center space-x-3 relative" ref={dropdownRef}>
                    <div className="hidden md:block text-right">
                        <div className="text-sm font-medium text-slate-900 dark:text-white capitalize">{user?.full_name}</div>
                        <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 font-bold focus:outline-none hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all"
                        >
                            {user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon size={18} />}
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden transform origin-top-right animate-in fade-in zoom-in duration-200">
                                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 md:hidden">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.full_name}</p>
                                    <p className="text-xs text-slate-500 truncate">{user?.role}</p>
                                </div>
                                <button className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <UserIcon size={16} className="mr-2" /> Profile
                                </button>
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <LogOut size={16} className="mr-2" /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
