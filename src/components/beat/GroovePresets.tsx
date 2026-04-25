"use client";
import React from "react";
import { type Pattern, TRACK_COUNT } from "@/lib/pattern";
import { Tooltip } from "@/components/ui/Tooltip";

// ── helpers ───────────────────────────────────────────────────────────────────
type StepStr = string; // 16-char string: "X" = on, "." = off
function s(str: StepStr): boolean[] {
  return str.split("").map((c) => c !== ".");
}

function makePattern(
  bpm: number,
  tracks: { sampleId: string; steps: StepStr; vol?: number }[]
): Pick<Pattern, "bpm" | "tracks"> {
  const fullTracks = Array.from({ length: TRACK_COUNT }, (_, i) => {
    const t = tracks[i];
    return {
      id:       `track-${i}`,
      sampleId: t?.sampleId ?? "kick",
      type:     "drum" as const,
      vol:      t?.vol ?? 0.8,
      mute:     false,
      solo:     false,
      steps:    t ? s(t.steps) : Array(16).fill(false) as boolean[],
      notes:    Array(16).fill(null) as (number | null)[],
      velocity: Array(16).fill(1) as number[],
      probability: Array(16).fill(1) as number[],
    };
  });
  return { bpm, tracks: fullTracks };
}

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
    description: "Driving kick, hard snare on 2 & 4, floor tom fill",
    bpm: 130,
    tracks: [
      { sampleId: "kick",      steps: "X...X...X...X..." },
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
    description: "Sparse kick, clap on beat 3, rapid 16th hi-hats",
    bpm: 140,
    tracks: [
      { sampleId: "kick",  steps: "X.....X.X......." },
      { sampleId: "clap",  steps: "........X......." },
      { sampleId: "hat",   steps: "XXXXXXXXXXXXXXXX", vol: 0.55 },
      { sampleId: "snap",  steps: "....X.......X...", vol: 0.7 },
      { sampleId: "laser", steps: "X...............", vol: 0.6 },
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
  onLoad: (patch: Pick<Pattern, "bpm" | "tracks">) => void;
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
              onClick={() => onLoad(makePattern(g.bpm, g.tracks))}
              className="flex items-center gap-1.5 rounded-full border border-rim bg-well px-3 py-1.5 text-xs font-semibold text-ink-dim hover:text-ink hover:border-indigo-400/60 hover:bg-panel transition-colors active:scale-95"
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
