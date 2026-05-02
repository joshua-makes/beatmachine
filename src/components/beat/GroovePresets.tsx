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
    probability: 1,
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
      probability: 1,
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
      probability: 1,
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
      probability: 1,
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
    // Beethoven 9th Sym, 4th mvt (1824) — public domain.
    // One complete 4-bar phrase. Each quarter note = trigger step + 3 null spacers.
    // Bar 1: E  E  F  G   Bar 2: G  F  E  D
    // Bar 3: C  C  D  E   Bar 4: E.(dotted-quarter) D(8th) D(half)
    label: "Ode to Joy",
    artist: "Beethoven",
    emoji: "🎶",
    description: "Beethoven's famous chorus — quarter notes, violin",
    bpm: 108,
    stepCount: 64,
    tracks: [
      {
        type: "melody", voice: "violin", vol: 0.82, name: "Strings",
        noteSeq: [
          "E4",null,null,null, "E4",null,null,null, "F4",null,null,null, "G4",null,null,null,  // bar 1
          "G4",null,null,null, "F4",null,null,null, "E4",null,null,null, "D4",null,null,null,  // bar 2
          "C4",null,null,null, "C4",null,null,null, "D4",null,null,null, "E4",null,null,null,  // bar 3
          "E4",null,null,null,null,null, "D4",null,  "D4",null,null,null,null,null,null,null,  // bar 4
        ],
        durations: [
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          6,null,null,null,null,null, 2,null, 8,null,null,null,null,null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......X.......X.......X.......X.......", vol: 0.62 },
      { sampleId: "snare", steps: "....X.......X.......X.......X.......X.......X.......X.......X...", vol: 0.54 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.22 },
    ],
  },
  {
    // Beethoven "Für Elise" (1810) — public domain.
    // 32 steps = 2 bars of 4/4. Opening 16th-note run then quarter-note melody.
    // Bar 1: [E5 Eb5 E5 Eb5 E5 B4 D5 C5](16ths) A4(q) C4(8th) E4(8th)
    // Bar 2: A4(q) rest(8th) B4(q) rest(8th) [E4 Ab4 B4 C5](16ths→loop)
    label: "Für Elise",
    artist: "Beethoven",
    emoji: "🌹",
    description: "Beethoven's iconic piano piece — opening theme, piano",
    bpm: 120,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "piano", vol: 0.82, name: "Piano",
        noteSeq: [
          "E5","Eb5","E5","Eb5","E5","B4","D5","C5",  // steps  0-7:  fast 16th run
          "A4", null, null, null,                      // steps  8-11: quarter A4
          "C4", null, "E4", null,                      // steps 12-15: 8th C4, 8th E4
          "A4", null, null, null,                      // steps 16-19: quarter A4
           null, null,                                 // steps 20-21: 8th rest
          "B4", null, null, null,                      // steps 22-25: quarter B4
           null, null,                                 // steps 26-27: 8th rest
          "E4","Ab4","B4","C5",                        // steps 28-31: ascending run into loop
        ],
        durations: [
          1,  1,  1,  1,  1,  1,  1,  1,
          4,null,null,null,
          2,null, 2,null,
          4,null,null,null,
          null,null,
          4,null,null,null,
          null,null,
          1,  1,  1,  1,
        ],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.48 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.18 },
    ],
  },
  {
    // "Twinkle Twinkle Little Star" — French tune (1761), public domain.
    // 4 phrases × 16 steps = 64 steps total. Quarter note = note + 3 nulls. Half note = note + 7 nulls.
    // Phrase 1: C  C  G  G  |  A  A  G(half)
    // Phrase 2: F  F  E  E  |  D  D  C(half)
    // Phrase 3: G  G  F  F  |  E  E  D(half)
    // Phrase 4: G  G  F  F  |  E  E  D(half)
    label: "Twinkle Twinkle",
    artist: "Traditional",
    emoji: "⭐",
    description: "Classic nursery rhyme — quarter & half notes, bells",
    bpm: 100,
    stepCount: 64,
    tracks: [
      {
        type: "melody", voice: "bell", vol: 0.80, name: "Bells",
        noteSeq: [
          "C4",null,null,null, "C4",null,null,null, "G4",null,null,null, "G4",null,null,null,  // phrase 1a
          "A4",null,null,null, "A4",null,null,null, "G4",null,null,null,null,null,null,null,   // phrase 1b (G half)
          "F4",null,null,null, "F4",null,null,null, "E4",null,null,null, "E4",null,null,null,  // phrase 2a
          "D4",null,null,null, "D4",null,null,null, "C4",null,null,null,null,null,null,null,   // phrase 2b (C half)
        ],
        durations: [
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          4,null,null,null, 4,null,null,null, 8,null,null,null,null,null,null,null,
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          4,null,null,null, 4,null,null,null, 8,null,null,null,null,null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X...X...X...X...X...X...X...X...X...X...X...X...X...X...X...X...", vol: 0.58 },
      { sampleId: "snare", steps: "....X.......X.......X.......X.......X.......X.......X.......X...", vol: 0.54 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.24 },
    ],
  },
  {
    // "Happy Birthday to You" — Hill sisters (1893), public domain.
    // 3/4 time. Pickup = two 8th notes "Hap-py". Each phrase = 24 steps.
    // 2 phrases × 24 + 16 silence = 64 steps.
    // Phrase 1: G(8th) G(8th) | A(q) G(q) C5(q) | B4(half)
    // Phrase 2: G(8th) G(8th) | A(q) G(q) D5(q) | C5(half)
    label: "Happy Birthday",
    artist: "Traditional",
    emoji: "🎂",
    description: "Two phrases in 3/4 — pickup 8th notes, bells",
    bpm: 88,
    stepCount: 64,
    tracks: [
      {
        type: "melody", voice: "bell", vol: 0.82, name: "Bells",
        noteSeq: [
          // phrase 1 — "Happy birthday to you"
          "G4",null,"G4",null,                        // steps  0-3:  Hap-(8th) py(8th)
          "A4",null,null,null,                        // steps  4-7:  birth-(q)
          "G4",null,null,null,                        // steps  8-11: day-(q)
          "C5",null,null,null,                        // steps 12-15: to-(q)
          "B4",null,null,null,null,null,null,null,    // steps 16-23: you (half)
          // phrase 2 — "Happy birthday to you"
          "G4",null,"G4",null,                        // steps 24-27: Hap-(8th) py(8th)
          "A4",null,null,null,                        // steps 28-31: birth-(q)
          "G4",null,null,null,                        // steps 32-35: day-(q)
          "D5",null,null,null,                        // steps 36-39: to-(q)
          "C5",null,null,null,null,null,null,null,    // steps 40-47: you (half)
          // silence to fill to 64 steps
          null,null,null,null,null,null,null,null,    // steps 48-55
          null,null,null,null,null,null,null,null,    // steps 56-63
        ],
        durations: [
          2,null,2,null,
          4,null,null,null,
          4,null,null,null,
          4,null,null,null,
          8,null,null,null,null,null,null,null,
          2,null,2,null,
          4,null,null,null,
          4,null,null,null,
          4,null,null,null,
          8,null,null,null,null,null,null,null,
          null,null,null,null,null,null,null,null,
          null,null,null,null,null,null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X...X...X...X...X...X...X...X...X...X...X...X...X...X...X...X...", vol: 0.60 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.20 },
    ],
  },
  {
    // "Mary Had a Little Lamb" — public domain.
    // 4 bars × 16 steps = 64 steps. Quarter = note+3 nulls, half = note+7 nulls.
    // Bar 1: E  D  C  D   Bar 2: E  E  E(half)
    // Bar 3: D  D  D(half)  Bar 4: E  G  G(half)
    label: "Mary Had a Lamb",
    artist: "Traditional",
    emoji: "🐑",
    description: "Simple 3-note melody — E D C. Great for beginners. Flute.",
    bpm: 100,
    stepCount: 64,
    tracks: [
      {
        type: "melody", voice: "flute", vol: 0.80, name: "Flute",
        noteSeq: [
          "E4",null,null,null, "D4",null,null,null, "C4",null,null,null, "D4",null,null,null,  // bar 1
          "E4",null,null,null, "E4",null,null,null, "E4",null,null,null,null,null,null,null,   // bar 2
          "D4",null,null,null, "D4",null,null,null, "D4",null,null,null,null,null,null,null,   // bar 3
          "E4",null,null,null, "G4",null,null,null, "G4",null,null,null,null,null,null,null,   // bar 4
        ],
        durations: [
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          4,null,null,null, 4,null,null,null, 8,null,null,null,null,null,null,null,
          4,null,null,null, 4,null,null,null, 8,null,null,null,null,null,null,null,
          4,null,null,null, 4,null,null,null, 8,null,null,null,null,null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X...X...X...X...X...X...X...X...X...X...X...X...X...X...X...X...", vol: 0.60 },
      { sampleId: "snare", steps: "....X.......X.......X.......X.......X.......X.......X.......X...", vol: 0.55 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.24 },
    ],
  },
];

// ── Genre starter grooves ─────────────────────────────────────────────────────
interface GrooveDef {
  label: string;
  emoji: string;
  description: string;
  bpm: number;
  stepCount?: 8 | 16 | 32 | 64;
  tracks: TrackDef[];
}

const GROOVES: GrooveDef[] = [
  {
    label: "Pop",
    emoji: "🎵",
    description: "Driving kick, layered clap & snare, open-hat upbeats, 16th shaker shimmer",
    bpm: 120,
    tracks: [
      { sampleId: "kick",     steps: "X...X..X.X..X...", vol: 0.88 },
      { sampleId: "snare",    steps: "....X.......X...", vol: 0.82 },
      { sampleId: "hat",      steps: "X.X.X.X.X.X.X.X.", vol: 0.50 },
      { sampleId: "open-hat", steps: "..X...X...X...X.", vol: 0.48 },
      { sampleId: "clap",     steps: "....X.......X...", vol: 0.72 },
      { sampleId: "shaker",   steps: "X.X.X.X.X.X.X.X.", vol: 0.28 },
      { sampleId: "crash",    steps: "X...............", vol: 0.65 },
    ],
  },
  {
    label: "Hip-Hop",
    emoji: "🎤",
    description: "Classic boom-bap — syncopated kick, snare on 2 & 4, sub bass",
    bpm: 88,
    tracks: [
      { sampleId: "kick",  steps: "X...X.X.....X...", vol: 0.90 },
      { sampleId: "snare", steps: "....X.......X...", vol: 0.85 },
      { sampleId: "hat",   steps: "..X...X...X...X.", vol: 0.40 },
      { sampleId: "snap",  steps: "........X.......", vol: 0.68 },
      { sampleId: "sub",   steps: "X.......X.......", vol: 0.75 },
    ],
  },
  {
    label: "Rock",
    emoji: "🤘",
    description: "Kick on 1, 2 & 3 with double, hard snare on 2 & 4, straight 8th hats",
    bpm: 120,
    tracks: [
      { sampleId: "kick",      steps: "X...X...X.X.....", vol: 0.90 },
      { sampleId: "snare",     steps: "....X.......X...", vol: 0.85 },
      { sampleId: "hat",       steps: "X.X.X.X.X.X.X.X.", vol: 0.48 },
      { sampleId: "crash",     steps: "X...............", vol: 0.82 },
      { sampleId: "floor-tom", steps: "..............X.", vol: 0.68 },
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
    description: "One-drop — kick on beat 3 only, organ skank on every upbeat",
    bpm: 82,
    tracks: [
      {
        type: "melody", voice: "organ", vol: 0.72, name: "Skank",
        noteSeq:  [null,null,"G3",null, null,null,"G3",null, null,null,"G3",null, null,null,"G3",null],
        durations:[null,null,  2, null, null,null,  2, null, null,null,  2, null, null,null,  2, null],
      },
      { sampleId: "kick",     steps: "........X.......", vol: 0.82 },
      { sampleId: "rimshot",  steps: "....X.......X...", vol: 0.72 },
      { sampleId: "open-hat", steps: "..X...X...X...X.", vol: 0.62 },
      { sampleId: "hat",      steps: "X.X.X.X.X.X.X.X.", vol: 0.22 },
    ],
  },
  {
    label: "House",
    emoji: "🏠",
    description: "Four-on-the-floor, clap on 2 & 4, open-hat on the 'and', 16th shaker",
    bpm: 126,
    tracks: [
      { sampleId: "kick",     steps: "X...X...X...X...", vol: 0.90 },
      { sampleId: "clap",     steps: "....X.......X...", vol: 0.80 },
      { sampleId: "hat",      steps: "..X...X...X...X.", vol: 0.50 },
      { sampleId: "open-hat", steps: "......X.......X.", vol: 0.72 },
      { sampleId: "shaker",   steps: "X.X.X.X.X.X.X.X.", vol: 0.42 },
    ],
  },
  {
    label: "Trap",
    emoji: "🌡️",
    description: "808 sub, 16th hi-hat rolls, sparse kick — Atlanta trap signature",
    bpm: 130,
    tracks: [
      { sampleId: "kick",      steps: "X.......X.X.....", vol: 0.92 },
      { sampleId: "clap",      steps: "....X.......X...", vol: 0.85 },
      { sampleId: "hat",       steps: "XXXXXXXXXXXXXXXX", vol: 0.28 },
      { sampleId: "open-hat",  steps: "......X.......X.", vol: 0.68 },
      { sampleId: "snap",      steps: "....X.......X...", vol: 0.72 },
      { sampleId: "sub",       steps: "X.......X.......", vol: 0.88 },
    ],
  },
  {
    label: "Disco",
    emoji: "🪩",
    description: "4-on-the-floor, snare on 2 & 4, open-hat on the '&', tambourine shimmer",
    bpm: 116,
    tracks: [
      { sampleId: "kick",       steps: "X...X...X...X...", vol: 0.88 },
      { sampleId: "snare",      steps: "....X.......X...", vol: 0.82 },
      { sampleId: "hat",        steps: "X.X.X.X.X.X.X.X.", vol: 0.50 },
      { sampleId: "open-hat",   steps: "..X...X...X...X.", vol: 0.62 },
      { sampleId: "tambourine", steps: "X.X.X.X.X.X.X.X.", vol: 0.48 },
    ],
  },
  {
    label: "Bossa",
    emoji: "🎸",
    description: "Brazilian bossa nova — guitar chord stabs, 3-2 clave, soft conga",
    bpm: 105,
    tracks: [
      {
        type: "melody", voice: "guitar", vol: 0.70, name: "Guitar",
        noteSeq:  ["A3",null,null,null, "C#4",null,"E4",null, "A3",null,null,null, "E4",null,null,null],
        durations:[  4, null,null,null,    2, null,  2, null,   4, null,null,null,   4, null,null,null],
      },
      { sampleId: "kick",      steps: "X.......X.......", vol: 0.55 },
      { sampleId: "rimshot",   steps: "....X.......X...", vol: 0.45 },
      { sampleId: "woodblock", steps: "X..X..X...X.X...", vol: 0.68 },
      { sampleId: "conga",     steps: "..X.X...X...X...", vol: 0.62 },
      { sampleId: "shaker",    steps: "X.X.X.X.X.X.X.X.", vol: 0.45 },
    ],
  },
  {
    label: "Latin",
    emoji: "💃",
    description: "Salsa/mambo — campana cowbell, conga tumbao, 3-2 clave",
    bpm: 115,
    tracks: [
      { sampleId: "kick",      steps: "X.......X.......", vol: 0.78 },
      { sampleId: "rimshot",   steps: "..X...X...X...X.", vol: 0.68 },
      { sampleId: "conga",     steps: "....X.X...X.X...", vol: 0.80 },
      { sampleId: "cowbell",   steps: "X...X.X.X...X.X.", vol: 0.72 },
      { sampleId: "woodblock", steps: "X..X..X...X.X...", vol: 0.58 },
      { sampleId: "shaker",    steps: "X.X.X.X.X.X.X.X.", vol: 0.42 },
    ],
  },
  // ── Genre grooves with melody ────────────────────────────────────────────
  {
    // Blues pentatonic riff in A minor.
    label: "Blues Rock",
    emoji: "🎸",
    description: "12-bar blues riff in A — pentatonic minor guitar",
    bpm: 96,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "guitar", vol: 0.82, name: "Guitar",
        noteSeq: [
          "A2",null,null,null, "C3",null,"D3",null, "Eb3",null,"D3",null, "C3",null,null,null,
          "A2",null,null,null, "C3",null,"D3",null, "Eb3",null,"D3",null, "A2",null,null,null,
        ],
        durations: [
          4,null,null,null, 2,null,2,null, 2,null,2,null, 4,null,null,null,
          4,null,null,null, 2,null,2,null, 2,null,2,null, 4,null,null,null,
        ],
      },
      { sampleId: "kick",      steps: "X...X.X.....X...X...X.X.....X...", vol: 0.82 },
      { sampleId: "snare",     steps: "....X.......X.......X.......X...", vol: 0.78 },
      { sampleId: "hat",       steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.38 },
      { sampleId: "floor-tom", steps: "..............X...............X.", vol: 0.60 },
    ],
  },
  {
    // Funk organ stabs on offbeats.
    label: "Funk Groove",
    emoji: "🎺",
    description: "Tight funk — organ chords, syncopated kick, conga groove",
    bpm: 98,
    stepCount: 32,
    tracks: [
      {
        type: "melody", voice: "organ", vol: 0.78, name: "Keys",
        noteSeq: [
          "Eb3",null, null,null, "Eb3",null, "Gb3",null, "Eb3",null, null,null, "Ab3",null, null,null,
          "Eb3",null, null,null, "Eb3",null, "Gb3",null, "Bb3",null, "Ab3",null, null,null, null,null,
        ],
        durations: [
          2,null, null,null, 2,null, 2,null, 2,null, null,null, 4,null, null,null,
          2,null, null,null, 2,null, 2,null, 2,null, 4,null, null,null, null,null,
        ],
      },
      { sampleId: "kick",  steps: "X......X...X..X.X......X...X..X.", vol: 0.84 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.80 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.38 },
      { sampleId: "conga", steps: "..X.....X.X.....X...X.X.....X...", vol: 0.56 },
    ],
  },
  {
    // Boom bap piano stabs.
    label: "Boom Bap",
    emoji: "🎤",
    description: "90s hip-hop — heavy snare, piano chord stabs",
    bpm: 87,
    stepCount: 16,
    tracks: [
      {
        type: "melody", voice: "piano", vol: 0.72, name: "Piano",
        noteSeq: [
          "D3",null,null,null, null,null, "C3",null,
          "A2",null,null,null, null,null,null,null,
        ],
        durations: [
          4,null,null,null, null,null, 2,null,
          8,null,null,null, null,null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X.......X.X.....", vol: 0.88 },
      { sampleId: "snare", steps: "....X.......X...", vol: 0.82 },
      { sampleId: "hat",   steps: "..X...X...X...X.", vol: 0.42 },
      { sampleId: "snap",  steps: "........X.......", vol: 0.65 },
    ],
  },
  {
    // Jazz walking bass ii-V-I in C.
    label: "Jazz Swing",
    emoji: "🎷",
    description: "Swing feel — ii-V-I walking bass in C, piano",
    bpm: 120,
    stepCount: 64,
    tracks: [
      {
        type: "melody", voice: "piano", vol: 0.70, name: "Piano",
        noteSeq: [
          "D3",null,null,null, "F3",null,null,null, "A3",null,null,null, "C4",null,null,null,
          "G2",null,null,null, "B3",null,null,null, "D4",null,null,null, "F4",null,null,null,
          "C3",null,null,null, "E3",null,null,null, "G3",null,null,null, "B3",null,null,null,
          "C4",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
        ],
        durations: [
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          4,null,null,null, 4,null,null,null, 4,null,null,null, 4,null,null,null,
          16,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
        ],
      },
      { sampleId: "kick",    steps: "X.......X.......X.......X.......X.......X.......X.......X.......", vol: 0.55 },
      { sampleId: "rimshot", steps: "....X.......X.......X.......X.......X.......X.......X.......X...", vol: 0.62 },
      { sampleId: "hat",     steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.36 },
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
              onClick={() => onLoad(makePattern(g.bpm, g.tracks, g.stepCount ?? 16))}
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
