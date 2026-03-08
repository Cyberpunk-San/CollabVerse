// frontend/src/types/auth.ts

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  github_username: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// Response types
export interface AuthUser {
  id: string;
  email: string;
  githubUsername: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}

// Error response
export interface AuthError {
  detail: string;
  status_code?: number;
}

// Token payload (what's inside the JWT)
export interface TokenPayload {
  sub: string;  // user id
  email: string;
  exp: number;  // expiration timestamp
  iat: number;  // issued at timestamp
}

// Auth state (for use in components)
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

// API response wrapper (if your API wraps responses)
export interface ApiResponse<T> {
  data: T;
  status: string;
  message?: string;
}