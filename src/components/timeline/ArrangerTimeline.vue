<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProjectStore } from '../../stores/projectStore';
import TrackHeader from './TrackHeader.vue';
import AudioRegion from './AudioRegion.vue';
import MidiRegion from './MidiRegion.vue';
import { ZoomIn, ZoomOut, Plus, Music } from 'lucide-vue-next';

const project = useProjectStore();
const timelineContainerRef = ref<HTMLDivElement | null>(null);

// Number of total bars to render (default 32 bars)
const totalBars = 32;
const beatsPerBar = computed(() => project.timeSignature[0]);
const totalBeats = computed(() => totalBars * beatsPerBar.value);
const timelineWidthPx = computed(() => totalBeats.value * project.zoomX);

// Click on ruler to seek
function onRulerClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const targetBeat = clickX / project.zoomX;
  project.seekToBeat(Math.max(0, targetBeat));
}

// Drag & drop audio file directly onto track lane
function onTrackDrop(e: DragEvent, trackId: string) {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('audio/') || file.name.endsWith('.wav') || file.name.endsWith('.mp3')) {
      project.importAudioFile(trackId, file);
    }
  }
}

function zoom(delta: number) {
  project.zoomX = Math.max(25, Math.min(120, project.zoomX + delta));
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#15151c] overflow-hidden select-none">
    <!-- Arranger Toolbar: Zoom & View controls -->
    <div class="h-9 bg-[#1d1d26] border-b border-neutral-700/80 px-4 flex items-center justify-between text-xs text-neutral-400">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-neutral-200 uppercase text-[11px] tracking-wide">Pistas (Arranger)</span>
        <span class="text-neutral-500">|</span>
        <span>{{ project.tracks.length }} Pistas Ativas</span>
      </div>

      <!-- Zoom Slider -->
      <div class="flex items-center gap-2">
        <button @click="zoom(-8)" class="p-1 hover:text-white rounded cursor-pointer" title="Zoom Out">
          <ZoomOut class="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min="25"
          max="120"
          v-model.number="project.zoomX"
          class="w-24 h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-orange-500"
        />
        <button @click="zoom(8)" class="p-1 hover:text-white rounded cursor-pointer" title="Zoom In">
          <ZoomIn class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Main Workspace (Track Headers on Left, Arranger Grid on Right) -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Left: Track Headers Column -->
      <div class="w-72 flex flex-col shrink-0 bg-[#171720] border-r border-neutral-700/80 z-10 shadow-lg">
        <!-- Header Spacer matching timeline ruler height -->
        <div class="h-8 border-b border-neutral-700/80 bg-[#1b1b24] px-3 flex items-center justify-between">
          <span class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Cabeçalho de Pista</span>
        </div>

        <!-- Track Strips List -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden">
          <TrackHeader
            v-for="track in project.tracks"
            :key="track.id"
            :track="track"
            :is-active="project.activeTrackId === track.id"
          />
        </div>
      </div>

      <!-- Right: Scrollable Timeline Grid -->
      <div
        ref="timelineContainerRef"
        class="flex-1 flex flex-col overflow-x-auto overflow-y-auto bg-[#14141a] relative"
      >
        <!-- Timeline Ruler & Loop Bar -->
        <div
          class="h-8 bg-[#1e1e28] border-b border-neutral-700/80 sticky top-0 z-20 cursor-pointer select-none"
          :style="{ width: `${timelineWidthPx}px` }"
          @click="onRulerClick"
        >
          <!-- GarageBand Yellow Cycle / Loop Region Bar -->
          <div
            v-if="project.isLooping"
            class="absolute top-0 h-2 bg-amber-500/80 border-b border-amber-300 shadow-sm rounded-xs pointer-events-none"
            :style="{
              left: `${project.loopStartBeat * project.zoomX}px`,
              width: `${(project.loopEndBeat - project.loopStartBeat) * project.zoomX}px`
            }"
          ></div>

          <!-- Musical Ruler Markers (Bars & Beats) -->
          <div class="relative w-full h-full flex items-end pb-1 text-[10px] font-mono text-neutral-400">
            <div
              v-for="bar in totalBars"
              :key="bar"
              class="absolute border-l border-neutral-600/60 pl-1 flex items-baseline gap-1"
              :style="{ left: `${(bar - 1) * beatsPerBar * project.zoomX}px` }"
            >
              <span class="font-bold text-neutral-200 text-xs">{{ bar }}</span>
              <!-- Sub-beat ticks -->
              <div class="flex gap-2 text-neutral-500 text-[9px]">
                <span v-for="b in beatsPerBar - 1" :key="b" class="opacity-60">.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tracks Canvas Area -->
        <div
          class="relative flex-1"
          :style="{ width: `${timelineWidthPx}px` }"
        >
          <!-- Background Grid Lines (Measure & Beat Dividers) -->
          <div class="absolute inset-0 pointer-events-none">
            <div
              v-for="bar in totalBars"
              :key="bar"
              class="absolute top-0 bottom-0 border-l border-neutral-800/80"
              :style="{ left: `${(bar - 1) * beatsPerBar * project.zoomX}px` }"
            >
              <!-- Quarter beat subtle lines -->
              <div
                v-for="beat in beatsPerBar - 1"
                :key="beat"
                class="absolute top-0 bottom-0 border-l border-neutral-800/30"
                :style="{ left: `${beat * project.zoomX}px` }"
              ></div>
            </div>
          </div>

          <!-- Track Content Lanes -->
          <div
            v-for="track in project.tracks"
            :key="track.id"
            class="relative border-b border-neutral-800/80 transition-colors"
            :class="project.activeTrackId === track.id ? 'bg-neutral-800/20' : ''"
            :style="{ height: `${project.trackHeight}px` }"
            @dragover.prevent
            @drop="onTrackDrop($event, track.id)"
            @click="project.activeTrackId = track.id"
          >
            <!-- Regions on this track -->
            <template v-for="region in track.regions" :key="region.id">
              <AudioRegion
                v-if="track.type === 'audio'"
                :region="region"
                :color="track.color"
              />
              <MidiRegion
                v-else
                :region="region"
                :color="track.color"
                :is-drummer="track.type === 'drummer'"
              />
            </template>
          </div>

          <!-- Moving Playhead Needle -->
          <div
            class="absolute top-0 bottom-0 w-px bg-orange-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(249,115,22,0.8)]"
            :style="{ left: `${project.currentBeat * project.zoomX}px` }"
          >
            <!-- Scrubber Playhead Diamond Top -->
            <div class="w-3.5 h-3.5 -ml-[7px] -mt-1 bg-orange-500 rotate-45 border border-white shadow"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
