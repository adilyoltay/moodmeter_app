// @ts-nocheck -- skeleton slice pending full implementation (PR9 roadmap)
import type { PointsSlice, SliceCreator } from './types';

export const createPointsSlice: SliceCreator<PointsSlice> = (set, get) => ({
  healingPoints: 0,
  lifetimeHealingPoints: 0,
  streak: null,
  addHealingPoints(amount) {
    if (!Number.isFinite(amount)) return;
    const { healingPoints, lifetimeHealingPoints } = get();
    set({
      healingPoints: healingPoints + amount,
      lifetimeHealingPoints: lifetimeHealingPoints + amount,
    } as Partial<PointsSlice>);
  },
  async updateStreak() {
    const current = get().streak ?? { current: 0, longest: 0, updatedAt: new Date().toISOString() };
    const nextCurrent = current.current + 1;
    const longest = Math.max(nextCurrent, current.longest ?? 0);
    set({ streak: { ...current, current: nextCurrent, longest, updatedAt: new Date().toISOString() } } as Partial<PointsSlice>);
  },
  resetStreak() {
    const current = get().streak;
    if (!current) return;
    set({ streak: { ...current, current: 0 } } as Partial<PointsSlice>);
  },
  async awardMicroReward(trigger, metadata) {
    const reward = {
      id: `${trigger}-${Date.now()}`,
      trigger,
      issuedAt: new Date().toISOString(),
      metadata: metadata ?? {},
    } as unknown as ReturnType<PointsSlice['awardMicroReward']> extends Promise<infer R> ? R : never;
    return reward;
  },
});

export default createPointsSlice;
