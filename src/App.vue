<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useProjectStore } from './stores/projectStore';
import { useAudioStore } from './stores/audioStore';
import { AudioEngineManager } from './audio/AudioEngineManager';
import AppHeader from './components/header/AppHeader.vue';
import ArrangerTimeline from './components/timeline/ArrangerTimeline.vue';
import AmpPedalboard from './components/instruments/AmpPedalboard.vue';
import DrummerPad from './components/instruments/DrummerPad.vue';
import PianoRollModal from './components/instruments/PianoRollModal.vue';
import PluginManagerModal from './components/plugins/PluginManagerModal.vue';
import { Cpu, Activity, ShieldCheck } from 'lucide-vue-next';

const project = useProjectStore();
const audio = useAudioStore();

const activeView = ref<'timeline' | 'amp' | 'drummer' | 'pianoroll'>('timeline');
const isPluginModalOpen = ref(false);
const audioContextState = ref('ready');
const sampleRate = ref(48000);

// Global Spacebar Play/Pause shortcut
function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (project.isPlaying) {
      project.pause();
    } else {
      project.play();
    }
  }
}

onMounted(() => {
  project.initEngine();
  audio.startMeterPolling();

  const engine = AudioEngineManager.getInstance();
  sampleRate.value = engine.ctx.sampleRate;
  audioContextState.value = engine.ctx.state;

  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  audio.stopMeterPolling();
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<template>
  <div class="h-full w-full flex flex-col bg-[#121217] overflow-hidden">
    <!-- Top Header & Transport Bar -->
    <AppHeader
      :active-view="activeView"
      @update:active-view="activeView = $event"
      @open-plugins="isPluginModalOpen = true"
    />

    <!-- Plugin Manager Modal -->
    <PluginManagerModal
      :is-open="isPluginModalOpen"
      @close="isPluginModalOpen = false"
    />

    <!-- Main Workspace with Vintage Rosewood / Mahogany Side Trims -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Left Wood Panel Accent -->
      <div class="w-2 woodgrain-side shrink-0 hidden md:block border-r border-black/40"></div>

      <!-- Center Dynamic View -->
      <main class="flex-1 flex flex-col overflow-hidden bg-[#15151c]">
        <ArrangerTimeline v-if="activeView === 'timeline'" />
        <AmpPedalboard v-else-if="activeView === 'amp'" />
        <DrummerPad v-else-if="activeView === 'drummer'" />
        <PianoRollModal v-else-if="activeView === 'pianoroll'" />
      </main>

      <!-- Right Wood Panel Accent -->
      <div class="w-2 woodgrain-side shrink-0 hidden md:block border-l border-black/40"></div>
    </div>

    <!-- Bottom Status Bar -->
    <footer class="h-6 bg-[#0f0f14] border-t border-neutral-800 px-4 flex items-center justify-between text-[10px] text-neutral-500 font-mono select-none">
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5 text-neutral-400">
          <Activity class="w-3 h-3 text-emerald-400" />
          Engine: {{ sampleRate }} Hz • 128 frames block
        </span>
        <span class="flex items-center gap-1.5 text-neutral-400">
          <Cpu class="w-3 h-3 text-orange-400" />
          DSP: AudioWorklet WebAssembly / Thread Ativa
        </span>
      </div>

      <div class="flex items-center gap-3">
        <span>Barra de Espaço: Play/Pause</span>
        <span class="text-neutral-600">|</span>
        <span class="flex items-center gap-1 text-emerald-400">
          <ShieldCheck class="w-3 h-3" />
          Master Limiter Ativo (-0.5 dB)
        </span>
      </div>
    </footer>
  </div>
</template>
