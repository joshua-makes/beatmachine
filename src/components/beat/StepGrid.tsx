"use client";
import React, { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface StepGridProps {
  steps: boolean[];
  currentStep: number | null;
  trackIndex: number;
  /** Called on pointer-down (start of click or drag) — page should push undo history here */
  onPaintStart: (step: number, value: boolean) => void;
  /** Called on pointer-enter while dragging — no undo push needed */
  onPaint: (step: number, value: boolean) => void;
  /** Right-click an active step to cycle its velocity: 1.0 → 0.5 → 0.25 → 1.0 */
  onVelocityChange?: (step: number, velocity: number) => void;
  disabled?: boolean;
  trackColor?: string;
  /** Optional note labels (e.g. "C4") shown inside active steps for melody tracks */
  noteLabels?: (string | null)[];
  /** Per-step velocity 0–1. Defaults to 1.0 when not provided. */
  velocities?: number[];
}

export function StepGrid({
  steps, currentStep, trackIndex,
  onPaintStart, onPaint, onVelocityChange,
  disabled, trackColor, noteLabels, velocities,
}: StepGridProps) {
  const activeColor = trackColor ?? "#6366f1";
  const activeGlow  = `${activeColor}55`;
  /** Tracks whether a paint drag is in progress and what value we're painting */
  const paintRef = useRef<{ value: boolean; lastStep: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep a live ref to steps so the pointermove handler always sees current values
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    function stop() { paintRef.current = null; }
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  /** Find which step button is under (x, y) by walking data-step attributes */
  const stepAtPoint = useCallback((x: number, y: number): number | null => {
    // Use elementsFromPoint to check all layers (handles cases where pointer is
    // over a child span inside the button, or briefly over a gap spacer)
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      let node: Element | null = el;
      while (node) {
        const s = (node as HTMLElement).dataset?.step;
        if (s !== undefined) return parseInt(s, 10);
        if (node === containerRef.current) break;
        node = node.parentElement;
      }
    }
    return null;
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || !paintRef.current) return;
    const step = stepAtPoint(e.clientX, e.clientY);
    if (step === null || step === paintRef.current.lastStep) return;
    // Paint all steps between lastStep and this one so fast drags don't skip cells
    const from = paintRef.current.lastStep;
    const to   = step;
    const dir  = to > from ? 1 : -1;
    for (let s = from + dir; s !== to + dir; s += dir) {
      if (stepsRef.current[s] !== paintRef.current.value) {
        onPaint(s, paintRef.current.value);
      }
    }
    paintRef.current.lastStep = step;
  }

  return (
    <div
      ref={containerRef}
      className="flex gap-1 select-none touch-none"
      role="group"
      aria-label={`Track ${trackIndex + 1} steps`}
      onPointerMove={handlePointerMove}
    >
      {steps.map((active, i) => {
        const label = noteLabels?.[i] ?? null;
        const vel   = velocities?.[i] ?? 1.0;
        // Dim active steps according to velocity level
        const opacity = active ? (vel > 0.6 ? 1 : vel > 0.3 ? 0.55 : 0.3) : 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && i % 4 === 0 && <div className="w-1.5 shrink-0" aria-hidden="true" />}
            <button
              type="button"
              data-step={i}
              aria-pressed={active}
              aria-label={label ? `${label} — Track ${trackIndex + 1} step ${i + 1}` : `Track ${trackIndex + 1} step ${i + 1}`}
              disabled={disabled}
              style={active ? {
                backgroundColor: activeColor,
                boxShadow: `0 0 7px 1px ${activeGlow}`,
                opacity,
              } : undefined}
              onPointerDown={(e) => {
                if (disabled || e.button !== 0) return;
                e.preventDefault();
                // Capture the pointer so move/up events keep firing even if the
                // finger/cursor leaves the button or the container entirely
                (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                const newVal = !active;
                paintRef.current = { value: newVal, lastStep: i };
                onPaintStart(i, newVal);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (disabled || !active || !onVelocityChange) return;
                // Cycle: full → medium → ghost → full
                const next = vel > 0.6 ? 0.5 : vel > 0.3 ? 0.25 : 1.0;
                onVelocityChange(i, next);
              }}
              className={cn(
                "h-7 w-7 min-w-7 sm:h-8 sm:w-8 sm:min-w-8 shrink-0 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900",
                "flex items-center justify-center relative",
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
              {/* Velocity indicator: "m" = mezzo (0.5), "p" = piano (0.25) */}
              {active && !label && vel < 0.9 && (
                <span className="text-[7px] font-bold leading-none text-white/75 select-none pointer-events-none">
                  {vel < 0.4 ? "p" : "m"}
                </span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
