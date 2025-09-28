import { create } from 'zustand';

import { composeMoodOnboardingSlices } from './onboarding';
import type { MoodOnboardingStoreState } from './onboarding';
import { createInitialOnboardingPayload } from './onboarding/utils/payload';

export type MoodOnboardingState = MoodOnboardingStoreState;

export const useMoodOnboardingStore = create<MoodOnboardingState>((set, get) => {
  const bindSet = (partial: any, replace?: boolean) => {
    if (replace) {
      set(partial, true);
    } else {
      set(partial, false);
    }
  };

  const composedSlices = composeMoodOnboardingSlices(bindSet, () => get() as MoodOnboardingState);

  return {
    ...composedSlices,
    reset: () => {
      get().cancelStepPersist();
      get().bootstrap(6, {
        step: 0,
        startedAt: Date.now(),
        isHydrated: true,
        isLoading: false,
      });

      set({ payload: createInitialOnboardingPayload() });

      void get().clearStorage();

      console.log('🔄 Onboarding store reset');
    },
  };
});

export const resetMoodOnboardingStore = () => {
  useMoodOnboardingStore.getState().reset();
};
