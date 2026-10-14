/**
 * Overdrive / Distortion AudioWorkletProcessor
 * High-performance audio thread DSP implementing:
 * - Non-linear waveshaping (Soft tanh, Hard clipping, Asymmetric Tube saturation)
 * - 1st-order dynamic low-pass tone filter
 * - Block processing in 128-frame chunks
 */
class OverdriveProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'drive', defaultValue: 5.0, minValue: 1.0, maxValue: 50.0, automationRate: 'a-rate' },
      { name: 'tone', defaultValue: 0.7, minValue: 0.05, maxValue: 1.0, automationRate: 'k-rate' },
      { name: 'level', defaultValue: 0.8, minValue: 0.0, maxValue: 2.0, automationRate: 'k-rate' },
      { name: 'mode', defaultValue: 0, minValue: 0, maxValue: 2, automationRate: 'k-rate' }, // 0: Soft (tanh), 1: Hard, 2: Tube Asymmetric
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    // Filter memory per channel for the tone filter (1-pole IIR)
    this.filterState = [0, 0];
  }

  // Non-linear waveshaping algorithms
  saturate(x, mode) {
    if (mode === 1) {
      // Hard clipping
      return Math.max(-1.0, Math.min(1.0, x));
    } else if (mode === 2) {
      // Asymmetric Tube Saturation (generates warm 2nd harmonic distortion)
      if (x >= 0) {
        return Math.tanh(x);
      } else {
        return Math.tanh(1.3 * x) * 0.85;
      }
    } else {
      // Classic Soft Clipping (Tanh curve)
      return Math.tanh(x);
    }
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

    const driveParam = parameters.drive;
    const tone = parameters.tone[0];
    const level = parameters.level[0];
    const mode = Math.round(parameters.mode[0]);

    // Simple 1-pole low-pass filter alpha calculated from tone parameter
    // tone = 1.0 means open filter (alpha close to 1), tone = 0.05 means heavy darkening
    const alpha = Math.min(0.99, Math.max(0.05, tone));

    const numChannels = Math.min(input.length, output.length);

    for (let c = 0; c < numChannels; ++c) {
      const inputChannel = input[c];
      const outputChannel = output[c];
      let yPrev = this.filterState[c] || 0;

      for (let i = 0; i < inputChannel.length; ++i) {
        const drive = driveParam.length > 1 ? driveParam[i] : driveParam[0];
        const raw = inputChannel[i] * drive;
        
        // 1. Non-linear wave shaping
        const shaped = this.saturate(raw, mode);

        // 2. 1-pole tone filter to tame harsh highs
        yPrev = yPrev + alpha * (shaped - yPrev);

        // 3. Output level adjustment with automatic gain compensation
        const makeup = 1.0 / (1.0 + Math.log(1.0 + drive * 0.2));
        outputChannel[i] = yPrev * level * makeup;
      }

      this.filterState[c] = yPrev;
    }

    return true;
  }
}

registerProcessor('overdrive-processor', OverdriveProcessor);
