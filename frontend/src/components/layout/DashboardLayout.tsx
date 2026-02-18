import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils'; // Ensure utils exists or fix imports

const DashboardLayout = () => {
    // Persistent Sidebar State (Desktop)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        return stored === 'true';
    });

    // Mobile Sidebar State
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
        localStorage.setItem('sidebar-collapsed', String(!isSidebarCollapsed));
    };

    const toggleMobileMenu = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
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
                "flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0",
                "md:pl-20", // Use padding to keep content inside the screen width
                !isSidebarCollapsed && "md:pl-64"
            )}>
                <Header onToggleMobileMenu={toggleMobileMenu} />

                {/* Content Scrollable Area */}
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
