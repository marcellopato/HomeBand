import type { AmpHeadParams } from '../types/audio';
import { createDistortionCurve } from './DSPMath';

export class AmpDesigner {
  public inputNode: GainNode;
  public outputNode: GainNode;

  private preampGain: GainNode;
  private preampShaper: WaveShaperNode;

  // 3-Band Tone Stack + Presence
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  private presenceFilter: BiquadFilterNode;

  // Cabinet Emulation Filter Bank
  private cabLowCut: BiquadFilterNode;
  private cabHighCut1: BiquadFilterNode;
  private cabHighCut2: BiquadFilterNode;
  private cabResonance: BiquadFilterNode;

  private masterGain: GainNode;
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.preampGain = ctx.createGain();
    this.preampShaper = ctx.createWaveShaper();
    this.preampShaper.oversample = '4x';

    // Tone stack filters
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120; // 120 Hz

    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 750; // 750 Hz
    this.midFilter.Q.value = 1.2;

    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 3200; // 3.2 kHz

    this.presenceFilter = ctx.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 4800; // 4.8 kHz
    this.presenceFilter.Q.value = 1.0;

    // Cabinet simulation filters (Simulating 12" speaker physical frequency response)
    this.cabLowCut = ctx.createBiquadFilter();
    this.cabLowCut.type = 'highpass';
    this.cabLowCut.frequency.value = 75; // Cut extreme sub bass rumble

    this.cabHighCut1 = ctx.createBiquadFilter();
    this.cabHighCut1.type = 'lowpass';
    this.cabHighCut1.frequency.value = 4800; // Steep speaker cone roll-off above 4.8kHz

    this.cabHighCut2 = ctx.createBiquadFilter();
    this.cabHighCut2.type = 'lowpass';
    this.cabHighCut2.frequency.value = 5400;

    this.cabResonance = ctx.createBiquadFilter();
    this.cabResonance.type = 'peaking';
    this.cabResonance.frequency.value = 2400; // Speaker cone breakup harmonic bump
    this.cabResonance.gain.value = 2.5;

    this.masterGain = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.connectChain();
  }

  private connectChain() {
    // Input -> Preamp Gain -> Tube Waveshaper -> Bass -> Mid -> Treble -> Presence -> Cab Filters -> Master -> Output
    this.inputNode.connect(this.preampGain);
    this.preampGain.connect(this.preampShaper);

    this.preampShaper.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.presenceFilter);

    this.presenceFilter.connect(this.cabLowCut);
    this.cabLowCut.connect(this.cabResonance);
    this.cabResonance.connect(this.cabHighCut1);
    this.cabHighCut1.connect(this.cabHighCut2);

    this.cabHighCut2.connect(this.masterGain);
    this.masterGain.connect(this.outputNode);
  }

  public updateAmp(params: AmpHeadParams) {
    const t = this.ctx.currentTime;

    // 1. Preamp Drive & Saturation curve
    const driveFactor = Math.max(0.1, params.preampDrive);
    this.preampGain.gain.setTargetAtTime(params.inputGain * (1.0 + driveFactor * 0.8), t, 0.02);
    this.preampShaper.curve = createDistortionCurve(driveFactor * 3.5, 2) as Float32Array<ArrayBuffer>;

    // 2. Tone Stack
    this.bassFilter.gain.setTargetAtTime(params.bass, t, 0.02);
    this.midFilter.gain.setTargetAtTime(params.middle, t, 0.02);
    this.trebleFilter.gain.setTargetAtTime(params.treble, t, 0.02);
    this.presenceFilter.gain.setTargetAtTime(params.presence, t, 0.02);

    // 3. Cabinet Voicing
    if (params.cabType === '4x12-heavy') {
      this.cabHighCut1.frequency.setTargetAtTime(4200, t, 0.02);
      this.cabResonance.frequency.setTargetAtTime(2100, t, 0.02);
      this.cabLowCut.frequency.setTargetAtTime(65, t, 0.02);
    } else if (params.cabType === '2x12-open') {
      this.cabHighCut1.frequency.setTargetAtTime(5200, t, 0.02);
      this.cabResonance.frequency.setTargetAtTime(2800, t, 0.02);
      this.cabLowCut.frequency.setTargetAtTime(90, t, 0.02);
    } else {
      // 1x12 Vintage
      this.cabHighCut1.frequency.setTargetAtTime(4600, t, 0.02);
      this.cabResonance.frequency.setTargetAtTime(2400, t, 0.02);
      this.cabLowCut.frequency.setTargetAtTime(80, t, 0.02);
    }

    // 4. Master volume with smooth ramp
    this.masterGain.gain.setTargetAtTime(params.masterVolume * 0.8, t, 0.02);
  }
}
