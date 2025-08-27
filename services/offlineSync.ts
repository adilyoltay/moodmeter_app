
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeStorageKey } from '@/lib/queryClient';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from './api';
import supabaseService from '@/services/supabase';
import { unifiedConflictResolver, UnifiedDataConflict, EntityType } from './unifiedConflictResolver';
import deadLetterQueue from '@/services/sync/deadLetterQueue';
import { syncCircuitBreaker } from '@/utils/circuitBreaker';
import batchOptimizer from '@/services/sync/batchOptimizer';
import { isUUID } from '@/utils/validators';
import { generateSecureId } from '@/utils/idGenerator';

export interface SyncQueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'achievement' | 'mood_entry' | 'ai_profile' | 'treatment_plan' | 'voice_checkin' | 'user_profile';
  data: any;
  timestamp: number;
  retryCount: number;
  deviceId?: string;
  lastModified?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  isBulkOperation?: boolean;
  batchId?: string;
}

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private isOnline: boolean = true;
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing: boolean = false;
  
  // ✅ NEW: Performance metrics tracking
  private syncMetrics = {
    successRate: 0,
    avgResponseTime: 0,
    lastSyncTime: 0,
    totalSynced: 0,
    totalFailed: 0
  };

  // 🧹 MEMORY LEAK FIX: Store NetInfo listener for cleanup
  private netInfoUnsubscribe?: () => void;

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  constructor() {
    this.initializeNetworkListener();
    this.loadSyncQueue();
  }

  private initializeNetworkListener(): void {
    // 🧹 MEMORY LEAK FIX: Store unsubscribe function for cleanup
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        console.log('📡 Device came back online, starting comprehensive sync...');
        
        // Start processing the sync queue
        this.processSyncQueue();
        
        // ✅ NEW: Also trigger mood entry auto-recovery when coming back online
        this.triggerMoodAutoRecovery().catch(error => {
          console.warn('⚠️ Mood auto-recovery failed after coming online:', error);
        });
      }
    });
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      let currentUserId = await AsyncStorage.getItem('currentUserId');
      try {
        const { default: supabase } = await import('@/services/supabase');
        const uid = (supabase as any)?.getCurrentUserId?.() || null;
        if (uid && typeof uid === 'string') currentUserId = uid;
      } catch {}
      const queueKey = `syncQueue_${safeStorageKey(currentUserId as any)}`;
      const queueData = await AsyncStorage.getItem(queueKey);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      let currentUserId = await AsyncStorage.getItem('currentUserId');
      try {
        const { default: supabase } = await import('@/services/supabase');
        const uid = (supabase as any)?.getCurrentUserId?.() || null;
        if (uid && typeof uid === 'string') currentUserId = uid;
      } catch {}
      const queueKey = `syncQueue_${safeStorageKey(currentUserId as any)}`;
      await AsyncStorage.setItem(queueKey, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // ✅ NEW: Priority system helper methods
  private determinePriority(entity: SyncQueueItem['entity']): 'low' | 'normal' | 'high' | 'critical' {
    switch (entity) {
      case 'mood_entry': return 'high';        // Mood data is critical for user experience
      case 'user_profile': return 'high';      // Profile updates are important for personalization
      case 'voice_checkin': return 'normal';   // Voice data is important but not critical
      case 'ai_profile': return 'normal';      // AI profiles can be delayed
      case 'treatment_plan': return 'normal';  // Treatment plans are important but not urgent
      case 'achievement': return 'low';        // Achievements can wait
      default: return 'normal';
    }
  }

  private getPriorityWeight(priority?: 'low' | 'normal' | 'high' | 'critical'): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private sortQueueByPriority(items: SyncQueueItem[]): SyncQueueItem[] {
    return items.sort((a, b) => {
      const priorityDiff = this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      // Secondary sort by timestamp (oldest first)
      return a.timestamp - b.timestamp;
    });
  }

  // ✅ NEW: Performance metrics methods
  private updateMetrics(success: boolean, responseTime: number): void {
    this.syncMetrics.totalSynced += success ? 1 : 0;
    this.syncMetrics.totalFailed += success ? 0 : 1;
    
    const total = this.syncMetrics.totalSynced + this.syncMetrics.totalFailed;
    this.syncMetrics.successRate = total > 0 ? (this.syncMetrics.totalSynced / total) * 100 : 0;
    
    // Exponential moving average for response time
    if (success) {
      this.syncMetrics.avgResponseTime = this.syncMetrics.avgResponseTime === 0 
        ? responseTime 
        : (this.syncMetrics.avgResponseTime * 0.7) + (responseTime * 0.3);
    }
    
    this.syncMetrics.lastSyncTime = Date.now();
  }

  public getSyncMetrics(): typeof this.syncMetrics {
    return { ...this.syncMetrics };
  }

  private async resolveValidUserId(candidate?: string | null): Promise<string> {
    if (candidate && isUUID(candidate)) return candidate;
    try {
      const { default: svc } = await import('@/services/supabase');
      const uid = (svc as any)?.getCurrentUserId?.() || null;
      if (uid && isUUID(uid)) return uid;
    } catch {}
    throw new Error('No valid user id available');
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    // ✅ Enhanced validation using QueueValidator
    const { queueValidator } = await import('@/services/sync/queueValidator');
    
    // Create temporary item for validation
    const tempItem: SyncQueueItem = {
      ...item,
      id: `temp_${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Validate and sanitize the item
    const validation = queueValidator.validateItem(tempItem);
    
    if (!validation.isValid) {
      console.warn('🚫 Dropping invalid sync queue item:', {
        entity: item.entity,
        type: item.type,
        errors: validation.errors
      });
      
      try {
        const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
        await trackAIInteraction(AIEventType.SYSTEM_STATUS, {
          event: 'invalid_sync_item_dropped',
          entity: item.entity,
          type: item.type,
          errors: validation.errors
        });
      } catch (error) {
        console.log('Failed to track invalid item drop:', error);
      }
      return; // Drop the item
    }

    // Log warnings but continue processing
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Sync item validation warnings:', {
        entity: item.entity,
        warnings: validation.warnings
      });
    }

    // Sanitize the item to fix common issues
    const sanitizedTempItem = queueValidator.sanitizeItem(tempItem);

    // ✅ NEW: Determine priority for the item
    const priority = this.determinePriority(sanitizedTempItem.entity as SyncQueueItem['entity']);

    const syncItem: SyncQueueItem = {
      // 🔐 SECURITY FIX: Replace insecure Date.now() + Math.random() with crypto-secure UUID
      id: generateSecureId(),
      type: sanitizedTempItem.type,
      entity: sanitizedTempItem.entity as 'achievement' | 'mood_entry' | 'ai_profile' | 'treatment_plan' | 'voice_checkin' | 'user_profile',
      data: sanitizedTempItem.data,
      timestamp: Date.now(),
      retryCount: 0,
      deviceId: await AsyncStorage.getItem('device_id') || 'unknown_device',
      lastModified: Date.now(),
      priority: priority,
      isBulkOperation: (item as any).isBulkOperation || false,
      batchId: (item as any).batchId
    };

    this.syncQueue.push(syncItem);
    await this.saveSyncQueue();

    // 📊 Telemetry: queued for offline delete
    try {
      if (syncItem.type === 'DELETE') {
        const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
        await trackAIInteraction(AIEventType.DELETE_QUEUED_OFFLINE, {
          entity: syncItem.entity,
          id: syncItem.data?.id,
          userId: syncItem.data?.user_id || syncItem.data?.userId
        }, syncItem.data?.user_id || syncItem.data?.userId);
      }
    } catch {}

    // If online, try to sync immediately
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      const summary = { successful: 0, failed: 0, conflicts: 0 } as const;
      // ✅ NEW: Sort queue by priority before processing
      const itemsToSync = this.sortQueueByPriority([...this.syncQueue]);
      const batchSize = batchOptimizer.calculate(itemsToSync.length);
      const startBatchAt = Date.now();

      console.log(`🔄 Processing sync queue: ${itemsToSync.length} items (Priorities: ${itemsToSync.slice(0, 5).map(i => i.priority).join(', ')}${itemsToSync.length > 5 ? '...' : ''})`);

      const successful: SyncQueueItem[] = [];
      const failed: SyncQueueItem[] = [];
      const latencies: number[] = [];

      // Small concurrency limiter (2) with per-user ordering
      const concurrency = 2;
      const inflightUsers = new Set<string>();
      const consumed = new Set<string>();

      const deriveUserId = (it: SyncQueueItem): string | null => {
        try {
          return it?.data?.user_id || it?.data?.userId || null;
        } catch { return null; }
      };

      const pickCandidate = (): SyncQueueItem | undefined => {
        for (let i = 0; i < itemsToSync.length; i++) {
          const cand = itemsToSync[i];
          if (consumed.has(cand.id)) continue;
          const uid = deriveUserId(cand);
          if (uid && inflightUsers.has(uid)) continue;
          return cand;
        }
        return undefined;
      };

      const runWorker = async (): Promise<void> => {
        while (true) {
          const current = pickCandidate();
          if (!current) break;
          const uid = deriveUserId(current);
          if (uid) inflightUsers.add(uid);
          consumed.add(current.id);
          const startedAt = Date.now();
          try {
            await syncCircuitBreaker.execute(() => this.syncItem(current));
            const latencyMs = Date.now() - startedAt;
            successful.push(current);
            latencies.push(latencyMs);
            // ✅ NEW: Update performance metrics
            this.updateMetrics(true, latencyMs);
            // Remove from queue if successful
            this.syncQueue = this.syncQueue.filter(q => q.id !== current.id);
            // Telemetry (non-blocking)
            try {
              const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
              await trackAIInteraction(AIEventType.CACHE_INVALIDATION, { scope: 'sync_item_succeeded', entity: current.entity, latencyMs });
            } catch {}
          } catch (error) {
            // ✅ NEW: Update performance metrics for failed sync
            this.updateMetrics(false, Date.now() - startedAt);
            // Increment retry count and backoff per-item
            const queueItem = this.syncQueue.find(q => q.id === current.id);
            if (queueItem) {
              queueItem.retryCount = (queueItem.retryCount || 0) + 1;
              failed.push(queueItem);
              const attempt = queueItem.retryCount;
              const base = 2000;
              const delay = Math.min(base * Math.pow(2, attempt), 60000) + Math.floor(Math.random() * 500);
              await new Promise(res => setTimeout(res, delay));
              if (attempt >= 8) {
                this.syncQueue = this.syncQueue.filter(q => q.id !== queueItem.id);
                await this.handleFailedSync(queueItem);
              }
            }
          } finally {
            if (uid) inflightUsers.delete(uid);
          }
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, itemsToSync.length) }, () => runWorker());
      await Promise.all(workers);

      await this.saveSyncQueue();
      batchOptimizer.record(batchSize, failed.length === 0, Date.now() - startBatchAt);

      // Emit cache invalidation for only successfully synced entities
      if (successful.length > 0) {
        try {
          const { emitSyncCompleted } = await import('@/hooks/useCacheInvalidation');
          const syncedEntities = Array.from(new Set(successful.map(item => item.entity)));
          const firstSuccessfulUserId = successful[0]?.data?.user_id || successful[0]?.data?.userId;
          emitSyncCompleted(syncedEntities, firstSuccessfulUserId);
          if (__DEV__) console.log('🔄 Cache invalidation triggered for:', syncedEntities);
        } catch (error) {
          if (__DEV__) console.warn('⚠️ Failed to emit cache invalidation:', error);
        }
      }

      // Persist summary + telemetry
      try {
        const attempted = itemsToSync.length;
        const succeeded = successful.length;
        const failedCount = failed.length;
        await AsyncStorage.setItem('last_sync_summary', JSON.stringify({ attempted, succeeded, failed: failedCount, at: new Date().toISOString() }));
        try {
          const { default: performanceMetricsService } = await import('@/services/telemetry/performanceMetricsService');
          const successRate = attempted > 0 ? succeeded / attempted : 1;
          const avgResponseMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
          await performanceMetricsService.recordToday({ sync: { successRate, avgResponseMs } });
        } catch {}
        // Telemetry aggregation (avg latency)
        try {
          const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
          const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
          await trackAIInteraction(AIEventType.SYSTEM_STATUS, {
            event: 'sync_batch_completed',
            attempted,
            succeeded,
            failed: failedCount,
            avgLatencyMs
          });
        } catch {}
      } catch {}
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.entity) {
      case 'user_profile':
        await this.syncUserProfile(item);
        break;
      // compulsion removed
      // thought_record removed
      case 'ai_profile':
        await this.syncAIProfile(item);
        break;
      case 'treatment_plan':
        await this.syncTreatmentPlan(item);
        break;
      case 'achievement':
        await this.syncAchievement(item);
        break;
      case 'mood_entry':
        await this.syncMoodEntry(item);
        break;
      case 'voice_checkin':
        await this.syncVoiceCheckin(item);
        break;
      // thought_record removed
      default:
        throw new Error(`Unknown entity type: ${item.entity}`);
    }
  }

  // compulsion sync removed

  // ✅ REMOVED: syncERPSession method - ERP module deleted

  private async syncAIProfile(item: SyncQueueItem): Promise<void> {
    const { default: svc } = await import('@/services/supabase');
    const d = item.data || {};
    const uid = await this.resolveValidUserId(d.user_id || d.userId);
    await (svc as any).upsertAIProfile(uid, d.profile_data, !!d.onboarding_completed);
  }

  private async syncUserProfile(item: SyncQueueItem): Promise<void> {
    const { default: svc } = await import('@/services/supabase');
    const d = item.data || {};
    let uid = d.user_id || d.userId;
    if (!uid) {
      try {
        const cur = (svc as any)?.getCurrentUserId?.();
        if (cur) uid = cur;
      } catch {}
    }
    if (!uid) throw new Error('No user id available for user_profile sync');
    await (svc as any).upsertUserProfile(uid, d.payload || d);
  }

  private async syncTreatmentPlan(item: SyncQueueItem): Promise<void> {
    const { default: svc } = await import('@/services/supabase');
    const d = item.data || {};
    const uid = await this.resolveValidUserId(d.user_id || d.userId);
    await (svc as any).upsertAITreatmentPlan(uid, d.plan_data, d.status || 'active');
  }

  // user_progress kaldırıldı – progress senkronizasyonu AI profiline taşındı (gerektiğinde ayrı servis kullanılacak)

  private async syncAchievement(item: SyncQueueItem): Promise<void> {
    // Sync achievements to Supabase
    try {
      const { default: svc } = await import('@/services/supabase');
      const d = item.data || {};
      switch (item.type) {
        case 'CREATE': {
          const { error } = await (svc as any).supabaseClient
            .from('user_achievements')
            .upsert({
              user_id: d.user_id,
              achievement_id: d.achievement_id,
              unlocked_at: d.unlocked_at || new Date().toISOString(),
              progress: d.progress ?? 100,
              metadata: d.metadata || {},
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,achievement_id' });
          if (error) throw error;
          break;
        }
        case 'UPDATE': {
          const { error } = await (svc as any).supabaseClient
            .from('user_achievements')
            .update({
              progress: d.progress,
              metadata: d.metadata,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', d.user_id)
            .eq('achievement_id', d.achievement_id);
          if (error) throw error;
          break;
        }
      }
    } catch (e) {
      console.warn('Achievement sync failed:', e);
      throw e;
    }
  }

  // ✅ F-04 FIX: Add DELETE handling to mood entry sync
  private async syncMoodEntry(item: SyncQueueItem): Promise<void> {
    const raw = item.data || {};
    const { default: svc } = await import('@/services/supabase');

    // Handle DELETE operations
    if (item.type === 'DELETE') {
      if (raw.id) {
        try {
          await (svc as any).deleteMoodEntry(raw.id);
          console.log('✅ Mood entry deleted successfully:', raw.id);
          try {
            const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
            await trackAIInteraction(AIEventType.DELETE_REPLAYED_SUCCESS, { entity: 'mood_entry', id: raw.id }, raw.user_id);
          } catch {}
        } catch (error) {
          console.warn('⚠️ Mood entry deletion failed:', error);
          try {
            const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
            await trackAIInteraction(AIEventType.DELETE_REPLAYED_FAILED, { entity: 'mood_entry', id: raw.id }, raw.user_id);
          } catch {}
          throw error; // Let it retry via DLQ
        }
      } else {
        console.log('⚠️ DELETE skipped: missing mood entry id');
      }
      return;
    }

    // Handle CREATE/UPDATE operations
    // Normalize payload and save to the new canonical table: mood_entries
    // Fallback user id acquisition
    const userId = await this.resolveValidUserId(raw.user_id || raw.userId);

    const entry = {
      user_id: userId,
      mood_score: raw.mood_score ?? raw.mood ?? 50,
      energy_level: raw.energy_level ?? raw.energy ?? 5,
      anxiety_level: raw.anxiety_level ?? raw.anxiety ?? 5,
      notes: raw.notes || '',
      triggers: raw.triggers || (raw.trigger ? [raw.trigger] : []),
      activities: raw.activities || [],
    };

    await (svc as any).saveMoodEntry(entry);
  }

  // ✅ F-04 FIX: Complete DELETE implementation for voice checkins
  private async syncVoiceCheckin(item: SyncQueueItem): Promise<void> {
    const { default: svc } = await import('@/services/supabase');
    switch (item.type) {
      case 'CREATE':
      case 'UPDATE':
        {
          const d = item.data || {};
          const uid = await this.resolveValidUserId(d.user_id || d.userId);
          await (svc as any).saveVoiceCheckin({ ...d, user_id: uid });
        }
        break;
      case 'DELETE':
        // ✅ F-04 FIX: Implement voice checkin deletion
        if (item.data?.id) {
          try {
            await (svc as any).deleteVoiceCheckin(item.data.id);
            console.log('✅ Voice checkin deleted successfully:', item.data.id);
            try {
              const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
              await trackAIInteraction(AIEventType.DELETE_REPLAYED_SUCCESS, { entity: 'voice_checkin', id: item.data.id }, item.data.user_id);
            } catch {}
          } catch (error) {
            console.warn('⚠️ Voice checkin deletion failed:', error);
            try {
              const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
              await trackAIInteraction(AIEventType.DELETE_REPLAYED_FAILED, { entity: 'voice_checkin', id: item.data.id }, item.data.user_id);
            } catch {}
            throw error; // Let it retry via DLQ
          }
        } else {
          console.log('⚠️ DELETE skipped: missing voice checkin id');
        }
        break;
    }
  }

  // ✅ F-04 FIX: Complete DELETE implementation for thought records
  // thought record sync removed

  private async handleFailedSync(item: SyncQueueItem): Promise<void> {
    console.error('Failed to sync item after max retries:', item);
    try {
      await deadLetterQueue.addToDeadLetter({
        id: item.id,
        type: item.type,
        entity: item.entity,
        data: item.data,
        errorMessage: 'Max retries exceeded',
      });
    } catch (e) {
      // Fallback: persist minimal info
      const currentUserId = await AsyncStorage.getItem('currentUserId');
      const failedKey = `failedSyncItems_${safeStorageKey(currentUserId as any)}`;
      const failedItems = await AsyncStorage.getItem(failedKey);
      const failed = failedItems ? JSON.parse(failedItems) : [];
      failed.push(item);
      await AsyncStorage.setItem(failedKey, JSON.stringify(failed));
    }
  }

  // compulsion offline helpers removed

  // ✅ F-01 FIX: ERP session methods REMOVED
  // ERP module has been deleted from the application.
  // These methods were creating ghost 'erp_session' entities in the sync queue.
  // If legacy code calls these methods, they will be no-ops.

  isOnlineMode(): boolean {
    return this.isOnline;
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  /**
   * 🧹 QUEUE MAINTENANCE: Clean stale items from sync queue
   * Removes items older than specified days to prevent queue bloat
   */
  async cleanupStaleItems(maxAgeInDays: number = 7): Promise<number> {
    const staleThreshold = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
    const initialCount = this.syncQueue.length;
    
    this.syncQueue = this.syncQueue.filter(item => 
      item.timestamp > staleThreshold
    );
    
    const removedCount = initialCount - this.syncQueue.length;
    
    if (removedCount > 0) {
      await this.saveSyncQueue();
      console.log(`🧹 Cleaned up ${removedCount} stale sync items older than ${maxAgeInDays} days`);
    }
    
    return removedCount;
  }

  /**
   * 📊 QUEUE HEALTH: Get sync queue health metrics
   */
  async getQueueHealthMetrics(): Promise<{
    totalItems: number;
    staleItems: number;
    retryItems: number;
    oldestItem: number | null;
    averageRetryCount: number;
  }> {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const staleItems = this.syncQueue.filter(item => item.timestamp < sevenDaysAgo).length;
    const retryItems = this.syncQueue.filter(item => item.retryCount > 0).length;
    const oldestItem = this.syncQueue.length > 0 
      ? Math.min(...this.syncQueue.map(item => item.timestamp))
      : null;
    
    const totalRetries = this.syncQueue.reduce((sum, item) => sum + item.retryCount, 0);
    const averageRetryCount = this.syncQueue.length > 0 ? totalRetries / this.syncQueue.length : 0;
    
    return {
      totalItems: this.syncQueue.length,
      staleItems,
      retryItems,
      oldestItem,
      averageRetryCount: Math.round(averageRetryCount * 100) / 100
    };
  }

  /**
   * ⚡ DAILY MAINTENANCE: Run daily queue maintenance
   * Should be called once per day to keep the queue healthy
   */
  async runDailyMaintenance(): Promise<{
    staleItemsRemoved: number;
    dlqItemsProcessed: number;
    queueHealth: any;
  }> {
    console.log('⚡ Starting daily sync queue maintenance...');
    
    // 1. Clean stale items (older than 7 days)
    const staleItemsRemoved = await this.cleanupStaleItems(7);
    
    // 2. Trigger DLQ cleanup
    let dlqItemsProcessed = 0;
    try {
      const dlqResult = await deadLetterQueue.performScheduledMaintenance();
      dlqItemsProcessed = dlqResult.archived + dlqResult.cleaned;
    } catch (error) {
      console.warn('⚠️ DLQ maintenance failed:', error);
    }
    
    // 3. Get updated health metrics
    const queueHealth = await this.getQueueHealthMetrics();
    
    const result = {
      staleItemsRemoved,
      dlqItemsProcessed,
      queueHealth
    };
    
    console.log('✅ Daily maintenance completed:', result);
    return result;
  }

  async forceSyncNow(): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    await this.processSyncQueue();
    return this.syncQueue.length === 0;
  }

  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  /**
   * Batch conflict-aware sync entrypoint
   */
  async syncWithConflictResolution(batchSize: number = 10): Promise<{ successful: number; failed: number; conflicts: number; }>{
    const result = { successful: 0, failed: 0, conflicts: 0 };
    if (!this.isOnline || this.syncQueue.length === 0) return result;
    const items = [...this.syncQueue];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const settled = await Promise.allSettled(batch.map((it) => this.syncItem(it)));
      settled.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          result.successful++;
          this.syncQueue = this.syncQueue.filter(q => q.id !== batch[idx].id);
        } else {
          result.failed++;
        }
      });
      await this.saveSyncQueue();
    }
    try { await AsyncStorage.setItem('last_sync_summary', JSON.stringify({ ...result, at: new Date().toISOString() })); } catch {}
    return result;
  }

  // ✅ NEW: Bulk operations for mood entries
  async bulkSyncMoodEntries(entries: any[], userId: string): Promise<{ synced: number; failed: number }> {
    const result = { synced: 0, failed: 0 };
    
    if (!entries.length || !isUUID(userId)) {
      return result;
    }

    const batchId = `mood_bulk_${Date.now()}_${userId}`;
    console.log(`🔄 Starting bulk mood sync: ${entries.length} entries (Batch: ${batchId})`);

    try {
      // Add all entries to sync queue as a batch
      const promises = entries.map((entry, index) => {
        const priority = 'high'; // Mood entries are high priority
        return this.addToSyncQueue({
          type: 'CREATE',
          entity: 'mood_entry',
          data: {
            user_id: userId,
            mood_score: entry.mood_score ?? entry.mood ?? 50,
            energy_level: entry.energy_level ?? entry.energy ?? 5,
            anxiety_level: entry.anxiety_level ?? entry.anxiety ?? 5,
            notes: entry.notes || '',
            triggers: entry.triggers || [],
            activities: entry.activities || [],
            timestamp: entry.timestamp || entry.created_at || new Date().toISOString(),
          },
          priority: priority as any,
          isBulkOperation: true,
          batchId: batchId
        });
      });

      await Promise.allSettled(promises);
      
      // Wait briefly for queue processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Process the queue immediately if we're online
      if (this.isOnline) {
        await this.processSyncQueue();
      }

      // Count successful items from the batch
      const remainingBatchItems = this.syncQueue.filter(item => item.batchId === batchId);
      result.synced = entries.length - remainingBatchItems.length;
      result.failed = remainingBatchItems.length;

      console.log(`✅ Bulk mood sync completed: ${result.synced}/${entries.length} synced (Batch: ${batchId})`);
      
      return result;
    } catch (error) {
      console.error('❌ Bulk mood sync failed:', error);
      result.failed = entries.length;
      return result;
    }
  }

  // ✅ NEW: Smart retry with network awareness
  private async smartRetry<T>(
    operation: () => Promise<T>, 
    context: { entity: string; userId?: string; priority?: string }
  ): Promise<T> {
    const maxRetries = context.priority === 'critical' ? 5 : 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check network status before retry
        try {
          const NetInfo = require('@react-native-community/netinfo').default;
          const state = await NetInfo.fetch();
          const isConnected = state.isConnected && state.isInternetReachable !== false;
          
          if (!isConnected && attempt > 0) {
            // If network is down, wait longer before retry
            const networkWaitTime = Math.min(5000 * Math.pow(2, attempt), 30000);
            console.log(`📡 Network down, waiting ${networkWaitTime}ms before retry (attempt ${attempt + 1})`);
            await new Promise(resolve => setTimeout(resolve, networkWaitTime));
            continue;
          }
        } catch {}

        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          // Exponential backoff with jitter
          const baseDelay = context.priority === 'critical' ? 1000 : 2000;
          const delay = Math.min(
            baseDelay * Math.pow(2, attempt), 
            context.priority === 'critical' ? 15000 : 30000
          ) + Math.floor(Math.random() * 1000);
          
          console.log(`⏳ Retrying ${context.entity} sync in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Smart retry failed');
  }

  // ✅ NEW: Trigger mood auto-recovery when network comes back online
  private async triggerMoodAutoRecovery(): Promise<void> {
    try {
      // Get current user ID
      const currentUserId = await AsyncStorage.getItem('currentUserId');
      if (!currentUserId || !isUUID(currentUserId)) {
        console.log('🔄 Skipping mood auto-recovery: no valid user ID');
        return;
      }

      console.log('🔄 Triggering mood auto-recovery for user:', currentUserId);
      
      // Import and call mood tracking service auto-recovery
      const { default: moodTrackingService } = await import('@/services/moodTrackingService');
      const result = await moodTrackingService.autoRecoverUnsyncedEntries(currentUserId);
      
      if (result.recovered > 0) {
        console.log(`✅ Network auto-recovery: ${result.recovered} mood entries queued for sync`);
        
        // Immediately process the newly queued items
        setTimeout(() => {
          this.processSyncQueue();
        }, 1000); // Small delay to allow queue additions to complete
      } else if (result.recovered === 0 && result.failed === 0) {
        console.log('✅ Network auto-recovery: No unsynced mood entries found');
      } else {
        console.warn(`⚠️ Network auto-recovery: ${result.failed} entries failed to queue`);
      }
      
    } catch (error) {
      console.error('❌ Mood auto-recovery failed:', error);
      // Don't throw - this shouldn't break the main sync process
    }
  }

  /**
   * 🧹 CLEANUP: Properly teardown all listeners and prevent memory leaks
   * Call this when the service is no longer needed (app shutdown, user logout, etc.)
   */
  public cleanup(): void {
    console.log('🧹 OfflineSyncService: Starting cleanup...');
    
    // 1. Remove NetInfo listener to prevent memory leak
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = undefined;
      console.log('✅ NetInfo listener removed');
    }
    
    // 2. Stop any active sync operations
    this.isSyncing = false;
    
    // 3. Clear sync queue from memory (AsyncStorage data preserved)
    this.syncQueue = [];
    
    // 4. Reset metrics
    this.syncMetrics = {
      successRate: 0,
      avgResponseTime: 0,
      lastSyncTime: 0,
      totalSynced: 0,
      totalFailed: 0
    };
    
    console.log('✅ OfflineSyncService cleanup completed');
  }
}

export const offlineSyncService = OfflineSyncService.getInstance();
