<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../../stores/projectStore';
import { Play, Pause, Circle, Repeat, Bell, RotateCcw, FastForward } from 'lucide-vue-next';

const project = useProjectStore();

// Formatted Bar : Beat : Division
const lcdPosition = computed(() => {
  const totalBeats = project.currentBeat;
  const beatsPerBar = project.timeSignature[0];
  const bar = Math.floor(totalBeats / beatsPerBar) + 1;
  const beat = (Math.floor(totalBeats) % beatsPerBar) + 1;
  const fraction = Math.floor((totalBeats % 1) * 240); // 240 PPQN standard

  const barStr = String(bar).padStart(3, '0');
  const fracStr = String(fraction).padStart(3, '0');
  return { barStr, beat, fracStr };
});

// Elapsed time in MM:SS.ms
const lcdTime = computed(() => {
  const seconds = (project.currentBeat * 60) / project.bpm;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${millis}`;
});

function adjustBpm(delta: number) {
  project.setBpm(project.bpm + delta);
}

function rewindToStart() {
  project.seekToBeat(0);
}
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Transport Controls (Rewind, Play, Record, Loop) -->
    <div class="flex items-center bg-neutral-900/90 border border-neutral-700/60 rounded-lg p-1 shadow-inner gap-1">
      <!-- Rewind / Return to Zero -->
      <button
        @click="rewindToStart"
        class="p-2 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        title="Retornar ao Início (Zero)"
      >
        <RotateCcw class="w-4 h-4" />
      </button>

      <!-- Play / Pause -->
      <button
        v-if="!project.isPlaying"
        @click="project.play()"
        class="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
        title="Reproduzir (Barra de Espaço)"
      >
        <Play class="w-4 h-4 fill-current" />
      </button>
      <button
        v-else
        @click="project.pause()"
        class="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium shadow flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
        title="Pausar (Barra de Espaço)"
      >
        <Pause class="w-4 h-4 fill-current" />
      </button>

      <!-- Record Arm Button -->
      <button
        @click="project.toggleRecord()"
        class="p-2 rounded transition-all cursor-pointer"
        :class="project.isRecording ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/40' : 'text-neutral-400 hover:text-red-400 hover:bg-neutral-800'"
        title="Gravar Áudio"
      >
        <Circle class="w-4 h-4 fill-current text-red-500" />
      </button>

      <div class="w-px h-5 bg-neutral-700/80 mx-1"></div>

      <!-- Loop Toggle -->
      <button
        @click="project.toggleLoop()"
        class="p-2 rounded transition-colors cursor-pointer"
        :class="project.isLooping ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'"
        title="Modo Loop (Compassos 1 ao 4)"
      >
        <Repeat class="w-4 h-4" />
      </button>

      <!-- Metronome Toggle -->
      <button
        @click="project.toggleMetronome()"
        class="p-2 rounded transition-colors cursor-pointer"
        :class="project.metronomeEnabled ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'"
        title="Metrônomo (Click de Áudio)"
      >
        <Bell class="w-4 h-4" />
      </button>
    </div>

    <!-- Center LCD Display (Signature GarageBand Look) -->
    <div class="flex items-center bg-[#0b0c10] border-2 border-neutral-700/80 rounded-lg px-4 py-1.5 shadow-inner select-none font-mono text-emerald-400 text-sm">
      <!-- Musical Bar / Beat Position -->
      <div class="flex flex-col items-center border-r border-neutral-800 pr-3 mr-3">
        <div class="text-[9px] uppercase tracking-wider text-neutral-500 font-sans font-semibold">Compasso</div>
        <div class="text-base font-bold text-amber-400 tracking-wider">
          <span>{{ lcdPosition.barStr }}</span>
          <span class="text-neutral-600">:</span>
          <span>{{ lcdPosition.beat }}</span>
          <span class="text-neutral-600">:</span>
          <span class="text-xs text-neutral-400">{{ lcdPosition.fracStr }}</span>
        </div>
      </div>

      <!-- Elapsed Time -->
      <div class="flex flex-col items-center border-r border-neutral-800 pr-3 mr-3">
        <div class="text-[9px] uppercase tracking-wider text-neutral-500 font-sans font-semibold">Tempo</div>
        <div class="text-sm font-semibold text-emerald-300">
          {{ lcdTime }}
        </div>
      </div>

      <!-- Tempo BPM with +/- buttons -->
      <div class="flex flex-col items-center border-r border-neutral-800 pr-3 mr-3">
        <div class="text-[9px] uppercase tracking-wider text-neutral-500 font-sans font-semibold">Tempo (BPM)</div>
        <div class="flex items-center gap-1.5">
          <button @click="adjustBpm(-1)" class="text-xs text-neutral-500 hover:text-neutral-200 cursor-pointer font-bold px-1">−</button>
          <span class="text-base font-bold text-cyan-400">{{ project.bpm }}</span>
          <button @click="adjustBpm(1)" class="text-xs text-neutral-500 hover:text-neutral-200 cursor-pointer font-bold px-1">+</button>
        </div>
      </div>

      <!-- Time Signature -->
      <div class="flex flex-col items-center">
        <div class="text-[9px] uppercase tracking-wider text-neutral-500 font-sans font-semibold">Fórmula</div>
        <div class="text-sm font-semibold text-neutral-300">
          {{ project.timeSignature[0] }}/{{ project.timeSignature[1] }}
        </div>
      </div>
    </div>
  </div>
</template>
