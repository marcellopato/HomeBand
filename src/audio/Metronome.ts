/**
 * Sample-accurate Synthesized Metronome
 * Eliminates jitter by scheduling oscillators directly into the audio thread.
 */
export class Metronome {
  private ctx: AudioContext;
  private outputNode: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.35;
    this.outputNode.connect(destination);
  }

  public scheduleClick(time: number, isAccent: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Accent pitch (Downbeat: 1600 Hz), regular beats: 900 Hz
    osc.frequency.setValueAtTime(isAccent ? 1600 : 900, time);

    gain.gain.setValueAtTime(1.0, time);
    // Smooth exponential decay to avoid any clicking
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isAccent ? 0.045 : 0.03));

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  public setVolume(vol: number) {
    this.outputNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.02);
  }
}
