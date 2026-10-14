<script setup lang="ts">
import { useAudioStore } from '../../stores/audioStore';
import { useProjectStore } from '../../stores/projectStore';
import TransportBar from './TransportBar.vue';
import VuMeter from '../common/VuMeter.vue';
import {
  SlidersHorizontal,
  Flame,
  Plus,
  Drum,
  Guitar,
  Music,
  Mic,
  Disc3
} from 'lucide-vue-next';

defineProps<{
  activeView: 'timeline' | 'amp' | 'drummer' | 'pianoroll';
}>();

const emit = defineEmits<{
  (e: 'update:activeView', view: 'timeline' | 'amp' | 'drummer' | 'pianoroll'): void;
}>();

const audio = useAudioStore();
const project = useProjectStore();

function onMasterSlider(e: Event) {
  const target = e.target as HTMLInputElement;
  audio.setMasterVolume(parseFloat(target.value));
}
</script>

<template>
  <header class="h-16 bg-gradient-to-b from-[#24242d] to-[#1a1a22] border-b border-neutral-700/80 px-4 flex items-center justify-between shadow-lg relative z-20 select-none">
    <!-- Left: Brand & View Selectors -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-1.5 shadow-md flex items-center justify-center">
          <Guitar class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="text-sm font-bold text-neutral-100 tracking-tight flex items-center gap-1.5">
            HomeBand
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
              DSP Worklet
            </span>
          </h1>
          <p class="text-[10px] text-neutral-400">Linux & Web Audio Workstation</p>
        </div>
      </div>

      <div class="h-6 w-px bg-neutral-700/80 mx-1"></div>

      <!-- Navigation Tabs (Arranger, Amp & FX, Drummer, Synth) -->
      <nav class="flex items-center bg-neutral-900/80 rounded-lg p-1 border border-neutral-800 text-xs font-medium">
        <button
          @click="emit('update:activeView', 'timeline')"
          class="px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          :class="activeView === 'timeline' ? 'bg-neutral-700/90 text-white shadow-sm' : 'text-neutral-400 hover:text-white'"
        >
          <SlidersHorizontal class="w-3.5 h-3.5" />
          <span>Arranjador</span>
        </button>

        <button
          @click="emit('update:activeView', 'amp')"
          class="px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          :class="activeView === 'amp' ? 'bg-blue-600/80 text-white shadow-sm' : 'text-neutral-400 hover:text-white'"
        >
          <Flame class="w-3.5 h-3.5 text-blue-400" />
          <span>Amp & Pedais</span>
        </button>

        <button
          @click="emit('update:activeView', 'drummer')"
          class="px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          :class="activeView === 'drummer' ? 'bg-amber-600/80 text-white shadow-sm' : 'text-neutral-400 hover:text-white'"
        >
          <Drum class="w-3.5 h-3.5 text-amber-400" />
          <span>Drummer X/Y</span>
        </button>

        <button
          @click="emit('update:activeView', 'pianoroll')"
          class="px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          :class="activeView === 'pianoroll' ? 'bg-emerald-600/80 text-white shadow-sm' : 'text-neutral-400 hover:text-white'"
        >
          <Music class="w-3.5 h-3.5 text-emerald-400" />
          <span>Piano Roll</span>
        </button>
      </nav>
    </div>

    <!-- Center: Transport Bar & LCD -->
    <TransportBar />

    <!-- Right: New Track Menu & Master Fader / Meter -->
    <div class="flex items-center gap-4">
      <!-- Add Track Quick Actions -->
      <div class="flex items-center bg-neutral-900/80 border border-neutral-700/80 rounded-lg p-0.5">
        <button
          @click="project.addTrack('audio')"
          class="p-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-red-400 rounded transition-colors cursor-pointer"
          title="Nova Pista de Áudio (Microfone / Interface)"
        >
          <Mic class="w-4 h-4" />
        </button>
        <button
          @click="project.addTrack('guitar')"
          class="p-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-blue-400 rounded transition-colors cursor-pointer"
          title="Nova Pista de Guitarra (Amp + Pedais)"
        >
          <Guitar class="w-4 h-4" />
        </button>
        <button
          @click="project.addTrack('midi')"
          class="p-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-400 rounded transition-colors cursor-pointer"
          title="Nova Pista MIDI / Sintetizador"
        >
          <Music class="w-4 h-4" />
        </button>
        <button
          @click="project.addTrack('drummer')"
          class="p-1.5 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 rounded transition-colors cursor-pointer"
          title="Nova Pista Drummer Procedural"
        >
          <Drum class="w-4 h-4" />
        </button>
      </div>

      <!-- Master Volume & VU Meter -->
      <div class="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-lg px-2.5 py-1.5 shadow-inner">
        <div class="flex flex-col">
          <span class="text-[9px] font-mono uppercase text-neutral-400 font-semibold">Master</span>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            :value="audio.masterVolume"
            @input="onMasterSlider"
            class="w-20 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
        <VuMeter :value="audio.masterPeak" :segments="10" orientation="vertical" />
      </div>
    </div>
  </header>
</template>
