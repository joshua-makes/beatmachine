"use client";
import React from "react";
import { type Pattern, TRACK_COUNT } from "@/lib/pattern";
import { Tooltip } from "@/components/ui/Tooltip";

// ── helpers ───────────────────────────────────────────────────────────────────
type StepStr = string; // "X" = on, "." = off — any length (16, 32, 64)
function s(str: StepStr): boolean[] {
  return str.split("").map((c) => c !== ".");
}

// Convert note name ("C4", "F#3", "Ab2" …) to MIDI number (C4 = 60)
const MIDI_NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(name: string): number {
  const m = name.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return 60;
  return (parseInt(m[3]) + 1) * 12 + MIDI_NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

// Track definition union — drum uses sample + step string; melody uses note sequence
interface DrumTrackDef  { sampleId: string; steps: StepStr; vol?: number; }
interface MelodyTrackDef { type: "melody"; noteSeq: (string | null)[]; vol?: number; }
type TrackDef = DrumTrackDef | MelodyTrackDef;

function makePattern(
  bpm: number,
  tracks: TrackDef[],
  stepCount: 8 | 16 | 32 | 64 = 16,
): Pick<Pattern, "bpm" | "stepCount" | "tracks"> {
  const fullTracks = Array.from({ length: TRACK_COUNT }, (_, i) => {
    const t = tracks[i];
    if (!t) {
      return {
        id: `track-${i}`, sampleId: "kick", type: "drum" as const,
        vol: 0.8, mute: false, solo: false,
        steps: Array(stepCount).fill(false) as boolean[],
        notes: Array(stepCount).fill(null) as (number | null)[],
        velocity: Array(stepCount).fill(1) as number[],
        probability: Array(stepCount).fill(1) as number[],
      };
    }
    if ("type" in t && t.type === "melody") {
      return {
        id: `track-${i}`, sampleId: "synth", type: "melody" as const,
        vol: t.vol ?? 0.75, mute: false, solo: false,
        steps: t.noteSeq.map((n) => n !== null),
        notes: t.noteSeq.map((n) => (n !== null ? noteToMidi(n) : null)),
        velocity: Array(stepCount).fill(1) as number[],
        probability: Array(stepCount).fill(1) as number[],
      };
    }
    const d = t as DrumTrackDef;
    return {
      id: `track-${i}`, sampleId: d.sampleId, type: "drum" as const,
      vol: d.vol ?? 0.8, mute: false, solo: false,
      steps: s(d.steps),
      notes: Array(stepCount).fill(null) as (number | null)[],
      velocity: Array(stepCount).fill(1) as number[],
      probability: Array(stepCount).fill(1) as number[],
    };
  });
  return { bpm, stepCount, tracks: fullTracks };
}

// ── Song showcase definitions ─────────────────────────────────────────────────
// Note: drum/rhythm patterns are not copyrightable; melodies here are either
// public domain or fair-use reconstructions for educational/interactive use.
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
  {
    // Traditional / public domain — "Jingle Bells" chorus, key of C.
    // Jin-gle bells, jin-gle bells, jin-gle all the way
    // E-E-E | E-E-E | E-G-C-D-E | F-F-F-F-F-E-E-E-E-D-D-E-D-G
    label: "Jingle Bells",
    artist: "Traditional",
    emoji: "🔔",
    description: "The classic Christmas chorus — jin-gle bells, jin-gle bells!",
    bpm: 120,
    stepCount: 32,
    tracks: [
      // Each note = 2 steps; bar 1: E E E(rest) E E E(rest)  E G C D E(rest)
      {
        type: "melody",
        vol: 0.82,
        noteSeq: [
          "E4",null,"E4",null,"E4",null,null,null,"E4",null,"E4",null,"E4",null,null,null,
          "E4",null,"G4",null,"C4",null,"D4",null,"E4",null,null,null,null,null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.75 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.70 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.35 },
    ],
  },
  {
    // Traditional / public domain — "London Bridge is Falling Down", key of C.
    // Lon-don Bridge is fall-ing down, fall-ing down, fall-ing down
    // G-A-G-F-E-F-G | D-E-F-E-F-G | G-A-G-F-E-F-G | E-G-E-C
    label: "London Bridge",
    artist: "Traditional",
    emoji: "🌉",
    description: "London Bridge is falling down — a bouncy 3-note nursery tune",
    bpm: 108,
    stepCount: 32,
    tracks: [
      // Each note = 2 steps: G A G F E F G (rest) D E F E F G (rest)
      {
        type: "melody",
        vol: 0.82,
        noteSeq: [
          "G4",null,"A4",null,"G4",null,"F4",null,"E4",null,"F4",null,"G4",null,null,null,
          "D4",null,"E4",null,"F4",null,"E4",null,"F4",null,"G4",null,null,null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.72 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.65 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.32 },
    ],
  },
  {
    // Traditional / public domain — most famous song in the world.
    // 3/4 melody fitted into 32 16th-note steps (2 bars of 4/4).
    // Phrase 1 "Hap-py Birth-day to you": C(2) C(2) D(4) C(2) F(4) E(2)
    // Phrase 2 "Hap-py Birth-day to you": C(2) C(2) D(4) C(2) G(4) F(2)
    // D4 gets 4 steps (dotted-quarter feel) — the key rhythmic hook of the song.
    label: "Happy Birthday",
    artist: "Traditional",
    emoji: "🎂",
    description: "The most famous song in the world — simple melody everyone knows",
    bpm: 92,
    stepCount: 32,
    tracks: [
      // Phrase 1: Hap(C) py(C) Birth(D).. day(C) to(F).. you(E)
      // Phrase 2: Hap(C) py(C) Birth(D).. day(C) to(G).. you(F)
      {
        type: "melody",
        vol: 0.82,
        noteSeq: [
          "C4",null,"C4",null,"D4",null,null,null,"C4",null,"F4",null,null,null,"E4",null,
          "C4",null,"C4",null,"D4",null,null,null,"C4",null,"G4",null,null,null,"F4",null,
        ],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.7 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.65 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.3 },
    ],
  },
  {
    // Traditional / public domain — only 3 notes! Perfect for beginners.
    // E-D-C-D-E-E-E | D-D-D | E-G-G | E-D-C-D-E-E-E-E-D-D-E-D-C
    label: "Mary Had a Little Lamb",
    artist: "Traditional",
    emoji: "🐑",
    description: "Only 3 notes: E, D and C — the easiest melody to learn",
    bpm: 100,
    stepCount: 32,
    tracks: [
      // E-D-C-D-E-E-E(rest) D-D-D(rest) E-G-G(rest) — each note = 2 steps
      {
        type: "melody",
        vol: 0.82,
        noteSeq: [
          "E4",null,"D4",null,"C4",null,"D4",null,"E4",null,"E4",null,"E4",null,null,null,
          "D4",null,"D4",null,"D4",null,null,null,"E4",null,"G4",null,"G4",null,null,null,
        ],
      },
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.7 },
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.65 },
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.3 },
    ],
  },
  {
    // Traditional / public domain — perfect Chrome Music Lab style intro melody.
    label: "Twinkle Twinkle",
    artist: "Traditional",
    emoji: "⭐",
    description: "Classic nursery rhyme melody — great starting point for kids",
    bpm: 96,
    stepCount: 32,
    tracks: [
      // C-C-G-G-A-A-G | F-F-E-E-D-D-C  (each note = 2 16th steps)
      {
        type: "melody",
        vol: 0.8,
        noteSeq: [
          "C4",null,"C4",null,"G4",null,"G4",null,"A4",null,"A4",null,"G4",null,null,null,
          "F4",null,"F4",null,"E4",null,"E4",null,"D4",null,"D4",null,"C4",null,null,null,
        ],
      },
      // Light kick on beats 1 and 3
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.7 },
      // Snare on 2 and 4
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.7 },
      // Soft 8th-note hat
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.35 },
    ],
  },
  {
    // Beethoven 9th, 4th movement (1824) — public domain.
    label: "Ode to Joy",
    artist: "Beethoven",
    emoji: "🎶",
    description: "Beethoven's famous melody — E4 phrase in C major, public domain",
    bpm: 108,
    stepCount: 32,
    tracks: [
      // E-E-F-G-G-F-E-D | C-C-D-E-E-D-D  (each note = 2 16th steps)
      {
        type: "melody",
        vol: 0.8,
        noteSeq: [
          "E4",null,"E4",null,"F4",null,"G4",null,"G4",null,"F4",null,"E4",null,"D4",null,
          "C4",null,"C4",null,"D4",null,"E4",null,"E4",null,"D4",null,"D4",null,null,null,
        ],
      },
      // Kick on downbeats
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.65 },
      // Light snare on 2 and 4
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.6 },
      // Soft hat
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.3 },
      // Chord hit on beat 1 of each bar
      { sampleId: "chord", steps: "X...............X...............", vol: 0.45 },
    ],
  },
];

// ── Groove definitions ───────────────────────────────────────────────────────
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
  onLoad: (patch: Pick<Pattern, "bpm" | "stepCount" | "tracks">) => void;
}

export function GroovePresets({ onLoad }: GroovePresetsProps) {
  return (
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
}
