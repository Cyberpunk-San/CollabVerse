// API response and error types
export interface ApiErrorResponse {
  detail: string;
  status_code?: number;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedMetadata {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  metadata: PaginatedMetadata;
}

export interface ApiStatusResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface BulkOperationResponse {
  success: boolean;
  message: string;
  processed: number;
  succeeded: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}