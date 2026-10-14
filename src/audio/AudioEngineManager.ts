import { MasterBus } from './MasterBus';
import { TrackNode } from './TrackNode';
import { Metronome } from './Metronome';
import { DrumSynthesizer } from './DrumSynthesizer';
import { SynthEngine } from './SynthEngine';
import { AudioRecorder } from './AudioRecorder';
import { AudioWorkletLoader } from '../dsp/AudioWorkletLoader';
import type { Track, Region, MidiNote } from '../types/audio';
import { extractPeaks } from '../dsp/DSPMath';

export class AudioEngineManager {
  private static instance: AudioEngineManager | null = null;

  public ctx: AudioContext;
  public masterBus: MasterBus;
  public metronome: Metronome;
  public drumSynth: DrumSynthesizer;
  public synthEngine: SynthEngine;
  public recorder: AudioRecorder;

  private trackNodes = new Map<string, TrackNode>();
  private activeBufferSources = new Map<string, AudioBufferSourceNode[]>();

  // Transport Clock State
  private isPlaying = false;
  private isRecording = false;
  private bpm = 120;
  private timeSignature: [number, number] = [4, 4];
  private isLooping = false;
  private loopStartBeat = 0;
  private loopEndBeat = 16;
  private metronomeEnabled = false;

  // High-precision lookahead scheduler state
  private playbackStartAudioTime = 0;
  private playbackStartBeat = 0;
  private currentPlayheadBeat = 0;
  private schedulerTimerId: number | null = null;
  private lookaheadMs = 40; // Frequency of scheduler tick
  private scheduleAheadSec = 0.12; // Lookahead window (120ms)
  private nextScheduledBeat = 0;

  // Listeners for UI state update
  private onBeatUpdateCallbacks: ((beat: number) => void)[] = [];

  private constructor() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });

    this.masterBus = new MasterBus(this.ctx);
    this.metronome = new Metronome(this.ctx, this.masterBus.inputNode);
    this.drumSynth = new DrumSynthesizer(this.ctx, this.masterBus.inputNode);
    this.synthEngine = new SynthEngine(this.ctx, this.masterBus.inputNode);
    this.recorder = new AudioRecorder(this.ctx);

    // Initialize AudioWorklets asynchronously in background
    AudioWorkletLoader.loadAllWorklets(this.ctx).catch(err => {
      console.warn('[AudioEngineManager] AudioWorklet load note:', err);
    });
  }

  public static getInstance(): AudioEngineManager {
    if (!AudioEngineManager.instance) {
      AudioEngineManager.instance = new AudioEngineManager();
    }
    return AudioEngineManager.instance;
  }

  public async resumeContext(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // --- Track Management ---

  public syncTracks(tracks: Track[], useWorklets: boolean = false) {
    const activeIds = new Set(tracks.map(t => t.id));

    // Remove deleted tracks
    for (const [id, node] of this.trackNodes.entries()) {
      if (!activeIds.has(id)) {
        node.dispose();
        this.trackNodes.delete(id);
      }
    }

    // Check for any soloed tracks
    const hasSolo = tracks.some(t => t.solo);

    // Create or update track nodes
    for (const track of tracks) {
      let node = this.trackNodes.get(track.id);
      if (!node) {
        node = new TrackNode(this.ctx, track, this.masterBus.inputNode, useWorklets);
        this.trackNodes.set(track.id, node);
      }

      node.setVolume(track.volume);
      node.setPan(track.pan);
      node.setMute(track.mute);

      if (hasSolo) {
        node.setSoloMute(!track.solo);
      } else {
        node.setSoloMute(false);
      }
    }
  }

  public getTrackNode(trackId: string): TrackNode | undefined {
    return this.trackNodes.get(trackId);
  }

  // --- Transport Clock & Lookahead Scheduling ---

  public setBpm(newBpm: number) {
    this.bpm = Math.max(30, Math.min(300, newBpm));
  }

  public setTimeSignature(num: number, den: number) {
    this.timeSignature = [num, den];
  }

  public setLoop(enabled: boolean, startBeat: number, endBeat: number) {
    this.isLooping = enabled;
    this.loopStartBeat = startBeat;
    this.loopEndBeat = endBeat;
  }

  public setMetronome(enabled: boolean) {
    this.metronomeEnabled = enabled;
  }

  public seek(beat: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.currentPlayheadBeat = Math.max(0, beat);
    this.notifyBeat(this.currentPlayheadBeat);

    if (wasPlaying) {
      this.play(this.currentPlayheadBeat);
    }
  }

  public async play(fromBeat?: number, tracks?: Track[]) {
    await this.resumeContext();

    if (fromBeat !== undefined) {
      this.currentPlayheadBeat = fromBeat;
    }

    this.isPlaying = true;
    this.playbackStartAudioTime = this.ctx.currentTime;
    this.playbackStartBeat = this.currentPlayheadBeat;
    this.nextScheduledBeat = Math.floor(this.currentPlayheadBeat);

    // Stop previous buffer sources
    this.stopAllBufferSources();

    // Start lookahead scheduler loop
    this.runScheduler(tracks || []);
  }

  public pause() {
    this.isPlaying = false;
    if (this.schedulerTimerId !== null) {
      window.clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
    this.stopAllBufferSources();
    this.synthEngine.allNotesOff();
  }

  public stop() {
    this.pause();
    this.seek(0);
  }

  private runScheduler(tracks: Track[]) {
    this.schedulerTimerId = window.setInterval(() => {
      if (!this.isPlaying) return;

      const secondsPerBeat = 60.0 / this.bpm;
      const elapsedAudioTime = this.ctx.currentTime - this.playbackStartAudioTime;
      const currentCalculatedBeat = this.playbackStartBeat + elapsedAudioTime / secondsPerBeat;

      // Handle timeline looping
      if (this.isLooping && currentCalculatedBeat >= this.loopEndBeat) {
        const loopDurationBeats = this.loopEndBeat - this.loopStartBeat;
        this.playbackStartAudioTime = this.ctx.currentTime;
        this.playbackStartBeat = this.loopStartBeat;
        this.nextScheduledBeat = this.loopStartBeat;
        this.currentPlayheadBeat = this.loopStartBeat;
        this.stopAllBufferSources();
        return;
      }

      this.currentPlayheadBeat = currentCalculatedBeat;
      this.notifyBeat(this.currentPlayheadBeat);

      // Schedule events within lookahead window
      const scheduleUntilAudioTime = this.ctx.currentTime + this.scheduleAheadSec;
      const scheduleUntilBeat = this.playbackStartBeat + (scheduleUntilAudioTime - this.playbackStartAudioTime) / secondsPerBeat;

      while (this.nextScheduledBeat < scheduleUntilBeat) {
        const beatAudioTime = this.playbackStartAudioTime + (this.nextScheduledBeat - this.playbackStartBeat) * secondsPerBeat;

        if (beatAudioTime >= this.ctx.currentTime - 0.01) {
          // 1. Schedule Metronome Click
          if (this.metronomeEnabled) {
            const isDownbeat = (this.nextScheduledBeat % this.timeSignature[0]) === 0;
            this.metronome.scheduleClick(beatAudioTime, isDownbeat);
          }

          // 2. Schedule MIDI events & Audio Clips for active tracks
          this.scheduleTrackEventsAtBeat(this.nextScheduledBeat, beatAudioTime, tracks);
        }

        this.nextScheduledBeat++;
      }
    }, this.lookaheadMs);
  }

  private scheduleTrackEventsAtBeat(beat: number, audioTime: number, tracks: Track[]) {
    const hasSolo = tracks.some(t => t.solo);

    for (const track of tracks) {
      if (track.mute) continue;
      if (hasSolo && !track.solo) continue;

      const trackNode = this.trackNodes.get(track.id);

      for (const region of track.regions) {
        // Trigger Audio Region playback
        if (track.type === 'audio' && region.audioBuffer && trackNode) {
          if (Math.abs(region.startBeat - beat) < 0.05) {
            this.playAudioRegion(region, trackNode.inputNode, audioTime);
          }
        }

        // Trigger MIDI / Smart Instrument notes
        if ((track.type === 'midi' || track.type === 'drummer') && region.notes) {
          for (const note of region.notes) {
            const noteAbsoluteBeat = region.startBeat + note.start;
            if (noteAbsoluteBeat >= beat && noteAbsoluteBeat < beat + 1) {
              const secondsPerBeat = 60.0 / this.bpm;
              const noteAudioTime = audioTime + (noteAbsoluteBeat - beat) * secondsPerBeat;

              if (track.type === 'drummer') {
                this.scheduleDrumNote(note, noteAudioTime);
              } else {
                this.synthEngine.noteOn(note.pitch, note.velocity, noteAudioTime);
                const noteDurationSec = note.duration * secondsPerBeat;
                this.synthEngine.noteOff(note.pitch, noteAudioTime + noteDurationSec);
              }
            }
          }
        }
      }
    }
  }

  private scheduleDrumNote(note: MidiNote, time: number) {
    // Standard General MIDI Drum mappings
    switch (note.pitch) {
      case 36: // C1 Bass drum
      case 35:
        this.drumSynth.trigger('kick', time, note.velocity);
        break;
      case 38: // D1 Acoustic snare
      case 40:
        this.drumSynth.trigger('snare', time, note.velocity);
        break;
      case 42: // F#1 Closed Hat
      case 44:
        this.drumSynth.trigger('hihatClosed', time, note.velocity);
        break;
      case 46: // A#1 Open Hat
        this.drumSynth.trigger('hihatOpen', time, note.velocity);
        break;
      case 41: // Low Tom
      case 43:
        this.drumSynth.trigger('tomLow', time, note.velocity);
        break;
      case 45: // Mid Tom
      case 47:
        this.drumSynth.trigger('tomMid', time, note.velocity);
        break;
      case 48: // High Tom
      case 50:
        this.drumSynth.trigger('tomHigh', time, note.velocity);
        break;
      case 49: // Crash cymbal
      case 57:
        this.drumSynth.trigger('crash', time, note.velocity);
        break;
      default:
        this.drumSynth.trigger('hihatClosed', time, note.velocity);
        break;
    }
  }

  private playAudioRegion(region: Region, destination: AudioNode, startTime: number) {
    if (!region.audioBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = region.audioBuffer;
    source.connect(destination);
    source.start(startTime);

    const activeList = this.activeBufferSources.get(region.id) || [];
    activeList.push(source);
    this.activeBufferSources.set(region.id, activeList);

    source.onended = () => {
      const list = this.activeBufferSources.get(region.id) || [];
      const idx = list.indexOf(source);
      if (idx !== -1) list.splice(idx, 1);
    };
  }

  private stopAllBufferSources() {
    for (const list of this.activeBufferSources.values()) {
      for (const src of list) {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Already stopped
        }
      }
    }
    this.activeBufferSources.clear();
  }

  // --- Audio Buffer Decoding ---

  public async decodeAudioFile(file: File | Blob): Promise<{ buffer: AudioBuffer; peaks: number[] }> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    const peaks = extractPeaks(audioBuffer, 350);
    return { buffer: audioBuffer, peaks };
  }

  // --- UI Synchronizer ---

  public subscribeBeat(cb: (beat: number) => void): () => void {
    this.onBeatUpdateCallbacks.push(cb);
    return () => {
      const idx = this.onBeatUpdateCallbacks.indexOf(cb);
      if (idx !== -1) this.onBeatUpdateCallbacks.splice(idx, 1);
    };
  }

  private notifyBeat(beat: number) {
    for (const cb of this.onBeatUpdateCallbacks) {
      cb(beat);
    }
  }

  public getCurrentBeat(): number {
    return this.currentPlayheadBeat;
  }
}
