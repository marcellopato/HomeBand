/**
 * Safe AudioWorklet Loader
 * Registers DSP processors in the AudioWorklet thread.
 */
export class AudioWorkletLoader {
  private static registeredContexts = new WeakSet<AudioContext>();

  static async loadAllWorklets(ctx: AudioContext): Promise<boolean> {
    if (this.registeredContexts.has(ctx)) {
      return true;
    }

    if (!ctx.audioWorklet) {
      console.warn('[AudioWorkletLoader] AudioWorklet not supported in this browser/runtime');
      return false;
    }

    const worklets = [
      '/worklets/overdrive-processor.js',
      '/worklets/delay-processor.js',
      '/worklets/chorus-processor.js',
      '/worklets/reverb-processor.js'
    ];

    try {
      await Promise.all(
        worklets.map(path => ctx.audioWorklet.addModule(path))
      );
      this.registeredContexts.add(ctx);
      console.log('[AudioWorkletLoader] All DSP AudioWorklets successfully initialized');
      return true;
    } catch (err) {
      console.error('[AudioWorkletLoader] Error loading AudioWorklet modules:', err);
      return false;
    }
  }
}
