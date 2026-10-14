/**
 * Acoustic Drum Synthesizer
 * Synthesizes dynamic Kick, Snare, Hi-Hats, Toms, and Crash using DSP oscillators,
 * noise generators, and multi-pole envelopes.
 */
export type DrumType = 'kick' | 'snare' | 'hihatClosed' | 'hihatOpen' | 'tomHigh' | 'tomMid' | 'tomLow' | 'crash';

export class DrumSynthesizer {
  private ctx: AudioContext;
  public outputNode: GainNode;
  private noiseBuffer: AudioBuffer;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.85;
    this.outputNode.connect(destination);

    // Pre-generate 2 seconds of white noise buffer to avoid real-time allocation
    const bufferSize = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public trigger(type: DrumType, time: number, velocity: number = 100) {
    const vel = Math.max(0.1, Math.min(1.0, velocity / 127));

    switch (type) {
      case 'kick':
        this.playKick(time, vel);
        break;
      case 'snare':
        this.playSnare(time, vel);
        break;
      case 'hihatClosed':
        this.playHiHat(time, vel, false);
        break;
      case 'hihatOpen':
        this.playHiHat(time, vel, true);
        break;
      case 'tomHigh':
        this.playTom(time, vel, 220);
        break;
      case 'tomMid':
        this.playTom(time, vel, 150);
        break;
      case 'tomLow':
        this.playTom(time, vel, 100);
        break;
      case 'crash':
        this.playCrash(time, vel);
        break;
    }
  }

  private playKick(time: number, vel: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Punch pitch drop: 140Hz -> 42Hz
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.08);

    const kickVol = vel * 1.1;
    gain.gain.setValueAtTime(kickVol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  private playSnare(time: number, vel: number) {
    // 1. Tonal body (180 Hz)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, time);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.08);

    oscGain.gain.setValueAtTime(vel * 0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(oscGain);
    oscGain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + 0.13);

    // 2. Snare rattle / noise wire
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(vel * 0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.outputNode);

    noise.start(time);
    noise.stop(time + 0.23);
  }

  private playHiHat(time: number, vel: number, isOpen: boolean) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    const duration = isOpen ? 0.35 : 0.055;
    gain.gain.setValueAtTime(vel * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(time);
    noise.stop(time + duration + 0.01);
  }

  private playTom(time: number, vel: number, startFreq: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.55, time + 0.18);

    gain.gain.setValueAtTime(vel * 0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + 0.29);
  }

  private playCrash(time: number, vel: number) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, time);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(time);
    noise.stop(time + 1.21);
  }
}
