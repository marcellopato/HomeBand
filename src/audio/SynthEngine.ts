import { midiToFrequency } from '../dsp/DSPMath';

interface ActiveVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  midi: number;
}

export class SynthEngine {
  private ctx: AudioContext;
  public outputNode: GainNode;
  private activeVoices = new Map<number, ActiveVoice>();

  // ADSR parameters
  public attack = 0.01;
  public decay = 0.15;
  public sustain = 0.6;
  public release = 0.25;
  public cutoff = 2800;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.7;
    this.outputNode.connect(destination);
  }

  public noteOn(midi: number, velocity: number = 100, time?: number) {
    const t = time ?? this.ctx.currentTime;
    this.noteOff(midi, t); // Release existing voice on this pitch if any

    const freq = midiToFrequency(midi);
    const velFactor = Math.max(0.1, Math.min(1.0, velocity / 127));

    // Dual oscillator setup: Sawtooth + Sub-square with subtle detune
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, t);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq, t);
    osc2.detune.setValueAtTime(7, t); // +7 cents detuning for rich chorus/analog width

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.cutoff * velFactor, t);
    filter.Q.value = 2.5;

    // Amplitude envelope (ADSR)
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(velFactor * 0.5, t + this.attack);
    gain.gain.setTargetAtTime(velFactor * 0.5 * this.sustain, t + this.attack, this.decay);

    // Audio routing
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc1.start(t);
    osc2.start(t);

    this.activeVoices.set(midi, { osc1, osc2, filter, gain, midi });
  }

  public noteOff(midi: number, time?: number) {
    const voice = this.activeVoices.get(midi);
    if (!voice) return;

    const t = time ?? this.ctx.currentTime;
    // Release ramp
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, t);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + this.release);

    voice.osc1.stop(t + this.release + 0.05);
    voice.osc2.stop(t + this.release + 0.05);

    this.activeVoices.delete(midi);
  }

  public allNotesOff() {
    for (const midi of this.activeVoices.keys()) {
      this.noteOff(midi);
    }
  }
}
