import { useState, useEffect, useCallback } from 'react';
import { syncQueueDB } from '../services/indexedDB';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    if (wasOffline) {
      setWasOffline(false);
      await processSyncQueue();
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}

async function processSyncQueue() {
  const pendingOps = await syncQueueDB.getPending();

  for (const op of pendingOps) {
    try {
      await syncQueueDB.updateStatus(op.id, 'completed');
    } catch (error) {
      console.error('Sync failed for operation:', op.id, error);
      await syncQueueDB.updateStatus(op.id, 'failed', error.message);
    }
  }
}

export function usePendingSyncCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const pending = await syncQueueDB.getPending();
      setCount(pending.length);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, []);

  return count;
}
