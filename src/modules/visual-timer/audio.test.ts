import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ambienceGenerator } from './audio';

describe('Audio AmbienceGenerator', () => {
  let mockAudioContext: any;
  let mockGainNode: any;
  let mockBufferSourceNode: any;
  let mockFilterNode: any;
  let mockOscillator: any;
  let mockLfoGainNode: any;
  let mockBuffer: any;

  beforeEach(() => {
    // Reset singleton state if possible or just use its methods
    ambienceGenerator.stop();

    mockGainNode = {
      gain: { value: 0, linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockBufferSourceNode = {
      loop: false,
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };

    mockFilterNode = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockLfoGainNode = {
      gain: { value: 0 },
      connect: vi.fn(),
    };

    mockBuffer = {
      getChannelData: vi.fn().mockReturnValue(new Float32Array(44100 * 2)),
    };

    mockAudioContext = {
      sampleRate: 44100,
      currentTime: 0,
      destination: {},
      createGain: vi.fn().mockReturnValue(mockGainNode),
      createBufferSource: vi.fn().mockReturnValue(mockBufferSourceNode),
      createBuffer: vi.fn().mockReturnValue(mockBuffer),
      createBiquadFilter: vi.fn().mockReturnValue(mockFilterNode),
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
    };

    // Override AudioContext on window
    vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockAudioContext));
    
    // Also clear the internal ctx reference by hacking if needed, but since we are stubbing window.AudioContext, 
    // it will be picked up on initAudio if it wasn't initialized yet.
    // If it was, we might have a problem. We can force it by resetting.
    (ambienceGenerator as any).ctx = null; 
  });

  it('should initialize audio generator, create nodes and start playing brown-noise', () => {
    ambienceGenerator.play('brown-noise', 0.8);
    
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockGainNode.gain.value).toBe(0.8);
    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    expect(mockBufferSourceNode.loop).toBe(true);
    
    expect(mockBufferSourceNode.connect).toHaveBeenCalledWith(mockGainNode);
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    expect(mockBufferSourceNode.start).toHaveBeenCalled();
  });

  it('should play rain ambience with filter and LFO', () => {
    // Specifically test rain which has more nodes
    
    // Setup for LFO gain
    mockAudioContext.createGain
      .mockReturnValueOnce(mockGainNode) // main gain
      .mockReturnValueOnce(mockLfoGainNode); // lfo gain

    ambienceGenerator.play('rain', 0.5);
    
    expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    expect(mockFilterNode.type).toBe('lowpass');
    expect(mockFilterNode.frequency.value).toBe(1000);
    
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.type).toBe('sine');
    expect(mockOscillator.frequency.value).toBe(0.5);
    
    expect(mockBufferSourceNode.connect).toHaveBeenCalledWith(mockFilterNode);
    expect(mockFilterNode.connect).toHaveBeenCalledWith(mockGainNode);
    expect(mockOscillator.connect).toHaveBeenCalledWith(mockLfoGainNode);
    expect(mockLfoGainNode.connect).toHaveBeenCalledWith(mockGainNode.gain);
    expect(mockOscillator.start).toHaveBeenCalled();
    
    expect(mockBufferSourceNode.start).toHaveBeenCalled();
  });

  it('should stop audio correctly', () => {
    ambienceGenerator.play('brown-noise');
    ambienceGenerator.stop();
    
    expect(mockBufferSourceNode.stop).toHaveBeenCalled();
    expect(mockBufferSourceNode.disconnect).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();
    expect((ambienceGenerator as any).isPlaying).toBe(false);
  });
  
  it('should stop audio when playing "none"', () => {
    ambienceGenerator.play('brown-noise');
    ambienceGenerator.play('none');
    
    expect(mockBufferSourceNode.stop).toHaveBeenCalled();
    expect((ambienceGenerator as any).isPlaying).toBe(false);
  });

  it('should adjust volume', () => {
    ambienceGenerator.play('pink-noise', 0.5);
    mockAudioContext.currentTime = 1.0;
    
    ambienceGenerator.setVolume(0.8);
    
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8, 1.1);
  });
});
