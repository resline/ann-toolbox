import { SensoryAmbience } from './types';

export class AmbienceGenerator {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  private initAudio() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown'): AudioBuffer {
    this.initAudio();
    const bufferSize = this.ctx!.sampleRate * 2; // 2 seconds of buffer
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      if (type === 'brown') {
        let outputVal = (lastOut + (0.02 * white)) / 1.02;
        lastOut = outputVal;
        outputVal *= 3.5; // compensate gain
        output[i] = outputVal;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // compensate gain
        b6 = white * 0.115926;
      } else {
        output[i] = white; // white
      }
    }
    return buffer;
  }

  public play(ambience: SensoryAmbience, volume: number = 0.5) {
    if (ambience === 'none') {
      this.stop();
      return;
    }

    this.initAudio();
    this.stop();

    this.gainNode = this.ctx!.createGain();
    this.gainNode.gain.value = volume;
    this.gainNode.connect(this.ctx!.destination);

    this.noiseNode = this.ctx!.createBufferSource();
    this.noiseNode.loop = true;

    if (ambience === 'brown-noise') {
      this.noiseNode.buffer = this.createNoiseBuffer('brown');
      this.noiseNode.connect(this.gainNode);
    } else if (ambience === 'pink-noise') {
      this.noiseNode.buffer = this.createNoiseBuffer('pink');
      this.noiseNode.connect(this.gainNode);
    } else if (ambience === 'rain') {
      // Simulate rain with filtered pink noise
      this.noiseNode.buffer = this.createNoiseBuffer('pink');
      this.filterNode = this.ctx!.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 1000;
      
      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      
      // Add subtle LFO to volume for "pulse" effect of rain
      const lfo = this.ctx!.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5; // 0.5 Hz
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = 0.2;
      lfo.connect(lfoGain);
      lfoGain.connect(this.gainNode.gain);
      lfo.start();
    } else {
      // fallback to brown noise for other natural sounds currently
      this.noiseNode.buffer = this.createNoiseBuffer('brown');
      this.noiseNode.connect(this.gainNode);
    }

    this.noiseNode.start();
    this.isPlaying = true;
  }

  public stop() {
    if (this.noiseNode && this.isPlaying) {
      this.noiseNode.stop();
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.isPlaying = false;
  }

  public setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.linearRampToValueAtTime(volume, this.ctx!.currentTime + 0.1);
    }
  }
}

export const ambienceGenerator = new AmbienceGenerator();
