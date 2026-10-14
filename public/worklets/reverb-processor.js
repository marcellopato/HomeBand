/**
 * Schroeder/Freeverb Reverb AudioWorkletProcessor
 * 4 Parallel Comb Filters + 2 Cascaded Allpass Diffusers
 */
class ReverbProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'roomSize', defaultValue: 0.7, minValue: 0.1, maxValue: 0.98, automationRate: 'k-rate' },
      { name: 'damping', defaultValue: 0.2, minValue: 0.0, maxValue: 1.0, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 0.3, minValue: 0.0, maxValue: 1.0, automationRate: 'k-rate' },
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    // Prime-number tuned delay lengths for natural diffusion without resonant peaks
    const combLengths = [1116, 1188, 1277, 1356];
    const allpassLengths = [225, 556];

    this.combs = combLengths.map(len => ({
      buffer: new Float32Array(len),
      index: 0,
      filter: 0
    }));

    this.allpasses = allpassLengths.map(len => ({
      buffer: new Float32Array(len),
      index: 0
    }));
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0) return true;

    const bypass = parameters.bypass[0] > 0.5;
    if (bypass) {
      for (let channel = 0; channel < input.length; ++channel) {
        output[channel].set(input[channel]);
      }
      return true;
    }

    const roomSize = parameters.roomSize[0];
    const damping = parameters.damping[0];
    const mix = parameters.mix[0];

    const inputL = input[0];
    const inputR = input[1] || input[0];
    const outputL = output[0];
    const outputR = output[1] || output[0];

    for (let i = 0; i < 128; ++i) {
      const inSample = (inputL[i] + inputR[i]) * 0.5 * 0.015;
      let combSum = 0;

      // 1. Process 4 parallel comb filters
      for (let c = 0; c < this.combs.length; ++c) {
        const comb = this.combs[c];
        const out = comb.buffer[comb.index];
        comb.filter = out * (1 - damping) + comb.filter * damping;
        comb.buffer[comb.index] = inSample + comb.filter * roomSize;
        comb.index = (comb.index + 1) % comb.buffer.length;
        combSum += out;
      }

      // 2. Diffuse through 2 series allpass filters
      let diff = combSum;
      for (let a = 0; a < this.allpasses.length; ++a) {
        const ap = this.allpasses[a];
        const bufOut = ap.buffer[ap.index];
        const apOut = -diff + bufOut;
        ap.buffer[ap.index] = diff + bufOut * 0.5;
        ap.index = (ap.index + 1) % ap.buffer.length;
        diff = apOut;
      }

      // 3. Output stereo wet/dry mix
      outputL[i] = inputL[i] * (1 - mix) + diff * mix * 2.0;
      outputR[i] = inputR[i] * (1 - mix) + diff * mix * 2.0;
    }

    return true;
  }
}

registerProcessor('reverb-processor', ReverbProcessor);
