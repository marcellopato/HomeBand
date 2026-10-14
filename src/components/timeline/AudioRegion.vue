<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Region } from '../../types/audio';
import { useProjectStore } from '../../stores/projectStore';

const props = defineProps<{
  region: Region;
  color?: string;
}>();

const project = useProjectStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

function drawWaveform() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const peaks = props.region.peaks || [];

  ctx.clearRect(0, 0, width, height);

  if (peaks.length === 0) {
    // Fallback: draw subtle guideline
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    return;
  }

  // Draw symmetric waveform
  ctx.fillStyle = props.color || '#ef4444';
  const midY = height / 2;
  const numPeaks = peaks.length;
  const stepX = width / numPeaks;

  ctx.beginPath();
  // Upper half
  for (let i = 0; i < numPeaks; i++) {
    const x = i * stepX;
    const peakHeight = Math.max(2, peaks[i] * (height * 0.45));
    if (i === 0) ctx.moveTo(x, midY - peakHeight);
    else ctx.lineTo(x, midY - peakHeight);
  }

  // Lower half
  for (let i = numPeaks - 1; i >= 0; i--) {
    const x = i * stepX;
    const peakHeight = Math.max(2, peaks[i] * (height * 0.45));
    ctx.lineTo(x, midY + peakHeight);
  }

  ctx.closePath();
  ctx.fill();
}

onMounted(() => {
  drawWaveform();
});

watch(() => props.region.peaks, () => {
  drawWaveform();
});
</script>

<template>
  <div
    class="absolute top-1 bottom-1 rounded-md border border-red-500/50 bg-red-950/40 shadow overflow-hidden cursor-pointer select-none group"
    :style="{
      left: `${region.startBeat * project.zoomX}px`,
      width: `${region.durationBeats * project.zoomX}px`
    }"
    @click.stop="project.selectedRegionId = region.id"
  >
    <!-- Region Top Bar -->
    <div class="h-4 bg-red-900/60 px-1.5 flex items-center justify-between text-[10px] font-medium text-red-200 border-b border-red-500/20">
      <span class="truncate">{{ region.name }}</span>
    </div>

    <!-- Waveform Canvas -->
    <div class="w-full h-[calc(100%-16px)] flex items-center">
      <canvas
        ref="canvasRef"
        :width="Math.max(20, Math.floor(region.durationBeats * project.zoomX))"
        :height="50"
        class="w-full h-full object-fill opacity-90"
      ></canvas>
    </div>
  </div>
</template>
