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
    // Queen (1977) — THE stomp-stomp-clap. One bar says it all.
    // Stomp on beat 1 (step 0), stomp on "and" of 1 (step 2), CLAP on beat 2 (step 4), silence
    label: "We Will Rock You",
    artist: "Queen",
    emoji: "👑",
    description: "Stomp on 1, stomp on 1+, CLAP on 2 — then glorious silence until next bar",
    bpm: 81,
    stepCount: 16,
    tracks: [
      { sampleId: "kick",      steps: "X.X.............", vol: 0.95 },
      { sampleId: "floor-tom", steps: "X.X.............", vol: 0.80 },
      { sampleId: "clap",      steps: "....X...........", vol: 1.0  },
      { sampleId: "crash",     steps: "X...............", vol: 0.45 },
    ],
  },
  {
    // MJ (1982) — LM-1 drums + the iconic F#-minor walking bassline.
    // Bass arc over 2 bars: F#2-A2-C#3 (up), then B2-A2-G#2-F#2 (down)
    label: "Billie Jean",
    artist: "Michael Jackson",
    emoji: "🕺",
    description: "MJ's LM-1 groove + F#m walking bass — the most recognizable bass ever",
    bpm: 117,
    stepCount: 32,
    tracks: [
      // F#m bass: bar1 = F#2 A2 C#3 (quarter notes), bar2 = B2 A2 G#2 F#2 resolve
      {
        type: "melody",
        vol: 0.88,
        noteSeq: [
          "F#2",null,null,null,"A2", null,null,null,"C#3",null,null,null,"A2", null,null,null,
          "B2", null,null,null,"A2", null,null,null,"G#2",null,null,null,"F#2",null,null,null,
        ],
      },
      // Kick: iconic syncopated LM-1 hits
      { sampleId: "kick",     steps: "X...X.X.X.X.....X...X.X.X.X....", vol: 0.9  },
      // Snare: beat 2 and 4 every bar
      { sampleId: "snare",    steps: "....X.......X.......X.......X...", vol: 0.85 },
      // 16th-note closed hat
      { sampleId: "hat",      steps: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", vol: 0.38 },
      // Open hat on 8th-note offbeats
      { sampleId: "open-hat", steps: "..X...X...X...X...X...X...X...X.", vol: 0.5  },
    ],
  },
  {
    // The White Stripes (2003) — the bass riff IS the song. E3 descending.
    // Rhythm: E(dotted-quarter=3) E(8th=2) G(8th=2) E(dotted-quarter=3) D(8th=2) C(8th=2) B(8th=2)
    label: "Seven Nation Army",
    artist: "The White Stripes",
    emoji: "🎸",
    description: "Iconic descending bass riff — dotted-quarter opening gives it the real feel",
    bpm: 120,
    stepCount: 32,
    tracks: [
      // Step layout: E3(0) .(1) .(2) E3(3) .(4) G3(5) .(6) E3(7) .(8) .(9) D3(10) .(11) C3(12) .(13) B2(14) .(15)
      {
        type: "melody",
        vol: 0.9,
        noteSeq: [
          "E3",null,null,"E3",null,"G3",null,"E3",null,null,"D3",null,"C3",null,"B2",null,
          "E3",null,null,"E3",null,"G3",null,"E3",null,null,"D3",null,"C3",null,"B2",null,
        ],
      },
      // Kick on 1 and 3
      { sampleId: "kick",  steps: "X.......X.......X.......X.......", vol: 0.9 },
      // Snare on 2 and 4
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.9 },
      // Straight 8th hats
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.5 },
    ],
  },
  {
    // Deep Purple (1972) — three power-chord groups (D minor).
    // Root + perfect 5th layered on two melody tracks for power-chord sound.
    // Groups: D-F-Ab | D-F-G | D-F-Ab-G | D resolve
    label: "Smoke on the Water",
    artist: "Deep Purple",
    emoji: "💨",
    description: "D-minor power chord riff — root + 5th layered for that guitar sound",
    bpm: 112,
    stepCount: 32,
    tracks: [
      // Root notes: D4 F4 Ab4 | D4 F4 G4 | D4 F4 Ab4 G4 | D4
      {
        type: "melody",
        vol: 0.85,
        noteSeq: [
          "D4",null,null,"F4",null,"Ab4",null,null,"D4",null,null,"F4",null,"G4",null,null,
          "D4",null,null,"F4",null,"Ab4",null,"G4","D4",null,null,null,null,null,null,null,
        ],
      },
      // Perfect 5ths above: A4 C5 Eb5 | A4 C5 D5 | A4 C5 Eb5 D5 | A4
      {
        type: "melody",
        vol: 0.55,
        noteSeq: [
          "A4",null,null,"C5",null,"Eb5",null,null,"A4",null,null,"C5",null,"D5",null,null,
          "A4",null,null,"C5",null,"Eb5",null,"D5","A4",null,null,null,null,null,null,null,
        ],
      },
      // Kick on 1 and 3 with pre-3 accent
      { sampleId: "kick",  steps: "X.......X...X...X.......X...X...", vol: 0.9  },
      // Snare on 2 and 4
      { sampleId: "snare", steps: "....X.......X.......X.......X...", vol: 0.95 },
      // Straight 8th hats
      { sampleId: "hat",   steps: "X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.", vol: 0.5  },
      // Crash on beat 1
      { sampleId: "crash", steps: "X...............................", vol: 0.75 },
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
