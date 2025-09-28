import supabaseService from '@/services/supabase';
import type { OnboardingPayload } from '@/features/onboarding/types';

export const syncProfileToSupabase = async (userId: string, payload: OnboardingPayload) => {
  await supabaseService.upsertUserProfile(userId, payload);
  console.log('☁️ Onboarding data synced to Supabase');

  if (payload.feature_flags) {
    const meta = {
      metadata: {
        feature_flags: payload.feature_flags,
        onboarding_v1: {
          motivation: payload.motivation,
          lifestyle: payload.lifestyle || {},
          reminders: payload.reminders || { enabled: false },
          version: payload.meta?.version || 1,
          created_at: payload.meta?.created_at || new Date().toISOString(),
        },
      },
    } as const;
    await supabaseService.updateUser(userId, meta as any);
    console.log('☁️ User metadata updated with feature flags');
  }
};

export const enqueueOfflineSyncFallback = async (
  userId: string,
  payload: OnboardingPayload,
) => {
  try {
    const { offlineSyncService } = await import('@/services/offlineSync');
    await offlineSyncService.addToSyncQueue({
      entity: 'user_profile',
      type: 'UPDATE',
      data: { payload, userId },
    });
    console.log('📥 Onboarding data added to offline sync queue');
  } catch (queueError) {
    console.error('❌ Failed to add onboarding data to sync queue:', queueError);
  }
};
