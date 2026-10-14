import { extractPeaks } from '../dsp/DSPMath';

export class AudioRecorder {
  private ctx: AudioContext;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private monitoringGain: GainNode;
  private isRecording = false;

  private recordChunks: Float32Array[] = [];
  private recorderNode: ScriptProcessorNode | null = null;
  private destinationTrackInput: AudioNode | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.monitoringGain = ctx.createGain();
    this.monitoringGain.gain.value = 0.0; // Disabled by default to avoid feedback loops
  }

  public async requestPermission(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2
        }
      });

      this.sourceNode = this.ctx.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.monitoringGain);
      return true;
    } catch (err) {
      console.error('[AudioRecorder] Failed to obtain microphone/instrument access:', err);
      return false;
    }
  }

  public setMonitoring(enabled: boolean, trackInput: AudioNode) {
    this.destinationTrackInput = trackInput;
    if (this.sourceNode) {
      if (enabled) {
        this.monitoringGain.disconnect();
        this.monitoringGain.connect(trackInput);
        this.monitoringGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
      } else {
        this.monitoringGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.02);
      }
    }
  }

  public startRecording() {
    if (!this.sourceNode) return;
    this.recordChunks = [];
    this.isRecording = true;

    // Use a lightweight recorder node to capture continuous 32-bit float audio frames
    this.recorderNode = this.ctx.createScriptProcessor(4096, 1, 1);
    this.recorderNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const channelData = e.inputBuffer.getChannelData(0);
      this.recordChunks.push(new Float32Array(channelData));
    };

    this.sourceNode.connect(this.recorderNode);
    this.recorderNode.connect(this.ctx.destination); // Required by Web Audio spec for ScriptProcessor to pump
  }

  public stopRecording(): { buffer: AudioBuffer; peaks: number[] } | null {
    this.isRecording = false;
    if (this.recorderNode && this.sourceNode) {
      this.sourceNode.disconnect(this.recorderNode);
      this.recorderNode.disconnect();
      this.recorderNode = null;
    }

    if (this.recordChunks.length === 0) return null;

    const totalLength = this.recordChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const audioBuffer = this.ctx.createBuffer(1, totalLength, this.ctx.sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    let offset = 0;
    for (const chunk of this.recordChunks) {
      channelData.set(chunk, offset);
      offset += chunk.length;
    }

    const peaks = extractPeaks(audioBuffer, 300);
    this.recordChunks = [];

    return { buffer: audioBuffer, peaks };
  }

  public dispose() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }
  }
}
