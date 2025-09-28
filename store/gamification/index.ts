import { create } from 'zustand';

import createAchievementsSlice from './achievementsSlice';
import createGamificationPersistenceSlice from './persistenceSlice';
import createPointsSlice from './pointsSlice';
import type { GamificationSlices } from './types';

export * from './types';
export { createPointsSlice };
export { createAchievementsSlice };
export { createGamificationPersistenceSlice };

export const composeGamificationSlices = (set: any, get: any): GamificationSlices => ({
  ...createPointsSlice(set, get),
  ...createAchievementsSlice(set, get),
  ...createGamificationPersistenceSlice(set, get),
});

export const createGamificationStoreBase = () =>
  create<GamificationSlices>()((set, get) => composeGamificationSlices(set, get));

