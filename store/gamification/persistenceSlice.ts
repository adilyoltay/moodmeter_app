import type { GamificationPersistenceSlice, SliceCreator } from './types';

const warn = (method: string) => {
  if (__DEV__) {
    console.warn(`[gamification:persistence] '${method}' not implemented yet.`);
  }
};

export const createGamificationPersistenceSlice: SliceCreator<GamificationPersistenceSlice> = (set) => ({
  profile: null,
  lastSyncedAt: undefined,
  async hydrateFromStorage() {
    warn('hydrateFromStorage');
  },
  async persistToStorage() {
    warn('persistToStorage');
  },
  async syncToSupabase() {
    warn('syncToSupabase');
    set({ lastSyncedAt: new Date().toISOString() } as Partial<GamificationPersistenceSlice>);
  },
  setProfile(profile) {
    set({ profile } as Partial<GamificationPersistenceSlice>);
  },
});

export default createGamificationPersistenceSlice;

