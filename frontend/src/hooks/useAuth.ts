import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/auth';
import { verifyApi } from '../api/verify';  // Import verify API
import { apiClient } from '../api';
import type {
  AuthUser,
  AuthState,
  AuthResponse
} from '../types/auth';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null
  });
  const [isGithubVerified, setIsGithubVerified] = useState<boolean>(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedVerified = localStorage.getItem('githubVerified') === 'true';

    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser) as AuthUser;
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        token: storedToken
      });
      setIsGithubVerified(storedVerified);

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authApi.login({ email, password });

      // Store auth data
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Initially not GitHub verified
      localStorage.setItem('githubVerified', 'false');
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
      setIsGithubVerified(false);

      return { success: true, user: response.user };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
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
      localStorage.setItem('githubVerified', 'false');  // Not verified yet
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
      setIsGithubVerified(false);

      return { success: true, user: response.user };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed'
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

        // You might want to refresh user data from server here
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
      localStorage.setItem('githubVerified', 'true');
      setIsGithubVerified(true);
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