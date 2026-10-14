<script setup lang="ts">
import { ref } from 'vue';
import type { Track } from '../../types/audio';
import { useProjectStore } from '../../stores/projectStore';
import {
  Mic,
  Music,
  Guitar,
  Drum,
  Volume2,
  Trash2,
  Radio,
  Circle,
  Upload
} from 'lucide-vue-next';

const props = defineProps<{
  track: Track;
  isActive: boolean;
}>();

const project = useProjectStore();
const fileInputRef = ref<HTMLInputElement | null>(null);

function getTrackIcon(type: string) {
  switch (type) {
    case 'audio': return Mic;
    case 'guitar': return Guitar;
    case 'midi': return Music;
    case 'drummer': return Drum;
    default: return Music;
  }
}

function onVolumeInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value);
  project.updateTrackVolume(props.track.id, val);
}

function onPanInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value);
  project.updateTrackPan(props.track.id, val);
}

function triggerFileUpload() {
  fileInputRef.value?.click();
}

function handleFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    project.importAudioFile(props.track.id, file);
    target.value = '';
  }
}
</script>

<template>
  <div
    class="w-72 border-r border-b border-neutral-700/80 p-2.5 flex flex-col justify-between transition-colors select-none relative"
    :class="isActive ? 'bg-[#21212a] border-l-4' : 'bg-[#18181f] hover:bg-[#1c1c24]'"
    :style="{
      height: `${project.trackHeight}px`,
      borderLeftColor: isActive ? track.color : 'transparent'
    }"
    @click="project.activeTrackId = track.id"
  >
    <!-- Top Row: Icon, Name, and Track Type Actions -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 overflow-hidden">
        <div
          class="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 shadow-sm"
          :style="{ backgroundColor: track.color }"
        >
          <component :is="getTrackIcon(track.type)" class="w-4 h-4" />
        </div>
        <div class="truncate">
          <input
            v-model="track.name"
            class="bg-transparent font-medium text-xs text-neutral-200 focus:outline-none focus:bg-neutral-800 rounded px-1 w-36 truncate"
          />
        </div>
      </div>

      <!-- Delete and Import buttons -->
      <div class="flex items-center gap-1 opacity-70 hover:opacity-100">
        <button
          v-if="track.type === 'audio'"
          @click.stop="triggerFileUpload"
          class="p-1 hover:text-white text-neutral-400 rounded hover:bg-neutral-800 cursor-pointer"
          title="Importar Áudio (WAV / MP3)"
        >
          <Upload class="w-3.5 h-3.5" />
        </button>
        <button
          @click.stop="project.deleteTrack(track.id)"
          class="p-1 hover:text-red-400 text-neutral-500 rounded hover:bg-neutral-800 cursor-pointer"
          title="Excluir Pista"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="audio/*"
          class="hidden"
          @change="handleFileSelected"
        />
      </div>
    </div>

    <!-- Bottom Row: Buttons (M, S, Rec, Monitor) & Volume / Pan -->
    <div class="flex items-center justify-between mt-1">
      <!-- Mute, Solo, Record Enable, Direct Monitor Buttons -->
      <div class="flex items-center gap-1">
        <!-- Mute -->
        <button
          @click.stop="project.toggleMute(track.id)"
          class="w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center border"
          :class="track.mute ? 'bg-blue-600 text-white border-blue-400 shadow-sm' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'"
          title="Mute (Silenciar pista)"
        >
          M
        </button>

        <!-- Solo -->
        <button
          @click.stop="project.toggleSolo(track.id)"
          class="w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center border"
          :class="track.solo ? 'bg-amber-500 text-black border-amber-300 font-extrabold shadow-sm' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'"
          title="Solo (Isolar pista)"
        >
          S
        </button>

        <!-- Record Enable (Arm) -->
        <button
          @click.stop="project.toggleArmed(track.id)"
          class="w-6 h-6 rounded transition-all cursor-pointer flex items-center justify-center border"
          :class="track.armed ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-red-400'"
          title="Armar para Gravação"
        >
          <Circle class="w-2.5 h-2.5 fill-current" />
        </button>

        <!-- Direct Monitoring (Headphone) -->
        <button
          @click.stop="project.toggleMonitoring(track.id)"
          class="w-6 h-6 rounded transition-all cursor-pointer flex items-center justify-center border"
          :class="track.monitoring ? 'bg-orange-500 text-white border-orange-300' : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-orange-400'"
          title="Monitoração Direta em Tempo Real"
        >
          <Radio class="w-3 h-3" />
        </button>
      </div>

      <!-- Fader & Pan Controls -->
      <div class="flex items-center gap-2">
        <!-- Pan Slider -->
        <div class="flex flex-col items-center">
          <span class="text-[8px] font-mono text-neutral-400">
            {{ track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}` }}
          </span>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.05"
            :value="track.pan"
            @input="onPanInput"
            class="w-12 h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-neutral-300"
            title="Pan Estéreo (Esquerda / Centro / Direita)"
          />
        </div>

        <!-- Volume Slider -->
        <div class="flex flex-col items-center">
          <span class="text-[8px] font-mono text-neutral-400">
            {{ Math.round(track.volume * 100) }}%
          </span>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            :value="track.volume"
            @input="onVolumeInput"
            class="w-16 h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-500"
            title="Volume da Pista"
          />
        </div>
      </div>
    </div>
  </div>
</template>
