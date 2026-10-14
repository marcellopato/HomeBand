import type { OverdrivePedalParams, ChorusPedalParams, DelayPedalParams, ReverbPedalParams } from '../types/audio';
import { subdivisionToSeconds, createDistortionCurve } from './DSPMath';

export class Pedalboard {
  public inputNode: GainNode;
  public outputNode: GainNode;

  // Nodes for Overdrive
  private overdriveNode: AudioWorkletNode | WaveShaperNode | null = null;
  private odToneFilter: BiquadFilterNode;
  private odPreGain: GainNode;
  private odPostGain: GainNode;

  // Nodes for Chorus
  private chorusNode: AudioWorkletNode | DelayNode | null = null;

  // Nodes for Delay
  private delayNode: AudioWorkletNode | DelayNode | null = null;

  // Nodes for Reverb
  private reverbNode: AudioWorkletNode | ConvolverNode | null = null;

  private ctx: AudioContext;
  private useWorklets: boolean = false;

  constructor(ctx: AudioContext, useWorklets: boolean = false) {
    this.ctx = ctx;
    this.useWorklets = useWorklets;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Setup fallback filter & gain stages
    this.odToneFilter = ctx.createBiquadFilter();
    this.odToneFilter.type = 'lowpass';
    this.odToneFilter.frequency.value = 3500;

    this.odPreGain = ctx.createGain();
    this.odPostGain = ctx.createGain();

    this.buildChain();
  }

  private buildChain() {
    if (this.useWorklets) {
      try {
        this.overdriveNode = new AudioWorkletNode(this.ctx, 'overdrive-processor');
        this.chorusNode = new AudioWorkletNode(this.ctx, 'chorus-processor');
        this.delayNode = new AudioWorkletNode(this.ctx, 'delay-processor');
        this.reverbNode = new AudioWorkletNode(this.ctx, 'reverb-processor');

        // Serial connection: Input -> Overdrive -> Chorus -> Delay -> Reverb -> Output
        this.inputNode.connect(this.overdriveNode);
        this.overdriveNode.connect(this.chorusNode);
        this.chorusNode.connect(this.delayNode);
        this.delayNode.connect(this.reverbNode);
        this.reverbNode.connect(this.outputNode);
        return;
      } catch (e) {
        console.warn('[Pedalboard] Failed to construct AudioWorkletNodes, using native Web Audio fallback:', e);
      }
    }

    // High quality standard Web Audio API Fallback chain
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = createDistortionCurve(5, 0) as Float32Array<ArrayBuffer>;
    shaper.oversample = '4x';
    this.overdriveNode = shaper;

    // Connect fallback overdrive
    this.inputNode.connect(this.odPreGain);
    this.odPreGain.connect(shaper);
    shaper.connect(this.odToneFilter);
    this.odToneFilter.connect(this.odPostGain);

    // Standard delay fallback
    const delay = this.ctx.createDelay(3.0);
    delay.delayTime.value = 0.35;
    const delayFb = this.ctx.createGain();
    delayFb.gain.value = 0.4;
    delay.connect(delayFb);
    delayFb.connect(delay);
    this.delayNode = delay;

    // Direct routing for fallback
    this.odPostGain.connect(this.outputNode);
    this.odPostGain.connect(delay);
    delay.connect(this.outputNode);
  }

  public updateOverdrive(params: OverdrivePedalParams) {
    const t = this.ctx.currentTime;
    if (this.overdriveNode instanceof AudioWorkletNode) {
      const p = this.overdriveNode.parameters;
      p.get('bypass')?.setValueAtTime(params.enabled ? 0 : 1, t);
      p.get('drive')?.setTargetAtTime(params.drive, t, 0.02);
      p.get('tone')?.setTargetAtTime(params.tone, t, 0.02);
      p.get('level')?.setTargetAtTime(params.level, t, 0.02);
      p.get('mode')?.setValueAtTime(params.mode, t);
    } else if (this.overdriveNode instanceof WaveShaperNode) {
      if (params.enabled) {
        this.odPreGain.gain.setTargetAtTime(params.drive * 0.2, t, 0.02);
        this.odToneFilter.frequency.setTargetAtTime(params.tone * 7000 + 400, t, 0.02);
        this.odPostGain.gain.setTargetAtTime(params.level, t, 0.02);
        this.overdriveNode.curve = createDistortionCurve(params.drive, params.mode) as Float32Array<ArrayBuffer>;
      } else {
        this.odPreGain.gain.setTargetAtTime(1.0, t, 0.02);
        this.odPostGain.gain.setTargetAtTime(1.0, t, 0.02);
        this.odToneFilter.frequency.setTargetAtTime(20000, t, 0.02);
        this.overdriveNode.curve = null;
      }
    }
  }

  public updateChorus(params: ChorusPedalParams) {
    const t = this.ctx.currentTime;
    if (this.chorusNode instanceof AudioWorkletNode) {
      const p = this.chorusNode.parameters;
      p.get('bypass')?.setValueAtTime(params.enabled ? 0 : 1, t);
      p.get('rate')?.setTargetAtTime(params.rate, t, 0.03);
      p.get('depth')?.setTargetAtTime(params.depth, t, 0.03);
      p.get('mix')?.setTargetAtTime(params.mix, t, 0.03);
      p.get('feedback')?.setTargetAtTime(params.feedback, t, 0.03);
    }
  }

  public updateDelay(params: DelayPedalParams, bpm: number) {
    const t = this.ctx.currentTime;
    const finalDelayTime = params.syncBpm
      ? subdivisionToSeconds(bpm, params.subdivision)
      : params.delayTime;

    if (this.delayNode instanceof AudioWorkletNode) {
      const p = this.delayNode.parameters;
      p.get('bypass')?.setValueAtTime(params.enabled ? 0 : 1, t);
      p.get('delayTime')?.setTargetAtTime(finalDelayTime, t, 0.03);
      p.get('feedback')?.setTargetAtTime(params.feedback, t, 0.03);
      p.get('damping')?.setTargetAtTime(params.damping, t, 0.03);
      p.get('mix')?.setTargetAtTime(params.mix, t, 0.03);
    } else if (this.delayNode instanceof DelayNode) {
      this.delayNode.delayTime.setTargetAtTime(finalDelayTime, t, 0.03);
    }
  }

  public updateReverb(params: ReverbPedalParams) {
    const t = this.ctx.currentTime;
    if (this.reverbNode instanceof AudioWorkletNode) {
      const p = this.reverbNode.parameters;
      p.get('bypass')?.setValueAtTime(params.enabled ? 0 : 1, t);
      p.get('roomSize')?.setTargetAtTime(params.roomSize, t, 0.03);
      p.get('damping')?.setTargetAtTime(params.damping, t, 0.03);
      p.get('mix')?.setTargetAtTime(params.mix, t, 0.03);
    }
  }
}
