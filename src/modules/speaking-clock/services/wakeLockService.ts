/**
 * Screen Wake Lock Service
 *
 * Prevents the screen from dimming or locking while Speaking Clock or Focus mode is active.
 * Handles automatic re-acquisition on tab visibility changes when the user switches back.
 */

export class WakeLockService {
  private sentinel: WakeLockSentinel | null = null;
  private isRequested = false;

  private handleVisibilityChange = async (): Promise<void> => {
    if (
      this.isRequested &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      (!this.sentinel || this.sentinel.released)
    ) {
      await this.acquire();
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
    this.isRequested = true;

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    return this.acquire();
  }

  /**
   * Internal acquisition of the WakeLock sentinel.
   */
  private async acquire(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.onrelease = () => {
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

    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // Ignore release errors
      }
      this.sentinel = null;
    }
  }

  /**
   * Returns true if wake lock is currently active and unreleased.
   */
  isActive(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }
}
