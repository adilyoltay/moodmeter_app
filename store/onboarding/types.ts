import type { OnboardingPayload, MotivationKey, HealthPermissionState } from '@/features/onboarding/types';

/**
 * Slice definitions for the upcoming sliced Zustand architecture.
 *
 * These interfaces intentionally mirror the responsibilities that currently live
 * inside `store/moodOnboardingStore.ts`. During the incremental migration we
 * can gradually map the monolithic implementation onto these smaller contracts.
 */

export interface ProgressState {
  step: number;
  totalSteps: number;
  startedAt: number;
  isHydrated: boolean;
  isLoading: boolean;
}

export interface ProgressBootstrapOptions {
  step?: number;
  startedAt?: number;
  isHydrated?: boolean;
  isLoading?: boolean;
}

export interface ProgressActions {
  setStep(step: number): void;
  next(): void;
  prev(): void;
  bootstrap(totalSteps: number, options?: ProgressBootstrapOptions): void;
  cancelStepPersist(): void;
}

export type ProgressSlice = ProgressState & ProgressActions;

export interface PayloadState {
  payload: OnboardingPayload;
}

export interface PayloadActions {
  setMotivation(motivations: MotivationKey[]): void;
  setFirstMood(score?: 1 | 2 | 3 | 4 | 5, tags?: string[]): void;
  setLifestyle(lifestyle: OnboardingPayload['lifestyle']): void;
  setReminders(reminders: OnboardingPayload['reminders']): void;
  setHealthPermissionStatus(status: HealthPermissionState, requestedAt?: string): void;
  resetPayload(): void;
}

export type PayloadSlice = PayloadState & PayloadActions;

export interface PersistenceState {
  lastPersistedAt?: number;
}

export interface PersistenceActions {
  hydrateFromStorage(userId?: string): Promise<void>;
  persistToStorage(): Promise<void>;
  syncToSupabase(userId: string): Promise<void>;
  schedulePersist(): void;
  cancelPersist(): void;
  clearStorage(): Promise<void>;
}

export type PersistenceSlice = PersistenceState & PersistenceActions;

export interface AiAnalysisState {
  progressiveInsights?: Record<string, unknown>;
  lastAnalysisAt?: number;
}

export interface AiAnalysisActions {
  collectProgressiveInsights(): Promise<Record<string, unknown>>;
  cleanupProgressiveCache(): Promise<void>;
  analyzeMotivationWithFallback(motivations: MotivationKey[]): Promise<void>;
  analyzeFirstMoodWithFallback(score?: 1 | 2 | 3 | 4 | 5, tags?: string[]): Promise<void>;
  generateFallbackProfile(payload: OnboardingPayload, insights: Record<string, unknown>, userId: string): unknown;
  generateMotivationFallback(motivations: MotivationKey[]): unknown;
  generateMoodFallback(score: 1 | 2 | 3 | 4 | 5, tags?: string[]): unknown;
}

export type AiAnalysisSlice = AiAnalysisState & AiAnalysisActions;

export interface CompletionState {
  completedAt?: string;
}

export interface CompletionActions {
  finalizeFlags(): void;
  complete(userId: string): Promise<{ success: boolean; criticalErrors: string[]; warnings: string[] }>;
  resetAll(): void;
}

export type CompletionSlice = CompletionState & CompletionActions;

export type MoodOnboardingSlices = ProgressSlice &
  PayloadSlice &
  PersistenceSlice &
  AiAnalysisSlice &
  CompletionSlice;

export interface MoodOnboardingLegacyActions {
  reset(): void;
}

export type MoodOnboardingStoreState = MoodOnboardingSlices & MoodOnboardingLegacyActions;

/**
 * Helper type for slice factory functions. We keep the signature lightweight so
 * that the actual implementation can decide whether to depend on `set`, `get`
 * or additional helpers.
 */
export type SliceCreator<Slice> = (
  set: (partial: Partial<Slice> | ((state: Slice) => Partial<Slice>), replace?: boolean) => void,
  get: () => Slice,
) => Slice;
