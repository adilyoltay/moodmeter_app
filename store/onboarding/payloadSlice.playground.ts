import { createMoodOnboardingStoreBase } from './index';

export function runPayloadSlicePlayground(): void {
  const store = createMoodOnboardingStoreBase();

  const initial = store.getState().payload;
  console.assert(initial.motivation.length === 0, 'Initial motivation should be empty');
  console.assert(initial.health?.status === 'not_requested', 'Initial health status should be not_requested');

  store.getState().setMotivation(['stress_reduction']);
  console.assert(store.getState().payload.motivation.length === 1, 'Motivation should update');

  store.getState().setFirstMood(3, ['focus']);
  const firstMood = store.getState().payload.first_mood;
  console.assert(firstMood?.score === 3, 'First mood score should persist');
  console.assert(firstMood?.tags?.includes('focus'), 'First mood tags should persist');

  store.getState().setLifestyle({ sleep_hours: 7, exercise: 'light' });
  console.assert(store.getState().payload.lifestyle?.sleep_hours === 7, 'Lifestyle sleep hours should merge');

  store.getState().setReminders({ enabled: true, days: ['Mon'], permissionStatus: 'granted' });
  console.assert(store.getState().payload.reminders?.enabled === true, 'Reminders should enable when permission granted');

  store.getState().setReminders({ enabled: true, permissionStatus: 'denied' });
  console.assert(store.getState().payload.reminders?.enabled === false, 'Denied permission should disable reminders');

  store.getState().setHealthPermissionStatus('granted', '2025-01-01T00:00:00.000Z');
  console.assert(store.getState().payload.health?.status === 'granted', 'Health status should update to granted');
}

export default runPayloadSlicePlayground;
