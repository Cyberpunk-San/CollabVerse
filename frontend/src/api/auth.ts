import { apiClient } from './index';
import type { 
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  AuthResponse,
  AuthUser,
  MessageResponse 
} from '../types/auth';

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Get current user data for session sync
   */
  getMe: async () => {
    const response = await apiClient.get<AuthUser>('/auth/me');
    return response.data;
  },

  /**
   * Login user
   */
  login: async (credentials: LoginRequest) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async () => {
    const response = await apiClient.post<MessageResponse>('/auth/logout');
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: ChangePasswordRequest) => {
    const response = await apiClient.post<MessageResponse>('/auth/change-password', data);
    return response.data;
  }
};