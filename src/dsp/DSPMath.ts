/**
 * DSP Math and Audio Utilities
 */

// Generate a non-linear transfer curve for Web Audio WaveShaperNode
export function createDistortionCurve(drive: number = 5, mode: number = 0, samples: number = 4096): Float32Array {
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;

  for (let i = 0; i < samples; ++i) {
    // x from -1.0 to +1.0
    const x = (i * 2) / samples - 1;

    if (mode === 1) {
      // Hard clipping with threshold
      const thresh = 0.5 / Math.max(1, drive * 0.2);
      curve[i] = Math.max(-thresh, Math.min(thresh, x)) * (1 / thresh);
    } else if (mode === 2) {
      // Asymmetric Tube Saturation (generates even 2nd/4th harmonics)
      const k = drive * 2;
      if (x >= 0) {
        curve[i] = Math.tanh(k * x);
      } else {
        curve[i] = Math.tanh(k * 0.75 * x) * 0.85;
      }
    } else {
      // Smooth Classic Tanh S-Curve
      curve[i] = Math.tanh(drive * x);
    }
  }

  return curve;
}

// Extract peak envelopes from an AudioBuffer for fast waveform rendering on Canvas
export function extractPeaks(audioBuffer: AudioBuffer, targetLength: number = 400): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const step = Math.floor(channelData.length / targetLength);
  const peaks: number[] = new Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const start = i * step;
    const end = Math.min(start + step, channelData.length);
    let max = 0;

    for (let j = start; j < end; j++) {
      const val = Math.abs(channelData[j]);
      if (val > max) max = val;
    }
    peaks[i] = Math.min(1.0, max);
  }

  return peaks;
}

// Convert BPM and rhythmic subdivision to exact delay time in seconds
export function subdivisionToSeconds(bpm: number, subdivision: '1/4' | '1/8' | '1/8d' | '1/16'): number {
  const quarterNote = 60.0 / bpm;
  switch (subdivision) {
    case '1/4':
      return quarterNote;
    case '1/8':
      return quarterNote * 0.5;
    case '1/8d': // Dotted eighth
      return quarterNote * 0.75;
    case '1/16':
      return quarterNote * 0.25;
    default:
      return quarterNote * 0.5;
  }
}

// Convert MIDI pitch number (e.g., 60 = C4) to Frequency in Hz (A4 = 440Hz)
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert MIDI note number to Note Name (e.g. 60 -> "C4")
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}
