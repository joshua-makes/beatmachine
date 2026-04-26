import Soundfont from "soundfont-player";
import { SAMPLES, sampleUrl, type SampleDef } from "./samples";

// Map internal voice names → General MIDI soundfont instrument names
const SF_INSTRUMENT: Record<string, string> = {
  piano:  "acoustic_grand_piano",
  violin: "violin",
  flute:  "flute",
  guitar: "acoustic_guitar_nylon",
  brass:  "french_horn",
  organ:  "drawbar_organ",
  bell:   "glockenspiel",
};

/** Frequency (Hz) → MIDI note number (C4=60). */
function freqToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private trackGains = new Map<string, GainNode>();
  private initialized = false;
  private currentPackFolder = "";
  private reverbNode: ConvolverNode | null = null;
  private reverbReturnGain: GainNode | null = null;
  /** Loaded soundfont instrument players, keyed by voice name. */
  private sfPlayers = new Map<string, Awaited<ReturnType<typeof Soundfont.instrument>>>();
  /** In-flight load promises — prevents duplicate fetches. */
  private sfLoadPromises = new Map<string, Promise<void>>();

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
    this._initReverb();
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
  /** Synthesise a reverb impulse response from decaying white noise. */
  private _initReverb(): void {
    if (!this.context || !this.masterGain) return;
    const ctx = this.context;
    const sr = ctx.sampleRate;
    const length = Math.floor(sr * 1.8);
    const buf = ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const norm = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - norm, 2.5);
      }
    }
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = buf;
    this.reverbReturnGain = ctx.createGain();
    this.reverbReturnGain.gain.value = 0.20;
    this.reverbNode.connect(this.reverbReturnGain);
    this.reverbReturnGain.connect(this.masterGain);
  }

  /** Create an envelope GainNode pre-wired to masterGain + an optional reverb send. */
  private _env(reverbAmt = 0.0): GainNode {
    const ctx = this.context!;
    const env = ctx.createGain();
    env.connect(this.masterGain!);
    if (this.reverbNode && reverbAmt > 0) {
      const send = ctx.createGain();
      send.gain.value = reverbAmt;
      env.connect(send);
      send.connect(this.reverbNode);
    }
    return env;
  }

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

    const env = this._env(0.12);
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
   * Fire-and-forget: fetch the soundfont for `voice` and store a Player.
   * Duplicate requests for the same voice are deduplicated via promise cache.
   */
  private _ensureSFPlayer(voice: string): void {
    if (this.sfPlayers.has(voice) || this.sfLoadPromises.has(voice)) return;
    if (!this.context || !this.masterGain) return;
    const sfName = SF_INSTRUMENT[voice] ?? "acoustic_grand_piano";
    const promise = Soundfont.instrument(this.context, sfName, {
      soundfont: "MusyngKite",
      destination: this.masterGain,
    }).then((player) => {
      this.sfPlayers.set(voice, player);
      this.sfLoadPromises.delete(voice);
    }).catch(() => {
      this.sfLoadPromises.delete(voice); // CDN unreachable — synthesis fallback stays
    });
    this.sfLoadPromises.set(voice, promise);
  }

  /**
   * Pre-fetch soundfont players for the given voice names.
   * Call this after engine.init() with the voices present in the loaded pattern
   * so samples are ready before the first bar plays.
   */
  async preloadVoices(voices: string[]): Promise<void> {
    if (!this.context || !this.initialized) return;
    voices.forEach((v) => this._ensureSFPlayer(v));
    // Wait for any already-in-progress loads to settle
    await Promise.allSettled(
      voices.map((v) => this.sfLoadPromises.get(v) ?? Promise.resolve()),
    );
  }

  /**
   * Play a melody note with the specified instrument voice.
   * Uses a real soundfont sample if loaded; stays silent while loading
   * (far better than a scratchy oscillator burst), and kicks off a background
   * fetch so the sample is ready for the next iteration.
   */
  playVoiceAt(voice: string, freq: number, velocity: number, duration: number, startTime: number): void {
    if (!this.context || !this.masterGain || !this.initialized) return;
    const sfPlayer = this.sfPlayers.get(voice);
    if (sfPlayer) {
      // Boost gain to match oscillator piano level (soundfonts are normalised quieter)
      sfPlayer.play(freqToMidi(freq), startTime, { gain: velocity * 2.2, duration });
      return;
    }
    // Kick off background load — notes will use real samples once it resolves
    this._ensureSFPlayer(voice);
    // If still loading, stay silent. Scratchy fallback synthesis is worse than
    // a brief moment of silence at the start while the CDN sample downloads.
    // (Piano has no soundfont delay issue because it falls through to playToneAt
    //  only when the piano soundfont itself fails to load.)
  }

  private _playViolin(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!;
    const t = startTime; const d = Math.max(duration, 0.2);
    const env = this._env(0.35); // strings love reverb
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.65, t + 0.12);
    env.gain.setValueAtTime(velocity * 0.65, t + Math.max(d - 0.12, 0.15));
    env.gain.linearRampToValueAtTime(0.001, t + d);
    // Two slightly detuned sawtooths create a natural chorus/unison effect
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = Math.min(freq * 5, 4000);
      filter.Q.value = 1.8;
      // Vibrato ramps in after bow stroke settles
      const lfo = ctx.createOscillator();
      const lfoDepth = ctx.createGain();
      lfo.type = "sine"; lfo.frequency.value = 5.5;
      lfoDepth.gain.setValueAtTime(0, t);
      lfoDepth.gain.linearRampToValueAtTime(freq * 0.007, t + 0.4);
      lfo.connect(lfoDepth); lfoDepth.connect(osc.frequency);
      const og = ctx.createGain(); og.gain.value = 0.5;
      osc.connect(filter); filter.connect(og); og.connect(env);
      osc.start(t); lfo.start(t);
      osc.stop(t + d + 0.1); lfo.stop(t + d + 0.1);
    }
  }

  private _playFlute(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!;
    const t = startTime; const d = Math.max(duration, 0.15);
    // Main tone: near-pure sine with gentle vibrato
    const env = this._env(0.28);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.5, t + 0.18);
    env.gain.setValueAtTime(velocity * 0.5, t + Math.max(d - 0.1, 0.2));
    env.gain.linearRampToValueAtTime(0.001, t + d);
    const osc = ctx.createOscillator();
    osc.type = "sine"; osc.frequency.value = freq;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = "sine"; lfo.frequency.value = 5.2;
    lfoDepth.gain.value = freq * 0.003;
    lfo.connect(lfoDepth); lfoDepth.connect(osc.frequency);
    osc.connect(env);
    osc.start(t); lfo.start(t);
    osc.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
    // Breath noise: short looping buffer → bandpass centred on the tone
    // This is the most recognisable feature of a real flute — without it it's just a sine
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuf;
    noiseNode.loop = true;
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = freq * 1.5;
    bpf.Q.value = 2.5;
    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(velocity * 0.14, t);          // breathy transient
    noiseEnv.gain.linearRampToValueAtTime(velocity * 0.05, t + 0.2); // settle
    noiseEnv.gain.setValueAtTime(velocity * 0.05, t + Math.max(d - 0.05, 0.22));
    noiseEnv.gain.linearRampToValueAtTime(0.001, t + d);
    noiseNode.connect(bpf); bpf.connect(noiseEnv); noiseEnv.connect(this.masterGain!);
    noiseNode.start(t);
    noiseNode.stop(t + d + 0.05);
  }

  private _playGuitar(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!;
    const t = startTime; const tail = Math.max(duration, 0.8);
    const delayTime = 1.0 / freq;
    // Seed the delay loop with one period of white noise
    const bufSize = Math.ceil(ctx.sampleRate * delayTime);
    const seedBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const sd = seedBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) sd[i] = Math.random() * 2 - 1;
    const seed = ctx.createBufferSource();
    seed.buffer = seedBuf;
    // Karplus-Strong: delay feedback loop whose period = 1/freq → that frequency resonates
    const delay = ctx.createDelay(0.1);
    delay.delayTime.value = delayTime;
    // Averaging lowpass in the loop causes high freqs to decay faster (string damping)
    const loopFilter = ctx.createBiquadFilter();
    loopFilter.type = "lowpass";
    loopFilter.frequency.value = Math.min(freq * 9, ctx.sampleRate * 0.45);
    // Feedback gain < 1 → loop decays; set to 0 at note end to free nodes
    const loopGain = ctx.createGain();
    loopGain.gain.setValueAtTime(0.990, t);
    loopGain.gain.setValueAtTime(0, t + tail + 0.3);
    // Guitar body warmth
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = "peaking";
    bodyFilter.frequency.value = 260;
    bodyFilter.Q.value = 0.7;
    bodyFilter.gain.value = 5;
    const env = this._env(0.18);
    env.gain.setValueAtTime(velocity * 0.9, t);
    env.gain.exponentialRampToValueAtTime(velocity * 0.5, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.001, t + tail);
    // Graph: seed → delay → loopFilter → loopGain → delay (feedback!)
    //                                  → bodyFilter → env → master
    seed.connect(delay);
    delay.connect(loopFilter);
    loopFilter.connect(loopGain);
    loopGain.connect(delay); // the feedback loop
    loopFilter.connect(bodyFilter);
    bodyFilter.connect(env);
    seed.start(t);
    seed.stop(t + delayTime * 2); // only the initial noise burst
  }

  private _playBrass(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!;
    const t = startTime; const d = Math.max(duration, 0.15);
    const env = this._env(0.10); // brass is relatively dry
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(velocity * 0.9, t + 0.035);
    env.gain.linearRampToValueAtTime(velocity * 0.75, t + 0.08);
    env.gain.setValueAtTime(velocity * 0.75, t + Math.max(d - 0.08, 0.1));
    env.gain.linearRampToValueAtTime(0.001, t + d);
    const osc = ctx.createOscillator();
    osc.type = "sawtooth"; osc.frequency.value = freq;
    // Soft-clip waveshaper (tanh) — adds tube-like harmonic saturation
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    const k = Math.tanh(3);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 3) / k;
    }
    shaper.curve = curve;
    // Bright → dark lowpass sweep — the embouchure opening effect
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(freq * 14, 9000), t);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 3.5, 3500), t + 0.08);
    filter.Q.value = 1.2;
    osc.connect(shaper); shaper.connect(filter); filter.connect(env);
    osc.start(t); osc.stop(t + d + 0.05);
  }

  private _playOrgan(freq: number, velocity: number, duration: number, startTime: number): void {
    const ctx = this.context!;
    const t = startTime; const d = duration;
    const env = this._env(0.12);
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
    const ctx = this.context!;
    const t = startTime; const tail = Math.max(duration, 1.5); // bells ring long
    const env = this._env(0.45); // bells need generous reverb
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
