// frontend/src/hooks/useWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { unifiedWsInstance } from '../api/websocket';
import type {
  ChatWebSocketReceiveMessage,
  GroupWebSocketReceiveMessage,
  AnyWebSocketMessage
} from '../types/websocket';

export type {
  ChatWebSocketReceiveMessage,
  GroupWebSocketReceiveMessage,
  AnyWebSocketMessage
};

interface UseWebSocketOptions<T> {
  onMessage?: (message: T) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export const useWebSocket = <T = AnyWebSocketMessage>(
  userId: string | null,
  options: UseWebSocketOptions<T> = {}
) => {
  const [isConnected, setIsConnected] = useState(unifiedWsInstance.isConnected());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      unifiedWsInstance.disconnect();
      return;
    }

    // Connect (it ignores if already connected)
    unifiedWsInstance.connect(userId);

    const unsubMessage = unifiedWsInstance.onMessage((msg) => {
      if (options.onMessage) {
        options.onMessage(msg as unknown as T);
      }
    });

    const unsubConnect = unifiedWsInstance.onConnect(() => {
      setIsConnected(true);
      setError(null);
      options.onConnected?.();
    });

    const unsubDisconnect = unifiedWsInstance.onDisconnect(() => {
      setIsConnected(false);
      options.onDisconnected?.();
    });

    const unsubError = unifiedWsInstance.onError((err) => {
      setError(err);
      options.onError?.(err);
    });

    return () => {
      unsubMessage();
      unsubConnect();
      unsubDisconnect();
      unsubError();
      // Notice we do not automatically disconnect, 
      // as the socket is shared across the app.
    };
  }, [userId, options]); // Make sure to include options if they are stable reference

  const send = useCallback((message: AnyWebSocketMessage) => {
    return unifiedWsInstance.send(message);
  }, []);

  return {
    isConnected,
    error,
    send,
    disconnect: () => unifiedWsInstance.disconnect(),
    reconnect: () => { if (userId) unifiedWsInstance.connect(userId); }
  };
};

// Specialized hooks for chat and group
export const useChatSocket = (
  userId: string | null,
  options: UseWebSocketOptions<ChatWebSocketReceiveMessage> = {}
) => {
  return useWebSocket<ChatWebSocketReceiveMessage>(userId, options);
};

export const useGroupSocket = (
  userId: string | null,
  options: UseWebSocketOptions<GroupWebSocketReceiveMessage> = {}
) => {
  return useWebSocket<GroupWebSocketReceiveMessage>(userId, options);
};