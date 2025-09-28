import type { AchievementDefinition } from '@/types/gamification';

import type { AchievementsSlice, SliceCreator } from './types';

export const createAchievementsSlice: SliceCreator<AchievementsSlice> = (set, get) => ({
  definitions: [],
  unlocked: {},
  pendingQueue: [],
  unlock: async (achievementId) => {
    const unlocked = { ...get().unlocked, [achievementId]: true };
    set({ unlocked } as Partial<AchievementsSlice>);
  },
  queueAchievement(definition: AchievementDefinition) {
    const queue = get().pendingQueue;
    set({ pendingQueue: [...queue, definition] } as Partial<AchievementsSlice>);
  },
  dequeueAchievement(achievementId: string) {
    const queue = get().pendingQueue.filter(item => item.id !== achievementId);
    set({ pendingQueue: queue } as Partial<AchievementsSlice>);
  },
  hydrateDefinitions(definitions) {
    set({ definitions } as Partial<AchievementsSlice>);
  },
});

export default createAchievementsSlice;

