// ============================================================
// Flash Fiado — useOfflineQueue Hook
// Sprint 4: Cola de operaciones offline
// ============================================================
import { useState, useEffect, useCallback } from 'react';

export interface OfflineOperation {
  id: string;
  type: 'addDebt' | 'addPayment';
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'flash_fiado_offline_queue';

function loadQueue(): OfflineOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineOperation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => loadQueue().length);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const enqueue = useCallback((op: Omit<OfflineOperation, 'id' | 'timestamp'>) => {
    const queue = loadQueue();
    const newOp: OfflineOperation = {
      ...op,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newOp);
    saveQueue(queue);
    setPendingCount(queue.length);
    return newOp.id;
  }, []);

  const dequeue = useCallback((id: string) => {
    const queue = loadQueue().filter((op) => op.id !== id);
    saveQueue(queue);
    setPendingCount(queue.length);
  }, []);

  const getQueue = useCallback(() => loadQueue(), []);

  const clearQueue = useCallback(() => {
    saveQueue([]);
    setPendingCount(0);
  }, []);

  return {
    isOnline,
    pendingCount,
    enqueue,
    dequeue,
    getQueue,
    clearQueue,
  };
}
