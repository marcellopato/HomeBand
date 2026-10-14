export type TrackType = 'audio' | 'midi' | 'drummer' | 'guitar';

export interface MidiNote {
  id: string;
  pitch: number; // 0 - 127 (e.g. 60 = C4)
  start: number; // in beats from start of region
  duration: number; // in beats
  velocity: number; // 1 - 127
}

export interface Region {
  id: string;
  trackId: string;
  name: string;
  startBeat: number; // beat position on timeline
  durationBeats: number; // length in beats
  audioBuffer?: AudioBuffer;
  peaks?: number[]; // Waveform peak envelope for instant canvas rendering
  notes?: MidiNote[]; // If MIDI / Drummer track
  color?: string;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  icon: string;
  volume: number; // 0.0 to 1.5 (1.0 = 0dB)
  pan: number; // -1.0 (Left) to +1.0 (Right)
  mute: boolean;
  solo: boolean;
  armed: boolean; // Record Enable
  monitoring: boolean; // Direct real-time monitor
  regions: Region[];
}

export interface OverdrivePedalParams {
  enabled: boolean;
  drive: number; // 1.0 to 50.0
  tone: number; // 0.05 to 1.0
  level: number; // 0.0 to 2.0
  mode: number; // 0: Soft (tanh), 1: Hard, 2: Tube Asymmetric
}

export interface ChorusPedalParams {
  enabled: boolean;
  rate: number; // 0.1 to 8.0 Hz
  depth: number; // 0.0005 to 0.015 s
  mix: number; // 0.0 to 1.0
  feedback: number; // 0.0 to 0.7
}

export interface DelayPedalParams {
  enabled: boolean;
  delayTime: number; // in seconds
  feedback: number; // 0.0 to 0.95
  damping: number; // 0.0 to 0.95
  mix: number; // 0.0 to 1.0
  syncBpm: boolean;
  subdivision: '1/4' | '1/8' | '1/8d' | '1/16';
}

export interface ReverbPedalParams {
  enabled: boolean;
  roomSize: number; // 0.1 to 0.98
  damping: number; // 0.0 to 1.0
  mix: number; // 0.0 to 1.0
}

export interface AmpHeadParams {
  preset: 'clean-american' | 'british-crunch' | 'high-gain-lead' | 'custom';
  inputGain: number; // 0.1 to 2.5
  preampDrive: number; // 0.0 to 10.0
  bass: number; // -12 to +12 dB
  middle: number; // -12 to +12 dB
  treble: number; // -12 to +12 dB
  presence: number; // 0.0 to 10.0
  masterVolume: number; // 0.0 to 1.0
  cabType: '1x12-vintage' | '4x12-heavy' | '2x12-open';
}

export interface DrummerConfig {
  x: number; // 0.0 (Simple) to 1.0 (Complex)
  y: number; // 0.0 (Soft) to 1.0 (Loud / Intense)
  fillsFrequency: 4 | 8; // Bars interval for fills
  swing: number; // 0.0 to 0.8
  ghostNotes: boolean;
  activeKit: 'acoustic-rock' | 'vintage-studio' | 'electronic-beat';
}

export interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  isLooping: boolean;
  loopStartBeat: number;
  loopEndBeat: number;
  currentBeat: number;
  bpm: number;
  timeSignature: [number, number]; // e.g. [4, 4]
  metronomeEnabled: boolean;
}
