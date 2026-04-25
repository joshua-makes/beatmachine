"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface StepGridProps {
  steps: boolean[];
  currentStep: number | null;
  trackIndex: number;
  onToggle: (step: number) => void;
  disabled?: boolean;
  trackColor?: string;
  /** Optional note labels (e.g. "C4") shown inside active steps for melody tracks */
  noteLabels?: (string | null)[];
}

export function StepGrid({ steps, currentStep, trackIndex, onToggle, disabled, trackColor, noteLabels }: StepGridProps) {
  const activeColor = trackColor ?? "#6366f1";
  const activeGlow  = `${activeColor}55`;
  return (
    <div className="flex gap-1 overflow-x-auto" role="group" aria-label={`Track ${trackIndex + 1} steps`}>
      {steps.map((active, i) => {
        const label = noteLabels?.[i] ?? null;
        return (
          <React.Fragment key={i}>
            {i > 0 && i % 4 === 0 && <div className="w-1.5 shrink-0" aria-hidden="true" />}
            <button
              type="button"
              aria-pressed={active}
              aria-label={label ? `${label} — Track ${trackIndex + 1} step ${i + 1}` : `Track ${trackIndex + 1} step ${i + 1}`}
              onClick={() => onToggle(i)}
              disabled={disabled}
              style={active ? { backgroundColor: activeColor, boxShadow: `0 0 7px 1px ${activeGlow}` } : undefined}
              className={cn(
                "h-8 w-8 min-w-8 shrink-0 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900",
                "flex items-center justify-center",
                active
                  ? "hover:brightness-110"
                  : "bg-well hover:bg-rim border border-rim",
                currentStep === i && active && "ring-2 ring-white/70 ring-offset-1 ring-offset-zinc-900",
                currentStep === i && !active && "bg-rim",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {active && label && (
                <span className="text-[8px] font-mono font-bold leading-none text-white/90 select-none pointer-events-none">
                  {label}
                </span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
