import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Bell, LogOut, User as UserIcon, Moon, Sun, Menu, ChevronRight } from 'lucide-react';

interface HeaderProps {
    onToggleMobileMenu?: () => void;
}

const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">Home</Link>
            {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;
                return (
                    <React.Fragment key={to}>
                        <ChevronRight className="mx-1.5 h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                        {isLast ? (
                            <span className="capitalize text-slate-900 dark:text-white font-semibold">
                                {value.replace('-', ' ')}
                            </span>
                        ) : (
                            <Link to={to} className="capitalize hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                {value.replace('-', ' ')}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = React.useState(() => {
        return document.documentElement.classList.contains('dark') ||
            localStorage.getItem('theme') === 'dark';
    });
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [notifCount, setNotifCount] = React.useState(0);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const toggleTheme = () => {
        const html = document.documentElement;
        if (isDark) {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        setIsDark(!isDark);
    };

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
        <header className="h-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between px-4 md:pr-6 md:pl-10 sticky top-0 z-30 w-full">
            {/* Left: Breadcrumbs/Logo */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleMobileMenu}
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden transition-colors"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden sm:block">
                    <Breadcrumbs />
                </div>
                <div className="sm:hidden font-extrabold text-lg gradient-text-brand">
                    CertifyX
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-1 md:space-x-2">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="relative p-2.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    <div className="relative w-5 h-5">
                        <Sun size={20} className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`} />
                        <Moon size={20} className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`} />
                    </div>
                </button>

                {/* Notifications Link for Students */}
                <button
                    onClick={() => user?.role === 'student' && navigate('/student/notifications')}
                    className="p-2.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all relative group"
                >
                    <Bell size={20} />
                    {notifCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-rose-500 to-pink-500"></span>
                        </span>
                    )}
                    {user?.role === 'student' && (
                        <div className="hidden group-hover:block absolute top-full right-0 mt-2 p-2.5 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-xs whitespace-nowrap z-50 animate-slide-down">
                            {notifCount > 0 ? `${notifCount} Unread Alerts` : 'View Notifications'}
                        </div>
                    )}
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* User Profile */}
                <div className="flex items-center space-x-3 relative" ref={dropdownRef}>
                    <div className="hidden md:block text-right">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{user?.full_name}</div>
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize tracking-wide">{user?.role}</div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm focus:outline-none ring-2 ring-transparent hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {user?.full_name ? user.full_name[0].toUpperCase() : <UserIcon size={18} />}
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-3 w-52 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden animate-scale-in">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 md:hidden">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.full_name}</p>
                                    <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
                                </div>
                                <button className="flex items-center w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                    <UserIcon size={16} className="mr-3 text-slate-400" /> Profile
                                </button>
                                <div className="mx-3 my-1 border-t border-slate-100 dark:border-slate-700/50" />
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                >
                                    <LogOut size={16} className="mr-3" /> Logout
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
