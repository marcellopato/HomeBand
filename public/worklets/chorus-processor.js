/**
 * Stereo Chorus AudioWorkletProcessor
 * Modulation DSP with dual quadrature LFOs (90-degree phase offset between left & right)
 */
class ChorusProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rate', defaultValue: 1.5, minValue: 0.1, maxValue: 8.0, automationRate: 'k-rate' },
      { name: 'depth', defaultValue: 0.003, minValue: 0.0005, maxValue: 0.015, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 0.5, minValue: 0.0, maxValue: 1.0, automationRate: 'k-rate' },
      { name: 'feedback', defaultValue: 0.2, minValue: 0.0, maxValue: 0.7, automationRate: 'k-rate' },
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    // 100ms max buffer is sufficient for chorus/flanger
    this.bufferSize = Math.floor(48000 * 0.1);
    this.buffers = [new Float32Array(this.bufferSize), new Float32Array(this.bufferSize)];
    this.writeIndex = 0;
    this.phase = 0; // LFO phase
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

    const rate = parameters.rate[0];
    const depth = parameters.depth[0];
    const mix = parameters.mix[0];
    const feedback = parameters.feedback[0];

    const baseDelaySamples = 0.012 * sampleRate; // 12ms baseline delay
    const depthSamples = depth * sampleRate;
    const phaseInc = (2 * Math.PI * rate) / sampleRate;

    const numChannels = Math.min(input.length, output.length, 2);

    for (let i = 0; i < 128; ++i) {
      const wIdx = (this.writeIndex + i) % this.bufferSize;

      // 90 degree phase shift between channels for wide stereo spread
      const lfoL = Math.sin(this.phase);
      const lfoR = Math.cos(this.phase);
      this.phase += phaseInc;
      if (this.phase >= 2 * Math.PI) this.phase -= 2 * Math.PI;

      const modDelays = [
        baseDelaySamples + lfoL * depthSamples,
        baseDelaySamples + lfoR * depthSamples
      ];

      for (let c = 0; c < numChannels; ++c) {
        const inSample = input[c][i] || 0;
        let rIdxFloat = wIdx - modDelays[c];
        while (rIdxFloat < 0) rIdxFloat += this.bufferSize;

        const rIdx0 = Math.floor(rIdxFloat);
        const rIdx1 = (rIdx0 + 1) % this.bufferSize;
        const frac = rIdxFloat - rIdx0;

        const delayedSample = this.buffers[c][rIdx0] * (1 - frac) + this.buffers[c][rIdx1] * frac;

        this.buffers[c][wIdx] = inSample + delayedSample * feedback;
        output[c][i] = inSample * (1 - mix * 0.5) + delayedSample * mix;
      }
    }

    this.writeIndex = (this.writeIndex + 128) % this.bufferSize;
    return true;
  }
}

registerProcessor('chorus-processor', ChorusProcessor);
