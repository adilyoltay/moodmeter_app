import AsyncStorage from '@react-native-async-storage/async-storage';

import { deriveFeatureFlags, applyReminderRule } from '@/features/onboarding/lib/deriveFeatureFlags';
import supabaseService from '@/services/supabase';
import moodTracker from '@/services/moodTrackingService';
import { NotificationScheduler } from '@/services/notificationScheduler';
import { isUUID } from '@/utils/validators';

import type { CompletionSlice, SliceCreator } from './types';
import { STORAGE_KEYS } from './utils/storageKeys';
import { trackOnboardingCompletion, trackOnboardingPersistence, trackOnboardingEvent } from './utils/telemetry';

type CompletionResult = {
  success: boolean;
  criticalErrors: string[];
  warnings: string[];
};

const persistFeatureFlags = (
  set: Parameters<SliceCreator<CompletionSlice>>[0],
) => {
  const unsafeSet = set as unknown as (updater: (state: any) => any) => void;
  unsafeSet((state: any) => {
    const baseFlags = deriveFeatureFlags(state.payload?.motivation || []);
    const withReminder = applyReminderRule(baseFlags, state.payload?.reminders?.enabled);

    if (state.payload?.health?.status === 'granted') {
      withReminder.healthkit_sync = true;
      withReminder.sleep_energy_cards = true;
    }

    return {
      payload: {
        ...state.payload,
        feature_flags: withReminder,
      },
    };
  });
};

export const createCompletionSlice: SliceCreator<CompletionSlice> = (set, get) => ({
  completedAt: undefined,

  finalizeFlags() {
    trackOnboardingEvent('onboarding.finalize_flags');
    persistFeatureFlags(set);

    const schedulePersist = (get() as any)?.schedulePersist;
    if (typeof schedulePersist === 'function') {
      schedulePersist();
    }
  },

  async complete(userId: string) {
    const state = get() as any;
    const payload = state.payload;
    const startedAt = state.startedAt;

    const durationMs = Date.now() - (typeof startedAt === 'number' ? startedAt : Date.now());
    const result: CompletionResult = { success: true, criticalErrors: [], warnings: [] };

    console.log('🔄 Starting enhanced onboarding completion...');

    // STEP 1: Persist latest payload + step snapshot
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.PAYLOAD, JSON.stringify(payload)),
        AsyncStorage.setItem(STORAGE_KEYS.STEP, '6'),
      ]);
      console.log('✅ V2 Local persistence completed');
    } catch (error) {
      const errorMsg = 'Local storage persistence failed';
      result.criticalErrors.push(errorMsg);
      console.error('❌ CRITICAL:', errorMsg, error);
    }

    // STEP 2: Resolve UID (critical)
    let uidForKey = userId;
    if (!isUUID(uidForKey)) {
      try {
        const { default: svc } = await import('@/services/supabase');
        const current = (svc as any)?.getCurrentUser?.() || (svc as any)?.currentUser || null;
        if (current && typeof current === 'object' && current.id) uidForKey = current.id;
      } catch {}

      if (!isUUID(uidForKey)) {
        const stored = await AsyncStorage.getItem('currentUserId');
        if (stored && isUUID(stored)) uidForKey = stored;
      }
    }

    if (!isUUID(uidForKey)) {
      const errorMsg = 'Unable to resolve valid user ID';
      result.criticalErrors.push(errorMsg);
      result.success = false;
      console.error('❌ CRITICAL:', errorMsg);
      return result;
    }

    // STEP 3: Store legacy snapshot for backwards compatibility
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LEGACY_SNAPSHOT,
        JSON.stringify({ userId: uidForKey, payload, savedAt: new Date().toISOString() }),
      );
      console.log('✅ User-specific storage completed');
    } catch (error) {
      const errorMsg = 'User-specific storage failed';
      result.criticalErrors.push(errorMsg);
      console.error('❌ CRITICAL:', errorMsg, error);
    }

    // STEP 4: Save baseline mood if available
    if (payload?.first_mood?.score) {
      try {
        const saveResult = await moodTracker.saveMoodEntry({
          user_id: uidForKey,
          mood_score: Math.max(10, Math.min(100, payload.first_mood.score * 20)),
          energy_level: 5,
          anxiety_level: 5,
          notes: 'İlk onboarding ruh hali kaydı - Baseline ölçüm',
          triggers: payload.first_mood.tags || [],
          activities: [],
          source: 'onboarding' as any,
        } as any);

        if (saveResult?.status === 'QUEUED_OFFLINE') {
          console.log('ℹ️ First mood entry queued for offline sync');
        } else {
          console.log('✅ First mood entry saved successfully');
        }
      } catch (error) {
        const errorMsg = 'First mood entry save failed';
        result.criticalErrors.push(errorMsg);
        console.error('❌ CRITICAL:', errorMsg, error);

        trackOnboardingPersistence('mood_save_failed', {
          userId: uidForKey,
          moodScore: payload.first_mood.score,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // STEP 5: Queue Supabase sync and attempt direct sync
    try {
      const { offlineSyncService } = await import('@/services/offlineSync');
      await offlineSyncService.addToSyncQueue({
        type: 'CREATE',
        entity: 'user_profile',
        data: { payload, userId: uidForKey },
        priority: 'critical' as any,
      });
      console.log('🛡️ Profile data proactively queued for offline sync (insurance)');
    } catch (queueError) {
      console.error('❌ CRITICAL: Failed to queue profile for offline sync:', queueError);

      try {
        const { onboardingSyncErrorService } = await import('@/features/ai-fallbacks/onboardingSyncErrorService');
        await onboardingSyncErrorService.trackSyncError(
          uidForKey,
          'queue_failed',
          `Queue failed: ${queueError.message || 'Unknown error'}`,
          {
            showAlert: true,
            showNotification: true,
            immediate: true,
            delay: 10000,
          },
        );
      } catch (trackingError) {
        console.error('Failed to track queue error:', trackingError);
      }

      result.criticalErrors.push('Profile queue failed - user will be notified and retry scheduled');
    }

    try {
      await state.syncToSupabase(uidForKey);
      console.log('✅ Supabase profile sync completed');

      await AsyncStorage.setItem('last_profile_sync', new Date().toISOString());
      try {
        await AsyncStorage.setItem(`onboarding_server_confirmed_${uidForKey}`, 'true');
      } catch {}

      try {
        const serverProfile = await supabaseService.getUserProfile(uidForKey, { forceRefresh: true, cacheMs: 0 });
        if (serverProfile) {
          await AsyncStorage.setItem(
            `user_profile_snapshot_${uidForKey}`,
            JSON.stringify({ user_id: uidForKey, fetchedAt: new Date().toISOString(), data: serverProfile }),
          );
          console.log('🗄️ Cached server user_profile snapshot');
        }
      } catch (snapErr) {
        console.warn('⚠️ Failed to cache server profile snapshot:', snapErr);
      }
    } catch (error) {
      const errorMsg = 'Supabase profile sync failed (queued for retry)';
      console.warn('⚠️ WARNING:', errorMsg, error);

      try {
        const { onboardingSyncErrorService } = await import('@/features/ai-fallbacks/onboardingSyncErrorService');
        await onboardingSyncErrorService.trackSyncError(
          uidForKey,
          'supabase_failed',
          `Supabase sync failed: ${error.message || 'Network or server error'}`,
          {
            showNotification: true,
            immediate: true,
            delay: 30000,
            persistError: true,
          },
        );
      } catch (trackingError) {
        console.error('Failed to track Supabase error:', trackingError);
      }

      result.warnings.push('Profile sync will complete when network is stable (you\'ll be notified)');
      console.log('📋 Profile will sync when network is available (already queued with error tracking)');
    }

    // STEP 6: Schedule notifications if enabled
    if (payload?.reminders?.enabled && payload.reminders.time) {
      try {
        const [h, m] = (payload.reminders.time || '09:00').split(':').map(Number);
        const now = new Date();
        const scheduleAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 9, m || 0, 0);
        await NotificationScheduler.scheduleDailyMoodReminder(scheduleAt);
        console.log('✅ Daily reminder scheduled successfully');
      } catch (error) {
        const warningMsg = 'Notification scheduling failed (can be enabled later in settings)';
        result.warnings.push(warningMsg);
        console.warn('⚠️ WARNING:', warningMsg, error);
      }
    }

    // STEP 7: Merge progressive insights & cleanup caches
    try {
      console.log('🤖 Generating comprehensive AI profile from onboarding data...');
      const progressiveInsights = (await state.collectProgressiveInsights()) as Record<string, any>;
      console.log(`🔍 Collected ${Object.keys(progressiveInsights).length} progressive insight sets`);

      console.log('✅ Completing onboarding without AI analysis (AI disabled)');
      const aiResult = state.generateFallbackProfile(payload, progressiveInsights, uidForKey) as Record<string, any> | undefined;

      const insightsArray = Array.isArray(aiResult?.insights) ? (aiResult.insights as any[]) : [];
      const patternsArray = Array.isArray(aiResult?.patterns) ? (aiResult.patterns as any[]) : [];

      const comprehensiveProfile = {
        insights: insightsArray,
        patterns: patternsArray,
        baseline: {
          moodInsights: progressiveInsights.mood || [],
          motivationAnalysis: progressiveInsights.motivation || [],
          personalizedGoals: Array.isArray((progressiveInsights.motivation as any)?.personalizedGoals)
            ? (progressiveInsights.motivation as any).personalizedGoals
            : [],
        },
        generatedAt: new Date().toISOString(),
        source: 'onboarding_completion_enhanced',
        profileVersion: '2.0',
        dataPoints: {
          motivations: payload?.motivation?.length || 0,
          firstMoodScore: payload?.first_mood?.score,
          lifestyleData: !!payload?.lifestyle,
          remindersEnabled: payload?.reminders?.enabled || false,
        },
      };

      console.log('ℹ️ Skipping AI profile caching (AI disabled)');

      if (comprehensiveProfile.insights.length > 0) {
        await AsyncStorage.setItem(
          `onboarding_completed_${uidForKey}`,
          JSON.stringify({
            insights: comprehensiveProfile.insights,
            fromOnboarding: true,
            generatedAt: new Date().toISOString(),
            aiDisabled: true,
          }),
        );
      }

      console.log('✅ Comprehensive AI profile generated and cached');
      console.log(`📊 Profile stats: ${insightsArray.length} insights, ${patternsArray.length} patterns`);

      await state.cleanupProgressiveCache();
    } catch (error) {
      const warningMsg = 'AI profile generation failed (non-critical)';
      result.warnings.push(warningMsg);
      console.warn('⚠️ WARNING:', warningMsg, error);
    }

    // STEP 8: Telemetry
    try {
      trackOnboardingCompletion({
        userId: uidForKey,
        durationMs,
        steps: (state.step ?? 0) + 1,
        motivations: payload?.motivation,
        hasReminder: !!payload?.reminders?.enabled,
        criticalErrorCount: result.criticalErrors.length,
        warningCount: result.warnings.length,
        success: result.success,
      });
      console.log('✅ Completion analytics tracked');
    } catch (error) {
      const warningMsg = 'Analytics tracking failed (telemetry issue)';
      result.warnings.push(warningMsg);
      console.warn('⚠️ Warning:', warningMsg, error);
    }

    if (result.criticalErrors.length > 0) {
      result.success = false;
      console.error(`❌ Onboarding completion had ${result.criticalErrors.length} critical errors`);
      console.error('🚫 Completion flags NOT set due to critical errors - user can retry onboarding');
    } else {
      console.log(`✅ Onboarding completion successful! ${result.warnings.length} warnings (non-critical)`);
      try {
        await AsyncStorage.setItem('ai_onboarding_completed', 'true');
        await AsyncStorage.setItem('ai_onboarding_completed_at', new Date().toISOString());
        await AsyncStorage.setItem(`ai_onboarding_completed_${uidForKey}`, 'true');
        await AsyncStorage.setItem(`onboarding_server_confirmed_${uidForKey}`, 'true');
        console.log('🎯 Completion flags set successfully - user can now access main app');
      } catch (flagError) {
        console.error('❌ Failed to set completion flags:', flagError);
        result.warnings.push('Completion flags failed to set - may need manual intervention');
      }
    }

    const completedAt = new Date().toISOString();
    set({ completedAt } as Partial<CompletionSlice>);

    return result;
  },

  resetAll() {
    set({ completedAt: undefined } as Partial<CompletionSlice>);
  },
});

export default createCompletionSlice;
