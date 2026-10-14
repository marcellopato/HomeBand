import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AudioEngineManager } from '../audio/AudioEngineManager';

export const useAudioStore = defineStore('audio', () => {
  const masterVolume = ref(0.85);
  const masterPeak = ref(0);
  const isInputArmed = ref(false);
  const hasInputPermission = ref(false);
  const isDirectMonitoring = ref(false);

  let meterIntervalId: number | null = null;

  function setMasterVolume(val: number) {
    masterVolume.value = val;
    AudioEngineManager.getInstance().masterBus.setVolume(val);
  }

  function startMeterPolling() {
    if (meterIntervalId !== null) return;
    const engine = AudioEngineManager.getInstance();

    meterIntervalId = window.setInterval(() => {
      masterPeak.value = engine.masterBus.getPeakLevel();
    }, 50);
  }

  function stopMeterPolling() {
    if (meterIntervalId !== null) {
      clearInterval(meterIntervalId);
      meterIntervalId = null;
    }
  }

  async function requestMicrophoneAccess(): Promise<boolean> {
    const engine = AudioEngineManager.getInstance();
    const ok = await engine.recorder.requestPermission();
    hasInputPermission.value = ok;
    return ok;
  }

  return {
    masterVolume,
    masterPeak,
    isInputArmed,
    hasInputPermission,
    isDirectMonitoring,
    setMasterVolume,
    startMeterPolling,
    stopMeterPolling,
    requestMicrophoneAccess
  };
});
