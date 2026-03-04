import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import RoleGuard from '@/components/layout/RoleGuard';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AnalyticsDashboard from '@/pages/admin/AnalyticsDashboard';
import Login from '@/pages/Login';

import Users from '@/pages/admin/Users';
import Activities from '@/pages/admin/Activities';
import VerificationQueue from '@/pages/faculty/VerificationQueue';
import AttendanceUpload from '@/pages/faculty/AttendanceUpload';
import UploadActivity from '@/pages/student/UploadActivity';
import MyPortfolio from '@/pages/student/MyPortfolio';
import Notifications from '@/pages/student/Notifications';
import VerifyPublic from '@/pages/VerifyPublic';

// Redirect helper for root path
const IndexRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'faculty') return <Navigate to="/faculty/analytics" replace />; // Faculty usually lands on Analytics or Queue? 
    // Wait, faculty/dashboard route was mapped to Dashboard.
    // I'll map faculty/dashboard to AnalyticsDashboard for now as they track their students?
    // Or maybe I should create FacultyDashboard? 
    // For now, let's stick to AnalyticsDashboard for Faculty if they use it.

    if (user.role === 'student') return <Navigate to="/student/upload" replace />;

    return <Navigate to="/login" replace />;
};

function App() {
    // Apply persistent dark mode on initial load
    React.useEffect(() => {
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    return (
        <AuthProvider>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/verify/:token" element={<VerifyPublic />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    {/* Root Redirect */}
                    <Route path="/" element={<IndexRedirect />} />

                    <Route element={<DashboardLayout />}>

                        {/* Admin Routes */}
                        <Route path="/admin" element={
                            <RoleGuard allowedRoles={['admin']}>
                                <Navigate to="/admin/dashboard" replace />
                            </RoleGuard>
                        } />
                        <Route path="/admin/dashboard" element={
                            <RoleGuard allowedRoles={['admin']}>
                                <AdminDashboard />
                            </RoleGuard>
                        } />
                        <Route path="/admin/users" element={<RoleGuard allowedRoles={['admin']}><Users /></RoleGuard>} />
                        <Route path="/admin/analytics" element={<RoleGuard allowedRoles={['admin']}><AnalyticsDashboard /></RoleGuard>} />
                        <Route path="/admin/activities" element={<RoleGuard allowedRoles={['admin']}><Activities /></RoleGuard>} />

                        {/* Faculty Routes */}
                        <Route path="/faculty" element={
                            <RoleGuard allowedRoles={['faculty']}>
                                <Navigate to="/faculty/dashboard" replace />
                            </RoleGuard>
                        } />
                        <Route path="/faculty/dashboard" element={
                            <RoleGuard allowedRoles={['faculty']}>
                                <AnalyticsDashboard />
                            </RoleGuard>
                        } />
                        <Route path="/faculty/queue" element={<RoleGuard allowedRoles={['faculty']}><VerificationQueue /></RoleGuard>} />
                        <Route path="/faculty/attendance" element={<RoleGuard allowedRoles={['faculty']}><AttendanceUpload /></RoleGuard>} />
                        <Route path="/faculty/analytics" element={<RoleGuard allowedRoles={['faculty']}><AnalyticsDashboard /></RoleGuard>} />

                        {/* Student Routes */}
                        <Route path="/student" element={
                            <RoleGuard allowedRoles={['student']}>
                                <Navigate to="/student/upload" replace />
                            </RoleGuard>
                        } />
                        <Route path="/student/upload" element={<RoleGuard allowedRoles={['student']}><UploadActivity /></RoleGuard>} />
                        <Route path="/student/portfolio" element={<RoleGuard allowedRoles={['student']}><MyPortfolio /></RoleGuard>} />
                        <Route path="/student/notifications" element={<RoleGuard allowedRoles={['student']}><Notifications /></RoleGuard>} />

                    </Route>
                </Route>

                {/* Fallback */}
                {/* Redirect based on logic, but for now fallback to login if unknown */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </AuthProvider>
    );
}

export default App;
