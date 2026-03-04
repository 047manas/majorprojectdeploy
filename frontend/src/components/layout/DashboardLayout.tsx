import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        return stored === 'true';
    });

    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
        localStorage.setItem('sidebar-collapsed', String(!isSidebarCollapsed));
    };

    const toggleMobileMenu = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 bg-dot-pattern opacity-30 dark:opacity-10 pointer-events-none z-0" />

            {/* Radial gradient decoration */}
            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-100/40 via-transparent to-transparent dark:from-indigo-900/10 pointer-events-none z-0" />

            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleCollapse={toggleSidebar}
                isMobileOpen={isMobileOpen}
                onCloseMobile={() => setIsMobileOpen(false)}
            />

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 relative z-10",
                "md:pl-20",
                !isSidebarCollapsed && "md:pl-64"
            )}>
                <Header onToggleMobileMenu={toggleMobileMenu} />

                {/* Content Scrollable Area */}
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
