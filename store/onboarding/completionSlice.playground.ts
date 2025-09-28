import { create } from 'zustand';

import { composeMoodOnboardingSlices } from './index';
import type { MoodOnboardingSlices } from './types';
import { STORAGE_KEYS } from './utils/storageKeys';

/**
 * Quick playground script to sanity check the completion slice when used in
 * isolation. Not wired into production builds – handy while migrating the
 * legacy store.
 */
export const createCompletionPlaygroundStore = () =>
  create<MoodOnboardingSlices>((set, get) => ({
    ...composeMoodOnboardingSlices(set, get),
  }));

export async function runCompletionSlicePlayground() {
  const store = createCompletionPlaygroundStore();
  const state = store.getState();

  state.bootstrap(6, {
    step: 3,
    isHydrated: true,
    isLoading: false,
  });
  state.setMotivation(['stress_reduction']);
  state.setFirstMood(3, ['work']);
  state.setLifestyle({ exercise: 'light', sleep_hours: 6, social: 'low' });
  state.setReminders({ enabled: true, time: '09:00' });
  state.finalizeFlags();

  const result = await state.complete('00000000-0000-0000-0000-000000000000');
  console.log('Completion result (playground):', result);
  console.log('Stored payload key should now exist:', STORAGE_KEYS.PAYLOAD);
}

export default runCompletionSlicePlayground;
