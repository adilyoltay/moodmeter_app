// @ts-nocheck -- placeholder types mirrored from legacy store; will be reconciled during PR9
import type { AchievementDefinition, MicroReward, MicroRewardTrigger, StreakInfo, UserGamificationProfile } from '@/types/gamification';

export interface PointsState {
  healingPoints: number;
  lifetimeHealingPoints: number;
  streak: StreakInfo | null;
}

export interface PointsActions {
  addHealingPoints(amount: number): void;
  updateStreak(): Promise<void>;
  resetStreak(): void;
  awardMicroReward(trigger: MicroRewardTrigger, metadata?: Record<string, unknown>): Promise<MicroReward>;
}

export type PointsSlice = PointsState & PointsActions;

export interface AchievementsState {
  definitions: AchievementDefinition[];
  unlocked: Record<string, boolean>;
  pendingQueue: AchievementDefinition[];
}

export interface AchievementsActions {
  unlock(achievementId: string): Promise<void>;
  queueAchievement(definition: AchievementDefinition): void;
  dequeueAchievement(achievementId: string): void;
  hydrateDefinitions(definitions: AchievementDefinition[]): void;
}

export type AchievementsSlice = AchievementsState & AchievementsActions;

export interface GamificationPersistenceState {
  profile: UserGamificationProfile | null;
  lastSyncedAt?: string;
}

export interface GamificationPersistenceActions {
  hydrateFromStorage(userId?: string): Promise<void>;
  persistToStorage(): Promise<void>;
  syncToSupabase(userId: string): Promise<void>;
  setProfile(profile: UserGamificationProfile | null): void;
}

export type GamificationPersistenceSlice = GamificationPersistenceState & GamificationPersistenceActions;

export type GamificationSlices = PointsSlice & AchievementsSlice & GamificationPersistenceSlice;

export type SliceCreator<Slice> = (
  set: (partial: Partial<Slice> | ((state: Slice) => Partial<Slice>), replace?: boolean) => void,
  get: () => Slice,
) => Slice;
