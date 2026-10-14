<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useProjectStore } from '../../stores/projectStore';
import { AudioEngineManager } from '../../audio/AudioEngineManager';
import { midiToNoteName } from '../../dsp/DSPMath';
import type { MidiNote } from '../../types/audio';
import { Music, Check, Wand2, Usb } from 'lucide-vue-next';

const project = useProjectStore();
const engine = AudioEngineManager.getInstance();

// Active MIDI Track Region
const activeMidiTrack = computed(() => {
  return project.tracks.find(t => t.id === project.activeTrackId && t.type === 'midi')
    || project.tracks.find(t => t.type === 'midi');
});

const activeRegion = computed(() => {
  return activeMidiTrack.value?.regions[0];
});

// Grid setup: 2 octaves display (C3 = 48 to B4 = 71)
const minPitch = 40;
const maxPitch = 64;
const pitches = computed(() => {
  const list: number[] = [];
  for (let p = maxPitch; p >= minPitch; p--) {
    list.push(p);
  }
  return list;
});

// Grid columns (16 beats, 1/4 beat resolution = 64 steps)
const snapGrid = ref<'1/4' | '1/8' | '1/16'>('1/16');
const gridBeats = 16;
const stepResolution = computed(() => {
  switch (snapGrid.value) {
    case '1/4': return 1.0;
    case '1/8': return 0.5;
    case '1/16': return 0.25;
  }
});

const totalSteps = computed(() => Math.floor(gridBeats / stepResolution.value));

function isBlackKey(pitch: number): boolean {
  const noteInOctave = pitch % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave);
}

// Click piano key to preview note
function playNotePreview(pitch: number) {
  engine.resumeContext();
  engine.synthEngine.noteOn(pitch, 100);
  setTimeout(() => {
    engine.synthEngine.noteOff(pitch);
  }, 250);
}

// Click grid to toggle or add note
function onCellClick(pitch: number, stepIndex: number) {
  if (!activeRegion.value) return;
  const noteStart = stepIndex * stepResolution.value;

  // Check if note already exists at this pitch and start
  const existingIdx = (activeRegion.value.notes || []).findIndex(
    n => n.pitch === pitch && Math.abs(n.start - noteStart) < 0.1
  );

  if (existingIdx !== -1) {
    activeRegion.value.notes?.splice(existingIdx, 1);
  } else {
    if (!activeRegion.value.notes) activeRegion.value.notes = [];
    const newNote: MidiNote = {
      id: `midi-${Date.now()}-${pitch}`,
      pitch,
      start: noteStart,
      duration: stepResolution.value * 2,
      velocity: 105
    };
    activeRegion.value.notes.push(newNote);
    playNotePreview(pitch);
  }
}

// Quantize notes in current region
function quantizeRegion() {
  if (!activeRegion.value?.notes) return;
  const res = stepResolution.value;
  for (const n of activeRegion.value.notes) {
    n.start = Math.round(n.start / res) * res;
    n.duration = Math.max(res, Math.round(n.duration / res) * res);
  }
}

// Computer Keyboard Musical Typing (A S D F G H J K = C4 D4 E4 F4 G4 A4 B4 C5)
const keyToMidiMap: Record<string, number> = {
  a: 60, // C4
  w: 61, // C#4
  s: 62, // D4
  e: 63, // D#4
  d: 64, // E4
  f: 65, // F4
  t: 66, // F#4
  g: 67, // G4
  y: 68, // G#4
  h: 69, // A4
  u: 70, // A#4
  j: 71, // B4
  k: 72  // C5
};

const pressedKeys = new Set<string>();
const midiConnected = ref(false);

function handleKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  const key = e.key.toLowerCase();
  if (keyToMidiMap[key] && !pressedKeys.has(key)) {
    pressedKeys.add(key);
    engine.resumeContext();
    engine.synthEngine.noteOn(keyToMidiMap[key], 110);
  }
}

function handleKeyUp(e: KeyboardEvent) {
  const key = e.key.toLowerCase();
  if (keyToMidiMap[key]) {
    pressedKeys.delete(key);
    engine.synthEngine.noteOff(keyToMidiMap[key]);
  }
}

// Web MIDI API: USB Keyboards Support
async function setupWebMIDI() {
  if (navigator.requestMIDIAccess) {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      const inputs = Array.from(midiAccess.inputs.values());
      if (inputs.length > 0) {
        midiConnected.value = true;
      }
      for (const input of inputs) {
        input.onmidimessage = (event: WebMidi.MIDIMessageEvent) => {
          const [status, note, velocity] = event.data;
          const command = status >> 4;
          if (command === 9 && velocity > 0) {
            // Note on
            engine.resumeContext();
            engine.synthEngine.noteOn(note, velocity);
          } else if (command === 8 || (command === 9 && velocity === 0)) {
            // Note off
            engine.synthEngine.noteOff(note);
          }
        };
      }
    } catch {
      // MIDI access optional
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  setupWebMIDI();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  engine.synthEngine.allNotesOff();
});
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#121217] overflow-hidden select-none p-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between bg-neutral-900/90 border border-neutral-700/80 rounded-xl px-4 py-2.5 mb-3 shadow">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
          <Music class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-wide">Piano Roll & Smart Synthesizer</h2>
          <p class="text-[11px] text-neutral-400">
            Digitação Musical ativa: Use as teclas
            <kbd class="px-1 py-0.5 bg-neutral-800 rounded font-mono text-emerald-300">A</kbd>
            <kbd class="px-1 py-0.5 bg-neutral-800 rounded font-mono text-emerald-300">S</kbd>
            <kbd class="px-1 py-0.5 bg-neutral-800 rounded font-mono text-emerald-300">D</kbd>
            <kbd class="px-1 py-0.5 bg-neutral-800 rounded font-mono text-emerald-300">F</kbd>
            ou teclado USB MIDI
          </p>
        </div>
      </div>

      <!-- Quantize & Grid Selection -->
      <div class="flex items-center gap-3">
        <!-- MIDI Status -->
        <div class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800">
          <Usb class="w-3.5 h-3.5" :class="midiConnected ? 'text-emerald-400' : 'text-neutral-500'" />
          <span :class="midiConnected ? 'text-emerald-300' : 'text-neutral-400'">
            {{ midiConnected ? 'MIDI USB Conectado' : 'MIDI Pronto' }}
          </span>
        </div>

        <!-- Snap to Grid -->
        <div class="flex items-center gap-1.5 text-xs text-neutral-300">
          <span>Snap:</span>
          <select
            v-model="snapGrid"
            class="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs focus:outline-none text-emerald-300"
          >
            <option value="1/4">1/4 (Semínima)</option>
            <option value="1/8">1/8 (Colcheia)</option>
            <option value="1/16">1/16 (Semicolcheia)</option>
          </select>
        </div>

        <!-- Quantize Button -->
        <button
          @click="quantizeRegion"
          class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
          title="Quantizar Notas (Alinhar ao Grid)"
        >
          <Wand2 class="w-3.5 h-3.5" />
          <span>Quantizar</span>
        </button>
      </div>
    </div>

    <!-- Main Piano Roll Work Area: Keys on Left, Interactive Step Grid on Right -->
    <div class="flex-1 flex rounded-xl border border-neutral-700/80 bg-[#16161f] shadow-2xl overflow-hidden">
      <!-- Piano Keys Column -->
      <div class="w-20 shrink-0 flex flex-col border-r border-neutral-700/80 bg-neutral-900 overflow-y-auto">
        <div
          v-for="pitch in pitches"
          :key="pitch"
          class="h-7 border-b border-neutral-800 px-2 flex items-center justify-between text-[11px] font-mono cursor-pointer transition-colors active:brightness-125"
          :class="isBlackKey(pitch) ? 'bg-[#181820] text-neutral-400' : 'bg-neutral-200 text-neutral-900 font-bold'"
          @mousedown="playNotePreview(pitch)"
        >
          <span>{{ midiToNoteName(pitch) }}</span>
        </div>
      </div>

      <!-- Grid Matrix Editor Area -->
      <div class="flex-1 flex flex-col overflow-x-auto overflow-y-auto bg-[#101016] relative">
        <div
          v-for="pitch in pitches"
          :key="pitch"
          class="h-7 border-b border-neutral-800/60 flex relative"
          :class="isBlackKey(pitch) ? 'bg-neutral-950/40' : 'bg-transparent'"
        >
          <!-- Grid step cells -->
          <div
            v-for="step in totalSteps"
            :key="step"
            class="h-full border-r border-neutral-800/40 hover:bg-emerald-500/10 cursor-pointer transition-colors"
            :style="{ width: `${project.zoomX * stepResolution}px` }"
            @click="onCellClick(pitch, step - 1)"
          ></div>

          <!-- Existing Active MIDI Notes on this row -->
          <template v-if="activeRegion?.notes">
            <div
              v-for="note in activeRegion.notes.filter(n => n.pitch === pitch)"
              :key="note.id"
              class="absolute top-1 bottom-1 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400 border border-emerald-300 shadow-md flex items-center px-1 text-[9px] font-mono font-bold text-black pointer-events-none"
              :style="{
                left: `${note.start * project.zoomX}px`,
                width: `${Math.max(12, note.duration * project.zoomX)}px`
              }"
            >
              {{ midiToNoteName(note.pitch) }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
