"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface StepGridProps {
  steps: boolean[];
  currentStep: number | null;
  trackIndex: number;
  onToggle: (step: number) => void;
  disabled?: boolean;
}

export function StepGrid({ steps, currentStep, trackIndex, onToggle, disabled }: StepGridProps) {
  return (
    <div className="flex gap-0.5 overflow-x-auto" role="group" aria-label={`Track ${trackIndex + 1} steps`}>
      {steps.map((active, i) => (
        <React.Fragment key={i}>
          {i > 0 && i % 4 === 0 && <div className="w-1" aria-hidden="true" />}
          <button
            type="button"
            aria-pressed={active}
            aria-label={`Track ${trackIndex + 1} step ${i + 1}`}
            onClick={() => onToggle(i)}
            disabled={disabled}
            className={cn(
              "h-8 w-8 min-w-8 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
              active
                ? "bg-indigo-500 border-indigo-400 hover:bg-indigo-400"
                : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
              currentStep === i && "ring-2 ring-white ring-offset-1 ring-offset-zinc-900",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
