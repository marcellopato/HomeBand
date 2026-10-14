import type { Track, TrackType } from '../types/audio';
import { Pedalboard } from '../dsp/Pedalboard';
import { AmpDesigner } from '../dsp/AmpDesigner';

export class TrackNode {
  public id: string;
  public type: TrackType;
  public inputNode: GainNode;
  public volumeNode: GainNode;
  public panNode: StereoPannerNode;
  public muteNode: GainNode;
  public analyser: AnalyserNode;
  public outputNode: GainNode;

  public pedalboard: Pedalboard | null = null;
  public ampDesigner: AmpDesigner | null = null;

  private ctx: AudioContext;
  private meterData: Uint8Array;
  private currentVolume: number = 1.0;
  private isMuted: boolean = false;

  constructor(ctx: AudioContext, track: Track, destination: AudioNode, useWorklets: boolean = false) {
    this.ctx = ctx;
    this.id = track.id;
    this.type = track.type;

    this.inputNode = ctx.createGain();
    this.volumeNode = ctx.createGain();
    this.volumeNode.gain.value = track.volume;

    this.panNode = ctx.createStereoPanner();
    this.panNode.pan.value = track.pan;

    this.muteNode = ctx.createGain();
    this.muteNode.gain.value = track.mute ? 0 : 1;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.meterData = new Uint8Array(this.analyser.frequencyBinCount);

    this.outputNode = ctx.createGain();

    // If guitar track, build Guitar Amp & Pedalboard chain
    if (track.type === 'guitar') {
      this.pedalboard = new Pedalboard(ctx, useWorklets);
      this.ampDesigner = new AmpDesigner(ctx);

      // Input -> Pedalboard -> AmpDesigner -> Volume -> Pan -> Mute -> Analyser -> Output
      this.inputNode.connect(this.pedalboard.inputNode);
      this.pedalboard.outputNode.connect(this.ampDesigner.inputNode);
      this.ampDesigner.outputNode.connect(this.volumeNode);
    } else {
      this.inputNode.connect(this.volumeNode);
    }

    this.volumeNode.connect(this.panNode);
    this.panNode.connect(this.muteNode);
    this.muteNode.connect(this.analyser);
    this.analyser.connect(this.outputNode);

    // Connect to Master Summing Bus
    this.outputNode.connect(destination);
  }

  public setVolume(vol: number) {
    this.currentVolume = vol;
    const t = this.ctx.currentTime;
    // Smooth target ramp to prevent any zipper clicks
    this.volumeNode.gain.setTargetAtTime(Math.max(0, Math.min(2.0, vol)), t, 0.02);
  }

  public setPan(panVal: number) {
    const t = this.ctx.currentTime;
    this.panNode.pan.setTargetAtTime(Math.max(-1, Math.min(1, panVal)), t, 0.02);
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    const t = this.ctx.currentTime;
    this.muteNode.gain.setTargetAtTime(mute ? 0 : 1, t, 0.015);
  }

  public setSoloMute(shouldBeSilent: boolean) {
    const t = this.ctx.currentTime;
    const target = (this.isMuted || shouldBeSilent) ? 0 : 1;
    this.muteNode.gain.setTargetAtTime(target, t, 0.015);
  }

  public getPeakLevel(): number {
    this.analyser.getByteFrequencyData(this.meterData);
    let max = 0;
    for (let i = 0; i < this.meterData.length; i++) {
      if (this.meterData[i] > max) max = this.meterData[i];
    }
    return max / 255;
  }

  public dispose() {
    this.inputNode.disconnect();
    this.volumeNode.disconnect();
    this.panNode.disconnect();
    this.muteNode.disconnect();
    this.analyser.disconnect();
    this.outputNode.disconnect();
  }
}
