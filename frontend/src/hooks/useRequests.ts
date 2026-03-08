// src/hooks/useRequests.ts
import { useState, useCallback } from 'react';
import { requestsApi } from '../api/requests';
import { useSnackbar } from 'notistack';

export const useRequests = () => {
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  const checkConnectionStatus = useCallback(async (otherStudentId: string) => {
    try {
      return await requestsApi.checkConnectionStatus(otherStudentId);
    } catch (error: unknown) {
      enqueueSnackbar('Failed to check connection status', { variant: 'error' });
      throw error;
    }
  }, [enqueueSnackbar]);

  const updatePendingCount = useCallback(async () => {
    try {
      const received = await requestsApi.getReceivedRequests('pending');
      setPendingCount(received.length);
    } catch (error: unknown) {
      console.error('Failed to update pending count:', error);
    }
  }, []);

  const sendRequest = useCallback(async (receiverId: string, message?: string) => {
    setLoading(true);
    try {
      const response = await requestsApi.sendRequest({
        receiver_id: receiverId,
        message,
      });
      enqueueSnackbar('Request sent successfully', { variant: 'success' });
      await updatePendingCount();
      return response;
    } catch (error: unknown) {
      let msg = 'Failed to send request';
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { detail?: string } } };
        msg = errObj.response?.data?.detail ?? msg;
      }
      enqueueSnackbar(msg, { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, updatePendingCount]);

  return {
    loading,
    pendingCount,
    checkConnectionStatus,
    sendRequest,
    updatePendingCount,
  };
};