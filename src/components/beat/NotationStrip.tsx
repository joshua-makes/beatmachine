"use client";
import React from "react";

interface NotationStripProps {
  steps: boolean[];
  currentStep: number | null;
  isPlaying: boolean;
  stepCount: number;
}

type NoteLen = "whole" | "half" | "quarter" | "eighth" | "sixteenth";

function runLength(steps: boolean[], from: number): number {
  let n = 0;
  for (let i = from; i < steps.length && steps[i]; i++) n++;
  return n;
}

function noteLen(steps: boolean[], i: number): NoteLen | null {
  if (!steps[i]) return null;
  const r = runLength(steps, i);
  if (r >= 16) return "whole";
  if (r >= 8)  return "half";
  if (r >= 4)  return "quarter";
  if (r >= 2)  return "eighth";
  return "sixteenth";
}

/** Human counting syllable for step i.
 *  16-step grid: 1 e + a 2 e + a …
 *  32-step grid: beat number on 0, "+" on 4, blank otherwise */
function syllable(i: number, stepCount: number): string {
  if (stepCount <= 16) {
    const beat = Math.floor(i / 4) + 1;
    const sub  = i % 4;
    return sub === 0 ? `${beat}` : sub === 1 ? "e" : sub === 2 ? "+" : "a";
  }
  const beat = Math.floor(i / 8) + 1;
  const sub  = i % 8;
  return sub === 0 ? `${beat}` : sub === 4 ? "+" : "";
}

const DOT_CLASS: Record<NoteLen, string> = {
  whole:     "w-5 h-5 rounded-full",
  half:      "w-4 h-4 rounded-full",
  quarter:   "w-3.5 h-3.5 rounded-full",
  eighth:    "w-2.5 h-2.5 rounded-full",
  sixteenth: "w-1.5 h-1.5 rounded-full",
};

const DOT_BG: Record<NoteLen, string> = {
  whole:     "bg-violet-400",
  half:      "bg-blue-400",
  quarter:   "bg-emerald-400",
  eighth:    "bg-amber-400",
  sixteenth: "bg-rose-400",
};

const DOT_TITLE: Record<NoteLen, string> = {
  whole:     "Whole note — 4 beats",
  half:      "Half note — 2 beats",
  quarter:   "Quarter note — 1 beat",
  eighth:    "Eighth note — half a beat",
  sixteenth: "16th note — very quick!",
};

const LEGEND: [NoteLen, string][] = [
  ["whole",     "Whole — 4 beats"],
  ["half",      "Half — 2 beats"],
  ["quarter",   "Quarter — 1 beat"],
  ["eighth",    "Eighth — ½ beat"],
  ["sixteenth", "16th — very quick"],
];

export function NotationStrip({ steps, currentStep, isPlaying, stepCount }: NotationStripProps) {
  const show = Math.min(steps.length, 32);

  return (
    <div className="mb-2 rounded-lg bg-well/50 border border-rim/60 px-2 pt-2 pb-2.5 overflow-x-auto">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-dim mb-1.5 select-none">
        🎓 Rhythm guide
      </p>

      {/* Cell row — mirrors StepGrid spacing exactly */}
      <div className="flex gap-1">
        {Array.from({ length: show }, (_, i) => {
          const active    = steps[i];
          const isCurrent = isPlaying && currentStep === i;
          const nl        = noteLen(steps, i);
          const syl       = syllable(i, stepCount);
          const onBeat    = i % 4 === 0;
          const andBeat   = i % 4 === 2;

          return (
            <React.Fragment key={i}>
              {/* Same beat-group spacer as StepGrid */}
              {i > 0 && i % 4 === 0 && (
                <div className="w-1.5 shrink-0" aria-hidden="true" />
              )}
              <div
                className="flex flex-col items-center justify-end gap-0.5 w-7 min-w-7 sm:w-8 sm:min-w-8 shrink-0"
                title={nl ? DOT_TITLE[nl] : undefined}
              >
                {/* Dot: size = note length, colour = note family */}
                <div className="flex items-center justify-center h-5 w-full">
                  {active && nl ? (
                    <div
                      className={`${DOT_CLASS[nl]} ${DOT_BG[nl]} transition-transform ${
                        isCurrent ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-900" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-rim opacity-40" />
                  )}
                </div>

                {/* Counting label */}
                {syl && (
                  <span className={[
                    "text-[8px] sm:text-[9px] font-mono leading-none select-none",
                    isCurrent
                      ? "text-white font-bold"
                      : onBeat
                        ? (active ? "text-emerald-400 font-bold" : "text-ink-dim font-bold")
                        : andBeat
                          ? (active ? "text-amber-400" : "text-ink-ghost")
                          : (active ? "text-ink-dim" : "text-ink-ghost/50"),
                  ].join(" ")}>
                    {syl}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 pt-1.5 border-t border-rim/40">
        {LEGEND.map(([nl, label]) => (
          <span key={nl} className="flex items-center gap-1 text-[9px] text-ink-dim select-none">
            <span className={`inline-block ${DOT_CLASS[nl]} ${DOT_BG[nl]} shrink-0`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
