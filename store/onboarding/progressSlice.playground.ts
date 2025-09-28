import { createMoodOnboardingStoreBase } from './index';

/**
 * Lightweight playground helper so we can manually verify the behaviour of the
 * progress slice while migrating off the monolithic onboarding store. The
 * assertions are intentionally simple and rely on `console.assert` so they can
 * be executed directly in Node or in ad-hoc test harnesses.
 */
export function runProgressSlicePlayground(): void {
  const store = createMoodOnboardingStoreBase();
  const state = store.getState();

  console.assert(state.step === 0, 'Initial step should be 0');
  console.assert(state.totalSteps === 6, 'Default total steps should be 6');
  console.assert(state.isHydrated === false, 'Initial hydration flag should be false');

  store.getState().next();
  console.assert(store.getState().step === 1, 'Next should advance step to 1');

  store.getState().prev();
  console.assert(store.getState().step === 0, 'Prev should return to step 0');

  store.getState().setStep(10);
  console.assert(store.getState().step === 5, 'setStep should clamp to last step');

  store.getState().bootstrap(4, { step: 2, isHydrated: true, isLoading: false });
  const bootstrapped = store.getState();
  console.assert(bootstrapped.totalSteps === 4, 'Bootstrap should update total steps');
  console.assert(bootstrapped.step === 2, 'Bootstrap should set the provided step');
  console.assert(bootstrapped.isHydrated === true, 'Bootstrap should update hydration flag');
}

export default runProgressSlicePlayground;
