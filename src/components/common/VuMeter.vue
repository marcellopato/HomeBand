<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number; // 0.0 to 1.0
    segments?: number;
    orientation?: 'vertical' | 'horizontal';
  }>(),
  {
    segments: 14,
    orientation: 'vertical'
  }
);

const activeSegmentIndex = computed(() => {
  return Math.round(props.value * props.segments);
});

function getSegmentColor(index: number): string {
  const norm = index / props.segments;
  if (norm > 0.85) return '#ef4444'; // Red (Clipping)
  if (norm > 0.65) return '#eab308'; // Yellow (Warning)
  return '#22c55e'; // Green (Safe)
}
</script>

<template>
  <div
    class="flex gap-0.5 p-0.5 bg-neutral-950 rounded border border-neutral-800 shadow-inner"
    :class="orientation === 'vertical' ? 'flex-col-reverse w-2.5 h-16' : 'flex-row h-2.5 w-16'"
  >
    <div
      v-for="i in segments"
      :key="i"
      class="flex-1 rounded-xs transition-opacity duration-75"
      :style="{
        backgroundColor: getSegmentColor(i),
        opacity: i <= activeSegmentIndex ? 1.0 : 0.15
      }"
    ></div>
  </div>
</template>
