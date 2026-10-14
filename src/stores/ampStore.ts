import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AmpHeadParams, OverdrivePedalParams, ChorusPedalParams, DelayPedalParams, ReverbPedalParams } from '../types/audio';
import { AudioEngineManager } from '../audio/AudioEngineManager';

export const useAmpStore = defineStore('amp', () => {
  const ampParams = ref<AmpHeadParams>({
    preset: 'british-crunch',
    inputGain: 1.0,
    preampDrive: 4.8,
    bass: 1.5,
    middle: 2.8,
    treble: 3.5,
    presence: 4.0,
    masterVolume: 0.75,
    cabType: '4x12-heavy'
  });

  const overdriveParams = ref<OverdrivePedalParams>({
    enabled: true,
    drive: 12.0,
    tone: 0.7,
    level: 0.85,
    mode: 0 // Soft tanh
  });

  const chorusParams = ref<ChorusPedalParams>({
    enabled: false,
    rate: 1.6,
    depth: 0.003,
    mix: 0.45,
    feedback: 0.2
  });

  const delayParams = ref<DelayPedalParams>({
    enabled: true,
    delayTime: 0.375,
    feedback: 0.4,
    damping: 0.35,
    mix: 0.3,
    syncBpm: true,
    subdivision: '1/8d'
  });

  const reverbParams = ref<ReverbPedalParams>({
    enabled: true,
    roomSize: 0.65,
    damping: 0.3,
    mix: 0.28
  });

  function applyPreset(presetName: 'clean-american' | 'british-crunch' | 'high-gain-lead') {
    ampParams.value.preset = presetName;

    switch (presetName) {
      case 'clean-american':
        ampParams.value.inputGain = 0.9;
        ampParams.value.preampDrive = 1.8;
        ampParams.value.bass = 3.0;
        ampParams.value.middle = -1.5; // Scooped mids
        ampParams.value.treble = 4.0;
        ampParams.value.presence = 5.0;
        ampParams.value.cabType = '1x12-vintage';
        overdriveParams.value.enabled = false;
        chorusParams.value.enabled = true;
        reverbParams.value.mix = 0.4;
        break;

      case 'british-crunch':
        ampParams.value.inputGain = 1.0;
        ampParams.value.preampDrive = 5.2;
        ampParams.value.bass = 1.5;
        ampParams.value.middle = 3.2;
        ampParams.value.treble = 2.5;
        ampParams.value.presence = 3.8;
        ampParams.value.cabType = '4x12-heavy';
        overdriveParams.value.enabled = true;
        overdriveParams.value.drive = 10.0;
        overdriveParams.value.mode = 0;
        break;

      case 'high-gain-lead':
        ampParams.value.inputGain = 1.2;
        ampParams.value.preampDrive = 8.5;
        ampParams.value.bass = 2.0;
        ampParams.value.middle = 1.0;
        ampParams.value.treble = 4.5;
        ampParams.value.presence = 6.0;
        ampParams.value.cabType = '4x12-heavy';
        overdriveParams.value.enabled = true;
        overdriveParams.value.drive = 22.0;
        overdriveParams.value.mode = 2; // Tube asymmetric
        delayParams.value.enabled = true;
        break;
    }

    syncToAudioEngine();
  }

  function syncToAudioEngine(bpm: number = 120) {
    const engine = AudioEngineManager.getInstance();
    // Find guitar track nodes and update them
    for (const trackNode of (engine as unknown as { trackNodes: Map<string, unknown> }).trackNodes?.values?.() || []) {
      const node = trackNode as {
        type: string;
        pedalboard?: {
          updateOverdrive: (p: OverdrivePedalParams) => void;
          updateChorus: (p: ChorusPedalParams) => void;
          updateDelay: (p: DelayPedalParams, b: number) => void;
          updateReverb: (p: ReverbPedalParams) => void;
        };
        ampDesigner?: {
          updateAmp: (p: AmpHeadParams) => void;
        };
      };

      if (node.type === 'guitar') {
        if (node.ampDesigner) {
          node.ampDesigner.updateAmp(ampParams.value);
        }
        if (node.pedalboard) {
          node.pedalboard.updateOverdrive(overdriveParams.value);
          node.pedalboard.updateChorus(chorusParams.value);
          node.pedalboard.updateDelay(delayParams.value, bpm);
          node.pedalboard.updateReverb(reverbParams.value);
        }
      }
    }
  }

  return {
    ampParams,
    overdriveParams,
    chorusParams,
    delayParams,
    reverbParams,
    applyPreset,
    syncToAudioEngine
  };
});
