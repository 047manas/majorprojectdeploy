import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface RoleGuardProps {
    allowedRoles: ('admin' | 'faculty' | 'student')[];
    children: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
    const { user } = useAuth();

    if (!user || !allowedRoles.includes(user.role)) {
        return null; // Or return a "Forbidden" component
    }

    return <>{children}</>;
};

export default RoleGuard;
