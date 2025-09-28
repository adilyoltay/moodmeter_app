import { isUUID } from '@/utils/validators';
import type { PersistenceSlice, SliceCreator } from './types';
import { PersistTimer } from './utils/timers';
import {
  readStoredPayload,
  readStoredStep,
  readLegacySnapshot,
  persistOnboardingState,
  clearOnboardingStorage,
} from './utils/persistence';
import { createInitialOnboardingPayload } from './utils/payload';
import { trackOnboardingPersistence } from './utils/telemetry';
import { syncProfileToSupabase, enqueueOfflineSyncFallback } from './utils/supabase';

const DEFAULT_TOTAL_STEPS = 6;

export const createPersistenceSlice: SliceCreator<PersistenceSlice> = (set, get) => {
  const timer = new PersistTimer();
  const getState = () => get() as any;

  const bootstrap = (step: number, startedAt: number, options?: { isHydrated?: boolean; isLoading?: boolean }) => {
    const state = getState();
    const totalSteps = state.totalSteps ?? DEFAULT_TOTAL_STEPS;
    state.bootstrap?.(totalSteps, {
      step,
      startedAt,
      isHydrated: options?.isHydrated,
      isLoading: options?.isLoading,
    });
  };

  const clampStep = (value: number, totalSteps: number) => {
    const safeTotal = Math.max(1, Math.floor(Number.isFinite(totalSteps) ? totalSteps : DEFAULT_TOTAL_STEPS));
    return Math.min(Math.max(Math.floor(value) || 0, 0), safeTotal - 1);
  };

  return {
    lastPersistedAt: undefined,
    async hydrateFromStorage(userId?: string) {
      set({ isLoading: true, isHydrated: false } as Partial<PersistenceSlice>);

      try {
        const [storedPayload, storedStep] = await Promise.all([
          readStoredPayload(),
          readStoredStep(),
        ]);

        let restoredPayload = storedPayload;
        let restoredStep = storedStep ?? 0;

        const legacySnapshot = await readLegacySnapshot(userId);
        if (legacySnapshot) {
          restoredPayload = legacySnapshot;
        }

        if (restoredPayload) {
          const payload = restoredPayload;

          let derivedStep = 0;
          if (payload.motivation?.length) derivedStep = Math.max(derivedStep, 1);
          if (payload.first_mood) derivedStep = Math.max(derivedStep, 2);
          if (payload.lifestyle) derivedStep = Math.max(derivedStep, 3);
          if (payload.reminders) derivedStep = Math.max(derivedStep, 4);
          if (payload.feature_flags) derivedStep = Math.max(derivedStep, 5);

          const state = getState();
          bootstrap(
            clampStep(Math.max(derivedStep, restoredStep), state.totalSteps ?? DEFAULT_TOTAL_STEPS),
            payload.meta?.created_at ? new Date(payload.meta.created_at).getTime() : Date.now(),
            { isHydrated: true, isLoading: false },
          );

          set({ payload } as any);
          const combinedState = getState();
          trackOnboardingPersistence('hydrate_success', {
            source: legacySnapshot ? 'legacy_snapshot' : 'storage',
            step: combinedState.step,
          });
        } else {
          bootstrap(0, Date.now(), { isHydrated: true, isLoading: false });
          set({ payload: createInitialOnboardingPayload() } as any);
          trackOnboardingPersistence('hydrate_empty');
        }
      } catch (error) {
        console.error('❌ Onboarding hydration failed:', error);
        const combinedState = getState();
        bootstrap(combinedState.step ?? 0, combinedState.startedAt ?? Date.now(), { isHydrated: true, isLoading: false });
        trackOnboardingPersistence('hydrate_failure', { error: String(error) });
     }
    },
    async persistToStorage() {
      try {
        const state = getState();
        const { payload, step } = state;
        await persistOnboardingState(payload, step ?? 0);
        set({ lastPersistedAt: Date.now() } as Partial<PersistenceSlice>);
        trackOnboardingPersistence('persist_success', { step });
      } catch (error) {
        console.error('❌ Failed to persist onboarding data:', error);
        trackOnboardingPersistence('persist_failure', { error: String(error) });
      }
    },
    async syncToSupabase(userId: string) {
      if (!isUUID(userId)) {
        console.warn('⚠️ Invalid userId for Supabase sync:', userId);
        return;
      }

      try {
        const { payload } = getState();
        await syncProfileToSupabase(userId, payload);
        trackOnboardingPersistence('supabase_sync_success');
      } catch (error) {
        console.error('❌ Supabase sync failed, queuing fallback:', error);
        const state = getState();
        await enqueueOfflineSyncFallback(userId, state.payload);
        trackOnboardingPersistence('supabase_sync_failure', { error: String(error) });
      }
    },
    schedulePersist() {
      timer.schedule(() => {
        void getState().persistToStorage();
      });
    },
    cancelPersist() {
      timer.clear();
    },
    async clearStorage() {
      await clearOnboardingStorage();
      trackOnboardingPersistence('clear_storage');
    },
  };
};

export default createPersistenceSlice;
