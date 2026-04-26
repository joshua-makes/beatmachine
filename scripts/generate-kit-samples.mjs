#!/usr/bin/env node
/**
 * Generates WAV files for the three alternate drum kits:
 *   public/samples/electronic/   — 808/909-style synth drums
 *   public/samples/lofi/         — dusty, warm, vinyl-flavoured kit
 *   public/samples/kids/         — bright, bouncy, toy-style sounds
 *
 * Each kit has the same 24 sample IDs as the default acoustic kit.
 * Run with:  node scripts/generate-kit-samples.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(__dirname, "../public/samples");
const SR = 22050; // sample rate

// ─── WAV writer ──────────────────────────────────────────────────────────────

function writeWav(folder, filename, samples) {
  const outDir = join(SAMPLES_DIR, folder);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);  // PCM
  buf.writeUInt16LE(1, 22);  // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  const outPath = join(outDir, filename);
  writeFileSync(outPath, buf);
  console.log(`  ${folder}/${filename}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** LCG pseudo-random noise (deterministic) */
function makeNoise(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0x100000000) * 2 - 1;
  };
}

/** ADSR envelope value at sample index i */
function adsr(i, n, attack, decay, sustain, release) {
  const t = i / SR;
  const total = n / SR;
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - ((t - attack) / decay) * (1 - sustain);
  if (t < total - release) return sustain;
  return sustain * Math.max(0, (total - t) / release);
}

/** Simple 1-pole low-pass filter state. Returns filtered value. */
function lp(x, prev, cutoff) {
  // cutoff 0..1 (fraction of Nyquist). 1 = no filter.
  const alpha = Math.min(1, cutoff * 2 * Math.PI / SR * SR);
  return prev + alpha * (x - prev);
}

/** Soft saturation */
const sat = (x, amount = 1) => Math.tanh(x * amount) / Math.tanh(amount);

// ─── ELECTRONIC KIT (808/909 style) ─────────────────────────────────────────

const EL = "electronic";

function elKick() {
  const n = Math.round(SR * 0.9);
  const s = new Float32Array(n);
  let phase = 0;
  const noise = makeNoise(1001);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Pitch: 200Hz → 40Hz over first 150ms (long sweep for 808 boom)
    const freq = 200 * Math.exp(-t * 14) + 40;
    phase += (2 * Math.PI * freq) / SR;
    const env = adsr(i, n, 0.001, 0.06, 0, 0.84);
    // Punch: short noise transient
    const punch = noise() * Math.exp(-t * 120) * 0.3;
    // Distort for weight
    s[i] = sat(Math.sin(phase) * env + punch, 2.5) * 0.88;
  }
  return s;
}

function elSnare() {
  const n = Math.round(SR * 0.28);
  const s = new Float32Array(n);
  const noise = makeNoise(1002);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Body: 900Hz ring, fast decay
    const freq = 900 * Math.exp(-t * 60) + 200;
    phase += (2 * Math.PI * freq) / SR;
    const ring = Math.sin(phase) * Math.exp(-t * 30) * 0.35;
    // Noise: tight, bright
    const no = noise() * Math.exp(-t * 14) * 0.65;
    const env = adsr(i, n, 0.001, 0.01, 0.05, 0.27);
    s[i] = (ring + no) * env * 0.9;
  }
  return s;
}

function elHat() {
  const n = Math.round(SR * 0.05);
  const s = new Float32Array(n);
  const noise = makeNoise(1003);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    // Double high-pass for metallic bite
    const hp1 = no - prev * 0.78; prev = no;
    s[i] = hp1 * Math.exp(-t * 80) * 0.75;
  }
  return s;
}

function elOpenHat() {
  const n = Math.round(SR * 0.45);
  const s = new Float32Array(n);
  const noise = makeNoise(1004);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp = no - prev * 0.78; prev = no;
    const env = adsr(i, n, 0.002, 0.04, 0.35, 0.41);
    s[i] = hp * env * 0.6;
  }
  return s;
}

function elClap() {
  // 808 clap: 3 staggered noise bursts
  const n = Math.round(SR * 0.3);
  const s = new Float32Array(n);
  const noise = makeNoise(1005);
  const offsets = [0, 0.006, 0.014]; // seconds
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const o of offsets) {
      if (t >= o) {
        const dt = t - o;
        v += noise() * Math.exp(-dt * 38) * (1 / offsets.length);
      }
    }
    const tail = noise() * Math.exp(-t * 10) * 0.2;
    s[i] = (v + tail) * 0.9;
  }
  return s;
}

function elSnap() {
  const n = Math.round(SR * 0.06);
  const s = new Float32Array(n);
  const noise = makeNoise(1006);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const click = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 150);
    s[i] = (noise() * 0.4 + click * 0.6) * Math.exp(-t * 100) * 0.85;
  }
  return s;
}

function elRimshot() {
  const n = Math.round(SR * 0.1);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 1600 * t) * 0.5
      + Math.sin(2 * Math.PI * 2400 * t) * 0.3;
    s[i] = v * Math.exp(-t * 70) * 0.8;
  }
  return s;
}

function elTom() {
  const n = Math.round(SR * 0.4);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 160 * Math.exp(-t * 16) + 60;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = sat(Math.sin(phase), 1.8) * adsr(i, n, 0.001, 0.02, 0.1, 0.38) * 0.85;
  }
  return s;
}

function elHiTom() {
  const n = Math.round(SR * 0.28);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 300 * Math.exp(-t * 20) + 140;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = sat(Math.sin(phase), 1.8) * adsr(i, n, 0.001, 0.015, 0.08, 0.26) * 0.85;
  }
  return s;
}

function elFloorTom() {
  const n = Math.round(SR * 0.6);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 80 * Math.exp(-t * 10) + 38;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = sat(Math.sin(phase), 2) * adsr(i, n, 0.001, 0.04, 0.05, 0.56) * 0.9;
  }
  return s;
}

function elConga() {
  const n = Math.round(SR * 0.35);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 360 * Math.exp(-t * 24) + 220;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.015, 0.05, 0.33) * 0.8;
  }
  return s;
}

function elShaker() {
  const n = Math.round(SR * 0.07);
  const s = new Float32Array(n);
  const noise = makeNoise(1007);
  let prev1 = 0, prev2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp1 = no - prev1 * 0.75; prev1 = no;
    const hp2 = hp1 - prev2 * 0.75; prev2 = hp1;
    s[i] = hp2 * Math.exp(-t * 90) * 0.55;
  }
  return s;
}

function elTambourine() {
  const n = Math.round(SR * 0.25);
  const s = new Float32Array(n);
  const noise = makeNoise(1008);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const jingle = (Math.sin(2 * Math.PI * 10000 * t) * 0.2
      + Math.sin(2 * Math.PI * 8000 * t) * 0.15) * Math.exp(-t * 8);
    const no = noise() * Math.exp(-t * 20) * 0.4;
    s[i] = (jingle + no) * 0.7;
  }
  return s;
}

function elWoodblock() {
  const n = Math.round(SR * 0.08);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 2000 * t) * 0.6
      + Math.sin(2 * Math.PI * 3200 * t) * 0.4) * Math.exp(-t * 80) * 0.8;
  }
  return s;
}

function elCowbell() {
  // Classic 808 cowbell: two square-ish tones at 562 and 845 Hz, long ring
  const n = Math.round(SR * 1.0);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = sat(Math.sin(2 * Math.PI * 562 * t), 4) * 0.55
      + sat(Math.sin(2 * Math.PI * 845 * t), 4) * 0.45;
    s[i] = v * adsr(i, n, 0.001, 0.01, 0.4, 0.99) * 0.7;
  }
  return s;
}

function elCrash() {
  const n = Math.round(SR * 1.0);
  const s = new Float32Array(n);
  const noise = makeNoise(1009);
  let prev1 = 0, prev2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp1 = no - prev1 * 0.55; prev1 = no;
    const hp2 = hp1 - prev2 * 0.45; prev2 = hp1;
    const metal = Math.sin(2 * Math.PI * 6800 * t) * 0.12 * Math.exp(-t * 8);
    s[i] = (hp2 * Math.exp(-t * 2.5) + metal) * 0.65;
  }
  return s;
}

function elRide() {
  const n = Math.round(SR * 0.7);
  const s = new Float32Array(n);
  const noise = makeNoise(1010);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp = no - prev * 0.72; prev = no;
    const tone = Math.sin(2 * Math.PI * 4200 * t) * 0.25 * Math.exp(-t * 6);
    s[i] = (hp * adsr(i, n, 0.001, 0.03, 0.3, 0.67) * 0.5 + tone) * 0.8;
  }
  return s;
}

function elPerc() {
  const n = Math.round(SR * 0.12);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 1200 * t) * 0.5
      + Math.sin(2 * Math.PI * 1800 * t) * 0.3
      + Math.sin(2 * Math.PI * 2400 * t) * 0.2) * Math.exp(-t * 55) * 0.8;
  }
  return s;
}

function elFx() {
  const n = Math.round(SR * 0.6);
  const s = new Float32Array(n);
  let phase = 0;
  const noise = makeNoise(1011);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 80 + t * 2400;
    phase += (2 * Math.PI * freq) / SR;
    const sweep = Math.sin(phase);
    const env = Math.exp(-t * 3) * (1 - Math.exp(-t * 25));
    s[i] = (sweep * 0.7 + noise() * 0.3) * env * 0.75;
  }
  return s;
}

function elLaser() {
  const n = Math.round(SR * 0.5);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 2400 * Math.exp(-t * 12) + 100;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = sat(Math.sin(phase), 3) * Math.exp(-t * 5) * 0.75;
  }
  return s;
}

function elSub() {
  const n = Math.round(SR * 0.85);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 60 * Math.exp(-t * 5) + 40;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.003, 0.04, 0, 0.81) * 0.95;
  }
  return s;
}

function elBass() {
  const n = Math.round(SR * 0.55);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Sawtooth via harmonic sum
    let v = 0;
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * 80 * h * t) / h;
    s[i] = sat(v * (2 / Math.PI), 2) * adsr(i, n, 0.005, 0.04, 0.5, 0.51) * 0.7;
  }
  return s;
}

function elChord() {
  const dur = 0.5;
  const n = Math.round(SR * dur);
  const s = new Float32Array(n);
  // Minor 7th — slightly darker than acoustic major
  const freqs = [130.81, 155.56, 195.99, 233.08]; // Cm7: C3 Eb3 G3 Bb3
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const f of freqs) {
      v += sat(Math.sin(2 * Math.PI * f * t), 2);
    }
    s[i] = (v / freqs.length) * adsr(i, n, 0.005, 0.03, 0.5, 0.47) * 0.55;
  }
  return s;
}

function elSynth() {
  const n = Math.round(SR * 0.4);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * 440 * h * t) / h;
    s[i] = sat(v * (2 / Math.PI), 1.5) * adsr(i, n, 0.01, 0.04, 0.4, 0.36) * 0.6;
  }
  return s;
}

// ─── LO-FI KIT ───────────────────────────────────────────────────────────────

const LF = "lofi";

/** Lo-fi texture: add very faint vinyl crackle to any sample */
function addCrackle(s, seed, amount = 0.012) {
  const noise = makeNoise(seed);
  for (let i = 0; i < s.length; i++) {
    s[i] = Math.max(-1, Math.min(1, s[i] + noise() * amount));
  }
  return s;
}

function lfKick() {
  const n = Math.round(SR * 0.5);
  const s = new Float32Array(n);
  let phase = 0;
  const noise = makeNoise(2001);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Warm, muffled — slower pitch sweep, less distortion
    const freq = 100 * Math.exp(-t * 12) + 50;
    phase += (2 * Math.PI * freq) / SR;
    const body = Math.sin(phase) * adsr(i, n, 0.002, 0.05, 0, 0.45);
    const thump = noise() * Math.exp(-t * 80) * 0.12; // subtle punch
    s[i] = sat(body + thump, 1.4) * 0.85;
  }
  return addCrackle(s, 2099);
}

function lfSnare() {
  const n = Math.round(SR * 0.32);
  const s = new Float32Array(n);
  const noise = makeNoise(2002);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Warm body + crispy noise
    const freq = 220 * Math.exp(-t * 18) + 160;
    phase += (2 * Math.PI * freq) / SR;
    const body = Math.sin(phase) * 0.4 * Math.exp(-t * 25);
    const no = noise() * Math.exp(-t * 16) * 0.55;
    s[i] = (body + no) * adsr(i, n, 0.001, 0.02, 0.08, 0.3) * 0.85;
  }
  return addCrackle(s, 2098);
}

function lfHat() {
  const n = Math.round(SR * 0.07);
  const s = new Float32Array(n);
  const noise = makeNoise(2003);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp = no - prev * 0.6; prev = no; // softer HP = warmer
    s[i] = hp * Math.exp(-t * 70) * 0.55;
  }
  return addCrackle(s, 2097);
}

function lfOpenHat() {
  const n = Math.round(SR * 0.4);
  const s = new Float32Array(n);
  const noise = makeNoise(2004);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp = no - prev * 0.6; prev = no;
    s[i] = hp * adsr(i, n, 0.002, 0.04, 0.3, 0.36) * 0.5;
  }
  return addCrackle(s, 2096);
}

function lfClap() {
  const n = Math.round(SR * 0.25);
  const s = new Float32Array(n);
  const noise = makeNoise(2005);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Single burst + slightly longer tail (room)
    const burst = noise() * Math.exp(-t * 35);
    const room = noise() * Math.exp(-t * 8) * 0.2;
    s[i] = (burst + room) * 0.82;
  }
  return addCrackle(s, 2095);
}

function lfSnap() {
  const n = Math.round(SR * 0.08);
  const s = new Float32Array(n);
  const noise = makeNoise(2006);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const mid = Math.sin(2 * Math.PI * 2000 * t) * 0.35;
    s[i] = (noise() * 0.65 + mid) * Math.exp(-t * 75) * 0.85;
  }
  return addCrackle(s, 2094);
}

function lfRimshot() {
  const n = Math.round(SR * 0.14);
  const s = new Float32Array(n);
  const noise = makeNoise(2007);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const click = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 60) * 0.55;
    const body = noise() * Math.exp(-t * 35) * 0.45;
    s[i] = (click + body) * 0.85;
  }
  return addCrackle(s, 2093);
}

function lfTom() {
  const n = Math.round(SR * 0.45);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 110 * Math.exp(-t * 9) + 65;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.03, 0.15, 0.42) * 0.85;
  }
  return addCrackle(s, 2092);
}

function lfHiTom() {
  const n = Math.round(SR * 0.32);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 220 * Math.exp(-t * 11) + 140;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.025, 0.1, 0.3) * 0.85;
  }
  return addCrackle(s, 2091);
}

function lfFloorTom() {
  const n = Math.round(SR * 0.6);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 70 * Math.exp(-t * 7) + 45;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.04, 0.1, 0.56) * 0.9;
  }
  return addCrackle(s, 2090);
}

function lfConga() {
  const n = Math.round(SR * 0.38);
  const s = new Float32Array(n);
  let phase = 0;
  const noise = makeNoise(2008);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 200 * Math.exp(-t * 13) + 160;
    phase += (2 * Math.PI * freq) / SR;
    const slap = noise() * Math.exp(-t * 100) * 0.3;
    s[i] = (Math.sin(phase) * 0.7 + slap) * adsr(i, n, 0.001, 0.025, 0.08, 0.35) * 0.8;
  }
  return addCrackle(s, 2089);
}

function lfShaker() {
  const n = Math.round(SR * 0.1);
  const s = new Float32Array(n);
  const noise = makeNoise(2009);
  let prev1 = 0, prev2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp1 = no - prev1 * 0.65; prev1 = no;
    const hp2 = hp1 - prev2 * 0.65; prev2 = hp1;
    s[i] = hp2 * adsr(i, n, 0.001, 0.01, 0.1, 0.09) * 0.5;
  }
  return addCrackle(s, 2088);
}

function lfTambourine() {
  const n = Math.round(SR * 0.35);
  const s = new Float32Array(n);
  const noise = makeNoise(2010);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const jingle = (Math.sin(2 * Math.PI * 7000 * t) * 0.2
      + Math.sin(2 * Math.PI * 9500 * t) * 0.15
      + Math.sin(2 * Math.PI * 5500 * t) * 0.15) * Math.exp(-t * 5);
    const no = noise();
    const hp = no - prev * 0.65; prev = no;
    s[i] = (hp * Math.exp(-t * 12) * 0.4 + jingle) * 0.7;
  }
  return addCrackle(s, 2087);
}

function lfWoodblock() {
  const n = Math.round(SR * 0.18);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 900 * t) * 0.6
      + Math.sin(2 * Math.PI * 1450 * t) * 0.4) * Math.exp(-t * 38) * 0.82;
  }
  return addCrackle(s, 2086);
}

function lfCowbell() {
  const n = Math.round(SR * 0.5);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 520 * t) * 0.55
      + Math.sin(2 * Math.PI * 780 * t) * 0.45;
    s[i] = v * adsr(i, n, 0.001, 0.02, 0.25, 0.48) * 0.6;
  }
  return addCrackle(s, 2085);
}

function lfCrash() {
  const n = Math.round(SR * 1.0);
  const s = new Float32Array(n);
  const noise = makeNoise(2011);
  let prev1 = 0, prev2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp1 = no - prev1 * 0.5; prev1 = no;
    const hp2 = hp1 - prev2 * 0.4; prev2 = hp1;
    s[i] = (hp2 * Math.exp(-t * 2.0)) * 0.6;
  }
  return addCrackle(s, 2084, 0.02);
}

function lfRide() {
  const n = Math.round(SR * 0.75);
  const s = new Float32Array(n);
  const noise = makeNoise(2012);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp = no - prev * 0.65; prev = no;
    const tone = Math.sin(2 * Math.PI * 3000 * t) * 0.22 * Math.exp(-t * 4);
    s[i] = (hp * adsr(i, n, 0.001, 0.03, 0.4, 0.72) * 0.45 + tone) * 0.75;
  }
  return addCrackle(s, 2083);
}

function lfPerc() {
  const n = Math.round(SR * 0.18);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 700 * t) * 0.4
      + Math.sin(2 * Math.PI * 1100 * t) * 0.35
      + Math.sin(2 * Math.PI * 1500 * t) * 0.25) * Math.exp(-t * 32) * 0.75;
  }
  return addCrackle(s, 2082);
}

function lfFx() {
  // Vinyl-scratch type effect: pitch wobble + noise
  const n = Math.round(SR * 0.55);
  const s = new Float32Array(n);
  const noise = makeNoise(2013);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wobble = Math.sin(2 * Math.PI * 7 * t) * 200;
    const freq = 300 + wobble;
    phase += (2 * Math.PI * Math.abs(freq)) / SR;
    const sweep = Math.sin(phase);
    const env = Math.exp(-t * 3) * (1 - Math.exp(-t * 20));
    s[i] = (sweep * 0.5 + noise() * 0.5) * env * 0.7;
  }
  return addCrackle(s, 2081, 0.02);
}

function lfLaser() {
  const n = Math.round(SR * 0.45);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 1200 * Math.exp(-t * 9) + 100;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * Math.exp(-t * 4) * 0.75;
  }
  return addCrackle(s, 2080);
}

function lfSub() {
  const n = Math.round(SR * 0.7);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 50 * Math.exp(-t * 5) + 38;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.004, 0.04, 0, 0.66) * 0.9;
  }
  return addCrackle(s, 2079);
}

function lfBass() {
  // Upright-style bass — rounded, warm tone
  const n = Math.round(SR * 0.65);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 90 * t) * 0.6
      + Math.sin(2 * Math.PI * 180 * t) * 0.3
      + Math.sin(2 * Math.PI * 270 * t) * 0.1;
    s[i] = sat(v, 1.3) * adsr(i, n, 0.008, 0.06, 0.6, 0.59) * 0.75;
  }
  return addCrackle(s, 2078);
}

function lfChord() {
  // Jazz maj7 voicing for a warm, nostalgic feel
  const n = Math.round(SR * 0.6);
  const s = new Float32Array(n);
  const freqs = [130.81, 164.81, 196.0, 246.94]; // Cmaj7: C3 E3 G3 B3
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const f of freqs) {
      v += Math.sin(2 * Math.PI * f * t) * 0.6
        + Math.sin(2 * Math.PI * f * 2 * t) * 0.25
        + Math.sin(2 * Math.PI * f * 3 * t) * 0.1;
    }
    s[i] = sat(v / freqs.length, 1.2) * adsr(i, n, 0.01, 0.05, 0.55, 0.55) * 0.45;
  }
  return addCrackle(s, 2077);
}

function lfSynth() {
  // Warm Rhodes-ish pad
  const n = Math.round(SR * 0.55);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 330 * t) * 0.6
      + Math.sin(2 * Math.PI * 660 * t) * 0.25
      + Math.sin(2 * Math.PI * 990 * t) * 0.1
      + Math.sin(2 * Math.PI * 329.5 * t) * 0.05; // slight detune
    s[i] = v * adsr(i, n, 0.015, 0.06, 0.5, 0.5) * 0.6;
  }
  return addCrackle(s, 2076);
}

// ─── KIDS KIT ────────────────────────────────────────────────────────────────

const KD = "kids";

/** Pitch wobble (vibrato) — makes sounds feel bouncy/toylike */
function boing(i, freq0, decay, wobbleFreq, wobbleAmt) {
  let phase = 0;
  const samples = [];
  for (let j = 0; j <= i; j++) {
    const t = j / SR;
    const wobble = 1 + Math.sin(2 * Math.PI * wobbleFreq * t) * wobbleAmt * Math.exp(-t * 8);
    const freq = (freq0 * Math.exp(-t * decay) + freq0 * 0.25) * wobble;
    phase += (2 * Math.PI * freq) / SR;
    samples.push(phase);
  }
  return phase;
}

function kidsKick() {
  // "Boing" — lower sine with a springy pitch wobble
  const n = Math.round(SR * 0.55);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wobble = 1 + Math.sin(2 * Math.PI * 6 * t) * 0.06 * Math.exp(-t * 10);
    const freq = (90 * Math.exp(-t * 12) + 40) * wobble;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.03, 0.0, 0.52) * 0.88;
  }
  return s;
}

function kidsSnare() {
  // High "tap tap" — thin snare, higher pitched
  const n = Math.round(SR * 0.18);
  const s = new Float32Array(n);
  const noise = makeNoise(3002);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const body = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 40) * 0.35;
    const no = noise() * Math.exp(-t * 20) * 0.65;
    s[i] = (body + no) * adsr(i, n, 0.001, 0.01, 0.04, 0.17) * 0.82;
  }
  return s;
}

function kidsHat() {
  // "Ting" — bright high ping
  const n = Math.round(SR * 0.09);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 6000 * t) * 0.6
      + Math.sin(2 * Math.PI * 8400 * t) * 0.4) * Math.exp(-t * 60) * 0.7;
  }
  return s;
}

function kidsOpenHat() {
  // Sustained "tiiing"
  const n = Math.round(SR * 0.35);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 5800 * t) * 0.55
      + Math.sin(2 * Math.PI * 8000 * t) * 0.45) * adsr(i, n, 0.002, 0.03, 0.4, 0.32) * 0.65;
  }
  return s;
}

function kidsClap() {
  // High cartoon clap
  const n = Math.round(SR * 0.15);
  const s = new Float32Array(n);
  const noise = makeNoise(3005);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const body = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 50) * 0.3;
    s[i] = (noise() * 0.7 + body) * Math.exp(-t * 28) * 0.82;
  }
  return s;
}

function kidsSnap() {
  // "Click-clack" toy snap
  const n = Math.round(SR * 0.06);
  const s = new Float32Array(n);
  const noise = makeNoise(3006);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const click = Math.sin(2 * Math.PI * 4000 * t) * Math.exp(-t * 200) * 0.6;
    s[i] = (noise() * 0.4 + click) * Math.exp(-t * 110) * 0.88;
  }
  return s;
}

function kidsRimshot() {
  // Toy wood block rimshot
  const n = Math.round(SR * 0.1);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 1800 * t) * 0.55
      + Math.sin(2 * Math.PI * 2800 * t) * 0.45) * Math.exp(-t * 70) * 0.8;
  }
  return s;
}

function kidsTom() {
  // "Boing" mid
  const n = Math.round(SR * 0.45);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wobble = 1 + Math.sin(2 * Math.PI * 5 * t) * 0.04 * Math.exp(-t * 8);
    const freq = (180 * Math.exp(-t * 10) + 80) * wobble;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.025, 0.05, 0.42) * 0.85;
  }
  return s;
}

function kidsHiTom() {
  const n = Math.round(SR * 0.3);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wobble = 1 + Math.sin(2 * Math.PI * 6 * t) * 0.05 * Math.exp(-t * 9);
    const freq = (320 * Math.exp(-t * 13) + 160) * wobble;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.02, 0.04, 0.28) * 0.85;
  }
  return s;
}

function kidsFloorTom() {
  const n = Math.round(SR * 0.55);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wobble = 1 + Math.sin(2 * Math.PI * 4 * t) * 0.04 * Math.exp(-t * 6);
    const freq = (80 * Math.exp(-t * 8) + 38) * wobble;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.03, 0.03, 0.52) * 0.88;
  }
  return s;
}

function kidsConga() {
  const n = Math.round(SR * 0.3);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 280 * Math.exp(-t * 15) + 200;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.001, 0.02, 0.05, 0.28) * 0.82;
  }
  return s;
}

function kidsShaker() {
  // Toy shaker — higher pitch
  const n = Math.round(SR * 0.08);
  const s = new Float32Array(n);
  const noise = makeNoise(3009);
  let prev1 = 0, prev2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const no = noise();
    const hp1 = no - prev1 * 0.6; prev1 = no;
    const hp2 = hp1 - prev2 * 0.6; prev2 = hp1;
    // Add a bright ping overtone
    const ping = Math.sin(2 * Math.PI * 5000 * t) * Math.exp(-t * 120) * 0.3;
    s[i] = (hp2 * Math.exp(-t * 95) * 0.7 + ping) * 0.6;
  }
  return s;
}

function kidsTambourine() {
  const n = Math.round(SR * 0.3);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // Jingle bells style — multiple bright tones
    const jingle = Math.sin(2 * Math.PI * 4200 * t) * 0.3
      + Math.sin(2 * Math.PI * 5600 * t) * 0.25
      + Math.sin(2 * Math.PI * 7000 * t) * 0.2
      + Math.sin(2 * Math.PI * 8400 * t) * 0.15;
    s[i] = jingle * Math.exp(-t * 7) * 0.65;
  }
  return s;
}

function kidsWoodblock() {
  // "Tok tok" — higher and slightly ring-ier
  const n = Math.round(SR * 0.12);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 1800 * t) * 0.55
      + Math.sin(2 * Math.PI * 2900 * t) * 0.45) * Math.exp(-t * 52) * 0.8;
  }
  return s;
}

function kidsCowbell() {
  // "Ding dong" — pure bell-like tones, child-friendly
  const n = Math.round(SR * 0.75);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 880 * t) * 0.55
      + Math.sin(2 * Math.PI * 1320 * t) * 0.3
      + Math.sin(2 * Math.PI * 1760 * t) * 0.15;
    s[i] = v * adsr(i, n, 0.001, 0.01, 0.5, 0.74) * 0.7;
  }
  return s;
}

function kidsCrash() {
  // Cartoon "crash boom" — descending noise + low thud
  const n = Math.round(SR * 0.8);
  const s = new Float32Array(n);
  const noise = makeNoise(3011);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 2000 * Math.exp(-t * 10) + 60;
    phase += (2 * Math.PI * freq) / SR;
    const tone = Math.sin(phase) * Math.exp(-t * 5) * 0.4;
    const no = noise() * Math.exp(-t * 4) * 0.5;
    s[i] = (tone + no) * 0.7;
  }
  return s;
}

function kidsRide() {
  // "Ding" bell tone
  const n = Math.round(SR * 0.6);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 2200 * t) * 0.5
      + Math.sin(2 * Math.PI * 3300 * t) * 0.3
      + Math.sin(2 * Math.PI * 4400 * t) * 0.2) * adsr(i, n, 0.001, 0.02, 0.5, 0.58) * 0.68;
  }
  return s;
}

function kidsPerc() {
  // "Pip" — very short high tone
  const n = Math.round(SR * 0.1);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (Math.sin(2 * Math.PI * 1400 * t) * 0.55
      + Math.sin(2 * Math.PI * 2100 * t) * 0.45) * Math.exp(-t * 65) * 0.78;
  }
  return s;
}

function kidsFx() {
  // "Wheee!" — upward cartoon sweep
  const n = Math.round(SR * 0.5);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 200 + t * t * 4000;
    phase += (2 * Math.PI * freq) / SR;
    const env = Math.exp(-t * 2) * (1 - Math.exp(-t * 20));
    s[i] = Math.sin(phase) * env * 0.78;
  }
  return s;
}

function kidsLaser() {
  // "Pew pew" — quick downward sweep with bounce
  const n = Math.round(SR * 0.35);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 1800 * Math.exp(-t * 14) + 200;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * Math.exp(-t * 6) * 0.8;
  }
  return s;
}

function kidsSub() {
  // "Wub" — cartoon sub bass wobble
  const n = Math.round(SR * 0.6);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wobble = 1 + Math.sin(2 * Math.PI * 8 * t) * 0.1 * Math.exp(-t * 6);
    const freq = (65 * Math.exp(-t * 5) + 40) * wobble;
    phase += (2 * Math.PI * freq) / SR;
    s[i] = Math.sin(phase) * adsr(i, n, 0.003, 0.04, 0.0, 0.56) * 0.9;
  }
  return s;
}

function kidsBass() {
  // "Bwop" — cartoon bass stab
  const n = Math.round(SR * 0.5);
  const s = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 140 * Math.exp(-t * 7) + 70;
    phase += (2 * Math.PI * freq) / SR;
    const v = Math.sin(phase) * 0.6 + Math.sin(phase * 2) * 0.3;
    s[i] = sat(v, 1.8) * adsr(i, n, 0.005, 0.03, 0.3, 0.46) * 0.75;
  }
  return s;
}

function kidsChord() {
  // Toy piano — higher octave major chord
  const n = Math.round(SR * 0.5);
  const s = new Float32Array(n);
  const freqs = [523.25, 659.25, 783.99]; // C5 E5 G5
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const f of freqs) {
      // Bell-like partial emphasis
      v += Math.sin(2 * Math.PI * f * t) * 0.6
        + Math.sin(2 * Math.PI * f * 2 * t) * 0.2
        + Math.sin(2 * Math.PI * f * 3.5 * t) * 0.1 * Math.exp(-t * 8);
    }
    s[i] = (v / freqs.length) * adsr(i, n, 0.002, 0.03, 0.5, 0.47) * 0.5;
  }
  return s;
}

function kidsSynth() {
  // Toy xylophone-style hit
  const n = Math.round(SR * 0.4);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.sin(2 * Math.PI * 880 * t) * 0.55
      + Math.sin(2 * Math.PI * 880 * 2 * t) * 0.25
      + Math.sin(2 * Math.PI * 880 * 3 * t) * 0.1;
    s[i] = v * adsr(i, n, 0.001, 0.02, 0.3, 0.38) * 0.68;
  }
  return s;
}

// ─── Manifest ────────────────────────────────────────────────────────────────

const KITS = [
  {
    folder: EL,
    samples: [
      ["kick.wav", elKick], ["snare.wav", elSnare], ["hat.wav", elHat],
      ["open-hat.wav", elOpenHat], ["crash.wav", elCrash], ["ride.wav", elRide],
      ["clap.wav", elClap], ["snap.wav", elSnap], ["rimshot.wav", elRimshot],
      ["tom.wav", elTom], ["hi-tom.wav", elHiTom], ["floor-tom.wav", elFloorTom],
      ["conga.wav", elConga], ["shaker.wav", elShaker], ["tambourine.wav", elTambourine],
      ["woodblock.wav", elWoodblock], ["cowbell.wav", elCowbell], ["perc.wav", elPerc],
      ["fx.wav", elFx], ["laser.wav", elLaser], ["sub.wav", elSub],
      ["bass.wav", elBass], ["chord.wav", elChord], ["synth.wav", elSynth],
    ],
  },
  {
    folder: LF,
    samples: [
      ["kick.wav", lfKick], ["snare.wav", lfSnare], ["hat.wav", lfHat],
      ["open-hat.wav", lfOpenHat], ["crash.wav", lfCrash], ["ride.wav", lfRide],
      ["clap.wav", lfClap], ["snap.wav", lfSnap], ["rimshot.wav", lfRimshot],
      ["tom.wav", lfTom], ["hi-tom.wav", lfHiTom], ["floor-tom.wav", lfFloorTom],
      ["conga.wav", lfConga], ["shaker.wav", lfShaker], ["tambourine.wav", lfTambourine],
      ["woodblock.wav", lfWoodblock], ["cowbell.wav", lfCowbell], ["perc.wav", lfPerc],
      ["fx.wav", lfFx], ["laser.wav", lfLaser], ["sub.wav", lfSub],
      ["bass.wav", lfBass], ["chord.wav", lfChord], ["synth.wav", lfSynth],
    ],
  },
  {
    folder: KD,
    samples: [
      ["kick.wav", kidsKick], ["snare.wav", kidsSnare], ["hat.wav", kidsHat],
      ["open-hat.wav", kidsOpenHat], ["crash.wav", kidsCrash], ["ride.wav", kidsRide],
      ["clap.wav", kidsClap], ["snap.wav", kidsSnap], ["rimshot.wav", kidsRimshot],
      ["tom.wav", kidsTom], ["hi-tom.wav", kidsHiTom], ["floor-tom.wav", kidsFloorTom],
      ["conga.wav", kidsConga], ["shaker.wav", kidsShaker], ["tambourine.wav", kidsTambourine],
      ["woodblock.wav", kidsWoodblock], ["cowbell.wav", kidsCowbell], ["perc.wav", kidsPerc],
      ["fx.wav", kidsFx], ["laser.wav", kidsLaser], ["sub.wav", kidsSub],
      ["bass.wav", kidsBass], ["chord.wav", kidsChord], ["synth.wav", kidsSynth],
    ],
  },
];

// ─── Generate ────────────────────────────────────────────────────────────────

let total = 0;
for (const kit of KITS) {
  console.log(`\n🎵 Generating kit: ${kit.folder}/`);
  for (const [filename, gen] of kit.samples) {
    writeWav(kit.folder, filename, gen());
    total++;
  }
}
console.log(`\n✅ Done — generated ${total} samples across ${KITS.length} kits.`);
