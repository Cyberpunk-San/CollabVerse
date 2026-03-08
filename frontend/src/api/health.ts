// frontend/src/api/health.ts
import { apiClient } from './index';

export interface HealthResponse {
    status: string;
    timestamp: string;
    database: string;
    solver: string;
    response_time_ms: number;
    environment: string;
    version?: string;
}

export const healthApi = {
    /**
     * Check system health
     */
    check: async () => {
        const response = await apiClient.get<HealthResponse>('/health');
        return response.data;
    },
};
