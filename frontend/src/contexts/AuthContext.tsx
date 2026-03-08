import React, { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthState, AuthUser } from '../types/auth';

interface AuthContextType extends AuthState {
    isGithubVerified: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
    register: (email: string, password: string, githubUsername: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
    logout: () => Promise<void>;
    requestGithubVerification: (githubUsername: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    checkGithubVerification: () => Promise<{ success: boolean; data?: any; error?: string }>;
    pollGithubVerification: (onVerified?: () => void, interval?: number, timeout?: number) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const auth = useAuth();

    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
