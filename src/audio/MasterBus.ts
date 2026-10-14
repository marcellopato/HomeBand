/**
 * Master Output Bus
 * Summing, Brickwall Limiter protection, Master Volume, and Stereo Peak Metering.
 */
export class MasterBus {
  public inputNode: GainNode;
  public masterGain: GainNode;
  public limiter: DynamicsCompressorNode;
  public analyser: AnalyserNode;

  private ctx: AudioContext;
  private meterData: Uint8Array;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Brickwall mastering limiter to protect against clipping
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -0.5; // -0.5 dB
    this.limiter.knee.value = 0.0; // hard knee
    this.limiter.ratio.value = 20.0; // limiting ratio
    this.limiter.attack.value = 0.002; // 2 ms
    this.limiter.release.value = 0.05; // 50 ms

    // Real-time stereo analyser for VU / Peak meters
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.meterData = new Uint8Array(this.analyser.frequencyBinCount);

    // Routing: input -> limiter -> masterGain -> analyser -> destination
    this.inputNode.connect(this.limiter);
    this.limiter.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  public setVolume(val: number) {
    const t = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.5, val)), t, 0.02);
  }

  public getPeakLevel(): number {
    this.analyser.getByteFrequencyData(this.meterData);
    let sum = 0;
    for (let i = 0; i < this.meterData.length; i++) {
      sum += this.meterData[i];
    }
    return sum / (this.meterData.length * 255);
  }
}
