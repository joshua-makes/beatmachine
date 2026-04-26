"use client";
import React from "react";
import { type Pattern, type InstrumentSection, SECTION_COLORS } from "@/lib/pattern";
import { Tooltip } from "@/components/ui/Tooltip";

// ── helpers ───────────────────────────────────────────────────────────────────
type StepStr = string; // "X" = on, "." = off
function s(str: StepStr): boolean[] {
  return str.split("").map((c) => c !== ".");
}

// Convert note name ("C4", "F#3", "Ab2" …) to MIDI number (C4 = 60)
const MIDI_NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(name: string): number {
  const m = name.match(/^([A-G])(#|b)?(-?\d)$/);
  if (!m) return 60;
  return (parseInt(m[3]) + 1) * 12 + MIDI_NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

// Drum track def
interface DrumTrackDef  { sampleId: string; steps: StepStr; vol?: number; }
// Melody track: noteSeq entries are "C4" | null, durations in steps (1=1/16th, 2=1/8th, 4=1/4 etc)
interface MelodyTrackDef {
  type: "melody";
  noteSeq: (string | null)[];
  durations?: (number | null)[];
  voice?: string;
  vol?: number;
  name?: string;
}
type TrackDef = DrumTrackDef | MelodyTrackDef;

function makePattern(
  bpm: number,
  tracks: TrackDef[],
  stepCount: 8 | 16 | 32 | 64 = 16,
): Pick<Pattern, "bpm" | "stepCount" | "sections"> {
  const drumDefs   = tracks.filter((t): t is DrumTrackDef   => !("type" in t));
  const melodyDefs = tracks.filter((t): t is MelodyTrackDef => "type" in t && t.type === "melody");

  const drumTracks = drumDefs.map((d, i) => ({
    id: `preset-d${i}`, sampleId: d.sampleId, type: "drum" as const,
    vol: d.vol ?? 0.8, mute: false, solo: false,
    steps: s(d.steps),
    notes: Array(stepCount).fill(null) as (number | null)[],
    velocity: Array(stepCount).fill(1) as number[],
    probability: Array(stepCount).fill(1) as number[],
  }));

  const pianoTracks = melodyDefs.map((m, i) => {
    const notes = m.noteSeq.map((n) => (n !== null ? noteToMidi(n) : null));
    const steps = m.noteSeq.map((n) => n !== null);
    const durs  = m.durations
      ? m.durations.map((d) => d ?? 1)
      : Array(m.noteSeq.length).fill(1) as number[];
    return {
      id: `preset-m${i}`,
      name: m.name,
      sampleId: "synth",
      type: "melody" as const,
      voice: m.voice ?? "piano",
      vol: m.vol ?? 0.75,
      mute: false, solo: false,
      steps, notes,
      velocity: Array(m.noteSeq.length).fill(1) as number[],
      probability: Array(m.noteSeq.length).fill(1) as number[],
      durations: durs,
    };
  });

  // Ensure at least one track of each type
  if (drumTracks.length === 0) {
    drumTracks.push({
      id: "preset-d-kick", sampleId: "kick", type: "drum" as const,
      vol: 0.8, mute: false, solo: false,
      steps: Array(stepCount).fill(false) as boolean[],
      notes: Array(stepCount).fill(null) as (number | null)[],
      velocity: Array(stepCount).fill(1) as number[],
      probability: Array(stepCount).fill(1) as number[],
    });
  }
  if (pianoTracks.length === 0) {
    pianoTracks.push({
      id: "preset-m-synth", sampleId: "synth", type: "melody" as const,
      name: undefined,
      voice: "piano", vol: 0.75, mute: false, solo: false,
      steps: Array(stepCount).fill(false) as boolean[],
      notes: Array(stepCount).fill(null) as (number | null)[],
      velocity: Array(stepCount).fill(1) as number[],
      probability: Array(stepCount).fill(1) as number[],
      durations: Array(stepCount).fill(1) as number[],
    });
  }

  const sections: InstrumentSection[] = [
    {
      id: "section-drums", type: "drums", name: "Drums",
      color: SECTION_COLORS.drums, vol: 1, mute: false, solo: false,
      tracks: drumTracks,
    },
    {
      id: "section-melody", type: "piano", name: "Melody",
      color: SECTION_COLORS.piano, vol: 1, mute: false, solo: false,
      tracks: pianoTracks,
    },
  ];

  return { bpm, stepCount, sections };
}

// ── Song showcase definitions ─────────────────────────────────────────────────
// All melodies are either public domain (pre-1928) or original educational
// patterns written in a genre style. Not direct copies of copyrighted works.
interface SongDef {
  label: string;
  artist: string;
  emoji: string;
  description: string;
  bpm: number;
  stepCount: 8 | 16 | 32 | 64;
  tracks: TrackDef[];
}

const SONG_GROOVES: SongDef[] = [
  // ── PUBLIC DOMAIN ────────────────────────────────────────────────────────
  {
    // Beethoven 9th, 4th movement (1824) — public domain.
    // E-E-F-G | G-F-E-D | C-C-D-E | E(dotted)-D-D
    label: "Ode to Joy",
    artist: "Beethoven",
    emoji: "🎶",
    description: "Beethoven's famous chorus — quarter notes, strings voice",
    bpm: 104,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "violin", vol: 0.82, name: "Strings",
        noteSeq:  ["E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","E4","D4","D4",null,
                   "E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","D4","C4","C4",null],
        durations:[  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  3,  1,  4, null,
                     2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  4, null],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.62 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.58 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.26 },
    ],
  },
  {
    // Beethoven "Für Elise" opening theme (1810) — public domain.
    label: "Für Elise",
    artist: "Beethoven",
    emoji: "🌹",
    description: "Beethoven's iconic piano piece — the opening theme",
    bpm: 138,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "piano", vol: 0.80, name: "Piano",
        noteSeq:  ["E5","Eb5","E5","Eb5","E5","B4","D5","C5","A4",null,"C4","E4","A4",null,"B4",null,
                   "E4","Ab4","B4","C5", null,null,null,null,"E5","Eb5","E5","Eb5","E5","B4","D5","C5"],
        durations:[  1,   1,  1,   1,  1,  1,  1,  1,  4, null,  1,  1,  4, null,  4, null,
                     1,   1,  1,  8, null,null,null,null,  1,   1,  1,   1,  1,  1,  1,  1],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.52 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.48 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.20 },
    ],
  },
  {
    // "Twinkle Twinkle" — French tune (1761), public domain.
    label: "Twinkle Twinkle",
    artist: "Traditional",
    emoji: "⭐",
    description: "Classic nursery melody — bells voice, quarter notes",
    bpm: 96,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "bell", vol: 0.80, name: "Bells",
        noteSeq:  ["C4","C4","G4","G4","A4","A4","G4",null,"F4","F4","E4","E4","D4","D4","C4",null,
                   "G4","G4","F4","F4","E4","E4","D4",null,"G4","G4","F4","F4","E4","E4","D4",null],
        durations:[  2,  2,  2,  2,  2,  2,  4, null,  2,  2,  2,  2,  2,  2,  4, null,
                     2,  2,  2,  2,  2,  2,  4, null,  2,  2,  2,  2,  2,  2,  4, null],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.62 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.58 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.28 },
    ],
  },
  {
    // "Happy Birthday" — Hill sisters (1893), public domain.
    label: "Happy Birthday",
    artist: "Traditional",
    emoji: "🎂",
    description: "All 4 phrases — bells voice, dotted-quarter feel",
    bpm: 92,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "bell", vol: 0.82, name: "Bells",
        noteSeq:  ["G4","G4","A4",null,"G4","C5","B4",null,
                   "G4","G4","A4",null,"G4","D5","C5",null,
                   "G4","G4","G5","E4","C5","B4","A4",null,
                   "F4","F4","E4",null,"C5","D5","C5",null],
        durations:[  1,  1,  2, null,  2,  2,  4, null,
                     1,  1,  2, null,  2,  2,  4, null,
                     1,  1,  2,  2,   2,  2,  4, null,
                     1,  1,  2, null,  2,  2,  4, null],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.65 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.60 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.26 },
    ],
  },
  {
    // "Mary Had a Little Lamb" — public domain.
    label: "Mary Had a Lamb",
    artist: "Traditional",
    emoji: "🐑",
    description: "Only 3 notes — E, D, C. Perfect for beginners. Flute voice.",
    bpm: 100,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "flute", vol: 0.80, name: "Flute",
        noteSeq:  ["E4","D4","C4","D4","E4","E4","E4",null,"D4","D4","D4",null,"E4","G4","G4",null,
                   "E4","D4","C4","D4","E4","E4","E4","E4","D4","D4","E4","D4","C4",null,null,null],
        durations:[  2,  2,  2,  2,  2,  2,  4, null,  2,  2,  4, null,  2,  2,  4, null,
                     2,  2,  2,  2,  2,  2,  2,  2,   2,  2,  2,  2,   4, null,null,null],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.62 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.58 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.26 },
    ],
  },
  // ── GENRE PATTERNS ───────────────────────────────────────────────────────
  // Original educational patterns in a genre style — not copies of any song.
  {
    // Blues rock — pentatonic minor riff, guitar voice
    label: "Blues Rock",
    artist: "Genre",
    emoji: "🎸",
    description: "Pentatonic minor guitar riff — classic blues/rock feel",
    bpm: 100,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "guitar", vol: 0.82, name: "Guitar",
        noteSeq:  ["A2","A2","C3","D3","Eb3","D3","C3","A2","A2","A2","C3","D3","E3","G3","E3","A3",
                   "D3","D3","F3","G3","Ab3","G3","F3","D3","A2","A2","C3","D3","E3",null,null,null],
        durations:[  1,  1,  1,  1,   1,  1,  1,  2,  1,  1,  1,  1,  1,  1,  4, null,
                     1,  1,  1,  1,   1,  1,  1,  2,  1,  1,  1,  1,  4, null,null,null],
      },
      { sampleId: "kick",      steps: "X...X.X.....X...X...X.X.....X...", vol: 0.82 },
      { sampleId: "snare",     steps: "....X.......X.......X.......X...", vol: 0.78 },
      { sampleId: "hat",       steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.40 },
      { sampleId: "floor-tom", steps: "..............X...............X.", vol: 0.62 },
    ],
  },
  {
    // Funk — organ/keys, syncopated kick, conga
    label: "Funk Groove",
    artist: "Genre",
    emoji: "🎺",
    description: "Tight funk — organ chords, syncopated kick, conga groove",
    bpm: 98,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "organ", vol: 0.78, name: "Keys",
        noteSeq:  ["Eb3",null,"Eb3",null,"Gb3",null,"Eb3","Ab3","Eb3",null,"Eb3",null,"Gb3","Bb3","Ab3",null,
                   "Eb3",null,"Eb3",null,"Gb3",null,"Eb3","Ab3","Eb3",null,"Ab3",null,"Gb3",null,null,null],
        durations:[  1, null,  1, null,  1, null,  1,  1,  1, null,  1, null,  1,  1,  2, null,
                     1, null,  1, null,  1, null,  1,  1,  1, null,  2, null,  4, null,null,null],
      },
      { sampleId: "kick",  steps: "X......X...X..X.X......X...X..X.", vol: 0.84 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.80 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.38 },
      { sampleId: "conga", steps: "..X.....X.X.....X...X.X.....X...", vol: 0.56 },
      { sampleId: "snap",  steps: "........X...............X.......", vol: 0.62 },
    ],
  },
  {
    // Hip-hop — piano chords over boom-bap drums
    label: "Boom Bap",
    artist: "Genre",
    emoji: "🎤",
    description: "90s boom-bap — heavy snare, piano chord stabs",
    bpm: 87,
    stepCount: 16,
    tracks: [
      {
        type: "melody", voice: "piano", vol: 0.72, name: "Piano",
        noteSeq:  ["D3",null,null,"C3","A2",null,null,null,"F3",null,null,"E3","C3",null,null,null],
        durations:[  2, null,null,  2,  4, null,null,null,  2, null,null,  2,  4, null,null,null],
      },
      { sampleId: "kick",  steps: "X...X.......X...", vol: 0.86 },
      { sampleId: "snare", steps: "....X.......X...", vol: 0.82 },
      { sampleId: "hat",   steps: "..X...X...X...X.", vol: 0.42 },
      { sampleId: "snap",  steps: "........X.......", vol: 0.65 },
    ],
  },
  {
    // Jazz swing — ii-V-I chord walk, piano + rim
    label: "Jazz Swing",
    artist: "Genre",
    emoji: "🎷",
    description: "Swing 8ths — ii-V-I in C major, piano voicing, ride cymbal",
    bpm: 120,
    stepCount: 16,
    tracks: [
      {
        type: "melody", voice: "piano", vol: 0.70, name: "Piano",
        noteSeq:  ["D3","F3","A3","C4","G2","B3","D4","F4","C3","E3","G3","B3","C4",null,null,null],
        durations:[  1,  1,  1,  2,  1,  1,  1,  2,  1,  1,  1,  2,  4, null,null,null],
      },
      { sampleId: "kick",    steps: "X.......X.......", vol: 0.55 },
      { sampleId: "rimshot", steps: "....X.......X...", vol: 0.62 },
      { sampleId: "hat",     steps: "X.X.X.X.X.X.X.X.", vol: 0.36 },
    ],
  },
  {
    // Reggae one-drop with organ skank
    label: "Reggae",
    artist: "Genre",
    emoji: "🌴",
    description: "One-drop kick on beat 3 — organ chord skank, offbeat feel",
    bpm: 82,
    stepCount: 16,
    tracks: [
      {
        type: "melody", voice: "organ", vol: 0.68, name: "Organ",
        noteSeq:  [null,"G3",null,null,null,"G3",null,null,null,"C4",null,null,null,"C4",null,null],
        durations:[null,  1, null,null,null,  1, null,null,null,  1, null,null,null,  1, null,null],
      },
      { sampleId: "kick",     steps: "........X.......", vol: 0.80 },
      { sampleId: "rimshot",  steps: "....X.......X...", vol: 0.70 },
      { sampleId: "open-hat", steps: "..X...X...X...X.", vol: 0.60 },
      { sampleId: "hat",      steps: "X.X.X.X.X.X.X.X.", vol: 0.26 },
    ],
  },
  {
    // Bossa Nova — guitar chords on clave
    label: "Bossa Nova",
    artist: "Genre",
    emoji: "🎸",
    description: "Brazilian bossa — guitar chords on 3-2 clave, light percussion",
    bpm: 105,
    stepCount: 16,
    tracks: [
      {
        type: "melody", voice: "guitar", vol: 0.70, name: "Guitar",
        noteSeq:  ["A3",null,"C#4","E4",null,"A3",null,null,"A3",null,"E4",null,"C#4",null,null,null],
        durations:[  2, null,  1,   2, null,  2, null,null,  2, null,  2, null,  2,  null,null,null],
      },
      { sampleId: "kick",      steps: "X.......X.......", vol: 0.62 },
      { sampleId: "rimshot",   steps: "..X.X.......X.X.", vol: 0.65 },
      { sampleId: "shaker",    steps: "X.X.X.X.X.X.X.X.", vol: 0.50 },
      { sampleId: "woodblock", steps: "X..X..X...X.X...", vol: 0.60 },
    ],
  },
];

// ── Genre starter grooves ─────────────────────────────────────────────────────
interface GrooveDef {
  label: string;
  emoji: string;
  description: string;
  bpm: number;
  tracks: { sampleId: string; steps: StepStr; vol?: number }[];
}

const GROOVES: GrooveDef[] = [
  {
    label: "Pop",
    emoji: "🎵",
    description: "4-on-the-floor kick, snare on 2 & 4, 8th-note hats",
    bpm: 120,
    tracks: [
      { sampleId: "kick",     steps: "X...X...X...X..." },
      { sampleId: "snare",    steps: "....X.......X..." },
      { sampleId: "hat",      steps: "X.X.X.X.X.X.X.X." },
      { sampleId: "open-hat", steps: "...X...X...X...X" },
      { sampleId: "clap",     steps: "....X.......X...", vol: 0.6 },
      { sampleId: "crash",    steps: "X...............", vol: 0.7 },
    ],
  },
  {
    label: "Hip-Hop",
    emoji: "🎤",
    description: "Boom-bap — heavy kick, snare on 2 & 4, offbeat hats",
    bpm: 88,
    tracks: [
      { sampleId: "kick",  steps: "X...X.......X..." },
      { sampleId: "snare", steps: "....X.......X..." },
      { sampleId: "hat",   steps: "..X...X...X...X." },
      { sampleId: "snap",  steps: "........X......." },
      { sampleId: "sub",   steps: "X.......X.......", vol: 0.7 },
    ],
  },
  {
    label: "Rock",
    emoji: "🤘",
    description: "Driving kick with double on beat 3, hard snare, straight 8th hats",
    bpm: 125,
    tracks: [
      { sampleId: "kick",      steps: "X...X...X.X.X..." },
      { sampleId: "snare",     steps: "....X.......X..." },
      { sampleId: "hat",       steps: "X.X.X.X.X.X.X.X." },
      { sampleId: "crash",     steps: "X...............", vol: 0.8 },
      { sampleId: "floor-tom", steps: "..............X." },
    ],
  },
  {
    label: "Funk",
    emoji: "🎺",
    description: "Syncopated kick on 'the one', tight snare, conga groove",
    bpm: 100,
    tracks: [
      { sampleId: "kick",  steps: "X......X...X..X." },
      { sampleId: "snare", steps: "....X.......X..." },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X." },
      { sampleId: "conga", steps: "..X.....X.X....." },
      { sampleId: "snap",  steps: "........X......." },
    ],
  },
  {
    label: "Reggae",
    emoji: "🌴",
    description: "One-drop — kick only on beat 3, offbeat skank feel",
    bpm: 82,
    tracks: [
      { sampleId: "kick",      steps: "........X......." },
      { sampleId: "rimshot",   steps: "....X.......X..." },
      { sampleId: "open-hat",  steps: "..X...X...X...X." },
      { sampleId: "hat",       steps: "X.X.X.X.X.X.X.X.", vol: 0.5 },
      { sampleId: "woodblock", steps: "X..X..X.X..X..X.", vol: 0.6 },
    ],
  },
  {
    label: "House",
    emoji: "🏠",
    description: "Four-on-the-floor with clap, upbeat hats, shaker drive",
    bpm: 126,
    tracks: [
      { sampleId: "kick",     steps: "X...X...X...X..." },
      { sampleId: "clap",     steps: "....X.......X..." },
      { sampleId: "hat",      steps: "..X...X...X...X." },
      { sampleId: "open-hat", steps: "X.......X......." },
      { sampleId: "shaker",   steps: "X.X.X.X.X.X.X.X.", vol: 0.5 },
    ],
  },
  {
    label: "Trap",
    emoji: "🌡️",
    description: "Sparse syncopated kick, snappy clap, rolling 16th hi-hats with open-hat accents",
    bpm: 130,
    tracks: [
      { sampleId: "kick",      steps: "X.....X.X......." },
      { sampleId: "clap",      steps: "....X.......X..." },
      { sampleId: "hat",       steps: "X.X.X.X.X.X.X.X.", vol: 0.45 },
      { sampleId: "open-hat",  steps: "......X.......X.", vol: 0.65 },
      { sampleId: "snap",      steps: "....X.......X...", vol: 0.7  },
    ],
  },
  {
    label: "Disco",
    emoji: "🪩",
    description: "4-on-the-floor with open-hat offbeats and tambourine",
    bpm: 116,
    tracks: [
      { sampleId: "kick",       steps: "X...X...X...X..." },
      { sampleId: "snare",      steps: "....X.......X..." },
      { sampleId: "hat",        steps: "X.X.X.X.X.X.X.X." },
      { sampleId: "open-hat",   steps: "...X...X...X...X" },
      { sampleId: "tambourine", steps: "X.X.X.X.X.X.X.X.", vol: 0.5 },
    ],
  },
  {
    label: "Bossa",
    emoji: "🎸",
    description: "Brazilian bossa nova — 3-2 clave, shaker, conga",
    bpm: 105,
    tracks: [
      { sampleId: "kick",      steps: "X.......X......." },
      { sampleId: "rimshot",   steps: "..X.X.......X.X." },
      { sampleId: "shaker",    steps: "X.X.X.X.X.X.X.X.", vol: 0.6 },
      { sampleId: "woodblock", steps: "X..X..X...X.X...", vol: 0.7 },
      { sampleId: "conga",     steps: "..X.....X.X.....", vol: 0.75 },
    ],
  },
  {
    label: "Latin",
    emoji: "💃",
    description: "Latin groove — 3-2 clave on woodblock, conga, shaker",
    bpm: 110,
    tracks: [
      { sampleId: "kick",      steps: "X.......X......." },
      { sampleId: "snare",     steps: "....X.......X..." },
      { sampleId: "conga",     steps: "X.X.X.X.X.X.X..." },
      { sampleId: "woodblock", steps: "X..X..X...X.X..." },
      { sampleId: "shaker",    steps: "X.X.X.X.X.X.X.X.", vol: 0.55 },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
interface GroovePresetsProps {
  onLoad: (patch: Pick<Pattern, "bpm" | "stepCount" | "sections">) => void;
  compact?: boolean;
}

export function GroovePresets({ onLoad, compact }: GroovePresetsProps) {
  const [open, setOpen] = React.useState(false);

  const presetContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-ink">🎛️ Start with a groove</span>
        <span className="text-xs text-ink-ghost">— pick one to load it instantly</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {GROOVES.map((g) => (
          <Tooltip key={g.label} content={`${g.description}  ·  ${g.bpm} BPM`}>
            <button
              type="button"
              onClick={() => onLoad(makePattern(g.bpm, g.tracks, 16))}
              className="flex items-center gap-1.5 rounded-full border border-rim bg-well px-3 py-1.5 text-xs font-semibold text-ink-dim hover:text-ink hover:border-indigo-400/60 hover:bg-panel transition-colors active:scale-95"
            >
              <span aria-hidden="true">{g.emoji}</span>
              {g.label}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Famous song grooves */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-sm font-semibold text-ink">🎸 Famous grooves</span>
        <span className="text-xs text-ink-ghost">— drum patterns inspired by iconic songs</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SONG_GROOVES.map((g) => (
          <Tooltip key={g.label} content={`${g.description}  ·  ${g.bpm} BPM  ·  ${g.artist}`}>
            <button
              type="button"
              onClick={() => onLoad(makePattern(g.bpm, g.tracks, g.stepCount))}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-semibold text-amber-300/80 hover:text-amber-200 hover:border-amber-400/60 hover:bg-amber-500/10 transition-colors active:scale-95"
            >
              <span aria-hidden="true">{g.emoji}</span>
              {g.label}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="relative">
        <Tooltip content="Load a preset groove or song starter">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-rim bg-well px-3 py-1.5 text-xs font-semibold text-ink-dim hover:text-ink hover:bg-rim transition-colors"
          >
            <span aria-hidden="true">🎵</span>
            Grooves
            <span aria-hidden="true" className="text-[10px] opacity-60">{open ? "▲" : "▼"}</span>
          </button>
        </Tooltip>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 top-full mt-1 z-20 rounded-xl border border-rim bg-panel p-4 shadow-xl w-[30rem] max-w-[90vw]">
              {presetContent}
            </div>
          </>
        )}
      </div>
    );
  }

  return presetContent;
}
