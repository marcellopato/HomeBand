<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    unit?: string;
    size?: number;
    color?: string;
    defaultValue?: number;
  }>(),
  {
    min: 0,
    max: 10,
    step: 0.1,
    label: '',
    unit: '',
    size: 48,
    color: '#f97316',
    defaultValue: 5
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const isDragging = ref(false);
const startY = ref(0);
const startValue = ref(0);

// Map modelValue to rotation angle (-135deg to +135deg, total 270deg)
const angle = computed(() => {
  const norm = (props.modelValue - props.min) / (props.max - props.min);
  return -135 + norm * 270;
});

function onMouseDown(e: MouseEvent) {
  isDragging.value = true;
  startY.value = e.clientY;
  startValue.value = props.modelValue;

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const deltaY = startY.value - e.clientY;
  const range = props.max - props.min;
  const sensitivity = range / 150; // 150px drag covers full range

  let nextVal = startValue.value + deltaY * sensitivity;
  nextVal = Math.max(props.min, Math.min(props.max, nextVal));

  if (props.step) {
    nextVal = Math.round(nextVal / props.step) * props.step;
  }

  emit('update:modelValue', Number(nextVal.toFixed(2)));
}

function onMouseUp() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
}

function onDoubleClick() {
  emit('update:modelValue', props.defaultValue);
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const dir = e.deltaY < 0 ? 1 : -1;
  const range = props.max - props.min;
  const stepVal = props.step || range * 0.05;
  let nextVal = props.modelValue + dir * stepVal;
  nextVal = Math.max(props.min, Math.min(props.max, nextVal));
  emit('update:modelValue', Number(nextVal.toFixed(2)));
}
</script>

<template>
  <div class="flex flex-col items-center select-none" @wheel="onWheel">
    <!-- Knob Body with Skeuomorphic Vintage Styling -->
    <div
      class="relative cursor-ns-resize flex items-center justify-center rounded-full bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-950 shadow-md border border-neutral-600 active:scale-95 transition-transform"
      :style="{ width: `${size}px`, height: `${size}px` }"
      @mousedown="onMouseDown"
      @dblclick="onDoubleClick"
      :title="`${label}: ${modelValue}${unit} (Double click to reset)`"
    >
      <!-- Circular bevel ring -->
      <div class="absolute inset-1 rounded-full border border-neutral-600/40 bg-gradient-to-b from-neutral-800 to-neutral-900 pointer-events-none"></div>

      <!-- Rotating Indicator Notch -->
      <div
        class="absolute w-full h-full flex items-start justify-center pt-1 transition-transform pointer-events-none"
        :style="{ transform: `rotate(${angle}deg)` }"
      >
        <div
          class="w-1 h-3 rounded-full shadow-sm"
          :style="{ backgroundColor: color }"
        ></div>
      </div>

      <!-- Metallic Center Cap -->
      <div class="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-neutral-500 to-neutral-300 shadow-inner pointer-events-none border border-neutral-700"></div>
    </div>

    <!-- Label & Value Readout -->
    <span v-if="label" class="text-[10px] uppercase font-semibold text-neutral-400 mt-1 tracking-wider">
      {{ label }}
    </span>
    <span class="text-[9px] font-mono text-neutral-300">
      {{ modelValue }}{{ unit }}
    </span>
  </div>
</template>
