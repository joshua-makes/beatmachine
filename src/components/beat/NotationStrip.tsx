"use client";
import React from "react";

/**
 * NotationStrip — Teach Me panel shown below a track's step grid.
 *
 * Shows each step's rhythmic "name" so kids can connect the grid to music theory:
 *   • Step number inside beats (1, e, +, a  per beat — standard counting syllables)
 *   • Infers approximate note value from runs of consecutive active steps
 *   • Shows beat groupings and a concise legend
 */

interface NotationStripProps {
  steps: boolean[];
  currentStep: number | null;
  isPlaying: boolean;
}

/** Standard counting syllables for 16th-note positions within a beat */
const BEAT_SYLLABLES = ["1", "e", "+", "a", "2", "e", "+", "a", "3", "e", "+", "a", "4", "e", "+", "a"];

/** Beat number (1-4) for a step index */
function beatOf(step: number) { return Math.floor(step / 4) + 1; }

/** Infer approximate note value for a run of consecutive active steps.
 *  Returns a label + color class. */
function inferNoteValue(steps: boolean[], i: number): { symbol: string; label: string; color: string } | null {
  if (!steps[i]) return null;
  // Count the run of active steps starting at i (not before)
  let run = 0;
  for (let j = i; j < steps.length && steps[j]; j++) run++;

  // Also count backwards to see if we're inside a longer run
  let before = 0;
  for (let j = i - 1; j >= 0 && steps[j]; j--) before++;

  const totalRun = before + run;

  if (totalRun >= 16) return { symbol: "𝅝", label: "Whole note", color: "text-purple-400" };
  if (totalRun >= 8)  return { symbol: "𝅗𝅥", label: "Half note",  color: "text-blue-400" };
  if (totalRun >= 4)  return { symbol: "♩",  label: "Quarter note", color: "text-emerald-400" };
  if (totalRun >= 2)  return { symbol: "♪",  label: "Eighth note",  color: "text-amber-400" };
  return                      { symbol: "♬",  label: "16th note",    color: "text-rose-400" };
}

const NOTE_LEGEND = [
  { symbol: "♬", label: "16th note — very quick", color: "text-rose-400" },
  { symbol: "♪",  label: "8th note — quick",       color: "text-amber-400" },
  { symbol: "♩",  label: "Quarter note — 1 beat",  color: "text-emerald-400" },
  { symbol: "𝅗𝅥", label: "Half note — 2 beats",    color: "text-blue-400" },
  { symbol: "𝅝",  label: "Whole note — 4 beats",   color: "text-purple-400" },
];

export function NotationStrip({ steps, currentStep, isPlaying }: NotationStripProps) {
  const count = steps.length;
  // Clamp to at most 32 steps for display; for 64 steps show in groups of 4 still
  const showSteps = Math.min(count, 32);

  return (
    <div className="mt-1 mb-2 rounded-lg bg-well/60 border border-rim px-2 pt-1.5 pb-2">
      {/* Header */}
      <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-dim mb-1.5">
        🎓 Teach Me — note values
      </p>

      {/* Beat groupings row */}
      <div className="flex gap-1">
        {Array.from({ length: showSteps }, (_, i) => {
          const active = steps[i];
          const isCurrent = isPlaying && currentStep === i;
          const nv = inferNoteValue(steps, i);
          const syl = BEAT_SYLLABLES[i % 16] ?? String(i + 1);
          const beatStart = i % 4 === 0;

          return (
            <React.Fragment key={i}>
              {i > 0 && beatStart && (
                <div className="w-px bg-rim shrink-0 self-stretch" aria-hidden="true" />
              )}
              <div
                className={`flex flex-col items-center gap-0.5 w-7 min-w-7 sm:w-8 sm:min-w-8 shrink-0`}
                title={nv ? `${nv.label} — beat ${beatOf(i)}, "${syl}"` : `Beat ${beatOf(i)}, "${syl}" (rest)`}
              >
                {/* Note symbol */}
                <span className={`text-sm leading-none select-none ${
                  active
                    ? (nv?.color ?? "text-emerald-400")
                    : "text-ink-ghost"
                } ${isCurrent ? "scale-125 inline-block" : ""}`} aria-hidden="true">
                  {active && nv ? nv.symbol : "·"}
                </span>

                {/* Counting syllable */}
                <span className={`text-[8px] sm:text-[9px] font-mono leading-none select-none ${
                  isCurrent
                    ? "text-emerald-400 font-bold"
                    : active
                      ? "text-ink-dim font-semibold"
                      : "text-ink-ghost"
                }`}>
                  {syl}
                </span>

                {/* Beat number dot (only on beat 1 of each group) */}
                {beatStart && (
                  <span className={`text-[7px] font-bold leading-none select-none ${
                    isCurrent && i % 4 === 0 ? "text-emerald-400" : "text-ink-ghost"
                  }`}>
                    {beatOf(i)}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {NOTE_LEGEND.map((n) => (
          <span key={n.symbol} className="flex items-center gap-0.5 text-[9px] text-ink-dim">
            <span className={`text-xs ${n.color}`} aria-hidden="true">{n.symbol}</span>
            {n.label}
          </span>
        ))}
      </div>
    </div>
  );
}
