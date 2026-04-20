import { apiClient } from './index';

// Types based on request.py schemas
export interface RequestCreate {
  receiver_id: string;
  message?: string | null;
}

export interface RequestUpdate {
  status: 'accepted' | 'rejected';
}

export interface RequestResponse {
  id: string;
  sender_id: string;
  receiver_id: string;
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at?: string | null;
  sender_username?: string | null;
  sender_email?: string | null;
  receiver_username?: string | null;
  receiver_email?: string | null;
}

export interface Connection {
  student_id: string;
  github_username: string;
  email: string;
  skills: Record<string, number>;
  connected_since: string;
  direction: 'sent' | 'received';
}

export interface ConnectionStatusResponse {
  other_student_id: string;
  other_username?: string | null;
  status: 'no_connection' | 'you_sent_pending' | 'you_sent_accepted' | 'you_sent_rejected' | 
         'they_sent_pending' | 'they_sent_accepted' | 'they_sent_rejected';
  request_id?: string | null;
  can_send_request: boolean;
}

export const requestsApi = {
  /**
   * Send a connection request to another student
   * @param data - Request data with receiver_id and optional message
   */
  sendRequest: async (data: RequestCreate) => {
    const response = await apiClient.post<RequestResponse>('/requests/', data);
    return response.data;
  },

  getSentRequests: async (status?: string) => {
    const params: any = {};
    if (status) params.status = status;
    
    const response = await apiClient.get<RequestResponse[]>('/requests/sent', { params });
    return response.data;
  },

  getReceivedRequests: async (status: string = 'pending') => {
    const response = await apiClient.get<RequestResponse[]>('/requests/received', {
      params: { status }
    });
    return response.data;
  },

  getPendingRequests: async () => {
    return requestsApi.getReceivedRequests('pending');
  },

  respondToRequest: async (requestId: string, status: 'accepted' | 'rejected') => {
    const response = await apiClient.put<RequestResponse>(
      `/requests/${requestId}`,
      { status } as RequestUpdate
    );
    return response.data;
  },

  /**
   * Accept a request (convenience method)
   * @param requestId - ID of the request
   */
  acceptRequest: async (requestId: string) => {
    return requestsApi.respondToRequest(requestId, 'accepted');
  },

  /**
   * Reject a request (convenience method)
   * @param requestId - ID of the request
   */
  rejectRequest: async (requestId: string) => {
    return requestsApi.respondToRequest(requestId, 'rejected');
  },

  cancelRequest: async (requestId: string) => {
    const response = await apiClient.delete<{ message: string }>(`/requests/${requestId}`);
    return response.data;
  },

  getConnections: async () => {
    const response = await apiClient.get<Connection[]>('/requests/connections');
    return response.data;
  },

  /**
   * Check connection status with another student
   * @param otherStudentId - ID of the other student
   */
  checkConnectionStatus: async (otherStudentId: string) => {
    const response = await apiClient.get<ConnectionStatusResponse>(
      `/requests/check/${otherStudentId}`
    );
    return response.data;
  },

  /**
   * Get all requests (sent and received) grouped by status
   */
  getRequestSummary: async () => {
    const [sent, received, connections] = await Promise.all([
      requestsApi.getSentRequests(),
      requestsApi.getReceivedRequests('pending'),
      requestsApi.getConnections()
    ]);

    return {
      sent: {
        all: sent,
        pending: sent.filter(r => r.status === 'pending'),
        accepted: sent.filter(r => r.status === 'accepted'),
        rejected: sent.filter(r => r.status === 'rejected'),
        cancelled: sent.filter(r => r.status === 'cancelled')
      },
      received: {
        pending: received,
      },
      connections,
      total_connections: connections.length,
      total_pending_received: received.length,
      total_pending_sent: sent.filter(r => r.status === 'pending').length
    };
  },

  /**
   * Get connection count
   */
  getConnectionCount: async () => {
    const connections = await requestsApi.getConnections();
    return connections.length;
  },

  isConnected: async (otherStudentId: string): Promise<boolean> => {
    const status = await requestsApi.checkConnectionStatus(otherStudentId);
    return status.status === 'you_sent_accepted' || status.status === 'they_sent_accepted';
  }
};