import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/auth';
import { verifyApi } from '../api/verify';  // Import verify API
import { apiClient } from '../api';
import type {
  AuthState
} from '../types/auth';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      return {
        user: JSON.parse(user),
        isAuthenticated: true,
        isLoading: false,
        token
      };
    }
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      token: null
    };
  });
  const [isGithubVerified, setIsGithubVerified] = useState<boolean>(() => {
    return localStorage.getItem('githubVerified') === 'true';
  });

  useEffect(() => {
    if (state.token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, [state.token]);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authApi.login({ email, password });

      // Store auth data
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Update verification status from server
      localStorage.setItem('githubVerified', String(response.user.githubVerified));
      localStorage.setItem('studentId', response.user.id);
      localStorage.setItem('email', response.user.email);
      localStorage.setItem('githubUsername', response.user.githubUsername);

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.access_token}`;

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        token: response.access_token
      });
      setIsGithubVerified(response.user.githubVerified);

      return { success: true, user: response.user };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      let errorMessage = 'Login failed';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => err.msg).join(', ');
        }
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, githubUsername: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authApi.register({
        email,
        password,
        github_username: githubUsername
      });

      // Store auth data
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('githubVerified', String(response.user.githubVerified));
      localStorage.setItem('studentId', response.user.id);
      localStorage.setItem('email', response.user.email);
      localStorage.setItem('githubUsername', response.user.githubUsername);

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.access_token}`;

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        token: response.access_token
      });
      setIsGithubVerified(response.user.githubVerified);

      return { success: true, user: response.user };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      let errorMessage = 'Registration failed';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle Pydantic validation errors
          errorMessage = error.response.data.detail.map((err: any) => err.msg).join(', ');
        }
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  // GitHub verification methods
  const requestGithubVerification = useCallback(async (githubUsername: string) => {
    if (!state.user) return { success: false, error: 'Not logged in' };

    try {
      const result = await verifyApi.requestVerification(state.user.id, githubUsername);
      return { success: true, data: result };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Verification request failed'
      };
    }
  }, [state.user]);

  const checkGithubVerification = useCallback(async () => {
    if (!state.user) return { success: false, error: 'Not logged in' };

    try {
      const result = await verifyApi.checkVerification(state.user.id);

      if (result.verified) {
        // Update verification status
        localStorage.setItem('githubVerified', 'true');
        setIsGithubVerified(true);

      }

      return { success: true, data: result };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Verification check failed'
      };
    }
  }, [state.user]);

  const pollGithubVerification = useCallback(async (
    onVerified?: () => void,
    interval: number = 5000,
    timeout: number = 300000
  ) => {
    if (!state.user) return;

    const result = await verifyApi.pollVerification(state.user.id, interval, timeout);

    if (result.verified) {
      console.log('✅ GitHub Verified! Updating state...');
      localStorage.setItem('githubVerified', 'true');
      setIsGithubVerified(true);
      
      // Also update user object in state
      if (state.user) {
        const updatedUser = { ...state.user, githubVerified: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setState(prev => ({ ...prev, user: updatedUser }));
      }
      
      onVerified?.();
    }

    return result;
  }, [state.user]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('studentId');
      localStorage.removeItem('email');
      localStorage.removeItem('githubUsername');
      localStorage.removeItem('githubVerified');

      delete apiClient.defaults.headers.common['Authorization'];

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null
      });
      setIsGithubVerified(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    
    try {
      const userData = await authApi.getMe();
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('githubVerified', String(userData.githubVerified));
      
      setState(prev => ({ ...prev, user: userData }));
      setIsGithubVerified(userData.githubVerified);
      console.log('🔄 Session synchronized with server:', userData.githubVerified);
    } catch (err) {
      console.error('Failed to sync session:', err);
      // If unauthorized, logout
      if ((err as any).response?.status === 401) {
        logout();
      }
    }
  }, [state.token, logout]);

  useEffect(() => {
    if (state.isAuthenticated && state.token) {
        refreshUser();
    }
  }, [state.isAuthenticated, state.token, refreshUser]);

  return {
    ...state,
    isGithubVerified,
    login,
    register,
    logout,
    requestGithubVerification,
    checkGithubVerification,
    pollGithubVerification,
  };
};