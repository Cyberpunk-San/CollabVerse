import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},

	timeout: 30000, // 30 seconds timeout
});


export interface ApiError {
	detail: string;
	status_code?: number;
	retry_after?: number;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	size: number;
	pages: number;
}


apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		// Get auth data from localStorage
		const token = localStorage.getItem('token');
		const studentId = localStorage.getItem('studentId');

		// Add Authorization header if token exists
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		// Add X-Student-ID header if studentId exists (required for many endpoints)
		if (studentId) {
			config.headers['X-Student-ID'] = studentId;
		}

		// Log requests in development
		if (import.meta.env.DEV) {
			console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
				params: config.params,
				data: config.data,
				headers: config.headers
			});
		}

		return config;
	},
	(error: AxiosError) => {
		return Promise.reject(error);
	}
);


apiClient.interceptors.response.use(
	(response) => {
		// Log responses in development
		if (import.meta.env.DEV) {
			console.log(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
				status: response.status,
				data: response.data
			});
		}
		return response;
	},
	(error: AxiosError<ApiError>) => {
		// Handle specific error statuses
		if (error.response) {
			const status = error.response.status;
			const data = error.response.data;

			// Log errors in development
			if (import.meta.env.DEV) {
				console.error(`❌ [API] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
					status,
					data,
					message: error.message
				});
			}

			// Handle 401 Unauthorized
			if (status === 401) {
				// Clear auth data
				localStorage.removeItem('token');
				localStorage.removeItem('studentId');
				localStorage.removeItem('user');

				// Redirect to login if not already there
				if (!window.location.pathname.includes('/login')) {
					window.location.href = '/login';
				}
			}

			// Handle 403 Forbidden
			if (status === 403) {
				console.error('Access forbidden');
			}

			// Handle 404 Not Found
			if (status === 404) {
				console.error('Resource not found');
			}

			// Handle 429 Too Many Requests
			if (status === 429) {
				const retryAfter = error.response.headers['retry-after'];
				if (retryAfter) {
					data.retry_after = parseInt(retryAfter);
				}
				console.error('Rate limit exceeded. Please wait before making more requests.');
			}

			// Handle 500 Internal Server Error
			if (status >= 500) {
				console.error('Server error. Please try again later.');
			}
		} else if (error.request) {
			// Request was made but no response received
			console.error('No response received from server. Please check your connection.');
		} else {
			// Something happened in setting up the request
			console.error('Error setting up request:', error.message);
		}

		return Promise.reject(error);
	}
);


/**
 * Set authentication token
 * @param token - JWT token
 */
export const setAuthToken = (token: string | null) => {
	if (token) {
		localStorage.setItem('token', token);
		apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
	} else {
		localStorage.removeItem('token');
		delete apiClient.defaults.headers.common['Authorization'];
	}
};

/**
 * Set student ID header
 * @param studentId - Student UUID
 */
export const setStudentId = (studentId: string | null) => {
	if (studentId) {
		localStorage.setItem('studentId', studentId);
		apiClient.defaults.headers.common['X-Student-ID'] = studentId;
	} else {
		localStorage.removeItem('studentId');
		delete apiClient.defaults.headers.common['X-Student-ID'];
	}
};

/**
 * Clear all auth data
 */
export const clearAuth = () => {
	localStorage.removeItem('token');
	localStorage.removeItem('studentId');
	localStorage.removeItem('user');
	delete apiClient.defaults.headers.common['Authorization'];
	delete apiClient.defaults.headers.common['X-Student-ID'];
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
	return !!localStorage.getItem('token') && !!localStorage.getItem('studentId');
};

/**
 * Create form data from object
 * @param data - Object to convert to FormData
 */
export const createFormData = (data: Record<string, any>): FormData => {
	const formData = new FormData();

	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			if (value instanceof File) {
				formData.append(key, value);
			} else if (Array.isArray(value) || typeof value === 'object') {
				formData.append(key, JSON.stringify(value));
			} else {
				formData.append(key, String(value));
			}
		}
	});

	return formData;
};

/**
 * Build URL with query parameters
 * @param url - Base URL
 * @param params - Query parameters
 */
export const buildUrl = (url: string, params?: Record<string, any>): string => {
	if (!params) return url;

	const queryParams = new URLSearchParams();

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			queryParams.append(key, String(value));
		}
	});

	const queryString = queryParams.toString();
	return queryString ? `${url}?${queryString}` : url;
};

/**
 * Handle API error and return user-friendly message
 * @param error - Axios error
 */
export const handleApiError = (error: unknown): string => {
	if (axios.isAxiosError(error)) {
		const apiError = error.response?.data as ApiError;

		// Return server error message if available
		if (apiError?.detail) {
			return apiError.detail;
		}

		// Handle specific status codes
		switch (error.response?.status) {
			case 400:
				return 'Invalid request. Please check your input.';
			case 401:
				return 'Your session has expired. Please log in again.';
			case 403:
				return 'You do not have permission to perform this action.';
			case 404:
				return 'The requested resource was not found.';
			case 409:
				return 'This action conflicts with existing data.';
			case 422:
				return 'Validation error. Please check your input.';
			case 429:
				return 'Too many requests. Please wait a moment and try again.';
			case 500:
			case 502:
			case 503:
				return 'Server error. Please try again later.';
			default:
				return error.message || 'An unexpected error occurred.';
		}
	}

	return 'An unexpected error occurred.';
};


// Students API
export * from './students';

// Profile API
export * from './profile';

// Groups API
export * from './group';

// Chat API
export * from './chat';

// Teams API
export * from './team';

// Requests API
export * from './requests';

// Repos API
export * from './repos';

// WebSocket
export * from './websocket';

// ML API
export * from './ml';


export default {
	client: apiClient,
	setAuthToken,
	setStudentId,
	clearAuth,
	isAuthenticated,
	createFormData,
	buildUrl,
	handleApiError,
};