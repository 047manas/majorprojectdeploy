import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/services/api';

interface User {
    id: number;
    full_name: string;
    email: string;
    role: 'admin' | 'faculty' | 'student';
    department?: string;
    institution_id?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: () => void; // Redirects to Flask login
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            if (response.data.success) {
                setUser(response.data.data);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
        
        // Fail-safe: Ensure loading is disabled after a timeout even if request hangs
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => clearTimeout(timeout);
    }, []);

    const login = () => {
        // Redirect to Login Page
        window.location.href = '/login';
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
            setUser(null);
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed", error);
            // Even if API fails, clear local state
            setUser(null);
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
