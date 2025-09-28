export const STORAGE_KEYS = {
  PAYLOAD: 'profile_v2_payload',
  STEP: 'profile_v2_current_step',
  LEGACY_SNAPSHOT: 'profile_v2',
  MOOD_INSIGHTS: 'onboarding_mood_insights',
  MOTIVATION_INSIGHTS: 'onboarding_motivation_insights',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
