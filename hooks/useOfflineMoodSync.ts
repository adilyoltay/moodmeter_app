import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { useAuth } from '@/contexts/SupabaseAuthContext';
import moodOfflineQueue, {
  OfflineMoodItem,
  getBackoffDelay,
  peekAllDetailed,
} from '@/services/moodOfflineQueue';
import { eventBus, Events } from '@/services/eventBus';
import moodTracker from '@/services/moodTrackingService';

const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface OfflineMoodQueueViewItem extends OfflineMoodItem {
  nextBackoffMs: number | null;
  nextAttemptAt: string | null;
  isNew: boolean;
}

export interface UseOfflineMoodSyncOptions {
  enabled?: boolean;
  onSync?: () => void;
  onError?: (item: OfflineMoodItem, error: unknown) => void;
  onQueueChange?: (count: number, queue?: OfflineMoodQueueViewItem[]) => void;
}

export interface OfflineMoodSyncHandle {
  pendingCount: number;
  isSyncing: boolean;
  flushQueue: () => Promise<void>;
  refreshQueue: () => Promise<void>;
  retryItem: (itemId: string) => Promise<'SUCCESS' | 'QUEUED' | 'FAILED' | 'SKIPPED'>;
  deleteItem: (itemId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  items: OfflineMoodQueueViewItem[];
}

export const useOfflineMoodSync = (
  options: UseOfflineMoodSyncOptions = {}
): OfflineMoodSyncHandle => {
  const { enabled = true, onSync, onError, onQueueChange } = options;
  const { user } = useAuth();
  const netInfo = useNetInfo();
  const [pendingCount, setPendingCount] = useState(0);
  const [items, setItems] = useState<OfflineMoodQueueViewItem[]>([]);
  const flushingRef = useRef(false);
  const isMountedRef = useRef(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const instanceIdRef = useRef(`offline-sync-${Math.random().toString(36).slice(2, 10)}`);

  const updateCount = useCallback(
    async (userId?: string | null, { broadcast = true }: { broadcast?: boolean } = {}) => {
      const target = userId ?? user?.id;
      if (!target) {
        setPendingCount(0);
        setItems([]);
        onQueueChange?.(0, []);
        if (broadcast) {
          eventBus.emit(Events.OfflineQueueUpdated, {
            count: 0,
            items: [],
            origin: instanceIdRef.current,
            userId: target,
          });
        }
        return;
      }
      const queue = await peekAllDetailed(target);
      if (!isMountedRef.current) return;
      const enriched = queue.map<OfflineMoodQueueViewItem>((item) => {
        const delayMs = getBackoffDelay(Math.max(0, item.retries));
        const lastAttempt = item.lastAttemptAt ? new Date(item.lastAttemptAt).getTime() : null;
        const nextAttemptAt = lastAttempt != null ? new Date(lastAttempt + delayMs).toISOString() : null;
        const insertedTime = new Date(item.insertedAt).getTime();
        const isNew = Number.isFinite(insertedTime) ? (Date.now() - insertedTime) < 5 * 60 * 1000 : false;
        return {
          ...item,
          nextBackoffMs: Number.isFinite(delayMs) ? delayMs : null,
          nextAttemptAt,
          isNew,
        };
      });
      setPendingCount(enriched.length);
      setItems(enriched);
      onQueueChange?.(enriched.length, enriched);
      if (broadcast) {
        eventBus.emit(Events.OfflineQueueUpdated, {
          count: enriched.length,
          items: enriched,
          origin: instanceIdRef.current,
          userId: target,
        });
      }
    },
    [onQueueChange, user?.id]
  );

  useEffect(() => {
    isMountedRef.current = true;
    updateCount();
    return () => {
      isMountedRef.current = false;
    };
  }, [updateCount]);

  const flushQueue = useCallback(async () => {
    const userId = user?.id;
    if (!enabled || !userId || flushingRef.current) return;
    flushingRef.current = true;
    try {
      let queue = await peekAllDetailed(userId);
      setPendingCount(queue.length);
      setItems(queue);
      onQueueChange?.(queue.length, queue);
      eventBus.emit(Events.OfflineQueueUpdated, {
        count: queue.length,
        items: queue,
        origin: instanceIdRef.current,
        userId,
      });

      let syncedAny = false;

      while (queue.length && isMountedRef.current && netInfo.isConnected) {
        const item = queue[0];
        try {
          const saveResult = await moodTracker.saveMoodEntry(item.payload as any, { offlineItemId: item.id });

          if (saveResult.status === 'SUCCESS') {
            await moodOfflineQueue.remove(userId, item.id).catch(() => {});
            syncedAny = true;
          } else {
            const updated = await moodOfflineQueue.markRetry(userId, item.id, {
              errorMessage: 'Supabase returned queued_offline',
            });
            const retries = updated?.retries ?? item.retries + 1;
            const delay = getBackoffDelay(retries);
            await sleep(delay);
          }
        } catch (error) {
          const updated = await moodOfflineQueue.markRetry(userId, item.id, {
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          const retries = updated?.retries ?? item.retries + 1;
          if (retries >= MAX_RETRIES) {
            await moodOfflineQueue.remove(userId, item.id);
            onError?.(item, error);
          } else {
            const delay = getBackoffDelay(retries);
            await sleep(delay);
          }
        }

        queue = await peekAllDetailed(userId);
        setPendingCount(queue.length);
        setItems(queue);
        onQueueChange?.(queue.length, queue);
        eventBus.emit(Events.OfflineQueueUpdated, {
          count: queue.length,
          items: queue,
          origin: instanceIdRef.current,
          userId,
        });
      }

      if (syncedAny) {
        onSync?.();
      }
    } finally {
      flushingRef.current = false;
    }
  }, [enabled, netInfo.isConnected, onError, onQueueChange, onSync, user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appState.current = nextState;
      if (nextState === 'active' && netInfo.isConnected) {
        flushQueue().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [flushQueue, netInfo.isConnected]);

  useEffect(() => {
    if (!enabled) return;
    if (!user?.id) {
      setPendingCount(0);
      setItems([]);
      onQueueChange?.(0, []);
      eventBus.emit(Events.OfflineQueueUpdated, {
        count: 0,
        items: [],
        origin: instanceIdRef.current,
        userId: user?.id,
      });
      return;
    }

    if (netInfo.isConnected && appState.current === 'active') {
      flushQueue().catch(() => {});
    }
  }, [enabled, flushQueue, netInfo.isConnected, onQueueChange, user?.id]);

  const refreshQueue = useCallback(async () => {
    await updateCount();
  }, [updateCount]);

  const deleteItem = useCallback(
    async (itemId: string) => {
      const userId = user?.id;
      if (!userId) return;
      await moodOfflineQueue.remove(userId, itemId).catch(() => {});
      await updateCount(userId);
    },
    [updateCount, user?.id]
  );

  const clearQueue = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    await moodOfflineQueue.clearAllStrict(userId);
    await updateCount(userId);
  }, [updateCount, user?.id]);

  const retryItem = useCallback(
    async (itemId: string) => {
      const userId = user?.id;
      if (!userId) return 'SKIPPED';
      const queue = await peekAllDetailed(userId);
      const target = queue.find((item) => item.id === itemId);
      if (!target) {
        await updateCount(userId);
        return 'SKIPPED';
      }

      try {
        const result = await moodTracker.saveMoodEntry(target.payload as any, { offlineItemId: target.id });
        if (result.status === 'SUCCESS') {
          await moodOfflineQueue.remove(userId, target.id).catch(() => {});
          await updateCount(userId);
          onSync?.();
          return 'SUCCESS';
        }
        // still queued
        await updateCount(userId);
          return 'QUEUED';
      } catch (error) {
        await moodOfflineQueue.markRetry(userId, target.id, {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        onError?.(target, error);
        await updateCount(userId);
        return 'FAILED';
      }
    },
    [getBackoffDelay, onError, onSync, updateCount, user?.id]
  );

  useEffect(() => {
    const unsubscribe = eventBus.on(Events.OfflineQueueUpdated, (payload) => {
      if (!payload) return;
      if (payload.origin === instanceIdRef.current) return;
      if (payload.userId && payload.userId !== user?.id) return;
      updateCount(user?.id, { broadcast: false });
    });
    return () => {
      unsubscribe?.();
    };
  }, [updateCount, user?.id]);

  return {
    pendingCount,
    isSyncing: flushingRef.current,
    flushQueue,
    refreshQueue,
    retryItem,
    deleteItem,
    clearQueue,
    items,
  };
};

export default useOfflineMoodSync;
