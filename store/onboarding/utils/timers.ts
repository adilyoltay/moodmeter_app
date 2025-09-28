export type TimerHandle = ReturnType<typeof setTimeout> | null;

/**
 * Shared helper for slices that need debounce-like persistence scheduling. The
 * actual logic remains in the monolithic store for now; this utility gives us a
 * central place to move the implementation when we migrate.
 */
export class PersistTimer {
  private handle: TimerHandle = null;

  constructor(private readonly delayMs: number = 120) {}

  schedule(fn: () => void): void {
    this.clear();
    this.handle = setTimeout(() => {
      this.handle = null;
      fn();
    }, this.delayMs);
  }

  clear(): void {
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }

  isScheduled(): boolean {
    return this.handle !== null;
  }
}

