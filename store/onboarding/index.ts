import { create } from 'zustand';

import createAiAnalysisSlice from './aiAnalysisSlice';
import createCompletionSlice from './completionSlice';
import createPayloadSlice from './payloadSlice';
import createPersistenceSlice from './persistenceSlice';
import createProgressSlice from './progressSlice';
import type { MoodOnboardingSlices } from './types';

export * from './types';
export { createProgressSlice };
export { createPayloadSlice };
export { createPersistenceSlice };
export { createAiAnalysisSlice };
export { createCompletionSlice };

/**
 * Helper that composes all onboarding slices. The generic `set/get` signatures
 * intentionally accept `any` so that the function can be consumed both by the
 * existing monolithic store and the upcoming sliced version without fighting
 * the TypeScript compiler.
 */
export const composeMoodOnboardingSlices = (
  set: any,
  get: any,
): MoodOnboardingSlices => ({
  ...createProgressSlice(set, get),
  ...createPayloadSlice(set, get),
  ...createPersistenceSlice(set, get),
  ...createAiAnalysisSlice(set, get),
  ...createCompletionSlice(set, get),
});

/**
 * Standalone factory for the forthcoming sliced store. Not wired into the app
 * yet; kept alongside the slice creators so we can spin up isolated stores in
 * unit tests while migrating feature-by-feature.
 */
export const createMoodOnboardingStoreBase = () =>
  create<MoodOnboardingSlices>()((set, get) => composeMoodOnboardingSlices(set, get));

