/**
 * Screen Wake Lock Service
 *
 * Prevents the screen from dimming or locking while Speaking Clock or Focus mode is active.
 * Handles automatic re-acquisition on tab visibility changes when the user switches back.
 */

export class WakeLockService {
  private sentinel: WakeLockSentinel | null = null;
  private isRequested = false;
  private requestGeneration = 0;
  private pendingAcquire: Promise<boolean> | null = null;

  private handleVisibilityChange = async (): Promise<void> => {
    if (
      this.isRequested &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      (!this.sentinel || this.sentinel.released)
    ) {
      await this.acquireSingleFlight(this.requestGeneration);
    }
  };

  /**
   * Checks whether Screen Wake Lock API is supported in the current browser.
   */
  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'wakeLock' in navigator &&
      typeof navigator.wakeLock?.request === 'function'
    );
  }

  /**
   * Requests a screen wake lock and binds visibilitychange listener.
   */
  async request(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    this.isRequested = true;

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    if (this.sentinel && !this.sentinel.released) {
      return true;
    }
    if (this.pendingAcquire) {
      return this.pendingAcquire;
    }
    this.sentinel = null;
    const generation = ++this.requestGeneration;

    return this.acquireSingleFlight(generation);
  }

  private acquireSingleFlight(generation: number): Promise<boolean> {
    if (this.pendingAcquire) return this.pendingAcquire;

    const pending = this.acquire(generation);
    this.pendingAcquire = pending;
    void pending.finally(() => {
      if (this.pendingAcquire === pending) {
        this.pendingAcquire = null;
      }
    });
    return pending;
  }

  /**
   * Internal acquisition of the WakeLock sentinel.
   */
  private async acquire(generation: number): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.isRequested || generation !== this.requestGeneration) {
        await sentinel.release().catch(() => {});
        return false;
      }
      this.sentinel = sentinel;
      sentinel.onrelease = () => {
        // Sentinel was released by the browser (e.g. tab minimized or low battery)
      };
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Releases any active wake lock and unbinds visibility listener.
   */
  async release(): Promise<void> {
    this.isRequested = false;
    this.requestGeneration += 1;
    // The in-flight platform request cannot be cancelled. Detach it so a
    // later explicit request can start immediately; its generation guard will
    // release the stale sentinel if it eventually resolves.
    this.pendingAcquire = null;

    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    const sentinel = this.sentinel;
    this.sentinel = null;
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // Ignore release errors
      }
    }
  }

  /**
   * Returns true if wake lock is currently active and unreleased.
   */
  isActive(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }
}
