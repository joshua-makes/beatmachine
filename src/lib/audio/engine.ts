import { SAMPLES, sampleUrl, type SampleDef } from "./samples";

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private trackGains = new Map<string, GainNode>();
  private initialized = false;
  private currentPackFolder = "";

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
          const url = sampleUrl(sample.id, this.currentPackFolder);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          const audioBuffer = await this.context!.decodeAudioData(arrayBuf);
          this.buffers.set(sample.id, audioBuffer);
        } catch {
          // silently skip missing samples in tests / packs that don't have this sound
        }
      })
    );
  }

  /** Switch to a different sound pack folder. Reloads all buffers from the new paths.
   *  Falls back gracefully — if a file is missing in the pack it retains the previous buffer. */
  async loadSamplePack(packFolder: string): Promise<void> {
    if (!this.context || !this.initialized) return;
    this.currentPackFolder = packFolder;
    await Promise.all(
      SAMPLES.map(async (sample: SampleDef) => {
        try {
          const url = sampleUrl(sample.id, packFolder);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          const audioBuffer = await this.context!.decodeAudioData(arrayBuf);
          this.buffers.set(sample.id, audioBuffer);
        } catch {
          // file doesn't exist in this pack — keep the previously loaded buffer
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

  playBuffer(sampleId: string, trackId: string, time: number, velocity = 1.0): void {
    if (!this.context || !this.initialized) return;
    const buffer = this.buffers.get(sampleId);
    if (!buffer) return;
    const trackGain = this.getOrCreateTrackGain(trackId);
    if (!trackGain) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    if (velocity !== 1.0) {
      const velGain = this.context.createGain();
      velGain.gain.value = velocity;
      source.connect(velGain);
      velGain.connect(trackGain);
    } else {
      source.connect(trackGain);
    }
    source.start(time);
  }

  /**
   * Preview a sample immediately. Initialises the audio engine if needed
   * (requires a user-gesture to be somewhere in the call stack).
   */
  async previewSample(sampleId: string): Promise<void> {
    if (!this.initialized) await this.init();
    if (!this.context) return;
    this.playBuffer(sampleId, "__preview__", this.context.currentTime, 0.85);
  }

  /**
   * Short synthesised click for the metronome.
   * accent = true on beat 1 of each bar (higher pitch).
   */
  playClick(time: number, accent: boolean): void {
    if (!this.context || !this.masterGain || !this.initialized) return;
    const ctx = this.context;
    const freq = accent ? 1200 : 900;
    const vol  = accent ? 0.35 : 0.2;
    const osc  = ctx.createOscillator();
    const env  = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(vol, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  /**
   * Synthesise a piano-like tone and route it through the master gain / analyser.
   * velocity: 0-1, duration in seconds.
   */
  playTone(freq: number, velocity: number, duration: number): void {
    this.playToneAt(freq, velocity, duration, this.context?.currentTime ?? 0);
  }

  /**
   * Same as playTone but fires at a precise scheduled `startTime` (Web Audio clock).
   * Used by the step sequencer so melody notes are in sync with samples.
   */
  playToneAt(freq: number, velocity: number, duration: number, startTime: number): void {
    if (!this.context || !this.masterGain || !this.initialized) return;
    const ctx = this.context;
    const t = startTime;

    const env = ctx.createGain();
    env.connect(this.masterGain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.7, t + 0.01);
    env.gain.exponentialRampToValueAtTime(velocity * 0.3, t + 0.15);
    env.gain.setValueAtTime(velocity * 0.3, t + Math.max(duration - 0.2, 0.05));
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    env.gain.setValueAtTime(0, t + duration + 0.01);

    const partials: Array<{ ratio: number; gain: number; type: OscillatorType }> = [
      { ratio: 1, gain: 1.00, type: "triangle" },
      { ratio: 2, gain: 0.50, type: "sine" },
      { ratio: 3, gain: 0.25, type: "sine" },
      { ratio: 4, gain: 0.12, type: "sine" },
      { ratio: 5, gain: 0.06, type: "sine" },
    ];

    for (const { ratio, gain, type } of partials) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      oscGain.gain.value = gain;
      osc.connect(oscGain);
      oscGain.connect(env);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    }
  }

  /**
   * Play a melody note with the specified instrument voice.
   * Routes to a private synthesis method for each timbre.
   */
  playVoiceAt(voice: string, freq: number, velocity: number, duration: number, startTime: number): void {
    if (!this.context || !this.masterGain || !this.initialized) return;
    switch (voice) {
      case "violin": return this._playViolin(freq, velocity, duration, startTime);
      case "flute":  return this._playFlute(freq, velocity, duration, startTime);
      case "guitar": return this._playGuitar(freq, velocity, duration, startTime);
      case "brass":  return this._playBrass(freq, velocity, duration, startTime);
      case "organ":  return this._playOrgan(freq, velocity, duration, startTime);
      case "bell":   return this._playBell(freq, velocity, duration, startTime);
      default:       return this.playToneAt(freq, velocity, duration, startTime); // piano
    }
  }

  private _playViolin(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!; const masterGain = this.masterGain!;
    const t = startTime; const d = Math.max(duration, 0.2);
    const env = ctx.createGain();
    env.connect(masterGain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.75, t + 0.12); // bow stroke attack
    env.gain.setValueAtTime(velocity * 0.75, t + Math.max(d - 0.1, 0.15));
    env.gain.linearRampToValueAtTime(0.001, t + d);
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = Math.min(freq * 6, 4500);
    filter.Q.value = 1.2;
    // Vibrato: ramps in after 0.3s so the bow stroke sounds natural
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = "sine"; lfo.frequency.value = 5.5;
    lfoDepth.gain.setValueAtTime(0, t);
    lfoDepth.gain.linearRampToValueAtTime(freq * 0.008, t + 0.35);
    lfo.connect(lfoDepth); lfoDepth.connect(osc.frequency);
    osc.connect(filter); filter.connect(env);
    osc.start(t); lfo.start(t);
    osc.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
  }

  private _playFlute(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!; const masterGain = this.masterGain!;
    const t = startTime; const d = Math.max(duration, 0.15);
    const env = ctx.createGain();
    env.connect(masterGain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.55, t + 0.15); // gentle breath attack
    env.gain.setValueAtTime(velocity * 0.55, t + Math.max(d - 0.08, 0.18));
    env.gain.linearRampToValueAtTime(0.001, t + d);
    // Near-pure sine with tiny 2nd harmonic (flute is almost pure tone)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine"; osc1.frequency.value = freq;
    const g1 = ctx.createGain(); g1.gain.value = 1.0;
    osc1.connect(g1); g1.connect(env);
    const osc2 = ctx.createOscillator();
    osc2.type = "sine"; osc2.frequency.value = freq * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.06;
    osc2.connect(g2); g2.connect(env);
    // Gentle continuous vibrato
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = "sine"; lfo.frequency.value = 5.0;
    lfoDepth.gain.value = freq * 0.003;
    lfo.connect(lfoDepth); lfoDepth.connect(osc1.frequency); lfoDepth.connect(osc2.frequency);
    osc1.start(t); osc2.start(t); lfo.start(t);
    osc1.stop(t + d + 0.05); osc2.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
  }

  private _playGuitar(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!; const masterGain = this.masterGain!;
    const t = startTime; const tail = Math.max(duration, 0.5);
    const env = ctx.createGain();
    env.connect(masterGain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.9, t + 0.003); // pluck attack
    env.gain.exponentialRampToValueAtTime(velocity * 0.45, t + 0.25); // body resonance decay
    env.gain.exponentialRampToValueAtTime(0.001, t + tail);
    const partials: Array<{ ratio: number; gain: number; type: OscillatorType }> = [
      { ratio: 1, gain: 1.00, type: "triangle" },
      { ratio: 2, gain: 0.40, type: "sine" },
      { ratio: 3, gain: 0.10, type: "sine" },
    ];
    for (const { ratio, gain, type } of partials) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = type; osc.frequency.value = freq * ratio; og.gain.value = gain;
      osc.connect(og); og.connect(env);
      osc.start(t); osc.stop(t + tail + 0.05);
    }
  }

  private _playBrass(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!; const masterGain = this.masterGain!;
    const t = startTime; const d = Math.max(duration, 0.15);
    const env = ctx.createGain();
    env.connect(masterGain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.85, t + 0.04); // bright punchy attack
    env.gain.setValueAtTime(velocity * 0.7, t + Math.max(d - 0.1, 0.08));
    env.gain.linearRampToValueAtTime(0.001, t + d);
    const osc = ctx.createOscillator();
    osc.type = "sawtooth"; osc.frequency.value = freq;
    // Filter sweep: bright on attack, darkens to sustain (like a real horn embouchure)
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq * 5, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.5, t + 0.06);
    filter.Q.value = 0.8;
    osc.connect(filter); filter.connect(env);
    osc.start(t); osc.stop(t + d + 0.05);
  }

  private _playOrgan(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!; const masterGain = this.masterGain!;
    const t = startTime; const d = duration;
    const env = ctx.createGain();
    env.connect(masterGain);
    env.gain.setValueAtTime(velocity * 0.65, t); // Hammond-style: instant on
    env.gain.setValueAtTime(velocity * 0.65, t + Math.max(d - 0.01, 0.01));
    env.gain.setValueAtTime(0, t + d); // and instant off
    // Additive drawbars: sub-octave, fundamental, 2nd, 3rd, 4th
    const drawbars = [
      { ratio: 0.5, gain: 0.40 },
      { ratio: 1.0, gain: 1.00 },
      { ratio: 2.0, gain: 0.80 },
      { ratio: 3.0, gain: 0.50 },
      { ratio: 4.0, gain: 0.30 },
    ];
    for (const { ratio, gain } of drawbars) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq * ratio; og.gain.value = gain;
      osc.connect(og); og.connect(env);
      osc.start(t); osc.stop(t + d + 0.02);
    }
  }

  private _playBell(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!; const masterGain = this.masterGain!;
    const t = startTime; const tail = Math.max(duration, 1.5); // bells ring long
    const env = ctx.createGain();
    env.connect(masterGain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.8, t + 0.003); // metallic strike
    env.gain.exponentialRampToValueAtTime(0.001, t + tail);
    // Inharmonic sine partials — the 2.756 and 5.404 ratios are characteristic of real bells
    const bellPartials = [
      { ratio: 1.000, gain: 1.00 },
      { ratio: 2.756, gain: 0.60 },
      { ratio: 5.404, gain: 0.25 },
      { ratio: 3.000, gain: 0.15 },
    ];
    for (const { ratio, gain } of bellPartials) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq * ratio; og.gain.value = gain;
      osc.connect(og); og.connect(env);
      osc.start(t); osc.stop(t + tail + 0.05);
    }
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
