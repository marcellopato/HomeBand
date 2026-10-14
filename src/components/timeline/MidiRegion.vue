<script setup lang="ts">
import { computed } from 'vue';
import type { Region } from '../../types/audio';
import { useProjectStore } from '../../stores/projectStore';

const props = defineProps<{
  region: Region;
  color?: string;
  isDrummer?: boolean;
}>();

const project = useProjectStore();

// Calculate pitch range for mini note rendering
const noteBounds = computed(() => {
  const notes = props.region.notes || [];
  if (notes.length === 0) return { min: 36, max: 72 };
  let min = 127;
  let max = 0;
  for (const n of notes) {
    if (n.pitch < min) min = n.pitch;
    if (n.pitch > max) max = n.pitch;
  }
  return { min: Math.max(0, min - 2), max: Math.min(127, max + 2) };
});

function getNoteStyle(note: { pitch: number; start: number; duration: number }) {
  const range = Math.max(1, noteBounds.value.max - noteBounds.value.min);
  const topPercent = 100 - ((note.pitch - noteBounds.value.min) / range) * 80 - 15;
  const leftPx = note.start * project.zoomX;
  const widthPx = Math.max(4, note.duration * project.zoomX);

  return {
    top: `${Math.max(5, Math.min(85, topPercent))}%`,
    left: `${leftPx}px`,
    width: `${widthPx}px`
  };
}
</script>

<template>
  <div
    class="absolute top-1 bottom-1 rounded-md border shadow overflow-hidden cursor-pointer select-none group"
    :class="[
      isDrummer
        ? 'border-amber-500/60 bg-amber-950/40'
        : 'border-emerald-500/60 bg-emerald-950/40',
      project.selectedRegionId === region.id ? 'ring-2 ring-white/80' : ''
    ]"
    :style="{
      left: `${region.startBeat * project.zoomX}px`,
      width: `${region.durationBeats * project.zoomX}px`
    }"
    @click.stop="project.selectedRegionId = region.id"
  >
    <!-- Region Header -->
    <div
      class="h-4 px-1.5 flex items-center justify-between text-[10px] font-semibold border-b truncate"
      :class="isDrummer ? 'bg-amber-800/60 text-amber-200 border-amber-500/30' : 'bg-emerald-800/60 text-emerald-200 border-emerald-500/30'"
    >
      <span class="truncate">{{ region.name }}</span>
    </div>

    <!-- Mini Note Preview Canvas / Blocks -->
    <div class="relative w-full h-[calc(100%-16px)] pointer-events-none">
      <div
        v-for="note in region.notes"
        :key="note.id"
        class="absolute h-1.5 rounded-xs opacity-90 shadow-xs"
        :class="isDrummer ? 'bg-amber-400' : 'bg-emerald-400'"
        :style="getNoteStyle(note)"
      ></div>
    </div>
  </div>
</template>
