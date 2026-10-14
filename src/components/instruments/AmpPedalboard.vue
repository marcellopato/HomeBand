<script setup lang="ts">
import { useAmpStore } from '../../stores/ampStore';
import { useProjectStore } from '../../stores/projectStore';
import RotaryKnob from '../common/RotaryKnob.vue';
import { Flame, Sparkles, Zap, Radio, Sliders } from 'lucide-vue-next';

const ampStore = useAmpStore();
const project = useProjectStore();

function onPresetSelect(preset: 'clean-american' | 'british-crunch' | 'high-gain-lead') {
  ampStore.applyPreset(preset);
}

function updateDSP() {
  ampStore.syncToAudioEngine(project.bpm);
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#121217] overflow-y-auto p-4 select-none">
    <!-- Preset Selection & Quick Info Bar -->
    <div class="flex items-center justify-between bg-neutral-900/90 border border-neutral-700/80 rounded-xl px-4 py-2 mb-4 shadow">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
          <Flame class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white tracking-wide">Amp Designer & Pedalboard</h2>
          <p class="text-[11px] text-neutral-400">Emulação analógica serial com DSP WebAssembly/AudioWorklet</p>
        </div>
      </div>

      <!-- Quick Presets -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-neutral-400 font-semibold uppercase">Presets Rápidos:</span>
        <button
          @click="onPresetSelect('clean-american')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border"
          :class="ampStore.ampParams.preset === 'clean-american' ? 'bg-amber-600 text-white border-amber-400 shadow-md' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'"
        >
          Clean American
        </button>
        <button
          @click="onPresetSelect('british-crunch')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border"
          :class="ampStore.ampParams.preset === 'british-crunch' ? 'bg-orange-600 text-white border-orange-400 shadow-md' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'"
        >
          British Crunch
        </button>
        <button
          @click="onPresetSelect('high-gain-lead')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border"
          :class="ampStore.ampParams.preset === 'high-gain-lead' ? 'bg-red-700 text-white border-red-500 shadow-md' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'"
        >
          High-Gain Lead
        </button>
      </div>
    </div>

    <!-- 1. GUITAR HEAD (Cabeçote Valvulado) -->
    <div class="rounded-xl border-2 border-neutral-700 bg-gradient-to-b from-[#2b2b36] via-[#1f1f28] to-[#15151e] p-5 shadow-2xl mb-6 relative overflow-hidden">
      <!-- Vintage Tolex / Wood Corner Trim -->
      <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-b border-amber-800/40"></div>

      <!-- Head Front Faceplate -->
      <div class="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4">
        <div class="flex items-center gap-2">
          <!-- Glowing Valve/Jewel Pilot Light -->
          <div class="w-4 h-4 rounded-full bg-red-600 border-2 border-amber-300 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse"></div>
          <span class="text-xs uppercase font-extrabold tracking-widest text-amber-400 font-mono">
            GARAGE AMPLIFICATION • TUBE STAGE
          </span>
        </div>

        <!-- Cabinet Voicing Selector -->
        <div class="flex items-center gap-2 text-xs">
          <span class="text-neutral-400 font-medium">Gabinete / Falantes:</span>
          <select
            v-model="ampStore.ampParams.cabType"
            @change="updateDSP"
            class="bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-neutral-200 focus:outline-none"
          >
            <option value="1x12-vintage">1x12 Vintage Alnico (Warm & Sparkle)</option>
            <option value="4x12-heavy">4x12 Heavy Stack (Punchy & Tight)</option>
            <option value="2x12-open">2x12 Open Back (Airy & Wide)</option>
          </select>
        </div>
      </div>

      <!-- Amp Knobs Section: Input, Drive, 3-Band EQ, Presence, Master -->
      <div class="flex items-center justify-around py-2">
        <RotaryKnob
          v-model="ampStore.ampParams.inputGain"
          :min="0.1"
          :max="2.5"
          label="Gain In"
          color="#38bdf8"
          @update:model-value="updateDSP"
        />

        <div class="h-12 w-px bg-neutral-700/50"></div>

        <RotaryKnob
          v-model="ampStore.ampParams.preampDrive"
          :min="0.0"
          :max="10.0"
          label="Preamp Drive"
          color="#f97316"
          @update:model-value="updateDSP"
        />

        <div class="h-12 w-px bg-neutral-700/50"></div>

        <!-- 3-Band Tone Stack -->
        <RotaryKnob
          v-model="ampStore.ampParams.bass"
          :min="-12.0"
          :max="12.0"
          unit="dB"
          label="Bass"
          color="#a855f7"
          @update:model-value="updateDSP"
        />
        <RotaryKnob
          v-model="ampStore.ampParams.middle"
          :min="-12.0"
          :max="12.0"
          unit="dB"
          label="Middle"
          color="#eab308"
          @update:model-value="updateDSP"
        />
        <RotaryKnob
          v-model="ampStore.ampParams.treble"
          :min="-12.0"
          :max="12.0"
          unit="dB"
          label="Treble"
          color="#ec4899"
          @update:model-value="updateDSP"
        />
        <RotaryKnob
          v-model="ampStore.ampParams.presence"
          :min="0.0"
          :max="10.0"
          label="Presence"
          color="#22d3ee"
          @update:model-value="updateDSP"
        />

        <div class="h-12 w-px bg-neutral-700/50"></div>

        <RotaryKnob
          v-model="ampStore.ampParams.masterVolume"
          :min="0.0"
          :max="1.0"
          label="Master Out"
          color="#ef4444"
          @update:model-value="updateDSP"
        />
      </div>
    </div>

    <!-- 2. PEDALBOARD (Stompbox Row) -->
    <div class="rounded-xl border border-neutral-800 bg-[#14141a] p-4 shadow-xl">
      <div class="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
        <h3 class="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Sliders class="w-4 h-4 text-orange-400" />
          Pedalboard Serial (Overdrive &rarr; Chorus &rarr; Delay &rarr; Reverb)
        </h3>
        <span class="text-[10px] text-neutral-500 font-mono">AudioWorklet DSP Thread (128 frames)</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Pedal 1: Vintage Overdrive (Gold) -->
        <div
          class="rounded-xl border-2 p-3.5 flex flex-col items-center justify-between transition-all shadow-lg relative"
          :class="ampStore.overdriveParams.enabled ? 'border-amber-500 bg-gradient-to-b from-amber-950/80 to-amber-900/60 shadow-amber-950/40' : 'border-neutral-800 bg-neutral-900/80 opacity-70'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span class="text-xs font-extrabold text-amber-300 tracking-wider">OVERDRIVE</span>
            <!-- LED Indicator -->
            <div
              class="w-3 h-3 rounded-full border border-amber-300 transition-all shadow"
              :class="ampStore.overdriveParams.enabled ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'bg-neutral-800'"
            ></div>
          </div>

          <!-- Mode Toggle -->
          <div class="flex gap-1 mb-2 bg-neutral-950/70 p-1 rounded text-[9px] font-semibold w-full justify-around">
            <button
              @click="ampStore.overdriveParams.mode = 0; updateDSP()"
              :class="ampStore.overdriveParams.mode === 0 ? 'text-amber-400 font-bold' : 'text-neutral-500'"
              class="cursor-pointer"
            >
              Soft
            </button>
            <button
              @click="ampStore.overdriveParams.mode = 1; updateDSP()"
              :class="ampStore.overdriveParams.mode === 1 ? 'text-amber-400 font-bold' : 'text-neutral-500'"
              class="cursor-pointer"
            >
              Hard
            </button>
            <button
              @click="ampStore.overdriveParams.mode = 2; updateDSP()"
              :class="ampStore.overdriveParams.mode === 2 ? 'text-amber-400 font-bold' : 'text-neutral-500'"
              class="cursor-pointer"
            >
              Tube
            </button>
          </div>

          <div class="grid grid-cols-3 gap-2 w-full mb-3">
            <RotaryKnob v-model="ampStore.overdriveParams.drive" :min="1" :max="40" label="Drive" :size="36" color="#f59e0b" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.overdriveParams.tone" :min="0.05" :max="1.0" label="Tone" :size="36" color="#fbbf24" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.overdriveParams.level" :min="0.0" :max="1.8" label="Level" :size="36" color="#f59e0b" @update:model-value="updateDSP" />
          </div>

          <!-- Stomper Footswitch -->
          <button
            @click="ampStore.overdriveParams.enabled = !ampStore.overdriveParams.enabled; updateDSP()"
            class="w-14 h-14 rounded-full bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-600 border-2 border-neutral-700 shadow-md active:translate-y-0.5 cursor-pointer flex items-center justify-center font-bold text-neutral-800 text-[10px]"
          >
            BYPASS
          </button>
        </div>

        <!-- Pedal 2: Stereo Chorus (Cyan) -->
        <div
          class="rounded-xl border-2 p-3.5 flex flex-col items-center justify-between transition-all shadow-lg relative"
          :class="ampStore.chorusParams.enabled ? 'border-cyan-500 bg-gradient-to-b from-cyan-950/80 to-cyan-900/60 shadow-cyan-950/40' : 'border-neutral-800 bg-neutral-900/80 opacity-70'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span class="text-xs font-extrabold text-cyan-300 tracking-wider">CHORUS</span>
            <div
              class="w-3 h-3 rounded-full border border-cyan-300 transition-all shadow"
              :class="ampStore.chorusParams.enabled ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]' : 'bg-neutral-800'"
            ></div>
          </div>

          <div class="grid grid-cols-3 gap-2 w-full mb-3">
            <RotaryKnob v-model="ampStore.chorusParams.rate" :min="0.1" :max="7.0" label="Rate" :size="36" color="#22d3ee" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.chorusParams.depth" :min="0.001" :max="0.012" label="Depth" :size="36" color="#06b6d4" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.chorusParams.mix" :min="0.0" :max="1.0" label="Mix" :size="36" color="#22d3ee" @update:model-value="updateDSP" />
          </div>

          <button
            @click="ampStore.chorusParams.enabled = !ampStore.chorusParams.enabled; updateDSP()"
            class="w-14 h-14 rounded-full bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-600 border-2 border-neutral-700 shadow-md active:translate-y-0.5 cursor-pointer flex items-center justify-center font-bold text-neutral-800 text-[10px]"
          >
            BYPASS
          </button>
        </div>

        <!-- Pedal 3: Tape / Ping-Pong Delay (Emerald) -->
        <div
          class="rounded-xl border-2 p-3.5 flex flex-col items-center justify-between transition-all shadow-lg relative"
          :class="ampStore.delayParams.enabled ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/80 to-emerald-900/60 shadow-emerald-950/40' : 'border-neutral-800 bg-neutral-900/80 opacity-70'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span class="text-xs font-extrabold text-emerald-300 tracking-wider">ANALOG DELAY</span>
            <div
              class="w-3 h-3 rounded-full border border-emerald-300 transition-all shadow"
              :class="ampStore.delayParams.enabled ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-neutral-800'"
            ></div>
          </div>

          <!-- BPM Sync Toggle -->
          <div class="flex items-center justify-between w-full mb-2 bg-neutral-950/60 px-2 py-1 rounded text-[10px]">
            <span class="text-neutral-400">BPM Sync:</span>
            <select
              v-model="ampStore.delayParams.subdivision"
              @change="updateDSP"
              class="bg-neutral-800 text-emerald-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
            >
              <option value="1/4">1/4 Semínima</option>
              <option value="1/8">1/8 Colcheia</option>
              <option value="1/8d">1/8d Pontuada</option>
              <option value="1/16">1/16 Semicolcheia</option>
            </select>
          </div>

          <div class="grid grid-cols-3 gap-2 w-full mb-3">
            <RotaryKnob v-model="ampStore.delayParams.feedback" :min="0.0" :max="0.9" label="Feedback" :size="36" color="#10b981" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.delayParams.damping" :min="0.0" :max="0.9" label="Damp" :size="36" color="#34d399" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.delayParams.mix" :min="0.0" :max="1.0" label="Mix" :size="36" color="#10b981" @update:model-value="updateDSP" />
          </div>

          <button
            @click="ampStore.delayParams.enabled = !ampStore.delayParams.enabled; updateDSP()"
            class="w-14 h-14 rounded-full bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-600 border-2 border-neutral-700 shadow-md active:translate-y-0.5 cursor-pointer flex items-center justify-center font-bold text-neutral-800 text-[10px]"
          >
            BYPASS
          </button>
        </div>

        <!-- Pedal 4: Ambient Reverb (Purple) -->
        <div
          class="rounded-xl border-2 p-3.5 flex flex-col items-center justify-between transition-all shadow-lg relative"
          :class="ampStore.reverbParams.enabled ? 'border-purple-500 bg-gradient-to-b from-purple-950/80 to-purple-900/60 shadow-purple-950/40' : 'border-neutral-800 bg-neutral-900/80 opacity-70'"
        >
          <div class="flex items-center justify-between w-full mb-2">
            <span class="text-xs font-extrabold text-purple-300 tracking-wider">ROOM REVERB</span>
            <div
              class="w-3 h-3 rounded-full border border-purple-300 transition-all shadow"
              :class="ampStore.reverbParams.enabled ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.9)]' : 'bg-neutral-800'"
            ></div>
          </div>

          <div class="grid grid-cols-3 gap-2 w-full mb-3">
            <RotaryKnob v-model="ampStore.reverbParams.roomSize" :min="0.1" :max="0.95" label="Size" :size="36" color="#c084fc" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.reverbParams.damping" :min="0.0" :max="0.9" label="Damp" :size="36" color="#d8b4fe" @update:model-value="updateDSP" />
            <RotaryKnob v-model="ampStore.reverbParams.mix" :min="0.0" :max="1.0" label="Mix" :size="36" color="#c084fc" @update:model-value="updateDSP" />
          </div>

          <button
            @click="ampStore.reverbParams.enabled = !ampStore.reverbParams.enabled; updateDSP()"
            class="w-14 h-14 rounded-full bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-600 border-2 border-neutral-700 shadow-md active:translate-y-0.5 cursor-pointer flex items-center justify-center font-bold text-neutral-800 text-[10px]"
          >
            BYPASS
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
