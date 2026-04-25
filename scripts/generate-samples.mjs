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

const generators = [
  ["kick.wav", generateKick],
  ["snare.wav", generateSnare],
  ["hat.wav", generateHat],
  ["clap.wav", generateClap],
  ["tom.wav", generateTom],
  ["perc.wav", generatePerc],
  ["bass.wav", generateBass],
  ["synth.wav", generateSynth],
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
