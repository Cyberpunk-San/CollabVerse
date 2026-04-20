import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import Loading from '../common/Loading';

interface PrivateRouteProps {
    children: React.ReactNode;
}

/**
 * A wrapper for routes that require authentication.
 * Redirects to the login page if the user is not authenticated.
 * Displays a loading state while authentication status is being determined.
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { isAuthenticated, isGithubVerified, isLoading } = useAuthContext();
    const location = useLocation();

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                backgroundColor: 'var(--bg-primary, #ffffff)',
                zIndex: 9999
            }}>
                <Loading />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login page, but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isGithubVerified && location.pathname !== '/verify') {
        // Redirect to verification page if not verified
        return <Navigate to="/verify" replace />;
    }

    return <>{children}</>;
};

export default PrivateRoute;
