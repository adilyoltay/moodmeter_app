import type { MotivationKey, OnboardingPayload } from '@/features/onboarding/types';

import {
  createInitialOnboardingPayload,
  normalizeReminderUpdate,
  shouldQueueMoodAnalysis,
  shouldQueueMotivationAnalysis,
} from './utils/payload';
import type { PayloadSlice, SliceCreator } from './types';

const PAYLOAD_PERSIST_DEBOUNCE_MS = 100;

export const createPayloadSlice: SliceCreator<PayloadSlice> = (set, get) => {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const schedulePersist = () => {
    const orchestratedPersist = (get() as any)?.schedulePersist;
    if (typeof orchestratedPersist === 'function') {
      orchestratedPersist();
      return;
    }

    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    persistTimer = setTimeout(() => {
      persistTimer = null;
      const persistToStorage = (get() as any)?.persistToStorage;
      if (typeof persistToStorage === 'function') {
        Promise.resolve(persistToStorage()).catch((error: unknown) => {
          console.warn('⚠️ Failed to persist onboarding payload:', error);
        });
      }
    }, PAYLOAD_PERSIST_DEBOUNCE_MS);
  };

  const queueMotivationAnalysis = (motivations: MotivationKey[]) => {
    if (!shouldQueueMotivationAnalysis(motivations)) return;
    setTimeout(() => {
      const analyze = (get() as any)?.analyzeMotivationWithFallback;
      if (typeof analyze === 'function') {
        void analyze(motivations);
      }
    }, 700);
  };

  const queueMoodAnalysis = (score?: 1 | 2 | 3 | 4 | 5, tags?: string[]) => {
    if (!shouldQueueMoodAnalysis(score)) return;
    setTimeout(() => {
      const analyze = (get() as any)?.analyzeFirstMoodWithFallback;
      if (typeof analyze === 'function') {
        void analyze(score, tags);
      }
    }, 500);
  };

  return {
    payload: createInitialOnboardingPayload(),
    setMotivation(motivations) {
      set((state) => ({ payload: { ...state.payload, motivation: motivations } }) as Partial<PayloadSlice>);
      schedulePersist();
      queueMotivationAnalysis(motivations);
    },
    setFirstMood(score, tags = []) {
      set((state) => ({
        payload: {
          ...state.payload,
          first_mood: { score, tags, source: 'onboarding' },
        },
      }) as Partial<PayloadSlice>);
      schedulePersist();
      queueMoodAnalysis(score, tags);
    },
    setLifestyle(lifestyle) {
      if (!lifestyle) return;
      set((state) => ({
        payload: {
          ...state.payload,
          lifestyle: {
            ...(state.payload.lifestyle ?? {}),
            ...lifestyle,
          },
        },
      }) as Partial<PayloadSlice>);
      schedulePersist();
    },
    setReminders(reminders) {
      if (!reminders) return;
      set((state) => ({
        payload: {
          ...state.payload,
          reminders: normalizeReminderUpdate(state.payload.reminders, reminders),
        },
      }) as Partial<PayloadSlice>);
      schedulePersist();
    },
    setHealthPermissionStatus(status, requestedAt) {
      set((state) => ({
        payload: {
          ...state.payload,
          health: {
            status,
            lastRequestedAt: requestedAt || state.payload.health?.lastRequestedAt,
          },
        },
      }) as Partial<PayloadSlice>);
      schedulePersist();
    },
    resetPayload() {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      set({ payload: createInitialOnboardingPayload() } as Partial<PayloadSlice>);
    },
  };
};

export default createPayloadSlice;
