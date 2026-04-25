import { SAMPLES, type SampleDef } from "./samples";

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private trackGains = new Map<string, GainNode>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.mediaStreamDest = this.context.createMediaStreamDestination();

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.analyser.connect(this.mediaStreamDest);

    this.initialized = true;
    await this.loadBuffers();
  }

  private async loadBuffers(): Promise<void> {
    if (!this.context) return;
    await Promise.all(
      SAMPLES.map(async (sample: SampleDef) => {
        try {
          const res = await fetch(sample.url);
          const arrayBuf = await res.arrayBuffer();
          const audioBuffer = await this.context!.decodeAudioData(arrayBuf);
          this.buffers.set(sample.id, audioBuffer);
        } catch {
          // silently skip missing samples in tests
        }
      })
    );
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStreamDest?.stream ?? null;
  }

  getAudioContext(): AudioContext | null {
    return this.context;
  }

  setMasterVolume(vol: number): void {
    if (this.masterGain) this.masterGain.gain.value = vol;
  }

  getOrCreateTrackGain(trackId: string): GainNode | null {
    if (!this.context || !this.masterGain) return null;
    if (!this.trackGains.has(trackId)) {
      const g = this.context.createGain();
      g.connect(this.masterGain);
      this.trackGains.set(trackId, g);
    }
    return this.trackGains.get(trackId) ?? null;
  }

  setTrackVolume(trackId: string, vol: number): void {
    const g = this.getOrCreateTrackGain(trackId);
    if (g) g.gain.value = vol;
  }

  playBuffer(sampleId: string, trackId: string, time: number): void {
    if (!this.context || !this.initialized) return;
    const buffer = this.buffers.get(sampleId);
    if (!buffer) return;
    const trackGain = this.getOrCreateTrackGain(trackId);
    if (!trackGain) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(trackGain);
    source.start(time);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  resume(): Promise<void> {
    return this.context?.resume() ?? Promise.resolve();
  }

  suspend(): Promise<void> {
    return this.context?.suspend() ?? Promise.resolve();
  }
}

let engineInstance: AudioEngine | null = null;

export function getEngine(): AudioEngine {
  if (!engineInstance) engineInstance = new AudioEngine();
  return engineInstance;
}
