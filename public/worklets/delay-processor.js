/**
 * Stereo Delay with Damping AudioWorkletProcessor
 * Implements circular buffer with fractional sample interpolation,
 * feedback loop damping filter, and dry/wet mixing.
 */
class DelayProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'delayTime', defaultValue: 0.375, minValue: 0.01, maxValue: 2.5, automationRate: 'k-rate' }, // Seconds (default: dotted 8th @ 120bpm)
      { name: 'feedback', defaultValue: 0.45, minValue: 0.0, maxValue: 0.95, automationRate: 'k-rate' },
      { name: 'damping', defaultValue: 0.4, minValue: 0.0, maxValue: 0.95, automationRate: 'k-rate' }, // High-cut filter on feedback
      { name: 'mix', defaultValue: 0.35, minValue: 0.0, maxValue: 1.0, automationRate: 'k-rate' },
      { name: 'pingPong', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    // 3 seconds max delay buffer at 48kHz
    this.bufferSize = 48000 * 3;
    this.buffers = [new Float32Array(this.bufferSize), new Float32Array(this.bufferSize)];
    this.writeIndex = 0;
    this.dampState = [0, 0];
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

    const delayTime = parameters.delayTime[0];
    const feedback = parameters.feedback[0];
    const damping = parameters.damping[0];
    const mix = parameters.mix[0];
    const isPingPong = parameters.pingPong[0] > 0.5;

    // Convert delay time in seconds to sample delay
    const delaySamples = Math.min(this.bufferSize - 1, Math.max(1, delayTime * sampleRate));
    const numChannels = Math.min(input.length, output.length, 2);

    for (let i = 0; i < 128; ++i) {
      const wIdx = (this.writeIndex + i) % this.bufferSize;

      for (let c = 0; c < numChannels; ++c) {
        const inSample = input[c][i] || 0;

        // Offset delay for ping pong in right channel
        const offsetSamples = (isPingPong && c === 1) ? delaySamples * 0.75 : delaySamples;
        let rIdxFloat = wIdx - offsetSamples;
        while (rIdxFloat < 0) rIdxFloat += this.bufferSize;

        // Linear interpolation for smooth delay time changes
        const rIdx0 = Math.floor(rIdxFloat);
        const rIdx1 = (rIdx0 + 1) % this.bufferSize;
        const frac = rIdxFloat - rIdx0;

        const delayedSample = this.buffers[c][rIdx0] * (1 - frac) + this.buffers[c][rIdx1] * frac;

        // Damping filter (1-pole low pass in feedback loop)
        this.dampState[c] = this.dampState[c] + (1.0 - damping) * (delayedSample - this.dampState[c]);
        const feedbackSample = this.dampState[c] * feedback;

        // Feed either to same channel or opposite channel if ping-pong
        const targetChannel = isPingPong && c === 0 ? 1 : 0;
        this.buffers[targetChannel][wIdx] = inSample + feedbackSample;

        // Output mix
        output[c][i] = inSample * (1.0 - mix * 0.6) + delayedSample * mix;
      }
    }

    this.writeIndex = (this.writeIndex + 128) % this.bufferSize;
    return true;
  }
}

registerProcessor('delay-processor', DelayProcessor);
