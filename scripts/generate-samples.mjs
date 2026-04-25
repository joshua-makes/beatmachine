#!/usr/bin/env node
/**
 * Deterministic sample generator – produces 8 short WAV files in public/samples/.
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/samples");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 22050;

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2;
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }

  writeFileSync(join(OUT_DIR, filename), buf);
  console.log(`Generated: ${filename}`);
}

function env(attack, decay, sustain, release, totalSamples) {
  return (i) => {
    const t = i / SAMPLE_RATE;
    const totalDur = totalSamples / SAMPLE_RATE;
    if (t < attack) return t / attack;
    if (t < attack + decay) return 1 - ((t - attack) / decay) * (1 - sustain);
    if (t < totalDur - release) return sustain;
    return sustain * ((totalDur - t) / release);
  };
}

function generateKick() {
  const dur = 0.5;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.05, 0, 0.45, n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const freq = 150 * Math.exp(-i / SAMPLE_RATE * 20) + 40;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    samples[i] = Math.sin(phase) * adsr(i) * 0.9;
  }
  return samples;
}

function generateSnare() {
  const dur = 0.3;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.02, 0.1, 0.28, n);
  let seed = 42;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const tone = Math.sin(2 * Math.PI * 200 * i / SAMPLE_RATE);
    samples[i] = (noise * 0.7 + tone * 0.3) * adsr(i) * 0.9;
  }
  return samples;
}

function generateHat() {
  const dur = 0.1;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.005, 0.3, 0.09, n);
  let seed = 123;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const hp = noise - prev;
    prev = noise;
    samples[i] = hp * adsr(i) * 0.7;
  }
  return samples;
}

function generateClap() {
  const dur = 0.2;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  let seed = 555;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const t = i / SAMPLE_RATE;
    const env1 = Math.exp(-t * 40);
    const env2 = Math.exp(-(t - 0.01) * 30) * (t > 0.01 ? 1 : 0);
    samples[i] = noise * (env1 * 0.5 + env2 * 0.5) * 0.9;
  }
  return samples;
}

function generateTom() {
  const dur = 0.4;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.03, 0.2, 0.37, n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const freq = 120 * Math.exp(-i / SAMPLE_RATE * 8) + 60;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    samples[i] = Math.sin(phase) * adsr(i) * 0.85;
  }
  return samples;
}

function generatePerc() {
  const dur = 0.15;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.02, 0.1, 0.13, n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const v = Math.sin(2 * Math.PI * 800 * t) * 0.4
      + Math.sin(2 * Math.PI * 1200 * t) * 0.3
      + Math.sin(2 * Math.PI * 1600 * t) * 0.2
      + Math.sin(2 * Math.PI * 2000 * t) * 0.1;
    samples[i] = v * adsr(i) * 0.8;
  }
  return samples;
}

function generateBass() {
  const dur = 0.6;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.005, 0.05, 0.6, 0.5, n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const v = Math.sin(2 * Math.PI * 80 * t);
    const distorted = Math.tanh(v * 2) * 0.5;
    samples[i] = distorted * adsr(i) * 0.85;
  }
  return samples;
}

function generateSynth() {
  const dur = 0.4;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.01, 0.05, 0.5, 0.35, n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (let h = 1; h <= 8; h++) {
      v += Math.sin(2 * Math.PI * 440 * h * t) / h;
    }
    v = (2 / Math.PI) * v;
    samples[i] = v * adsr(i) * 0.6;
  }
  return samples;
}

function generateOpenHat() {
  const dur = 0.35;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.02, 0.4, 0.33, n);
  let seed = 456;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const hp = noise - prev * 0.85;
    prev = noise;
    samples[i] = hp * adsr(i) * 0.6;
  }
  return samples;
}

function generateRimshot() {
  const dur = 0.12;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  let seed = 789;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const t = i / SAMPLE_RATE;
    const click = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 80);
    const body = noise * Math.exp(-t * 40) * 0.4;
    samples[i] = (click + body) * 0.9;
  }
  return samples;
}

function generateShaker() {
  const dur = 0.08;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.01, 0.1, 0.07, n);
  let seed = 321;
  let prev1 = 0, prev2 = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const hp1 = noise - prev1;
    const hp2 = hp1 - prev2;
    prev1 = noise; prev2 = hp1;
    samples[i] = hp2 * adsr(i) * 0.55;
  }
  return samples;
}

function generateCowbell() {
  const dur = 0.6;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.02, 0.3, 0.58, n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const v = Math.sin(2 * Math.PI * 562 * t) * 0.6
      + Math.sin(2 * Math.PI * 845 * t) * 0.4;
    const ring = Math.sin(2 * Math.PI * 3370 * t) * 0.15 * Math.exp(-t * 8);
    samples[i] = (v + ring) * adsr(i) * 0.7;
  }
  return samples;
}

function generateSub() {
  const dur = 0.7;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.003, 0.04, 0.0, 0.66, n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const freq = 55 * Math.exp(-i / SAMPLE_RATE * 6) + 40;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    samples[i] = Math.sin(phase) * adsr(i) * 0.95;
  }
  return samples;
}

function generateChord() {
  const dur = 0.5;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.005, 0.04, 0.5, 0.45, n);
  const freqs = [261.63, 329.63, 392.0]; // C4, E4, G4
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (const f of freqs) {
      let s = 0;
      for (let h = 1; h <= 4; h++) s += Math.sin(2 * Math.PI * f * h * t) / h;
      v += (2 / Math.PI) * s;
    }
    samples[i] = (v / freqs.length) * adsr(i) * 0.5;
  }
  return samples;
}

function generateFx() {
  const dur = 0.5;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  let seed = 999;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const t = i / SAMPLE_RATE;
    const sweep = Math.sin(2 * Math.PI * (200 + t * 1800) * t);
    const env1 = Math.exp(-t * 4) * (1 - Math.exp(-t * 30));
    samples[i] = (sweep * 0.6 + noise * 0.4) * env1 * 0.8;
  }
  return samples;
}

function generateRide() {
  const dur = 0.8;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.03, 0.5, 0.77, n);
  let seed = 777;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const hp = noise - prev * 0.7;
    prev = noise;
    const t = i / SAMPLE_RATE;
    const tone = Math.sin(2 * Math.PI * 3400 * t) * 0.2 * Math.exp(-t * 5);
    samples[i] = (hp * 0.8 + tone) * adsr(i) * 0.55;
  }
  return samples;
}

// ── NEW SAMPLES ──────────────────────────────────────────────────────────────

function generateCrash() {
  const dur = 1.2;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  let seed = 11111;
  let prev1 = 0, prev2 = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const hp1 = noise - prev1 * 0.55;
    const hp2 = hp1 - prev2 * 0.45;
    prev1 = noise; prev2 = hp1;
    const t = i / SAMPLE_RATE;
    const attack = Math.exp(-t * 5) * 0.65;
    const sustain = Math.exp(-t * 1.8) * 0.35;
    const metal = (Math.sin(2 * Math.PI * 7200 * t) * 0.12 + Math.sin(2 * Math.PI * 5400 * t) * 0.1) * Math.exp(-t * 6);
    samples[i] = (hp2 * (attack + sustain) + metal) * 0.7;
  }
  return samples;
}

function generateConga() {
  const dur = 0.35;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.025, 0.1, 0.32, n);
  let seed = 22222;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const freq = 220 * Math.exp(-i / SAMPLE_RATE * 14) + 180;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const slap = noise * Math.exp(-i / SAMPLE_RATE * 120) * 0.35;
    samples[i] = (Math.sin(phase) * 0.65 + slap) * adsr(i) * 0.85;
  }
  return samples;
}

function generateSnap() {
  const dur = 0.07;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  let seed = 33333;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const t = i / SAMPLE_RATE;
    const mid = Math.sin(2 * Math.PI * 3200 * t) * 0.3;
    samples[i] = (noise * 0.7 + mid) * Math.exp(-t * 90) * 0.9;
  }
  return samples;
}

function generateWoodblock() {
  const dur = 0.15;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const v = Math.sin(2 * Math.PI * 1200 * t) * 0.6
            + Math.sin(2 * Math.PI * 1950 * t) * 0.4;
    samples[i] = v * Math.exp(-t * 42) * 0.85;
  }
  return samples;
}

function generateTambourine() {
  const dur = 0.35;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  let seed = 44444;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    const t = i / SAMPLE_RATE;
    const jingle = (Math.sin(2 * Math.PI * 8000 * t) * 0.2
                  + Math.sin(2 * Math.PI * 11000 * t) * 0.15
                  + Math.sin(2 * Math.PI * 6500 * t) * 0.15) * Math.exp(-t * 4);
    const hp = noise - prev * 0.7;
    prev = noise;
    samples[i] = (hp * Math.exp(-t * 12) * 0.5 + jingle) * 0.75;
  }
  return samples;
}

function generateHiTom() {
  const dur = 0.3;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.02, 0.1, 0.28, n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const freq = 260 * Math.exp(-i / SAMPLE_RATE * 10) + 190;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    samples[i] = Math.sin(phase) * adsr(i) * 0.85;
  }
  return samples;
}

function generateFloorTom() {
  const dur = 0.55;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const adsr = env(0.001, 0.04, 0.12, 0.51, n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const freq = 78 * Math.exp(-i / SAMPLE_RATE * 7) + 48;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    samples[i] = Math.sin(phase) * adsr(i) * 0.9;
  }
  return samples;
}

function generateLaser() {
  const dur = 0.4;
  const n = Math.round(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 1600 * Math.exp(-t * 10) + 120;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    samples[i] = Math.sin(phase) * Math.exp(-t * 4) * 0.8;
  }
  return samples;
}

const generators = [
  ["kick.wav",       generateKick],
  ["snare.wav",      generateSnare],
  ["hat.wav",        generateHat],
  ["clap.wav",       generateClap],
  ["tom.wav",        generateTom],
  ["perc.wav",       generatePerc],
  ["bass.wav",       generateBass],
  ["synth.wav",      generateSynth],
  ["open-hat.wav",   generateOpenHat],
  ["rimshot.wav",    generateRimshot],
  ["shaker.wav",     generateShaker],
  ["cowbell.wav",    generateCowbell],
  ["sub.wav",        generateSub],
  ["chord.wav",      generateChord],
  ["fx.wav",         generateFx],
  ["ride.wav",       generateRide],
  // New samples
  ["crash.wav",      generateCrash],
  ["conga.wav",      generateConga],
  ["snap.wav",       generateSnap],
  ["woodblock.wav",  generateWoodblock],
  ["tambourine.wav", generateTambourine],
  ["hi-tom.wav",     generateHiTom],
  ["floor-tom.wav",  generateFloorTom],
  ["laser.wav",      generateLaser],
];

for (const [filename, gen] of generators) {
  const outPath = join(OUT_DIR, filename);
  if (!existsSync(outPath)) {
    writeWav(filename, gen());
  } else {
    console.log(`Exists: ${filename}`);
  }
}

console.log("Sample generation complete.");
