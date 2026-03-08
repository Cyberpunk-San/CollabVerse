// frontend/src/api/stats.ts
import { apiClient } from './index';

export interface SystemStats {
    users: {
        total: number;
        online: number;
        verified: number;
    };
    groups: {
        total: number;
        active: number;
        messages: number;
    };
    messages: {
        total: number;
        today: number;
        by_type: Record<string, number>;
    };
    teams: {
        total: number;
        formed: number;
        average_size: number;
    };
    performance: {
        average_response_time: number;
        uptime: number;
    };
}

export const statsApi = {
    /**
     * Get system-wide statistics
     */
    getSystemStats: async () => {
        const response = await apiClient.get<SystemStats>('/stats/system');
        return response.data;
    },

    /**
     * Get user statistics
     */
    getUserStats: async (userId: string) => {
        const response = await apiClient.get(`/stats/users/${userId}`);
        return response.data;
    },
};
