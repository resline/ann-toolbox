/**
 * Silent Audio Loop Service
 *
 * Maintains an active audio session on mobile browsers (Android Chrome, iOS Safari)
 * by running a low-gain silent audio node. Prevents the OS from terminating or suspending
 * background timers and worker threads when the screen is locked or tab is minimized.
 */

export class SilentAudioLoop {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isRunning = false;

  /**
   * Starts the silent audio loop to preserve background execution.
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) {
        return false;
      }

      this.audioContext = new AudioCtxClass();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {
          // Ignore resume rejection (e.g. before initial user interaction)
        });
      }

      this.gainNode = this.audioContext.createGain();
      // Extremely low gain (inaudible 0.00001) to keep the audio hardware buffer pipeline active
      this.gainNode.gain.setValueAtTime(0.00001, this.audioContext.currentTime);

      this.oscillator = this.audioContext.createOscillator();
      this.oscillator.type = 'sine';
      this.oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.oscillator.start();
      this.isRunning = true;
      return true;
    } catch {
      this.isRunning = false;
      return false;
    }
  }

  /**
   * Stops the silent audio loop and cleans up audio nodes.
   */
  stop(): void {
    if (!this.isRunning && !this.audioContext) {
      return;
    }

    this.isRunning = false;

    try {
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }

      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
    } catch {
      // Ignore errors on cleanup
    }
  }

  /**
   * Returns true if silent audio loop is currently active.
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
