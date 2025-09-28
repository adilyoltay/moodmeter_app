import { createMoodOnboardingStoreBase } from './index';

export async function runPersistenceSlicePlayground(): Promise<void> {
  const store = createMoodOnboardingStoreBase();

  await store.getState().hydrateFromStorage();
  console.assert(store.getState().isHydrated === true, 'Hydration should mark store hydrated');

  await store.getState().persistToStorage();
  console.assert(typeof store.getState().lastPersistedAt === 'number', 'Persist should update lastPersistedAt');

  await store.getState().clearStorage();
}

export default runPersistenceSlicePlayground;
