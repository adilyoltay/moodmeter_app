import type { ProgressBootstrapOptions, ProgressSlice, SliceCreator } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const DEFAULT_TOTAL_STEPS = 6;
const STEP_PERSIST_DEBOUNCE_MS = 120;

export const createProgressSlice: SliceCreator<ProgressSlice> = (set, get) => {
  let fallbackPersistTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleFallbackPersist = () => {
    if (fallbackPersistTimer) {
      clearTimeout(fallbackPersistTimer);
    }

    fallbackPersistTimer = setTimeout(() => {
      fallbackPersistTimer = null;
      const persistToStorage = (get() as any)?.persistToStorage;
      if (typeof persistToStorage === 'function') {
        Promise.resolve(persistToStorage()).catch((error: unknown) => {
          console.warn('⚠️ Failed to persist onboarding progress:', error);
        });
      }
    }, STEP_PERSIST_DEBOUNCE_MS);
  };

  const triggerPersist = () => {
    const schedulePersist = (get() as any)?.schedulePersist;
    if (typeof schedulePersist === 'function') {
      schedulePersist();
      return;
    }
    scheduleFallbackPersist();
  };

  const cancelFallbackPersist = () => {
    if (fallbackPersistTimer) {
      clearTimeout(fallbackPersistTimer);
      fallbackPersistTimer = null;
    }
  };

  const getSafeTotalSteps = (totalSteps?: number) => {
    const source = typeof totalSteps === 'number' ? totalSteps : (get().totalSteps ?? DEFAULT_TOTAL_STEPS);
    return Math.max(1, Math.floor(Number.isFinite(source) ? source : DEFAULT_TOTAL_STEPS));
  };

  const clampToTotal = (value: number, totalSteps?: number) => {
    const safeTotal = getSafeTotalSteps(totalSteps);
    return clamp(Math.floor(Number(value) || 0), 0, safeTotal - 1);
  };

  return {
    step: 0,
    totalSteps: DEFAULT_TOTAL_STEPS,
    startedAt: Date.now(),
    isHydrated: false,
    isLoading: false,
    setStep(step: number) {
      const safeStep = clampToTotal(step);
      if (safeStep === get().step) return;
      set({ step: safeStep } as Partial<ProgressSlice>);
      triggerPersist();
    },
    next() {
      const { step } = get();
      const nextStep = clampToTotal(step + 1);
      if (nextStep === step) return;
      set({ step: nextStep } as Partial<ProgressSlice>);
      triggerPersist();
    },
    prev() {
      const { step } = get();
      const prevStep = clampToTotal(step - 1);
      if (prevStep === step) return;
      set({ step: prevStep } as Partial<ProgressSlice>);
      triggerPersist();
    },
    bootstrap(totalSteps: number, options: ProgressBootstrapOptions = {}) {
      const safeTotal = getSafeTotalSteps(totalSteps);
      const current = get();
      const nextState: Partial<ProgressSlice> = {
        totalSteps: safeTotal,
        startedAt:
          typeof options.startedAt === 'number'
            ? options.startedAt
            : typeof current.startedAt === 'number'
            ? current.startedAt
            : Date.now(),
        isHydrated:
          options.isHydrated ?? (typeof current.isHydrated === 'boolean' ? current.isHydrated : false),
        isLoading:
          options.isLoading ?? (typeof current.isLoading === 'boolean' ? current.isLoading : false),
      };

      const targetStep = typeof options.step === 'number' ? options.step : current.step ?? 0;
      nextState.step = clampToTotal(targetStep, safeTotal);

      set(nextState);
    },
    cancelStepPersist() {
      cancelFallbackPersist();
      const cancelPersist = (get() as any)?.cancelPersist;
      if (typeof cancelPersist === 'function') {
        cancelPersist();
      }
    },
  };
};

export default createProgressSlice;
