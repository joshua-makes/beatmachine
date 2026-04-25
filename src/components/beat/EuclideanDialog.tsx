"use client";
import React, { useState } from "react";
import { euclidean } from "@/lib/euclidean";

interface EuclideanDialogProps {
  stepCount: number;
  onApply: (steps: boolean[]) => void;
  onClose: () => void;
}

// Famous euclidean rhythm presets for education
const PRESETS = [
  { hits: 2, label: "2 in 16 — half-time kick" },
  { hits: 3, label: "3 in 16 — tresillo feel" },
  { hits: 4, label: "4 in 16 — four-on-the-floor" },
  { hits: 5, label: "5 in 16 — quintillo" },
  { hits: 7, label: "7 in 16 — afro-cuban" },
];

export function EuclideanDialog({ stepCount, onApply, onClose }: EuclideanDialogProps) {
  const [hits, setHits] = useState(4);
  const preview = euclidean(hits, stepCount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-panel border border-rim rounded-xl shadow-2xl w-80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Euclidean Rhythm</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-ghost hover:text-ink text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-ink-dim leading-relaxed">
          Distributes <strong className="text-ink">{hits}</strong> hits evenly across{" "}
          <strong className="text-ink">{stepCount}</strong> steps using the Bjorklund algorithm.
        </p>

        {/* Hits slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-ink-dim">
            <span>Hits</span>
            <span className="font-mono font-bold text-ink">{hits}</span>
          </div>
          <input
            type="range"
            min={1}
            max={stepCount}
            value={hits}
            onChange={(e) => setHits(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Preset quick-picks */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-ink-ghost font-semibold">Quick picks</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.hits}
                type="button"
                onClick={() => setHits(p.hits)}
                className={`rounded px-2 py-0.5 text-[11px] font-mono border transition-colors ${
                  hits === p.hits
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-well border-rim text-ink-dim hover:text-ink"
                }`}
                title={p.label}
              >
                {p.hits}
              </button>
            ))}
          </div>
        </div>

        {/* Preview grid */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-ink-ghost font-semibold">Preview</span>
          <div className="flex flex-wrap gap-1">
            {preview.map((on, i) => (
              <React.Fragment key={i}>
                {i > 0 && i % 4 === 0 && <div className="w-1 shrink-0" />}
                <div
                  className={`h-5 w-5 rounded-sm border transition-colors ${
                    on
                      ? "bg-indigo-500 border-indigo-400"
                      : "bg-well border-rim"
                  }`}
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => { onApply(preview); onClose(); }}
            className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-well border border-rim hover:bg-rim text-ink-dim text-sm font-semibold py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
