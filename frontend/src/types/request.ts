// Based on request.py schemas
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

export type ConnectionStatus = 
  | 'no_connection'
  | 'you_sent_pending'
  | 'you_sent_accepted'
  | 'you_sent_rejected'
  | 'they_sent_pending'
  | 'they_sent_accepted'
  | 'they_sent_rejected';

export interface ConnectionStatusResponse {
  other_student_id: string;
  other_username?: string | null;
  status: ConnectionStatus;
  request_id?: string | null;
  can_send_request: boolean;
}

export interface RequestSummary {
  sent: {
    all: RequestResponse[];
    pending: RequestResponse[];
    accepted: RequestResponse[];
    rejected: RequestResponse[];
    cancelled: RequestResponse[];
  };
  received: {
    pending: RequestResponse[];
    accepted?: RequestResponse[];
    rejected?: RequestResponse[];
  };
  connections: Connection[];
  total_connections: number;
  total_pending_received: number;
  total_pending_sent: number;
}