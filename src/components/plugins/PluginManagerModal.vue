<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Sliders, Cpu, HardDrive, RefreshCw, X, Check, Volume2 } from 'lucide-vue-next';

interface PluginItem {
  name: string;
  format: string;
  path: string;
  category: string;
  vendor: string;
}

interface AudioDeviceItem {
  name: string;
  is_default: boolean;
  is_input: boolean;
  max_channels: number;
  default_sample_rate: number;
}

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const plugins = ref<PluginItem[]>([]);
const audioDevices = ref<AudioDeviceItem[]>([]);
const audioBackend = ref<string>('ALSA / PipeWire');
const isScanning = ref(false);
const isDesktop = ref(false);

async function scanSystem() {
  isScanning.value = true;
  // Check if running inside Tauri
  const tauriWindow = (window as unknown as { __TAURI__?: { core?: { invoke: (cmd: string) => Promise<unknown> } } }).__TAURI__;

  if (tauriWindow?.core?.invoke) {
    isDesktop.value = true;
    try {
      const scanned = await tauriWindow.core.invoke('scan_installed_plugins') as PluginItem[];
      plugins.value = scanned;

      const devices = await tauriWindow.core.invoke('get_audio_devices') as AudioDeviceItem[];
      audioDevices.value = devices;

      const backend = await tauriWindow.core.invoke('get_linux_audio_backend') as string;
      audioBackend.value = backend;
    } catch (err) {
      console.warn('[PluginManager] Tauri invoke note:', err);
    }
  } else {
    // Web Fallback mode: provide built-in DSP plugins
    isDesktop.value = false;
    plugins.value = [
      { name: 'HomeBand Tanh Overdrive', format: 'AudioWorklet DSP', path: '/worklets/overdrive-processor.js', category: 'Distortion / Saturation', vendor: 'HomeBand' },
      { name: 'HomeBand Stereo Tape Delay', format: 'AudioWorklet DSP', path: '/worklets/delay-processor.js', category: 'Delay / Echo', vendor: 'HomeBand' },
      { name: 'HomeBand Quadrature Chorus', format: 'AudioWorklet DSP', path: '/worklets/chorus-processor.js', category: 'Modulation', vendor: 'HomeBand' },
      { name: 'HomeBand Freeverb Reverb', format: 'AudioWorklet DSP', path: '/worklets/reverb-processor.js', category: 'Reverb / Space', vendor: 'HomeBand' },
      { name: 'Calf Studio Gear (Native Host Ready)', format: 'LV2 / VST3', path: '/usr/lib/lv2/calf.lv2', category: 'Studio Suite (Saturator, Tape, EQ, Delay)', vendor: 'Calf Studio' },
      { name: 'DrumGizmo Multi-Mic', format: 'LV2', path: '/usr/lib/lv2/drumgizmo.lv2', category: 'Acoustic Drums', vendor: 'DrumGizmo' }
    ];
  }

  isScanning.value = false;
}

onMounted(() => {
  scanSystem();
});
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-2xl bg-[#181822] border-2 border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
      <!-- Modal Header -->
      <div class="px-5 py-4 bg-gradient-to-r from-neutral-800 to-neutral-900 border-b border-neutral-700/80 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
            <Sliders class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white tracking-wide">Gerenciador de Plugins & Hardware Linux</h2>
            <p class="text-[11px] text-neutral-400">
              {{ isDesktop ? 'Ambiente Nativo Linux (Host VST3 / CLAP / LV2 ativo)' : 'Ambiente Web / Host Híbrido' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="scanSystem"
            :disabled="isScanning"
            class="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="isScanning ? 'animate-spin' : ''" />
            <span>Escanear</span>
          </button>
          <button
            @click="emit('close')"
            class="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Backend & Device Status Banner -->
      <div class="px-5 py-2.5 bg-[#121218] border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <span class="flex items-center gap-1.5">
          <Cpu class="w-3.5 h-3.5 text-emerald-400" />
          Backend: <strong class="text-neutral-200">{{ audioBackend }}</strong>
        </span>
        <span class="flex items-center gap-1.5">
          <HardDrive class="w-3.5 h-3.5 text-blue-400" />
          Plugins Detectados: <strong class="text-orange-400">{{ plugins.length }}</strong>
        </span>
      </div>

      <!-- Plugins List -->
      <div class="flex-1 overflow-y-auto p-5 space-y-2.5">
        <div
          v-for="plug in plugins"
          :key="plug.path"
          class="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center font-bold text-[10px]">
              {{ plug.format }}
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-2">
                {{ plug.name }}
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-normal">
                  {{ plug.category }}
                </span>
              </div>
              <div class="text-[10px] text-neutral-500 font-mono truncate max-w-md">
                {{ plug.path }}
              </div>
            </div>
          </div>

          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Pronto
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
