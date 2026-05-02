"use client";
import React from "react";
import {
  NOTE_NAMES,
  SCALE_LABELS,
  getScaleMidiSet,
  getDiatonicChords,
  type NoteName,
  type ScaleName,
} from "@/lib/scales";
import { Tooltip } from "@/components/ui/Tooltip";

/** Convert a MIDI note number to its note name (e.g. 60 → "C") */
const midiToName = (midi: number) => NOTE_NAMES[midi % 12];

// ── Popular presets ──────────────────────────────────────────────────────────
interface Preset { label: string; root: NoteName; scale: ScaleName; }
const PRESETS: Preset[] = [
  { label: "C Maj",    root: "C",  scale: "major"      },
  { label: "A Min",    root: "A",  scale: "minor"      },
  { label: "G Maj",    root: "G",  scale: "major"      },
  { label: "E Min",    root: "E",  scale: "minor"      },
  { label: "D Dor",    root: "D",  scale: "dorian"     },
  { label: "C Blues",  root: "C",  scale: "blues"      },
  { label: "A Penta",  root: "A",  scale: "pentaMinor" },
  { label: "F Mix",    root: "F",  scale: "mixolydian" },
];

// White key chromatic offsets within an octave (C=0, D=2, E=4, F=5, G=7, A=9, B=11)
const WHITE_KEY_OFFSETS = [0, 2, 4, 5, 7, 9, 11] as const;

// Black key chromatic offsets + their left position as % of one octave container's width
// Positions derived from: blackKey center at n/7 of octave, black width ~0.6/7 = 8.57%
const BLACK_KEYS = [
  { offset: 1,  leftPct: 10.00 }, // C#
  { offset: 3,  leftPct: 24.29 }, // D#
  { offset: 6,  leftPct: 52.86 }, // F#
  { offset: 8,  leftPct: 67.14 }, // G#
  { offset: 10, leftPct: 81.43 }, // A#
] as const;

interface PianoKeyboardProps {
  root: NoteName;
  scale: ScaleName;
  octave: number;
  /** Currently armed MIDI note (shown with emerald ring on the keyboard key) */
  selectedNote?: number | null;
  /** Currently armed chord — shown with amber ring on chord button */
  selectedChord?: number[] | null;
  /** Notes currently sounding during playback — lit up on keyboard */
  activeNotes?: number[];
  onRootChange: (root: NoteName) => void;
  onScaleChange: (scale: ScaleName) => void;
  onOctaveChange: (octave: number) => void;
  onPlayNote: (midi: number) => void;
  onPlayChord: (midiNotes: number[]) => void;
  /** Arm a chord for step painting (also plays it) */
  onArmChord?: (midiNotes: number[]) => void;
}

export function PianoKeyboard({
  root,
  scale,
  octave,
  selectedNote,
  selectedChord,
  activeNotes,
  onRootChange,
  onScaleChange,
  onOctaveChange,
  onPlayNote,
  onPlayChord,
  onArmChord,
}: PianoKeyboardProps) {
  const scaleMidi = getScaleMidiSet(root, scale);
  const rootChromatic = NOTE_NAMES.indexOf(root);
  const chords = getDiatonicChords(root, scale, octave);

  function whiteKeyClass(midi: number) {
    if (activeNotes?.includes(midi))
      return "bg-emerald-300 dark:bg-emerald-400 active:bg-emerald-400";
    const isRoot  = midi % 12 === rootChromatic;
    const inScale = scaleMidi.has(midi);
    if (isRoot && inScale)
      return "bg-indigo-200 dark:bg-indigo-800 active:bg-indigo-300 dark:active:bg-indigo-700";
    if (inScale)
      return "bg-indigo-50 dark:bg-indigo-950 active:bg-indigo-100 dark:active:bg-indigo-900";
    return "bg-white dark:bg-zinc-200 active:bg-gray-200 dark:active:bg-zinc-400";
  }

  function blackKeyClass(midi: number) {
    if (activeNotes?.includes(midi)) return "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-300";
    const isRoot  = midi % 12 === rootChromatic;
    const inScale = scaleMidi.has(midi);
    if (isRoot && inScale) return "bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-300";
    if (inScale)           return "bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-500";
    return "bg-zinc-900 hover:bg-zinc-700 active:bg-zinc-600";
  }

  const octaves = [octave, octave + 1];

  return (
    <div className="space-y-3">
      {/* ── Presets ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Tooltip content="Quick-select a popular key + scale combo">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Presets</span>
        </Tooltip>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => {
            const active = root === p.root && scale === p.scale;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => { onRootChange(p.root); onScaleChange(p.scale); }}
                aria-pressed={active}
                title={`${p.root} ${SCALE_LABELS[p.scale]}`}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-well border-rim text-ink-dim hover:text-ink hover:border-indigo-400/50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
          <span className="text-base" aria-hidden="true">🎹</span>
          Keyboard
        </span>

        {/* Root / Key */}
        <div className="flex items-center gap-1.5">
          <Tooltip content="Root key — the tonal centre of the scale">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Key</span>
          </Tooltip>
          <div className="flex flex-wrap gap-0.5 rounded-lg bg-well border border-rim p-0.5">
            {NOTE_NAMES.map((note) => (
              <Tooltip key={note} content={`Set ${note} as root key`}>
                <button
                  type="button"
                  onClick={() => onRootChange(note)}
                  aria-pressed={root === note}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold transition-colors ${
                    root === note
                      ? "bg-indigo-600 text-white"
                      : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {note}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div className="flex items-center gap-1.5">
          <Tooltip content="Scale — determines highlighted keys and available chords">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Scale</span>
          </Tooltip>
          <select
            value={scale}
            onChange={(e) => onScaleChange(e.target.value as ScaleName)}
            className="rounded-lg bg-well border border-rim px-2 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {(Object.keys(SCALE_LABELS) as ScaleName[]).map((s) => (
              <option key={s} value={s}>{SCALE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Octave shift */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Oct</span>
          <Tooltip content="Shift keyboard down one octave">
            <button
              type="button"
              onClick={() => onOctaveChange(Math.max(1, octave - 1))}
              aria-label="Octave down"
              className="h-6 w-6 rounded bg-well border border-rim text-ink-dim hover:bg-rim flex items-center justify-center text-sm transition-colors"
            >
              ‹
            </button>
          </Tooltip>
          <span className="text-xs font-mono text-ink w-4 text-center">{octave}</span>
          <Tooltip content="Shift keyboard up one octave">
            <button
              type="button"
              onClick={() => onOctaveChange(Math.min(6, octave + 1))}
              aria-label="Octave up"
              className="h-6 w-6 rounded bg-well border border-rim text-ink-dim hover:bg-rim flex items-center justify-center text-sm transition-colors"
            >
              ›
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Piano keyboard ── */}
      <div
        className="flex rounded-lg overflow-hidden border border-rim"
        style={{ height: "96px" }}
      >
        {octaves.map((oct) => {
          return (
            <div key={oct} className="relative flex flex-1 h-full">
              {/* White keys */}
              {WHITE_KEY_OFFSETS.map((offset) => {
                const midi = (oct + 1) * 12 + offset;
                const isArmed   = midi === selectedNote;
                const isPlaying = activeNotes?.includes(midi);
                return (
                  <button
                    key={offset}
                    type="button"
                    onPointerDown={(e) => { e.preventDefault(); onPlayNote(midi); }}
                    aria-label={`${NOTE_NAMES[offset]}${oct}`}
                    className={`flex-1 h-full border-r border-zinc-300 dark:border-zinc-500 transition-colors select-none rounded-b-sm ${whiteKeyClass(midi)} ${isArmed ? "ring-2 ring-inset ring-emerald-500 z-10 relative" : ""} ${isPlaying && !isArmed ? "ring-2 ring-inset ring-emerald-400 z-10 relative" : ""}`}
                  />
                );
              })}
              {/* Black keys (absolutely positioned) */}
              {BLACK_KEYS.map(({ offset, leftPct }) => {
                const midi = (oct + 1) * 12 + offset;
                const isArmed   = midi === selectedNote;
                const isPlaying = activeNotes?.includes(midi);
                return (
                  <button
                    key={offset}
                    type="button"
                    onPointerDown={(e) => { e.preventDefault(); onPlayNote(midi); }}
                    aria-label={`${NOTE_NAMES[offset]}${oct}`}
                    style={{ left: `${leftPct}%`, width: "8.57%", height: "60%", top: 0 }}
                    className={`absolute z-10 rounded-b-sm transition-colors select-none ${blackKeyClass(midi)} ${isArmed || isPlaying ? "ring-2 ring-emerald-400 z-20" : ""}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Octave note labels ── */}
      <div className="flex text-[9px] font-mono text-ink-ghost select-none px-0.5 gap-0">
        {octaves.map((oct) =>
          WHITE_KEY_OFFSETS.map((offset) => (
            <span key={`${oct}-${offset}`} className="flex-1 text-center">
              {NOTE_NAMES[offset]}
            </span>
          ))
        )}
      </div>

      {/* ── Chord buttons ── */}
      {chords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim">
            Chords
          </span>
          {/* Armed chord indicator */}
          {selectedChord && selectedChord.length > 0 && (
            <span className="text-xs font-mono bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded px-2 py-0.5">
              armed: {selectedChord.map((m) => NOTE_NAMES[m % 12]).join("+")}
            </span>
          )}
          {chords.map((chord, i) => {
            const isArmed = selectedChord != null &&
              selectedChord.length === chord.midiNotes.length &&
              chord.midiNotes.every((n, j) => n === selectedChord[j]);
            return (
              <Tooltip
                key={i}
                content={`${chord.degree} — ${chord.label}  (${chord.midiNotes.map(midiToName).join(" ")})`}
              >
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); onPlayChord(chord.midiNotes); onArmChord?.(chord.midiNotes); }}
                  aria-pressed={isArmed}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
                    isArmed
                      ? "bg-amber-500/30 border-amber-400 text-amber-300 ring-1 ring-amber-400"
                      : chord.quality === "maj"
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30"
                      : chord.quality === "min"
                      ? "bg-zinc-700/30 border-zinc-600/50 text-ink-dim hover:bg-zinc-700/50"
                      : chord.quality === "dim"
                      ? "bg-red-900/20 border-red-700/40 text-red-400 hover:bg-red-900/30"
                      : chord.quality === "aug"
                      ? "bg-amber-900/20 border-amber-700/40 text-amber-400 hover:bg-amber-900/30"
                      : "bg-well border-rim text-ink-dim hover:bg-rim"
                  }`}
                >
                  <span className="text-[9px] font-mono mr-0.5 opacity-60">{chord.degree}</span>
                  {chord.label}
                </button>
              </Tooltip>
            );
          })}
          {/* Dismiss armed chord */}
          {selectedChord && selectedChord.length > 0 && (
            <button
              type="button"
              onClick={() => onArmChord?.([])}
              className="text-xs text-ink-ghost hover:text-ink-dim px-1"
              title="Clear armed chord"
            >
              × clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
