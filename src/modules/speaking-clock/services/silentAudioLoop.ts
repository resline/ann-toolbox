/**
 * Silent Audio Loop Service
 *
 * Maintains an active audio session on mobile browsers (Android Chrome, iOS Safari)
 * by running a low-gain audio node. This is best effort only: silent playback does
 * not exempt a page from browser throttling or OS suspension.
 */

export class SilentAudioLoop {
  private audioContext: AudioContext | null = null;
  private ownsAudioContext = false;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isRunning = false;
  private startGeneration = 0;

  constructor(audioContext?: AudioContext | null) {
    if (audioContext) {
      this.audioContext = audioContext;
      this.ownsAudioContext = false;
    }
  }

  /**
   * Starts the silent audio loop to preserve background execution.
   */
  async start(audioContext?: AudioContext | null): Promise<boolean> {
    if (this.isRunning) {
      return true;
    }

    const generation = ++this.startGeneration;

    if (typeof window === 'undefined') {
      return false;
    }

    try {
      if (audioContext) {
        this.audioContext = audioContext;
        this.ownsAudioContext = false;
      }
      if (!this.audioContext) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtxClass) return false;
        this.audioContext = new AudioCtxClass();
        this.ownsAudioContext = true;
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {
          // Ignore resume rejection (e.g. before initial user interaction)
        });
      }
      if (generation !== this.startGeneration || !this.audioContext) return false;

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
    this.startGeneration += 1;
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

      if (this.ownsAudioContext && this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      this.audioContext = null;
      this.ownsAudioContext = false;
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
