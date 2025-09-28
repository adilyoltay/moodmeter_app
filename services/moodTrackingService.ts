import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/services/supabase';
import batchOptimizer from '@/services/sync/batchOptimizer';
import { intelligentMergeService } from '@/services/staticMoodMerge';
import { secureDataService } from '@/services/encryption/secureDataService';
import { getCurrentUserId as resolveCurrentUserId } from '@/services/mood/userIdResolver';
import { moodRepository } from '@/services/mood/moodRepository';
import { generatePrefixedId } from '@/utils/idGenerator';
import { idempotencyService } from '@/services/idempotencyService';
import optimizedStorage from '@/services/optimizedStorage';
import { useGamificationStore } from '@/store/gamificationStore';
import { moodDataLoader } from '@/services/moodDataLoader';
import moodOfflineQueue, { SavedMoodPayload } from '@/services/moodOfflineQueue';
import { mapTriggerIdsToLabels } from '@/utils/moodTriggers';

export interface MoodEntry {
  id: string;
  user_id: string;
  mood_score: number;
  energy_level: number;
  anxiety_level: number;
  notes?: string;
  triggers?: string[];
  activities?: string[];
  timestamp: string;
  synced: boolean;
  sync_attempts?: number;
  last_sync_attempt?: string;
  content_hash?: string; // For duplicate detection
  created_at?: string; // Alternative timestamp field
  
  // ID MAPPING FIELDS for local ↔ remote sync
  local_id?: string; // Client-generated ID (mood_xxx_timestamp) 
  remote_id?: string; // Supabase UUID after successful save
}

export type SaveMoodEntryResult =
  | { status: 'SUCCESS'; entry: MoodEntry }
  | { status: 'QUEUED_OFFLINE'; entry: MoodEntry; itemId: string };

/**
 * 🔒 ENCRYPTED STORAGE FORMAT
 * Separates non-sensitive metadata from encrypted sensitive data
 */

class MoodTrackingService {
  private static instance: MoodTrackingService;
  private readonly STORAGE_KEY = 'mood_entries';
  private static readonly FAST_PATH_REMOTE_TTL_MS = 60_000; // 60s window before forcing a fresh merge
  private readonly fastPathState = new Map<string, { lastFullMerge: number }>();

  static getInstance(): MoodTrackingService {
    if (!MoodTrackingService.instance) {
      MoodTrackingService.instance = new MoodTrackingService();
    }
    return MoodTrackingService.instance;
  }

  /**
   * Resolve remote_id for a given entry id (which may be local_id or remote_id).
   * Returns remote_id if known, otherwise null.
   */
  async resolveRemoteIdFor(entryId: string): Promise<string | null> {
    try {
      // Fast path: if the provided id already looks like a UUID, use it as remote id
      const uuidRe = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      if (uuidRe.test(entryId)) return entryId;

      const userId = await this.getCurrentUserId();
      if (!userId) return null;
      // Extend resolution window to 90 days for better cross-device mapping
      const recent = await this.getMoodEntries(userId, 90);
      const found = recent.find(e => e.id === entryId || e.local_id === entryId || e.remote_id === entryId);
      if (!found) return null;
      // If entry already has a remote_id recorded, prefer it; otherwise if its own id looks like a UUID, use it
      if (found.remote_id && uuidRe.test(found.remote_id)) return found.remote_id;
      if (uuidRe.test(found.id)) return found.id;
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * Get current user ID from multiple sources with fallback
   */
  private async getCurrentUserId(): Promise<string | null> {
    // Delegate to centralized resolver (keeps backwards compatibility)
    return resolveCurrentUserId();
  }

  /**
   * 🔒 DECRYPT MOOD ENTRY WITH BACKWARDS COMPATIBILITY
   * Handles both v1 (plain) and v2 (encrypted) storage formats
   */
  private async decryptMoodEntry(rawEntry: any): Promise<MoodEntry | null> {
    const { decryptMoodEntry } = await import('@/services/mood/moodMigration');
    return decryptMoodEntry(rawEntry);
  }

  /**
   * 🔄 MIGRATE LEGACY ENTRY TO ENCRYPTED FORMAT
   * Automatically upgrades v1 entries to v2 encrypted format
   */
  private async migrateEntryToEncrypted(entry: MoodEntry): Promise<void> {
    try {
      // Re-save with encryption (will create v2 format)
      await moodRepository.save(entry);
      console.log('✅ Entry migrated to encrypted format:', entry.id);
    } catch (error) {
      console.error('❌ Failed to migrate entry to encrypted format:', error);
      // Don't throw - migration failure shouldn't break read operations
    }
  }

  async saveMoodEntry(
    entry: Omit<MoodEntry, 'id' | 'timestamp' | 'synced'>,
    options: { offlineItemId?: string } = {}
  ): Promise<SaveMoodEntryResult> {
    // 🛡️ IDEMPOTENCY CHECK: Prevent duplicate mood entries
    const idempotencyResult = await idempotencyService.checkMoodEntryIdempotency({
      user_id: entry.user_id,
      mood_score: entry.mood_score,
      energy_level: entry.energy_level,
      anxiety_level: entry.anxiety_level,
      notes: entry.notes,
      triggers: entry.triggers,
      activities: entry.activities
    });

    // ✅ DUPLICATE DETECTED: Clear signal to UI - don't return entry that confuses state
    if (idempotencyResult.isDuplicate && !idempotencyResult.shouldProcess) {
      console.log(`🛡️ Duplicate mood entry prevented: ${idempotencyResult.localEntryId}`);
      
      // 🚨 CRITICAL FIX: Throw specific error that UI can handle gracefully
      // This prevents UI from thinking a new entry was created
      const duplicateError = new Error('DUPLICATE_MOOD_ENTRY_PREVENTED');
      (duplicateError as any).code = 'DUPLICATE_PREVENTED';
      (duplicateError as any).existingEntryId = idempotencyResult.localEntryId;
      (duplicateError as any).existingTimestamp = idempotencyResult.existingEntry?.timestamp;
      
      throw duplicateError;
    }

    // ✅ SAFE TO PROCESS: Create mood entry with consistent local ID
    const triggerLabels = mapTriggerIdsToLabels(Array.isArray(entry.triggers) ? entry.triggers : []);

    const moodEntry: MoodEntry = {
      ...entry,
      triggers: triggerLabels,
      // 🎯 Use consistent local entry ID from idempotency service
      id: idempotencyResult.localEntryId,
      local_id: idempotencyResult.localEntryId, // Store local ID for mapping
      timestamp: new Date().toISOString(),
      synced: false,
      sync_attempts: 0,
    };

    // 🚀 PERFORMANCE: Parallel execution for faster saves
    const [localSaveResult, cacheInvalidateResult] = await Promise.allSettled([
      // Local save (encrypted V2)
      moodRepository.save(moodEntry),
      
      // Cache invalidation (parallel with local save)
      (async () => {
        try {
          const uid = moodEntry.user_id || (await this.getCurrentUserId());
          if (uid) {
            moodDataLoader.invalidate(uid);
          }
        } catch {}
      })()
    ]);

    // Log any local save failures but don't block
    if (localSaveResult.status === 'rejected') {
      console.warn('⚠️ Local mood save failed:', localSaveResult.reason);
    }

    // Use standardized supabaseService.saveMoodEntry (writes to canonical mood_entries table)
    try {
      const supabaseResult = await supabaseService.saveMoodEntry({
        user_id: moodEntry.user_id,
        mood_score: moodEntry.mood_score,
        energy_level: moodEntry.energy_level,
        anxiety_level: moodEntry.anxiety_level,
        notes: moodEntry.notes,
        triggers: triggerLabels,
        activities: moodEntry.activities || [], // Send activities array
        trigger: moodEntry.triggers?.[0] || '', // Keep backward compatibility
        timestamp: moodEntry.timestamp, // Preserve original creation time for idempotency
      });
      
      // 🆔 CRITICAL FIX: Store complete ID mapping and content_hash from Supabase response
      if (supabaseResult && supabaseResult.id) {
        const remoteId = supabaseResult.id;
        const contentHash = supabaseResult.content_hash;
        
        // Update mood entry with complete mapping data
        moodEntry.remote_id = remoteId;
        moodEntry.content_hash = contentHash;
        moodEntry.synced = true; // Mark as successfully synced
        
        console.log(`🔄 Complete ID mapping: Local(${moodEntry.local_id}) ↔ Remote(${remoteId}) | Hash(${contentHash})`);
        
        // Update local storage with complete mapping for deduplication
        await moodRepository.update(moodEntry);
      }
      
      // 🚀 PERFORMANCE: Parallel post-sync operations
      const postSyncOperations = await Promise.allSettled([
        // Mark as processed in idempotency service
        idempotencyService.markAsProcessed(
          idempotencyResult.localEntryId,
          idempotencyResult.contentHash,
          moodEntry.user_id
        ),
        
        // Mark as synced in repository
        moodRepository.markSynced(moodEntry.id, moodEntry.user_id),
        
        // Clean up offline queue
        (async () => {
          try {
            if (options.offlineItemId) {
              await moodOfflineQueue.remove(moodEntry.user_id, options.offlineItemId);
            } else {
              await moodOfflineQueue.remove(moodEntry.user_id, moodEntry.id);
            }
          } catch (queueCleanupError) {
            console.warn('⚠️ Failed to cleanup offline queue item after success:', queueCleanupError);
          }
        })()
      ]);

      // Log any failures but don't block the response
      postSyncOperations.forEach((result, index) => {
        if (result.status === 'rejected') {
          const operationNames = ['idempotency', 'markSynced', 'queueCleanup'];
          console.warn(`⚠️ Post-sync ${operationNames[index]} failed:`, result.reason);
        }
      });
    } catch (e) {
      console.warn('❌ Mood entry Supabase save failed, adding to offline sync queue:', e);
      
      // 🛡️ Check if we should queue (idempotency service prevents double-queuing)
      if (!idempotencyResult.shouldQueue) {
        console.log(`🛡️ Skipping sync queue - already queued: ${idempotencyResult.localEntryId}`);
        try {
          const { eventBus, Events } = await import('@/services/eventBus');
          eventBus.emit(Events.MoodEntrySaved, { userId: moodEntry.user_id, entry: moodEntry });
        } catch {}
        return {
          status: 'QUEUED_OFFLINE',
          itemId: options.offlineItemId ?? moodEntry.id,
          entry: moodEntry,
        } satisfies SaveMoodEntryResult;
      }
      
      // 🚀 PERFORMANCE: Parallel error handling operations
      const [feedbackResult, syncAttemptResult] = await Promise.allSettled([
        // Record sync error for user feedback
        (async () => {
          try {
            const { default: offlineSyncUserFeedbackService } = await import('@/services/offlineSyncUserFeedbackService');
            await offlineSyncUserFeedbackService.recordSyncError(
              moodEntry.id,
              'mood_entry',
              'CREATE',
              e instanceof Error ? e.message : String(e),
              0, // Initial attempt
              8  // Max retries in offline sync
            );
          } catch (feedbackError) {
            console.warn('⚠️ Failed to record mood entry sync error for user feedback:', feedbackError);
          }
        })(),
        
        // Increment sync attempt for tracking
        this.incrementSyncAttempt(moodEntry.id, moodEntry.user_id)
      ]);
      
      // ✅ NEW: Auto-add failed entries to offline sync queue for automatic retry
      const queuePayload: SavedMoodPayload = {
        user_id: moodEntry.user_id,
        mood_score: moodEntry.mood_score,
        energy_level: moodEntry.energy_level,
        anxiety_level: moodEntry.anxiety_level,
        notes: moodEntry.notes || '',
        triggers: triggerLabels,
        activities: moodEntry.activities || [],
        timestamp: moodEntry.timestamp,
        source: (entry as any)?.source,
        method: (entry as any)?.method,
        metadata: (entry as any)?.metadata,
        local_entry_id: moodEntry.id,
      };

      // 🚀 PERFORMANCE: Parallel queue operations
      const [queuedItem] = await Promise.all([
        moodOfflineQueue.enqueue(moodEntry.user_id, queuePayload, {
          id: moodEntry.id,
          insertedAt: moodEntry.timestamp,
        }),
        
        // Mark as queued in parallel
        idempotencyService.markAsQueued(
          idempotencyResult.localEntryId,
          idempotencyResult.contentHash,
          moodEntry.user_id
        )
      ]);

      console.log('✅ Failed mood entry added to offline queue:', queuedItem.id);

      // Fire event asynchronously (non-blocking)
      (async () => {
        try {
          const { eventBus, Events } = await import('@/services/eventBus');
          eventBus.emit(Events.MoodEntrySaved, { userId: moodEntry.user_id, entry: moodEntry });
        } catch {}
      })();

      return {
        status: 'QUEUED_OFFLINE',
        itemId: queuedItem.id,
        entry: moodEntry,
      } satisfies SaveMoodEntryResult;
    }

    // 🚀 PERFORMANCE: Background operations (non-blocking)
    // Background cleanup (1% chance per save)
    if (Math.random() < 0.01) {
      idempotencyService.cleanupOldEntries().then(deletedCount => {
        if (deletedCount > 0) {
          console.log(`🧹 Background cleanup: removed ${deletedCount} old idempotency entries`);
        }
      }).catch(() => {}); // Silent failure for background cleanup
    }
    
    // Gamification and event broadcasting (parallel, non-blocking)
    Promise.allSettled([
      // Gamification awards
      (async () => {
        try {
          const source = (entry as any)?.source || '';
          const isVoiceSource = typeof source === 'string' && (source.includes('voice') || source.includes('va_pad'));
          const isOnboardingSource = typeof source === 'string' && source.includes('onboarding');
          if (!isVoiceSource && !isOnboardingSource) {
            const { updateStreak, awardMicroReward } = useGamificationStore.getState();
            const ts = (entry as any)?.timestamp || new Date().toISOString();
            await updateStreak(ts);
            await awardMicroReward('mood_manual_checkin', { source: 'manual', timestamp: ts });
          }
        } catch (gamiError) {
          console.warn('⚠️ Gamification (manual mood) award failed:', gamiError);
        }
      })(),
      
      // Event broadcasting
      (async () => {
        try {
          const { eventBus, Events } = await import('@/services/eventBus');
          eventBus.emit(Events.MoodEntrySaved, { userId: moodEntry.user_id, entry: moodEntry });
        } catch {}
      })()
    ]).catch(() => {}); // Silent failure for background operations

    return {
      status: 'SUCCESS',
      entry: moodEntry,
    } satisfies SaveMoodEntryResult;
  }

  /**
   * 📝 Update existing mood entry (both local and remote)
   */
  async updateMoodEntry(entryId: string, updates: Partial<Omit<MoodEntry, 'id' | 'timestamp'>>, userIdOverride?: string): Promise<MoodEntry> {
    try {
      console.log(`📝 Updating mood entry: ${entryId}`, updates);

      // 🚨 CRITICAL FIX: Get valid user ID from multiple sources with priority
      let userId = userIdOverride || (updates as any).user_id;
      if (!userId) {
        userId = await this.getCurrentUserId();
      }
      
      if (!userId) {
        console.error('❌ No valid user ID available for mood entry update');
        throw new Error('User authentication required for mood entry operations');
      }
      
      console.log('✅ Using user ID for update:', userId.slice(0, 8) + '...');

      // 🔍 First, find the entry to get current data
      const existingEntries = await this.getMoodEntries(userId, 30);
      const existingEntry = existingEntries.find(entry => entry.id === entryId);
      
      if (!existingEntry) {
        throw new Error(`Mood entry not found: ${entryId}`);
      }

      // 🔄 Create updated entry
      const updatedEntry: MoodEntry = {
        ...existingEntry,
        ...updates,
        timestamp: existingEntry.timestamp, // Keep original timestamp
        synced: false, // Mark as needing sync
        sync_attempts: 0
      };

      // 🔒 Update in local storage
      await moodRepository.update(updatedEntry);
      
      // 🌐 Update in remote (Supabase)
      try {
        await supabaseService.updateMoodEntry(entryId, {
          mood_score: updatedEntry.mood_score,
          energy_level: updatedEntry.energy_level, 
          anxiety_level: updatedEntry.anxiety_level,
          notes: updatedEntry.notes,
          triggers: updatedEntry.triggers,
          activities: updatedEntry.activities
        });
        
        // Mark as synced
        updatedEntry.synced = true;
        await moodRepository.update(updatedEntry);
        
        console.log(`✅ Mood entry updated successfully: ${entryId}`);
        // Invalidate chart caches so updates reflect immediately
        try { if (userId) moodDataLoader.invalidate(userId); } catch {}
      } catch (remoteError) {
        console.warn('⚠️ Remote update failed, will sync later:', remoteError);
        
        // Add to sync queue for later
        // TODO: Add to offline sync queue
      }

      return updatedEntry;
    } catch (error) {
      console.error(`❌ Failed to update mood entry ${entryId}:`, error);
      throw error;
    }
  }



  private async incrementSyncAttempt(id: string, userId: string): Promise<void> {
    const dates = await this.getRecentDates(7);
    for (const date of dates) {
      const key = `${this.STORAGE_KEY}_${userId}_${date}`;
      const existing = await AsyncStorage.getItem(key);
      if (existing) {
        try {
          const rawEntries = JSON.parse(existing);
          let foundAndUpdated = false;
          
          // 🔒 UPDATE ENCRYPTED STORAGE WITH SYNC ATTEMPT COUNT
          const updatedEntries = rawEntries.map((rawEntry: any) => {
            // Handle both v1 and v2 formats for sync attempt increment
            const entryId = rawEntry.storageVersion === 2 ? rawEntry.metadata?.id : rawEntry.id;
            
            if (entryId === id) {
              foundAndUpdated = true;
              
              if (rawEntry.storageVersion === 2) {
                // V2 format: Update metadata
                return {
                  ...rawEntry,
                  metadata: {
                    ...rawEntry.metadata,
                    sync_attempts: (rawEntry.metadata.sync_attempts || 0) + 1,
                    last_sync_attempt: new Date().toISOString()
                  }
                };
              } else {
                // V1 format: Update directly (backwards compatibility)
                return {
                  ...rawEntry,
                  sync_attempts: (rawEntry.sync_attempts || 0) + 1,
                  last_sync_attempt: new Date().toISOString()
                };
              }
            }
            return rawEntry;
          });
          
          if (foundAndUpdated) {
            await AsyncStorage.setItem(key, JSON.stringify(updatedEntries));
            console.log('🔄 Sync attempt incremented for mood entry:', id);
            break;
          }
        } catch (error) {
          console.error('❌ Failed to increment sync attempt:', error);
        }
      }
    }
  }

  async syncPendingEntries(userId: string): Promise<{ synced: number; failed: number }> {
    const result = { synced: 0, failed: 0 };
    const pending = await this.getUnsyncedEntries(userId);
    if (pending.length === 0) return result;

    console.log(`🔄 Syncing ${pending.length} pending mood entries for user ${userId}`);

    try {
      // ✅ NEW: Use bulk sync for better performance
      const { offlineSyncService } = await import('@/services/offlineSync');
      const bulkResult = await offlineSyncService.bulkSyncMoodEntries(pending, userId);
      
      // Mark successfully synced entries as synced
      if (bulkResult.synced > 0) {
        const syncedEntries = pending.slice(0, bulkResult.synced);
        for (const entry of syncedEntries) {
          await moodRepository.markSynced(entry.id, userId);
          result.synced++;
        }
      }
      
      // Update retry count for failed entries
      if (bulkResult.failed > 0) {
        const failedEntries = pending.slice(bulkResult.synced);
        for (const entry of failedEntries) {
          await this.incrementSyncAttempt(entry.id, userId);
          result.failed++;
        }
      }

      console.log(`✅ Mood sync completed: ${result.synced} synced, ${result.failed} failed`);
      return result;
      
    } catch (error) {
      console.error('❌ Bulk mood sync failed, falling back to individual sync:', error);
      
      // Fallback to individual sync if bulk fails
      const BATCH_SIZE = Math.max(1, batchOptimizer.calculate(pending.length, 'normal'));
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        try {
          let batchError = null;
          for (const entry of batch) {
            try {
              await supabaseService.saveMoodEntry({
                user_id: entry.user_id,
                mood_score: entry.mood_score,
                energy_level: entry.energy_level,
                anxiety_level: entry.anxiety_level,
                notes: entry.notes,
                triggers: entry.triggers || [], // Send full triggers array
                activities: entry.activities || [], // Send activities array
                trigger: entry.triggers?.[0] || '', // Keep backward compatibility
                timestamp: entry.timestamp, // Preserve original creation time for idempotency
              });
            } catch (e) {
              batchError = e;
              break;
            }
          }
          const error = batchError;
          if (!error) {
            for (const item of batch) {
              await moodRepository.markSynced(item.id, userId);
              result.synced++;
            }
          } else {
            result.failed += batch.length;
            for (const item of batch) {
              await this.incrementSyncAttempt(item.id, userId);
            }
          }
        } catch (e) {
          result.failed += batch.length;
          for (const item of batch) {
            await this.incrementSyncAttempt(item.id, userId);
          }
        }
      }

      return result;
    }
  }

  private async getUnsyncedEntries(userId: string): Promise<MoodEntry[]> {
    return moodRepository.getUnsyncedEntries(userId, 30);
  }

  // 🌍 TIMEZONE FIX: Generate local date keys instead of UTC
  private async getRecentDates(days: number): Promise<string[]> {
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 86400000);
      // 🔧 Use LOCAL date instead of UTC
      const localDate = this.getLocalDateKey(d);
      dates.push(localDate);
    }
    return dates;
  }

  /**
   * 🌍 Get local date string for storage key (YYYY-MM-DD)
   * Avoids UTC timezone issues where mood entries appear in wrong day
   */
  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get the last mood entry for the user
   * Combines local and remote data to return the most recent entry
   */
  async getLastMoodEntry(userId: string): Promise<MoodEntry | null> {
    if (!userId) {
      console.warn('⚠️ getLastMoodEntry: userId is required');
      return null;
    }

    try {
      // Get recent mood entries (last 7 days should be sufficient for "last" entry)
      const recentEntries = await this.getMoodEntries(userId, 7);
      
      if (recentEntries.length === 0) {
        console.log('📊 getLastMoodEntry: No mood entries found');
        return null;
      }

      // getMoodEntries already returns sorted by timestamp (desc), so first is most recent
      const lastEntry = recentEntries[0];
      
      console.log('📊 getLastMoodEntry: Found last entry:', {
        id: lastEntry.id,
        timestamp: lastEntry.timestamp,
        mood_score: lastEntry.mood_score,
        synced: lastEntry.synced
      });
      
      return lastEntry;
    } catch (error) {
      console.error('❌ getLastMoodEntry error:', error);
      return null;
    }
  }

  /**
   * Legacy sync method - get last mood entry synchronously (deprecated)
   * @deprecated Use getLastMoodEntry(userId) instead
   */
  getLastMoodEntrySync(): { anxiety: number } | null {
    console.warn('⚠️ getLastMoodEntrySync is deprecated, use async getLastMoodEntry(userId) instead');
    return null;
  }

  // Cross-device: fetch recent remote entries and merge with local using intelligent merge
  async getMoodEntries(userId: string, days: number = 7): Promise<MoodEntry[]> {
    console.log(`🔄 getMoodEntries called: userId=${userId.slice(0, 8)}..., days=${days}`);

    const normalizedDays = Math.max(1, days);
    const fastPathResult = await this.tryOptimizedFastPath(userId, normalizedDays);
    const fastWindowActive = fastPathResult !== null && this.canUseFastPath(userId);

    if (fastWindowActive) {
      return fastPathResult;
    }

    const localEntries = fastPathResult ?? await this.loadLocalEntriesFromStorage(userId, normalizedDays);

    try {
      // Use fully standardized supabaseService.getMoodEntries (canonical service method)
      const remoteData = await supabaseService.getMoodEntries(userId, normalizedDays);

      if (remoteData && remoteData.length > 0) {
        const remoteEntries: MoodEntry[] = remoteData.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          mood_score: d.mood_score,
          energy_level: d.energy_level,
          anxiety_level: d.anxiety_level,
          notes: d.notes || '',
          // ✅ NEW SCHEMA: Handle both array and single trigger formats for migration period
          triggers: d.triggers && Array.isArray(d.triggers)
            ? d.triggers
            : (d.trigger ? [d.trigger] : []),
          activities: d.activities || [],
          timestamp: d.created_at || d.timestamp,
          synced: true,
          sync_attempts: 0,
          // 🆔 CRITICAL FIX: Add mapping fields for deduplication
          remote_id: d.id,
          content_hash: d.content_hash,
        }));

        // 🔄 INTELLIGENT MOOD MERGE WITH CONFLICT RESOLUTION
        try {
          console.log('🔄 Using intelligent mood merge for cross-device sync...', {
            localCount: localEntries.length,
            remoteCount: remoteEntries.length,
          });

          const mergeResult = await intelligentMergeService.intelligentMoodMerge(localEntries, remoteEntries);

          console.log('✅ Intelligent merge completed:', {
            totalEntries: mergeResult.mergedEntries.length,
            conflictsResolved: mergeResult.conflicts.length,
            syncSuccess: mergeResult.stats.syncSuccess,
          });

          if (mergeResult.conflicts.length > 0) {
            console.log('⚠️ Mood data conflicts resolved:', mergeResult.conflicts.map(c => ({
              entryId: c.entryId,
              strategy: c.resolution,
              timestamp: c.mergedVersion?.timestamp,
            })));
          }

          const merged = mergeResult.mergedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.markFullMergeCompleted(userId);
          return merged;

        } catch (mergeError) {
          console.error('⚠️ Intelligent mood merge failed, falling back to simple merge:', mergeError);

          const merged = new Map<string, MoodEntry>();
          [...localEntries, ...remoteEntries].forEach((entry) => {
            const existing = merged.get(entry.id);
            if (!existing) merged.set(entry.id, entry);
            else if (!existing.synced && entry.synced) merged.set(entry.id, entry);
            else if (new Date(entry.timestamp).getTime() > new Date(existing.timestamp).getTime()) merged.set(entry.id, entry);
          });

          const fallbackMerged = Array.from(merged.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.markFullMergeCompleted(userId);
          return fallbackMerged;
        }
      }
    } catch (fetchError) {
      console.error('⚠️ Failed to fetch remote mood entries:', fetchError);
    }

    const sortedLocal = this.sortEntriesDesc(localEntries);
    this.markFullMergeCompleted(userId);
    return sortedLocal;
  }

  private canUseFastPath(userId: string): boolean {
    const meta = this.fastPathState.get(userId);
    if (!meta) return false;
    return (Date.now() - meta.lastFullMerge) < MoodTrackingService.FAST_PATH_REMOTE_TTL_MS;
  }

  private markFullMergeCompleted(userId: string): void {
    this.fastPathState.set(userId, { lastFullMerge: Date.now() });
  }

  private sortEntriesDesc(entries: MoodEntry[]): MoodEntry[] {
    return [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private async loadLocalEntriesFromStorage(userId: string, days: number): Promise<MoodEntry[]> {
    const dates = await this.getRecentDates(days);

    const loadPromises = dates.map(async (date) => {
      const key = `${this.STORAGE_KEY}_${userId}_${date}`;
      try {
        const existing = await optimizedStorage.getOptimized<any>(key);
        if (!existing) return [];

        const decryptedEntries: MoodEntry[] = [];
        for (const rawEntry of existing) {
          try {
            const decryptedEntry = await this.decryptMoodEntry(rawEntry);
            if (decryptedEntry) {
              decryptedEntries.push(decryptedEntry);
            }
          } catch (decryptError) {
            console.warn('⚠️ Failed to decrypt mood entry, skipping:', decryptError);
          }
        }
        return decryptedEntries;
      } catch (error) {
        console.warn(`Failed to load mood entries for date ${date}:`, error);
        return [];
      }
    });

    const allEntries = await Promise.all(loadPromises);
    const flatEntries = allEntries.flat();
    const deduped = this.dedupeEntries(flatEntries);

    if (deduped.length !== flatEntries.length) {
      const removedCount = flatEntries.length - deduped.length;
      console.log(`🧹 Removed ${removedCount} duplicate local entries during storage read`);
    }

    return deduped;
  }

  private async tryOptimizedFastPath(userId: string, days: number): Promise<MoodEntry[] | null> {
    try {
      const now = new Date();
      const dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);
      const dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
      dateFrom.setDate(dateFrom.getDate() - (days - 1));

      const optimizedEntries = await optimizedStorage.queryMoodEntries(userId, {
        dateFrom,
        dateTo,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      if (!optimizedEntries) {
        return null;
      }

      if (optimizedEntries.length === 0) {
        return [];
      }

      const needsHydration = optimizedEntries.some((entry: any) =>
        entry?.notes === undefined || entry?.triggers === undefined || entry?.activities === undefined
      );

      const hydrationMap = new Map<string, MoodEntry[]>();

      if (needsHydration) {
        const datesToHydrate = new Set<string>();
        optimizedEntries.forEach((entry: any) => {
          const ts = entry?.timestamp || entry?.created_at;
          if (!ts) return;
          try {
            const dateKey = this.getLocalDateKey(new Date(ts));
            datesToHydrate.add(dateKey);
          } catch {}
        });

        await Promise.all(Array.from(datesToHydrate).map(async (dateKey) => {
          const storageKey = `${this.STORAGE_KEY}_${userId}_${dateKey}`;
          try {
            const stored = await optimizedStorage.getOptimized<any>(storageKey);
            if (!stored) {
              hydrationMap.set(dateKey, []);
              return;
            }

            const decrypted: MoodEntry[] = [];
            for (const rawEntry of stored) {
              try {
                const decryptedEntry = await this.decryptMoodEntry(rawEntry);
                if (decryptedEntry) decrypted.push(decryptedEntry);
              } catch (decryptError) {
                console.warn('⚠️ Hydration decrypt failed:', decryptError);
              }
            }
            hydrationMap.set(dateKey, decrypted);
          } catch (e) {
            console.warn('⚠️ Hydration load failed:', e);
            hydrationMap.set(dateKey, []);
          }
        }));
      }

      const enrichedEntries: MoodEntry[] = optimizedEntries.map((entry: any) => {
        const normalized = this.normalizeOptimizedEntry(entry, userId);

        if (!needsHydration) {
          return normalized;
        }

        if (entry?.notes !== undefined && entry?.triggers !== undefined && entry?.activities !== undefined) {
          return normalized;
        }

        const ts = normalized.timestamp;
        if (!ts) {
          return normalized;
        }

        const dateKey = this.getLocalDateKey(new Date(ts));
        const candidates = hydrationMap.get(dateKey) || [];
        const match = candidates.find(candidate =>
          candidate.id === normalized.id ||
          (!!candidate.local_id && candidate.local_id === normalized.id) ||
          (!!normalized.local_id && candidate.id === normalized.local_id) ||
          (!!candidate.remote_id && candidate.remote_id === normalized.remote_id)
        );

        if (match) {
          return {
            ...match,
            synced: normalized.synced,
            sync_attempts: normalized.sync_attempts ?? match.sync_attempts,
            last_sync_attempt: normalized.last_sync_attempt ?? match.last_sync_attempt,
            local_id: normalized.local_id ?? match.local_id,
            remote_id: normalized.remote_id ?? match.remote_id,
            content_hash: normalized.content_hash ?? match.content_hash,
          };
        }

        return normalized;
      });

      const deduped = this.dedupeEntries(enrichedEntries);
      const cutoffTime = dateFrom.getTime();
      const filtered = deduped.filter(entry => {
        const ts = new Date(entry.timestamp).getTime();
        return ts >= cutoffTime;
      });

      return this.sortEntriesDesc(filtered);
    } catch (error) {
      console.warn('⚠️ Optimized fast path failed, falling back to full merge:', error);
      return null;
    }
  }

  private dedupeEntries(entries: MoodEntry[]): MoodEntry[] {
    const map = new Map<string, MoodEntry>();
    for (const entry of entries) {
      if (!entry || !entry.id) continue;
      const existing = map.get(entry.id);
      if (!existing) {
        map.set(entry.id, entry);
        continue;
      }
      const existingTime = new Date(existing.timestamp || 0).getTime();
      const incomingTime = new Date(entry.timestamp || 0).getTime();
      if (incomingTime > existingTime) {
        map.set(entry.id, entry);
      }
    }
    return Array.from(map.values());
  }

  private normalizeOptimizedEntry(entry: any, userFallback: string): MoodEntry {
    const timestamp = entry?.timestamp || entry?.created_at || new Date().toISOString();
    const triggers = Array.isArray(entry?.triggers) ? entry.triggers : (entry?.trigger ? [entry.trigger] : undefined);
    const activities = Array.isArray(entry?.activities) ? entry.activities : undefined;
    const id = (entry?.id || entry?.local_id || entry?.remote_id || generatePrefixedId('mood_fastpath')) as string;
    const userIdValue = typeof entry?.user_id === 'string' && entry.user_id.length > 0 ? entry.user_id : userFallback;

    return {
      id,
      user_id: userIdValue,
      mood_score: typeof entry?.mood_score === 'number' ? entry.mood_score : 0,
      energy_level: typeof entry?.energy_level === 'number' ? entry.energy_level : 0,
      anxiety_level: typeof entry?.anxiety_level === 'number' ? entry.anxiety_level : 0,
      notes: entry?.notes ?? '',
      triggers: triggers ?? [],
      activities: activities ?? [],
      timestamp,
      synced: entry?.synced ?? true,
      sync_attempts: typeof entry?.sync_attempts === 'number' ? entry.sync_attempts : undefined,
      last_sync_attempt: entry?.last_sync_attempt,
      content_hash: entry?.content_hash,
      local_id: entry?.local_id,
      remote_id: entry?.remote_id,
    };
  }

  /**
   * Check if entry exists in LOCAL storage only (bypass intelligent merge)
   * Used for deletion verification without triggering remote sync
   */
  async checkEntryExistsInLocalStorage(entryId: string): Promise<boolean> {
    try {
      console.log('🔍 Checking local storage for entry:', entryId);
      
      // Get all possible storage keys
      const allKeys = await this.getAllMoodStorageKeys();
      
      for (const storageKey of allKeys) {
        const existing = await AsyncStorage.getItem(storageKey);
        
        if (existing) {
          try {
            let entries: any[] = JSON.parse(existing);
            
            // Handle both encrypted (v2) and plain (v1) storage formats
            if (entries.length > 0 && entries[0].storageVersion === 2) {
              // Decrypt entries to check IDs
              for (const rawEntry of entries) {
                const decrypted = await this.decryptMoodEntry(rawEntry);
                if (decrypted && decrypted.id === entryId) {
                  console.log(`🔍 Entry ${entryId} found in encrypted storage key: ${storageKey}`);
                  return true;
                }
              }
            } else {
              // Plain format - direct check
              const found = entries.some((entry: any) => entry.id === entryId);
              if (found) {
                console.log(`🔍 Entry ${entryId} found in plain storage key: ${storageKey}`);
                return true;
              }
            }
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse storage key ${storageKey}:`, parseError);
          }
        }
      }
      
      // Also check main storage key
      const mainData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (mainData) {
        try {
          const entries: MoodEntry[] = JSON.parse(mainData);
          const found = entries.some(entry => entry.id === entryId);
          if (found) {
            console.log(`🔍 Entry ${entryId} found in main storage`);
            return true;
          }
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse main storage:`, parseError);
        }
      }
      
      console.log(`🔍 Entry ${entryId} NOT found in local storage`);
      return false;
      
    } catch (error) {
      console.error('❌ Failed to check entry existence in local storage:', error);
      return false;
    }
  }

  /**
   * Force delete mood entry with more aggressive cleanup
   * Used when standard deletion fails
   */
  async forceDeleteMoodEntry(entryId: string): Promise<void> {
    try {
      console.log('🔥 FORCE DELETING mood entry from local storage:', entryId);
      
      // 🚀 CRITICAL: Mark entry as deleted in cache FIRST to prevent re-add
      const userId = await this.getCurrentUserId();
      if (userId) {
        const { moodDeletionCache } = await import('@/services/moodDeletionCache');
        await moodDeletionCache.markAsDeleted(entryId, userId, 'cleanup');
        console.log('✅ Entry marked in deletion cache (FORCE mode)');
      }
      
      let deletionSuccess = false;
      let keysProcessed = 0;
      
      // 1. Get ALL storage keys (not just recent dates)
      const allStorageKeys = await AsyncStorage.getAllKeys();
      const moodKeys = allStorageKeys.filter(key => 
        key.includes('mood_entries') || key.includes(this.STORAGE_KEY)
      );
      
      console.log(`🔍 Force deletion: Found ${moodKeys.length} potential mood storage keys`);
      
      // 2. Process each key
      for (const storageKey of moodKeys) {
        keysProcessed++;
        const existing = await AsyncStorage.getItem(storageKey);
        
        if (existing) {
          try {
            let entries: any[] = JSON.parse(existing);
            let originalCount = entries.length;
            
            // Handle encrypted format
            if (entries.length > 0 && entries[0].storageVersion === 2) {
              console.log(`🔍 Processing encrypted storage key: ${storageKey}`);
              
              // Decrypt, filter, and re-encrypt
              const decryptedEntries: MoodEntry[] = [];
              for (const rawEntry of entries) {
                const decrypted = await this.decryptMoodEntry(rawEntry);
                if (decrypted && decrypted.id !== entryId) {
                  decryptedEntries.push(decrypted);
                }
              }
              
              // Re-encrypt remaining entries
              if (decryptedEntries.length > 0) {
                const encryptedEntries = [];
                for (const entry of decryptedEntries) {
                  const sensitiveData = {
                    notes: entry.notes || '',
                    triggers: entry.triggers || [],
                    activities: entry.activities || []
                  };
                  
                  const encryptedData = await secureDataService.encryptSensitiveData(sensitiveData);
                  
                  const encryptedEntry = {
                    metadata: {
                      id: entry.id,
                      user_id: entry.user_id,
                      mood_score: entry.mood_score,
                      energy_level: entry.energy_level,
                      anxiety_level: entry.anxiety_level,
                      timestamp: entry.timestamp,
                      synced: entry.synced,
                      sync_attempts: entry.sync_attempts,
                      last_sync_attempt: entry.last_sync_attempt,
                    },
                    encryptedData,
                    storageVersion: 2
                  };
                  
                  encryptedEntries.push(encryptedEntry);
                }
                await AsyncStorage.setItem(storageKey, JSON.stringify(encryptedEntries));
              } else {
                await AsyncStorage.removeItem(storageKey);
                console.log(`🗑️ Removed empty encrypted storage key: ${storageKey}`);
              }
              
              if (originalCount > decryptedEntries.length) {
                console.log(`🔥 FORCE DELETED from encrypted key ${storageKey}: ${originalCount} -> ${decryptedEntries.length}`);
                deletionSuccess = true;
              }
              
            } else {
              // Handle plain format
              console.log(`🔍 Processing plain storage key: ${storageKey}`);
              const filteredEntries = entries.filter((entry: any) => entry.id !== entryId);
              
              if (filteredEntries.length !== originalCount) {
                if (filteredEntries.length > 0) {
                  await AsyncStorage.setItem(storageKey, JSON.stringify(filteredEntries));
                } else {
                  await AsyncStorage.removeItem(storageKey);
                  console.log(`🗑️ Removed empty plain storage key: ${storageKey}`);
                }
                console.log(`🔥 FORCE DELETED from plain key ${storageKey}: ${originalCount} -> ${filteredEntries.length}`);
                deletionSuccess = true;
              }
            }
            
          } catch (processError) {
            console.warn(`⚠️ Failed to process storage key ${storageKey}:`, processError);
          }
        }
      }
      
      // 3. Clear any caches or temporary data
      try {
        const cacheKeys = allStorageKeys.filter(key => 
          key.includes('cache') && key.includes('mood')
        );
        for (const cacheKey of cacheKeys) {
          await AsyncStorage.removeItem(cacheKey);
          console.log(`🧹 Cleared mood cache: ${cacheKey}`);
        }
      } catch (cacheError) {
        console.warn('⚠️ Failed to clear mood caches:', cacheError);
      }
      
      console.log(`🔥 Force deletion summary:`);
      console.log(`   Keys processed: ${keysProcessed}`);
      console.log(`   Deletion success: ${deletionSuccess}`);
      
      if (deletionSuccess) {
        console.log('✅ FORCE DELETION completed successfully');
        // Invalidate chart caches for current user
        try { if (userId) moodDataLoader.invalidate(userId); } catch {}
      } else {
        console.warn('⚠️ FORCE DELETION: Entry not found in any storage key');
      }
      
    } catch (error) {
      console.error('❌ FORCE DELETE failed:', error);
      throw error;
    }
  }

  /**
   * Delete mood entry from local storage
   * ENHANCED: Better logging and verification
   */
  async deleteMoodEntry(entryId: string): Promise<void> {
    try {
      console.log('🗑️ Starting mood entry deletion from local storage:', entryId);
      
      // 🚀 CRITICAL: Mark entry as deleted in cache FIRST to prevent re-add
      const userId = await this.getCurrentUserId();
      if (userId) {
        const { moodDeletionCache } = await import('@/services/moodDeletionCache');
        await moodDeletionCache.markAsDeleted(entryId, userId, 'user_initiated');
        console.log('✅ Entry marked in deletion cache to prevent re-add');
      }
      
      let entryFound = false;
      let totalKeysChecked = 0;
      let keysWithData = 0;

      // 🆔 ID MAPPING: Support both UUID (remote) and local ID (mood_xxx) formats
      const isUUIDFormat = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(entryId);
      const isLocalFormat = entryId.startsWith('mood_');
      
      console.log(`🔍 Delete ID analysis: ${entryId} (UUID: ${isUUIDFormat}, Local: ${isLocalFormat})`);
      
      // If we have a UUID, try to find corresponding local_id
      let localIdToSearch = entryId;
      if (isUUIDFormat) {
        try {
          // Search for entry with this remote_id to get local_id
          if (!userId) {
            console.error('❌ No user ID available for getMoodEntries - cannot proceed with deletion');
            throw new Error('User authentication required for mood entry operations');
          }
          const allEntries = await this.getMoodEntries(userId, 30);
          const matchingEntry = allEntries.find(entry => 
            entry.remote_id === entryId || entry.id === entryId
          );
          
          if (matchingEntry && matchingEntry.local_id) {
            localIdToSearch = matchingEntry.local_id;
            console.log(`🔄 Found local ID mapping: ${entryId} → ${localIdToSearch}`);
          } else if (matchingEntry) {
            localIdToSearch = matchingEntry.id;
            console.log(`🔄 Using entry.id as fallback: ${localIdToSearch}`);
          }
        } catch (mappingError) {
          console.warn('⚠️ ID mapping lookup failed, will search with original ID:', mappingError);
        }
      }
      
      // 🚨 CRITICAL FIX: Use same storage access method as getMoodEntries
      // This ensures deletion finds entries in the same locations where getMoodEntries finds them
      console.log('🔍 Using consistent storage access method for deletion...');
      
      // First try optimized storage (same as getMoodEntries)
      try {
        if (!userId) {
          console.error('❌ No user ID available for optimized query - cannot proceed');
          throw new Error('User authentication required for mood entry operations');
        }
        const optimizedEntries = await optimizedStorage.queryMoodEntries(userId, {
          sortBy: 'timestamp',
          sortOrder: 'desc'
        });
        
        if (optimizedEntries.length > 0) {
          console.log(`🔍 Found ${optimizedEntries.length} entries via optimized storage, checking for deletion target`);
          
          const entryToDelete = optimizedEntries.find(entry => 
            entry.id === entryId || 
            entry.local_id === entryId || 
            entry.remote_id === entryId
          );
          
          if (entryToDelete) {
            console.log(`✅ Found entry to delete via optimized storage: ${entryToDelete.id}`);
            
            // Mark entry as found and proceed with manual deletion
            entryFound = true;
            console.log(`🎯 Target entry details:`, {
              id: entryToDelete.id,
              local_id: entryToDelete.local_id,
              remote_id: entryToDelete.remote_id,
              timestamp: entryToDelete.timestamp
            });
            
            // 🚨 CRITICAL FIX: Manual deletion since optimizedStorage.deleteMoodEntry not implemented
            // Clear from regular AsyncStorage using same logic as getMoodEntries
            const entryDate = new Date(entryToDelete.timestamp);
            const localDateKey = this.getLocalDateKey(entryDate);
            const storageKey = `${this.STORAGE_KEY}_${userId}_${localDateKey}`;
            
            const existing = await AsyncStorage.getItem(storageKey);
            if (existing) {
              try {
                let entries = JSON.parse(existing);
                const originalCount = entries.length;
                
                // Filter out the entry (handle both encrypted and plain formats)
                if (entries.length > 0 && entries[0].storageVersion === 2) {
                  // Encrypted format
                  entries = entries.filter((e: any) => {
                    const metadata = e.metadata || {};
                    return !(
                      metadata.id === entryId ||
                      metadata.local_id === entryId ||
                      metadata.remote_id === entryId
                    );
                  });
                } else {
                  // Plain format
                  entries = entries.filter((e: any) => !(
                    e.id === entryId ||
                    e.local_id === entryId ||
                    e.remote_id === entryId
                  ));
                }
                
                if (entries.length === 0) {
                  await AsyncStorage.removeItem(storageKey);
                  console.log(`🗑️ Removed empty storage key: ${storageKey}`);
                } else {
                  await AsyncStorage.setItem(storageKey, JSON.stringify(entries));
                  console.log(`🔄 Updated storage key: ${storageKey} (${originalCount} → ${entries.length})`);
                }
              } catch (error) {
                console.error(`❌ Failed to process storage key ${storageKey}:`, error);
              }
            }
            
            // 🧹 ADDITIONAL CLEANUP: Clear from optimized storage cache/index
            try {
              await optimizedStorage.clearMemoryCache();
              console.log('🧹 Optimized storage cache cleared after deletion');
            } catch (cacheError) {
              console.warn('⚠️ Cache clear failed:', cacheError);
            }
            
            console.log('✅ Entry successfully deleted via consistent storage method');
            // Invalidate chart caches before returning
            try { if (userId) moodDataLoader.invalidate(userId); } catch {}
            return; // Early return on success
          }
        }
        
        console.log('🔍 Entry not found in optimized storage, falling back to traditional scan');
      } catch (error) {
        console.warn('⚠️ Optimized storage deletion failed, using traditional method:', error);
      }
      
      // Fallback: Traditional storage scan
      const allKeys = await this.getAllMoodStorageKeys();
      console.log(`🔍 Fallback: Checking ${allKeys.length} storage keys for entry ${entryId}`);
      
      for (const storageKey of allKeys) {
        totalKeysChecked++;
        const existing = await AsyncStorage.getItem(storageKey);
        
        if (existing) {
          keysWithData++;
          try {
            // Handle both encrypted (v2) and plain (v1) storage formats
            let entries: any[] = JSON.parse(existing);
            
            // Check if this is encrypted format
            if (entries.length > 0 && entries[0].storageVersion === 2) {
              // Encrypted format - need to decrypt to check IDs
              const decryptedEntries: MoodEntry[] = [];
              for (const rawEntry of entries) {
                const decrypted = await this.decryptMoodEntry(rawEntry);
                if (decrypted) {
                  decryptedEntries.push(decrypted);
                }
              }
              entries = decryptedEntries;
            }
            
            const originalCount = entries.length;
            // 🆔 ENHANCED FILTERING: Check both original entryId and mapped localIdToSearch
            const filteredEntries = entries.filter((entry: any) => {
              const entryMatches = (
                entry.id === entryId || 
                entry.id === localIdToSearch ||
                entry.local_id === entryId ||
                entry.remote_id === entryId
              );
              return !entryMatches; // Keep entries that DON'T match
            });
            
            // If entries were removed, update storage
            if (filteredEntries.length !== originalCount) {
              console.log(`🔍 Found entry ${entryId} in ${storageKey} (${originalCount} -> ${filteredEntries.length})`);
              
              if (filteredEntries.length > 0) {
                // Re-encrypt if necessary and save
                if (entries.length > 0 && (entries[0] as any).storageVersion === 2) {
                  // Need to re-encrypt the remaining entries
                  const encryptedEntries = [];
                  for (const entry of filteredEntries) {
                    const sensitiveData = {
                      notes: entry.notes || '',
                      triggers: entry.triggers || [],
                      activities: entry.activities || []
                    };
                    
                    const encryptedData = await secureDataService.encryptSensitiveData(sensitiveData);
                    
                    const encryptedEntry = {
                      metadata: {
                        id: entry.id,
                        user_id: entry.user_id,
                        mood_score: entry.mood_score,
                        energy_level: entry.energy_level,
                        anxiety_level: entry.anxiety_level,
                        timestamp: entry.timestamp,
                        synced: entry.synced,
                        sync_attempts: entry.sync_attempts,
                        last_sync_attempt: entry.last_sync_attempt,
                      },
                      encryptedData,
                      storageVersion: 2
                    };
                    
                    encryptedEntries.push(encryptedEntry);
                  }
                  await AsyncStorage.setItem(storageKey, JSON.stringify(encryptedEntries));
                } else {
                  // Plain format
                  await AsyncStorage.setItem(storageKey, JSON.stringify(filteredEntries));
                }
              } else {
                await AsyncStorage.removeItem(storageKey); // Remove empty date entry
                console.log(`🗑️ Removed empty storage key: ${storageKey}`);
              }
              
              console.log(`✅ Entry ${entryId} removed from storage key: ${storageKey}`);
              entryFound = true;
              // Don't break - entry might exist in multiple places due to sync issues
            }
          } catch (parseError) {
            console.warn(`⚠️ Failed to process storage key ${storageKey}:`, parseError);
          }
        }
      }

      // Also try to remove from the main storage key (fallback for old format)
      const mainKey = this.STORAGE_KEY;
      const mainData = await AsyncStorage.getItem(mainKey);
      if (mainData) {
        try {
          const entries: MoodEntry[] = JSON.parse(mainData);
          const filteredEntries = entries.filter(entry => entry.id !== entryId);
          
          if (filteredEntries.length !== entries.length) {
            if (filteredEntries.length > 0) {
              await AsyncStorage.setItem(mainKey, JSON.stringify(filteredEntries));
            } else {
              await AsyncStorage.removeItem(mainKey);
            }
            console.log(`✅ Removed entry ${entryId} from main storage`);
            entryFound = true;
          }
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse data from main storage:`, parseError);
        }
      }

      // Final summary
      console.log(`📊 Deletion summary for ${entryId}:`);
      console.log(`   Keys checked: ${totalKeysChecked}`);
      console.log(`   Keys with data: ${keysWithData}`);
      console.log(`   Entry found and deleted: ${entryFound}`);
      
      if (entryFound) {
        console.log('✅ Successfully deleted mood entry from local storage');
      } else {
        console.warn(`⚠️ Entry ${entryId} not found in local storage - might have been already deleted or ID mismatch`);
      }
      // Regardless of path, invalidate chart caches for this user so any potential change reflects
      try { if (userId) moodDataLoader.invalidate(userId); } catch {}
      
    } catch (error) {
      console.error('❌ Failed to delete mood entry from local storage:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Auto-recover unsynchronized mood entries on app startup
   * This method should be called during app initialization to ensure no mood data is lost
   */
  async autoRecoverUnsyncedEntries(userId: string): Promise<{ recovered: number; failed: number }> {
    if (!userId) {
      console.warn('⚠️ autoRecoverUnsyncedEntries: userId is required');
      return { recovered: 0, failed: 0 };
    }

    try {
      console.log('🔄 Auto-recovering unsynced mood entries...');
      
      const unsyncedEntries = await this.getUnsyncedEntries(userId);
      if (unsyncedEntries.length === 0) {
        console.log('✅ No unsynced mood entries found');
        return { recovered: 0, failed: 0 };
      }

      console.log(`📊 Found ${unsyncedEntries.length} unsynced mood entries, adding to offline sync queue...`);
      
      let recovered = 0;
      let failed = 0;
      
      // Add unsynced entries to offline sync queue for automatic processing
      const { offlineSyncService } = await import('@/services/offlineSync');
      
      let invalidEntries = 0;
      const validEntries: MoodEntry[] = [];
      const invalidIds: string[] = [];

      // ✅ PRE-VALIDATE entries before adding to sync queue
      for (const entry of unsyncedEntries) {
        const isValid = entry.user_id && 
                       entry.mood_score !== undefined && 
                       entry.mood_score !== null &&
                       typeof entry.mood_score === 'number';
        
        if (!isValid) {
          console.warn(`🚫 Skipping invalid mood entry during auto-recovery:`, {
            id: entry.id,
            hasUserId: !!entry.user_id,
            hasMoodScore: entry.mood_score !== undefined,
            moodScoreType: typeof entry.mood_score,
            moodScoreValue: entry.mood_score
          });
          invalidEntries++;
          invalidIds.push(entry.id);
        } else {
          validEntries.push(entry);
        }
      }

      // ✅ Process only valid entries
      for (const entry of validEntries) {
        try {
          await offlineSyncService.addToSyncQueue({
            type: 'CREATE',
            entity: 'mood_entry',
            data: {
              user_id: entry.user_id,
              mood_score: entry.mood_score,
              energy_level: entry.energy_level,
              anxiety_level: entry.anxiety_level,
              notes: entry.notes || '',
              triggers: entry.triggers || [],
              activities: entry.activities || [],
              timestamp: entry.timestamp,
              local_entry_id: entry.id
            },
            priority: 'high' as any,
            deviceId: await AsyncStorage.getItem('device_id') || 'unknown_device'
          });
          recovered++;
        } catch (error) {
          console.error(`❌ Failed to queue mood entry ${entry.id}:`, error);
          failed++;
        }
      }

      // 🧹 CLEANUP: Remove invalid entries from local storage to prevent future issues
      if (invalidEntries > 0) {
        console.log(`🧹 Cleaning up ${invalidEntries} invalid mood entries from local storage...`);
        await this.cleanupInvalidEntries(userId, invalidIds);
      }

      console.log(`✅ Auto-recovery complete: ${recovered} queued, ${failed} failed${invalidEntries > 0 ? `, ${invalidEntries} invalid entries cleaned` : ''}`);

      // Track recovery telemetry
      try {
        // 🚫 AI Telemetry - DISABLED (Hard Stop AI Cleanup)
        // const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
        // await trackAIInteraction(AIEventType.SYSTEM_STATUS, {
        //   event: 'mood_auto_recovery_completed',
        //   userId: userId,
        //   totalUnsynced: unsyncedEntries.length,
        //   recovered: recovered,
        //   failed: failed,
        //   invalidEntries: invalidEntries,
        //   cleanupPerformed: invalidEntries > 0
        // });
      } catch {}

      return { recovered, failed };
      
    } catch (error) {
      console.error('❌ Auto-recovery failed:', error);
      return { recovered: 0, failed: 0 };
    }
  }

  /**
   * 🧹 Clean up invalid mood entries from local storage
   * Removes entries that are missing required fields (user_id, mood_score)
   */
  private async cleanupInvalidEntries(userId: string, invalidIds: string[]): Promise<number> {
    let cleanedCount = 0;
    
    try {
      const dates = await this.getRecentDates(30); // Check last 30 days
      
      for (const date of dates) {
        const key = `${this.STORAGE_KEY}_${userId}_${date}`;
        const existing = await AsyncStorage.getItem(key);
        
        if (existing) {
          const entries: MoodEntry[] = JSON.parse(existing);
          const originalCount = entries.length;
          
          // Filter out invalid entries
          const validEntries = entries.filter(entry => {
            const isInvalid = invalidIds.includes(entry.id);
            if (isInvalid) {
              console.log(`🗑️ Removing invalid entry ${entry.id} from ${date}`);
              cleanedCount++;
            }
            return !isInvalid;
          });
          
          // Save the cleaned data back to storage
          if (validEntries.length !== originalCount) {
            if (validEntries.length === 0) {
              await AsyncStorage.removeItem(key);
              console.log(`🗑️ Removed empty storage key: ${key}`);
            } else {
              await AsyncStorage.setItem(key, JSON.stringify(validEntries));
              console.log(`🧹 Updated ${key}: ${originalCount} → ${validEntries.length} entries`);
            }
          }
        }
      }
      
      console.log(`✅ Cleanup complete: Removed ${cleanedCount} invalid mood entries from local storage`);
      
      // Track cleanup telemetry
      try {
        // 🚫 AI Telemetry - DISABLED (Hard Stop AI Cleanup)
        // const { trackAIInteraction, AIEventType } = await import('@/features/ai/telemetry/aiTelemetry');
        // await trackAIInteraction(AIEventType.SYSTEM_STATUS, {
        //   event: 'mood_storage_cleanup',
        //   userId,
        //   cleanedCount,
        //   invalidIds: invalidIds.slice(0, 5) // Only log first 5 IDs for privacy
        // });
      } catch (telemetryError) {
        console.log('Failed to track cleanup telemetry:', telemetryError);
      }
      
    } catch (error) {
      console.error('❌ Failed to cleanup invalid entries:', error);
    }
    
    return cleanedCount;
  }

  /**
   * Helper: Get all mood-related storage keys
   * Scans AsyncStorage for keys matching mood entry pattern
   */
  private async getAllMoodStorageKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const moodKeys = allKeys.filter(key => key.startsWith(this.STORAGE_KEY));
      console.log(`📦 Found ${moodKeys.length} mood storage keys`);
      
      // 🔍 DEBUG: Show which keys were found for deletion debugging  
      if (moodKeys.length > 0) {
        console.log('🔍 Mood storage keys for deletion scan:', moodKeys.slice(0, 5));
      }
      
      return moodKeys;
    } catch (error) {
      console.error('❌ Failed to get mood storage keys:', error);
      return [];
    }
  }


}

export const moodTracker = MoodTrackingService.getInstance();
export default moodTracker;
