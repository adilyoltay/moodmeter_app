import AsyncStorage from '@react-native-async-storage/async-storage';
import { isUUID } from '@/utils/validators';
import type { OnboardingPayload, HealthPermissionState } from '@/features/onboarding/types';

import { createInitialOnboardingPayload } from './payload';
import { STORAGE_KEYS } from './storageKeys';

const normalizePayload = (raw: any): OnboardingPayload => {
  const fallback = createInitialOnboardingPayload();
  if (!raw || typeof raw !== 'object') return fallback;

  try {
    const payload: OnboardingPayload = {
      motivation: Array.isArray(raw.motivation) ? raw.motivation : [],
      first_mood: raw.first_mood && typeof raw.first_mood === 'object' ? {
        score: raw.first_mood.score,
        tags: Array.isArray(raw.first_mood.tags) ? raw.first_mood.tags : undefined,
        source: 'onboarding',
      } : undefined,
      lifestyle: raw.lifestyle && typeof raw.lifestyle === 'object' ? raw.lifestyle : undefined,
      reminders: raw.reminders && typeof raw.reminders === 'object' ? raw.reminders : undefined,
      health: raw.health && typeof raw.health.status === 'string'
        ? { status: raw.health.status as HealthPermissionState, lastRequestedAt: raw.health.lastRequestedAt }
        : { status: 'not_requested' as HealthPermissionState },
      feature_flags: raw.feature_flags && typeof raw.feature_flags === 'object' ? raw.feature_flags : undefined,
      profile: raw.profile && typeof raw.profile === 'object' ? raw.profile : undefined,
      meta: raw.meta && typeof raw.meta === 'object'
        ? { version: 1 as const, created_at: raw.meta.created_at || new Date().toISOString() }
        : { version: 1 as const, created_at: new Date().toISOString() },
    };
    return payload;
  } catch (error) {
    console.warn('⚠️ Failed to normalize onboarding payload:', error);
    return fallback;
  }
};

export const readStoredPayload = async (): Promise<OnboardingPayload | null> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PAYLOAD);
    if (!stored) return null;
    return normalizePayload(JSON.parse(stored));
  } catch (error) {
    console.error('❌ Failed to read onboarding payload from storage:', error);
    return null;
  }
};

export const readStoredStep = async (): Promise<number | null> => {
  try {
    const storedStep = await AsyncStorage.getItem(STORAGE_KEYS.STEP);
    if (!storedStep) return null;
    const parsed = parseInt(storedStep, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (error) {
    console.error('❌ Failed to read onboarding step from storage:', error);
    return null;
  }
};

export const readLegacySnapshot = async (userId?: string): Promise<OnboardingPayload | null> => {
  if (!userId || !isUUID(userId)) return null;
  try {
    const snapshot = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_SNAPSHOT);
    if (!snapshot) return null;
    const parsed = JSON.parse(snapshot);
    if (parsed?.userId !== userId || !parsed.payload) return null;
    return normalizePayload(parsed.payload);
  } catch (error) {
    console.warn('⚠️ Failed to read legacy onboarding snapshot:', error);
    return null;
  }
};

export const persistOnboardingState = async (payload: OnboardingPayload, step: number): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.PAYLOAD, JSON.stringify(payload)),
      AsyncStorage.setItem(STORAGE_KEYS.STEP, step.toString()),
    ]);
    console.log(`💾 V2 Onboarding data persisted: step ${step}`);
  } catch (error) {
    console.error('❌ Failed to persist V2 onboarding data:', error);
  }
};

export const clearOnboardingStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PAYLOAD,
      STORAGE_KEYS.STEP,
      STORAGE_KEYS.LEGACY_SNAPSHOT,
      STORAGE_KEYS.MOOD_INSIGHTS,
      STORAGE_KEYS.MOTIVATION_INSIGHTS,
    ]);
    console.log('🧹 Onboarding storage cleared');
  } catch (error) {
    console.warn('⚠️ Failed to clear onboarding storage during reset:', error);
  }
};

export const readProgressiveInsights = async (): Promise<Record<string, unknown>> => {
  const result: Record<string, unknown> = {};
  try {
    const mood = await AsyncStorage.getItem(STORAGE_KEYS.MOOD_INSIGHTS);
    if (mood) result.mood = JSON.parse(mood);
    const motivation = await AsyncStorage.getItem(STORAGE_KEYS.MOTIVATION_INSIGHTS);
    if (motivation) result.motivation = JSON.parse(motivation);
  } catch (error) {
    console.warn('⚠️ Failed to collect progressive insights:', error);
  }
  return result;
};

export const clearProgressiveCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.MOOD_INSIGHTS,
      STORAGE_KEYS.MOTIVATION_INSIGHTS,
    ]);
    console.log('🧹 Progressive insight cache cleaned up');
  } catch (error) {
    console.warn('⚠️ Failed to cleanup progressive cache:', error);
  }
};
