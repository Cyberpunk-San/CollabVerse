// frontend/src/api/websocket.ts
import { WS_EVENTS } from './constants';
import type { AnyWebSocketMessage } from '../types/websocket';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

type MessageHandler = (data: AnyWebSocketMessage) => void;

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;
  private heartbeatIntervalTimer?: number;
  private reconnectTimer?: number;
  private userId: string | null = null;
  private _connectionState: ConnectionState = 'disconnected';

  private messageHandlers = new Set<MessageHandler>();
  private connectionHandlers = new Set<() => void>();
  private disconnectHandlers = new Set<() => void>();
  private errorHandlers = new Set<(err: string) => void>();

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  connect(userId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.userId === userId) {
      return; // Already connected to this user
    }
    if (this.ws?.readyState === WebSocket.CONNECTING && this.userId === userId) {
      return; // Already connecting
    }

    // Close existing connection if user changed or if reconnecting a closed socket
    if (this.ws) {
      this.disconnect();
    }

    this.userId = userId;
    this.initiateConnection();
  }

  private initiateConnection() {
    if (!this.userId) return;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const wsBase = import.meta.env.VITE_WS_URL || `${protocol}//${host}${port}`;
      const wsUrl = `${wsBase}/ws/${this.userId}`;

      console.log(`Connecting to WebSocket: ${wsUrl}`);
      this._connectionState = 'connecting';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`WebSocket connected`);
        this._connectionState = 'connected';
        this.reconnectAttempt = 0;
        this.connectionHandlers.forEach(h => h());
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(h => h(data));
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = (event) => {
        const errorMsg = 'WebSocket connection error';
        console.error(errorMsg, event);
        this.errorHandlers.forEach(h => h(errorMsg));
      };

      this.ws.onclose = () => {
        console.log(`WebSocket disconnected`);
        if (this._connectionState !== 'reconnecting' && this._connectionState !== 'disconnected') {
          this._connectionState = 'disconnected';
        }
        this.disconnectHandlers.forEach(h => h());
        this.stopHeartbeat();
        this.reconnect();
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      this._connectionState = 'failed';
      this.errorHandlers.forEach(h => h('Failed to connect to WebSocket'));
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempt);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`);

      this.reconnectTimer = window.setTimeout(() => {
        this._connectionState = 'reconnecting';
        this.reconnectAttempt++;
        this.initiateConnection();
      }, delay);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatIntervalTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: WS_EVENTS.PING }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalTimer) {
      window.clearInterval(this.heartbeatIntervalTimer);
      this.heartbeatIntervalTimer = undefined;
    }
  }

  send(message: AnyWebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected');
    return false;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.stopHeartbeat();

    if (this.ws) {
      // Prevent reconnecting on explicit disconnect
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
      this.userId = null;
      this._connectionState = 'disconnected';
      this.disconnectHandlers.forEach(h => h());
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Subscriptions
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: () => void) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: () => void) {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: (err: string) => void) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }
}

export const unifiedWsInstance = new UnifiedWebSocket();