<script setup lang="ts">
import { ref } from 'vue';
import { useDrummerStore } from '../../stores/drummerStore';
import { useProjectStore } from '../../stores/projectStore';
import { AudioEngineManager } from '../../audio/AudioEngineManager';
import type { DrumType } from '../../audio/DrumSynthesizer';
import RotaryKnob from '../common/RotaryKnob.vue';
import { Drum, Sparkles, RefreshCw, Volume2 } from 'lucide-vue-next';

const drummer = useDrummerStore();
const project = useProjectStore();

const padContainerRef = ref<HTMLDivElement | null>(null);
const isDraggingPuck = ref(false);

function onPadMouseDown(e: MouseEvent) {
  isDraggingPuck.value = true;
  updatePuckPosition(e);
  window.addEventListener('mousemove', onPadMouseMove);
  window.addEventListener('mouseup', onPadMouseUp);
}

function onPadMouseMove(e: MouseEvent) {
  if (!isDraggingPuck.value) return;
  updatePuckPosition(e);
}

function onPadMouseUp() {
  isDraggingPuck.value = false;
  window.removeEventListener('mousemove', onPadMouseMove);
  window.removeEventListener('mouseup', onPadMouseUp);

  // Sync updated drum pattern into project timeline
  project.regenerateDrummer();
}

function updatePuckPosition(e: MouseEvent) {
  if (!padContainerRef.value) return;
  const rect = padContainerRef.value.getBoundingClientRect();
  const xNorm = (e.clientX - rect.left) / rect.width;
  const yNorm = 1.0 - (e.clientY - rect.top) / rect.height; // Invert so top is Loud

  drummer.setCoordinates(xNorm, yNorm);
}

// Live Drum Pad Triggering (Live sound synthesis)
const activePad = ref<string | null>(null);

function triggerPad(drumType: DrumType, velocity: number = 110) {
  const engine = AudioEngineManager.getInstance();
  engine.resumeContext();
  engine.drumSynth.trigger(drumType, engine.ctx.currentTime, velocity);

  activePad.value = drumType;
  setTimeout(() => {
    if (activePad.value === drumType) activePad.value = null;
  }, 120);
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#121217] overflow-y-auto p-4 select-none">
    <!-- Header info -->
    <div class="flex items-center justify-between bg-neutral-900/90 border border-neutral-700/80 rounded-xl px-4 py-2.5 mb-4 shadow">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
          <Drum class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-wide">Drummer Procedural Inteligente</h2>
          <p class="text-[11px] text-neutral-400">Pad matricial X/Y de dinâmica e complexidade rítmica estilo Apple GarageBand</p>
        </div>
      </div>

      <!-- Sync Button -->
      <button
        @click="project.regenerateDrummer()"
        class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span>Atualizar Timeline</span>
      </button>
    </div>

    <!-- Main Drummer Section: X/Y Pad on Left, Controls & Live Pads on Right -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
      <!-- 1. 2D X/Y Matrix Pad -->
      <div class="rounded-xl border-2 border-neutral-700 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 p-5 flex flex-col shadow-2xl relative">
        <div class="flex items-center justify-between text-xs text-neutral-400 font-semibold mb-3">
          <span>PAD MATRICIAL X/Y</span>
          <span class="font-mono text-amber-400">
            X: {{ Math.round(drummer.config.x * 100) }}% | Y: {{ Math.round(drummer.config.y * 100) }}%
          </span>
        </div>

        <!-- 2D Interactive Area -->
        <div
          ref="padContainerRef"
          class="relative flex-1 min-h-[300px] rounded-lg border border-neutral-700/80 bg-[#0e0e14] shadow-inner cursor-crosshair overflow-hidden"
          @mousedown="onPadMouseDown"
        >
          <!-- Grid Quadrant Guide Lines -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-full h-px bg-neutral-800"></div>
          </div>
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="h-full w-px bg-neutral-800"></div>
          </div>

          <!-- Dynamic Heat Gradient based on Y (Intensity) -->
          <div
            class="absolute inset-0 pointer-events-none opacity-20 transition-opacity"
            :style="{
              background: `radial-gradient(circle at ${drummer.config.x * 100}% ${(1 - drummer.config.y) * 100}%, rgba(245, 158, 11, 0.8), transparent 70%)`
            }"
          ></div>

          <!-- Axis Labels -->
          <div class="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-amber-400 tracking-wider pointer-events-none">
            ▲ INTENSO / FORTE
          </div>
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-neutral-500 tracking-wider pointer-events-none">
            ▼ SUAVE / LEVE
          </div>
          <div class="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-neutral-500 tracking-wider pointer-events-none">
            ◀ SIMPLES
          </div>
          <div class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-amber-400 tracking-wider pointer-events-none">
            COMPLEXO ▶
          </div>

          <!-- Draggable Glowing Puck (GarageBand Drummer Puck) -->
          <div
            class="absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 border-2 border-white shadow-[0_0_15px_rgba(245,158,11,0.9)] flex items-center justify-center pointer-events-none transition-transform"
            :class="isDraggingPuck ? 'scale-110 shadow-[0_0_25px_rgba(245,158,11,1)]' : ''"
            :style="{
              left: `${drummer.config.x * 100}%`,
              top: `${(1 - drummer.config.y) * 100}%`
            }"
          >
            <div class="w-3 h-3 rounded-full bg-amber-950/80"></div>
          </div>
        </div>
      </div>

      <!-- 2. Controls & Live Rubber Drum Pads -->
      <div class="flex flex-col gap-4">
        <!-- Groove Fine-Tuning Controls -->
        <div class="rounded-xl border border-neutral-800 bg-[#171722] p-4 shadow-lg">
          <h3 class="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
            Parâmetros de Groove & Fills
          </h3>
          <div class="grid grid-cols-3 gap-4 text-center">
            <!-- Fills Frequency -->
            <div class="flex flex-col items-center">
              <span class="text-[10px] font-semibold text-neutral-400 uppercase mb-1.5">Preenchimentos (Fills)</span>
              <div class="flex bg-neutral-900 border border-neutral-700 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  @click="drummer.config.fillsFrequency = 4; project.regenerateDrummer()"
                  :class="drummer.config.fillsFrequency === 4 ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'"
                  class="px-2.5 py-1 rounded cursor-pointer"
                >
                  A cada 4
                </button>
                <button
                  @click="drummer.config.fillsFrequency = 8; project.regenerateDrummer()"
                  :class="drummer.config.fillsFrequency === 8 ? 'bg-amber-600 text-white' : 'text-neutral-400 hover:text-white'"
                  class="px-2.5 py-1 rounded cursor-pointer"
                >
                  A cada 8
                </button>
              </div>
            </div>

            <!-- Swing Knob -->
            <RotaryKnob
              v-model="drummer.config.swing"
              :min="0.0"
              :max="0.6"
              :step="0.02"
              label="Swing (Balanço)"
              unit="x"
              color="#f59e0b"
              @update:model-value="project.regenerateDrummer()"
            />

            <!-- Ghost Notes Toggle -->
            <div class="flex flex-col items-center justify-center">
              <span class="text-[10px] font-semibold text-neutral-400 uppercase mb-1.5">Ghost Notes</span>
              <button
                @click="drummer.config.ghostNotes = !drummer.config.ghostNotes; project.regenerateDrummer()"
                class="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
                :class="drummer.config.ghostNotes ? 'bg-amber-600/30 text-amber-300 border-amber-500' : 'bg-neutral-800 text-neutral-500 border-neutral-700'"
              >
                {{ drummer.config.ghostNotes ? 'Ativadas' : 'Desativadas' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Live Rubber Drum Pads (Instant Synthesized Audio Feedback) -->
        <div class="flex-1 rounded-xl border border-neutral-800 bg-[#171722] p-4 shadow-lg flex flex-col">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 class="w-4 h-4 text-amber-400" />
              Pads Acústicos para Teste em Tempo Real
            </h3>
            <span class="text-[10px] text-neutral-500 font-mono">Toque com o mouse</span>
          </div>

          <!-- Rubber Pads 4x2 Grid -->
          <div class="grid grid-cols-4 gap-2.5 flex-1 min-h-[160px]">
            <button
              @mousedown="triggerPad('kick')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'kick' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">KICK</span>
              <span class="text-[9px] text-neutral-400">Bumbo</span>
            </button>

            <button
              @mousedown="triggerPad('snare')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'snare' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">SNARE</span>
              <span class="text-[9px] text-neutral-400">Caixa</span>
            </button>

            <button
              @mousedown="triggerPad('hihatClosed')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'hihatClosed' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">HI-HAT</span>
              <span class="text-[9px] text-neutral-400">Fechado</span>
            </button>

            <button
              @mousedown="triggerPad('hihatOpen')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'hihatOpen' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">OPEN HAT</span>
              <span class="text-[9px] text-neutral-400">Aberto</span>
            </button>

            <button
              @mousedown="triggerPad('tomHigh')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'tomHigh' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">TOM 1</span>
              <span class="text-[9px] text-neutral-400">Agudo</span>
            </button>

            <button
              @mousedown="triggerPad('tomMid')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'tomMid' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">TOM 2</span>
              <span class="text-[9px] text-neutral-400">Médio</span>
            </button>

            <button
              @mousedown="triggerPad('tomLow')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'tomLow' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">FLOOR TOM</span>
              <span class="text-[9px] text-neutral-400">Surdo</span>
            </button>

            <button
              @mousedown="triggerPad('crash')"
              class="rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-md"
              :class="activePad === 'crash' ? 'border-amber-400 bg-amber-500 text-black scale-95' : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'"
            >
              <span class="text-xs font-bold">CRASH</span>
              <span class="text-[9px] text-neutral-400">Prato</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
