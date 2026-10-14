import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Track, Region, TrackType, MidiNote } from '../types/audio';
import { AudioEngineManager } from '../audio/AudioEngineManager';
import { useDrummerStore } from './drummerStore';
import { useAmpStore } from './ampStore';

export const useProjectStore = defineStore('project', () => {
  const bpm = ref(120);
  const timeSignature = ref<[number, number]>([4, 4]);
  const isPlaying = ref(false);
  const isRecording = ref(false);
  const isLooping = ref(true);
  const loopStartBeat = ref(0);
  const loopEndBeat = ref(16);
  const currentBeat = ref(0);
  const metronomeEnabled = ref(false);

  // Zoom & UI dimensions
  const zoomX = ref(54); // Pixels per beat
  const trackHeight = ref(84); // Track strip height in pixels
  const activeTrackId = ref<string>('track-drummer');
  const selectedRegionId = ref<string | null>(null);

  // Initial Demo Project Tracks
  const tracks = ref<Track[]>([
    {
      id: 'track-drummer',
      name: 'Kyle - SoCal Drummer',
      type: 'drummer',
      color: '#eab308', // Amber / Gold
      icon: 'Drum',
      volume: 1.0,
      pan: 0.0,
      mute: false,
      solo: false,
      armed: false,
      monitoring: false,
      regions: [
        {
          id: 'reg-drummer-1',
          trackId: 'track-drummer',
          name: 'Rock Beat (Procedural)',
          startBeat: 0,
          durationBeats: 16,
          notes: [] // Populated dynamically by drummerStore
        }
      ]
    },
    {
      id: 'track-guitar',
      name: 'Vintage Drive Guitar',
      type: 'guitar',
      color: '#3b82f6', // Electric Blue
      icon: 'Guitar',
      volume: 0.9,
      pan: -0.2,
      mute: false,
      solo: false,
      armed: false,
      monitoring: true,
      regions: []
    },
    {
      id: 'track-synth',
      name: 'Analog Bass Synth',
      type: 'midi',
      color: '#10b981', // Emerald
      icon: 'Music',
      volume: 0.95,
      pan: 0.1,
      mute: false,
      solo: false,
      armed: false,
      monitoring: false,
      regions: [
        {
          id: 'reg-synth-1',
          trackId: 'track-synth',
          name: 'Driving Bassline',
          startBeat: 0,
          durationBeats: 16,
          notes: [
            // Bar 1 (A minor)
            { id: 'b1', pitch: 45, start: 0.0, duration: 0.75, velocity: 110 },
            { id: 'b2', pitch: 45, start: 1.0, duration: 0.75, velocity: 100 },
            { id: 'b3', pitch: 45, start: 2.0, duration: 0.75, velocity: 110 },
            { id: 'b4', pitch: 48, start: 3.0, duration: 0.5, velocity: 105 },
            { id: 'b5', pitch: 47, start: 3.5, duration: 0.5, velocity: 100 },
            // Bar 2 (F major)
            { id: 'b6', pitch: 41, start: 4.0, duration: 0.75, velocity: 110 },
            { id: 'b7', pitch: 41, start: 5.0, duration: 0.75, velocity: 100 },
            { id: 'b8', pitch: 41, start: 6.0, duration: 0.75, velocity: 110 },
            { id: 'b9', pitch: 45, start: 7.0, duration: 0.75, velocity: 105 },
            // Bar 3 (C major)
            { id: 'b10', pitch: 48, start: 8.0, duration: 0.75, velocity: 110 },
            { id: 'b11', pitch: 48, start: 9.0, duration: 0.75, velocity: 100 },
            { id: 'b12', pitch: 48, start: 10.0, duration: 0.75, velocity: 110 },
            { id: 'b13', pitch: 50, start: 11.0, duration: 0.75, velocity: 100 },
            // Bar 4 (G major)
            { id: 'b14', pitch: 43, start: 12.0, duration: 0.75, velocity: 110 },
            { id: 'b15', pitch: 43, start: 13.0, duration: 0.75, velocity: 100 },
            { id: 'b16', pitch: 47, start: 14.0, duration: 0.75, velocity: 110 },
            { id: 'b17', pitch: 45, start: 15.0, duration: 0.75, velocity: 105 }
          ]
        }
      ]
    },
    {
      id: 'track-vocal',
      name: 'Audio Track / Mic',
      type: 'audio',
      color: '#ef4444', // Red
      icon: 'Mic',
      volume: 1.0,
      pan: 0.0,
      mute: false,
      solo: false,
      armed: true,
      monitoring: false,
      regions: []
    }
  ]);

  const activeTrack = computed(() => {
    return tracks.value.find(t => t.id === activeTrackId.value) || tracks.value[0];
  });

  // Init Engine sync
  function initEngine() {
    const engine = AudioEngineManager.getInstance();
    const drummer = useDrummerStore();

    // Populate initial procedural drummer notes
    const drummerTrack = tracks.value.find(t => t.type === 'drummer');
    if (drummerTrack && drummerTrack.regions[0]) {
      drummerTrack.regions[0].notes = drummer.generateDrumPattern(4);
    }

    engine.syncTracks(tracks.value, true);
    engine.setBpm(bpm.value);
    engine.setTimeSignature(timeSignature.value[0], timeSignature.value[1]);
    engine.setLoop(isLooping.value, loopStartBeat.value, loopEndBeat.value);
    engine.setMetronome(metronomeEnabled.value);

    // Sync playhead updates to Pinia
    engine.subscribeBeat((beat) => {
      currentBeat.value = beat;
    });

    const amp = useAmpStore();
    amp.syncToAudioEngine(bpm.value);
  }

  function play() {
    const engine = AudioEngineManager.getInstance();
    isPlaying.value = true;
    engine.play(currentBeat.value, tracks.value);
  }

  function pause() {
    const engine = AudioEngineManager.getInstance();
    isPlaying.value = false;
    isRecording.value = false;
    engine.pause();
  }

  function stop() {
    const engine = AudioEngineManager.getInstance();
    isPlaying.value = false;
    isRecording.value = false;
    engine.stop();
    currentBeat.value = 0;
  }

  async function toggleRecord() {
    const engine = AudioEngineManager.getInstance();

    if (isRecording.value) {
      // Stop recording
      isRecording.value = false;
      pause();
      const recorded = engine.recorder.stopRecording();
      if (recorded) {
        // Find armed track
        const armedTrack = tracks.value.find(t => t.armed && t.type === 'audio');
        if (armedTrack) {
          const newRegion: Region = {
            id: `rec-${Date.now()}`,
            trackId: armedTrack.id,
            name: `Take ${armedTrack.regions.length + 1}`,
            startBeat: 0,
            durationBeats: Math.max(4, Math.ceil((recorded.buffer.duration * bpm.value) / 60)),
            audioBuffer: recorded.buffer,
            peaks: recorded.peaks
          };
          armedTrack.regions.push(newRegion);
        }
      }
    } else {
      // Start recording
      const armed = tracks.value.some(t => t.armed);
      if (!armed) {
        // Auto arm first audio track
        const audTrack = tracks.value.find(t => t.type === 'audio');
        if (audTrack) audTrack.armed = true;
      }
      const ok = await engine.recorder.requestPermission();
      if (!ok) {
        alert('Por favor permita o acesso ao microfone/interface de áudio para gravar.');
        return;
      }
      engine.recorder.startRecording();
      isRecording.value = true;
      play();
    }
  }

  function seekToBeat(beat: number) {
    const engine = AudioEngineManager.getInstance();
    currentBeat.value = Math.max(0, beat);
    engine.seek(beat);
  }

  function setBpm(newBpm: number) {
    bpm.value = Math.max(40, Math.min(240, newBpm));
    AudioEngineManager.getInstance().setBpm(bpm.value);
    useAmpStore().syncToAudioEngine(bpm.value);
  }

  function toggleMetronome() {
    metronomeEnabled.value = !metronomeEnabled.value;
    AudioEngineManager.getInstance().setMetronome(metronomeEnabled.value);
  }

  function toggleLoop() {
    isLooping.value = !isLooping.value;
    AudioEngineManager.getInstance().setLoop(isLooping.value, loopStartBeat.value, loopEndBeat.value);
  }

  function setLoopRange(start: number, end: number) {
    loopStartBeat.value = Math.max(0, start);
    loopEndBeat.value = Math.max(loopStartBeat.value + 1, end);
    AudioEngineManager.getInstance().setLoop(isLooping.value, loopStartBeat.value, loopEndBeat.value);
  }

  function addTrack(type: TrackType) {
    const id = `track-${Date.now()}`;
    const count = tracks.value.filter(t => t.type === type).length + 1;
    let name = 'New Track';
    let color = '#3b82f6';
    let icon = 'Music';

    switch (type) {
      case 'audio':
        name = `Audio Track ${count}`;
        color = '#ef4444';
        icon = 'Mic';
        break;
      case 'midi':
        name = `Synth Track ${count}`;
        color = '#10b981';
        icon = 'Music';
        break;
      case 'guitar':
        name = `Guitar Amp ${count}`;
        color = '#6366f1';
        icon = 'Guitar';
        break;
      case 'drummer':
        name = `Drummer ${count}`;
        color = '#f59e0b';
        icon = 'Drum';
        break;
    }

    const newTrack: Track = {
      id,
      name,
      type,
      color,
      icon,
      volume: 1.0,
      pan: 0.0,
      mute: false,
      solo: false,
      armed: false,
      monitoring: false,
      regions: []
    };

    tracks.value.push(newTrack);
    activeTrackId.value = id;
    AudioEngineManager.getInstance().syncTracks(tracks.value, true);
  }

  function deleteTrack(id: string) {
    if (tracks.value.length <= 1) return;
    const idx = tracks.value.findIndex(t => t.id === id);
    if (idx !== -1) {
      tracks.value.splice(idx, 1);
      if (activeTrackId.value === id) {
        activeTrackId.value = tracks.value[0].id;
      }
      AudioEngineManager.getInstance().syncTracks(tracks.value, true);
    }
  }

  function updateTrackVolume(id: string, vol: number) {
    const t = tracks.value.find(trk => trk.id === id);
    if (t) {
      t.volume = vol;
      AudioEngineManager.getInstance().getTrackNode(id)?.setVolume(vol);
    }
  }

  function updateTrackPan(id: string, pan: number) {
    const t = tracks.value.find(trk => trk.id === id);
    if (t) {
      t.pan = pan;
      AudioEngineManager.getInstance().getTrackNode(id)?.setPan(pan);
    }
  }

  function toggleMute(id: string) {
    const t = tracks.value.find(trk => trk.id === id);
    if (t) {
      t.mute = !t.mute;
      AudioEngineManager.getInstance().syncTracks(tracks.value, true);
    }
  }

  function toggleSolo(id: string) {
    const t = tracks.value.find(trk => trk.id === id);
    if (t) {
      t.solo = !t.solo;
      AudioEngineManager.getInstance().syncTracks(tracks.value, true);
    }
  }

  function toggleArmed(id: string) {
    const t = tracks.value.find(trk => trk.id === id);
    if (t) {
      t.armed = !t.armed;
    }
  }

  async function toggleMonitoring(id: string) {
    const t = tracks.value.find(trk => trk.id === id);
    if (t) {
      t.monitoring = !t.monitoring;
      const engine = AudioEngineManager.getInstance();
      const node = engine.getTrackNode(id);
      if (node && t.monitoring) {
        const ok = await engine.recorder.requestPermission();
        if (ok) {
          engine.recorder.setMonitoring(true, node.inputNode);
        }
      } else if (node) {
        engine.recorder.setMonitoring(false, node.inputNode);
      }
    }
  }

  async function importAudioFile(trackId: string, file: File) {
    const engine = AudioEngineManager.getInstance();
    const { buffer, peaks } = await engine.decodeAudioFile(file);

    const targetTrack = tracks.value.find(t => t.id === trackId);
    if (targetTrack) {
      const beats = (buffer.duration * bpm.value) / 60;
      const newRegion: Region = {
        id: `reg-imported-${Date.now()}`,
        trackId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        startBeat: currentBeat.value,
        durationBeats: beats,
        audioBuffer: buffer,
        peaks
      };
      targetTrack.regions.push(newRegion);
    }
  }

  function regenerateDrummer() {
    const drummerTrack = tracks.value.find(t => t.type === 'drummer');
    if (drummerTrack && drummerTrack.regions[0]) {
      const drummer = useDrummerStore();
      drummerTrack.regions[0].notes = drummer.generateDrumPattern(4);
    }
  }

  return {
    bpm,
    timeSignature,
    isPlaying,
    isRecording,
    isLooping,
    loopStartBeat,
    loopEndBeat,
    currentBeat,
    metronomeEnabled,
    zoomX,
    trackHeight,
    tracks,
    activeTrackId,
    activeTrack,
    selectedRegionId,
    initEngine,
    play,
    pause,
    stop,
    toggleRecord,
    seekToBeat,
    setBpm,
    toggleMetronome,
    toggleLoop,
    setLoopRange,
    addTrack,
    deleteTrack,
    updateTrackVolume,
    updateTrackPan,
    toggleMute,
    toggleSolo,
    toggleArmed,
    toggleMonitoring,
    importAudioFile,
    regenerateDrummer
  };
});
