"use client";
import React, { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface StepGridProps {
  steps: boolean[];
  currentStep: number | null;
  trackIndex: number;
  /** Called on pointer-down (start of click or drag) — page should push undo history here */
  onPaintStart: (step: number, value: boolean) => void;
  /** Called on pointer-enter while dragging — no undo push needed */
  onPaint: (step: number, value: boolean) => void;
  /** Hold/long-press or right-click an active step to set velocity via a picker. */
  onVelocityChange?: (step: number, velocity: number) => void;
  disabled?: boolean;
  trackColor?: string;
  /** Optional note labels (e.g. "C4") shown inside active steps for melody tracks */
  noteLabels?: (string | null)[];
  /** Per-step velocity 0–1. Defaults to 1.0 when not provided. */
  velocities?: number[];
  /** Highlight these steps with a selection ring */
  selection?: [number, number] | null;
  /** When true, dragging selects a range instead of painting steps */
  selectionMode?: boolean;
  /** Called while dragging in selection mode */
  onRangeSelect?: (start: number, end: number) => void;
  /** Per-step note duration in steps (melody tracks). Default 1. */
  durations?: number[];
  /** Hold/long-press or right-click an active step to set duration via a picker. */
  onDurationChange?: (step: number, duration: number) => void;
  /** Total steps in the pattern — caps which note lengths are offered in the picker. */
  stepCount?: number;
}

/** How long to hold before the picker appears (ms) */
const LONG_PRESS_MS = 440;

/** Standard musical note lengths expressed as 16th-note step counts */
const NOTE_LENGTHS = [
  { steps: 1,  label: "1/16", name: "sixteenth"     },
  { steps: 2,  label: "1/8",  name: "eighth"         },
  { steps: 3,  label: "3/16", name: "dotted eighth"  },
  { steps: 4,  label: "1/4",  name: "quarter"        },
  { steps: 6,  label: "3/8",  name: "dotted quarter" },
  { steps: 8,  label: "1/2",  name: "half"           },
  { steps: 12, label: "3/4",  name: "dotted half"    },
  { steps: 16, label: "1/1",  name: "whole"          },
] as const;

/** Map a step-count duration to its musical fraction label (e.g. 4 → "1/4") */
function stepsToLabel(d: number): string {
  return NOTE_LENGTHS.find((n) => n.steps === d)?.label ?? `${d}s`;
}

export function StepGrid({
  steps, currentStep, trackIndex,
  onPaintStart, onPaint, onVelocityChange,
  disabled, trackColor, noteLabels, velocities,
  selection, selectionMode, onRangeSelect,
  durations, onDurationChange, stepCount,
}: StepGridProps) {
  const activeColor = trackColor ?? "#6366f1";
  const activeGlow  = `${activeColor}55`;

  /** Tracks whether a paint drag is in progress and what value we're painting */
  const paintRef = useRef<{ value: boolean; lastStep: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  /** Tracks the anchor step when dragging in selection mode */
  const rangeStartRef = useRef<number | null>(null);

  // ── Long-press / picker ────────────────────────────────────────────────────
  const longTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPosRef      = useRef<{ x: number; y: number } | null>(null);
  /**
   * When pressing an active step we defer the erase so a long-press can
   * intercept it and open the picker instead.
   */
  const pendingEraseRef = useRef<(() => void) | null>(null);
  const [picker, setPicker] = useState<{
    step: number; x: number; y: number; above: boolean;
  } | null>(null);

  const hasPicker = !!(onDurationChange || onVelocityChange);

  function clearLongTimer() {
    if (longTimerRef.current) { clearTimeout(longTimerRef.current); longTimerRef.current = null; }
    longPosRef.current = null;
  }

  function flushPendingErase() {
    const fn = pendingEraseRef.current;
    pendingEraseRef.current = null;
    clearLongTimer();
    if (fn) fn();
  }

  useEffect(() => {
    function globalStop() {
      paintRef.current      = null;
      rangeStartRef.current = null;
      flushPendingErase();
    }
    window.addEventListener("pointerup",     globalStop);
    window.addEventListener("pointercancel", globalStop);
    return () => {
      window.removeEventListener("pointerup",     globalStop);
      window.removeEventListener("pointercancel", globalStop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes picker
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPicker(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker]);

  /** Find which step button is under (x, y) by walking data-step attributes */
  const stepAtPoint = useCallback((x: number, y: number): number | null => {
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

  /** Walk up from an event target to find the step index + its DOMRect. */
  function stepFromTarget(target: EventTarget): { step: number; rect: DOMRect } | null {
    let node: Element | null = target as Element;
    while (node && node !== containerRef.current) {
      const s = (node as HTMLElement).dataset?.step;
      if (s !== undefined) return { step: parseInt(s, 10), rect: node.getBoundingClientRect() };
      node = node.parentElement;
    }
    return null;
  }

  function openPicker(step: number, rect: DOMRect) {
    const above = rect.top > 120;
    setPicker({ step, x: rect.left + rect.width / 2, y: above ? rect.top : rect.bottom, above });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    // Moved > 5 px while long-press is pending → cancel timer and flush deferred erase
    if (longPosRef.current) {
      const dx = e.clientX - longPosRef.current.x;
      const dy = e.clientY - longPosRef.current.y;
      if (dx * dx + dy * dy > 25) {
        clearLongTimer();
        if (pendingEraseRef.current) {
          const fn = pendingEraseRef.current;
          pendingEraseRef.current = null;
          fn(); // fire erase so drag-to-erase works normally
        }
      }
    }
    // Selection-mode drag: extend the range
    if (selectionMode) {
      if (rangeStartRef.current === null) return;
      const step = stepAtPoint(e.clientX, e.clientY);
      if (step === null) return;
      onRangeSelect?.(
        Math.min(rangeStartRef.current, step),
        Math.max(rangeStartRef.current, step),
      );
      return;
    }
    if (!paintRef.current) return;
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
    <>
      <div
        ref={containerRef}
        className={`flex gap-1 select-none touch-none${selectionMode ? " cursor-crosshair" : ""}`}
        role="group"
        aria-label={`Track ${trackIndex + 1} steps`}
        onPointerMove={handlePointerMove}
        onContextMenu={(e) => {
          // Desktop right-click: open picker immediately (no long-press wait needed)
          e.preventDefault();
          if (disabled || !hasPicker) return;
          const info = stepFromTarget(e.target as EventTarget);
          if (!info || !stepsRef.current[info.step]) return;
          openPicker(info.step, info.rect);
        }}
      >
      {steps.map((active, i) => {
        const label    = noteLabels?.[i] ?? null;
        const vel      = velocities?.[i] ?? 1.0;
        const dur      = durations?.[i] ?? 1;
        // Dim active steps according to velocity level
        const opacity = active ? (vel > 0.6 ? 1 : vel > 0.3 ? 0.55 : 0.3) : 1;
        const inSel = selection != null && i >= selection[0] && i <= selection[1];
        // A step is "held" if a previous step's duration reaches into it
        const isHeld = !active && (() => {
          for (let j = Math.max(0, i - 15); j < i; j++) {
            if (steps[j] && (durations?.[j] ?? 1) > i - j) return true;
          }
          return false;
        })();
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
              } : isHeld ? {
                borderColor: activeColor + "99",
                backgroundColor: activeColor + "33",
              } : undefined}
              onPointerDown={(e) => {
                if (disabled) return;
                e.preventDefault();
                (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                if (selectionMode) {
                  rangeStartRef.current = i;
                  onRangeSelect?.(i, i);
                  return;
                }
                if (e.button !== 0) return; // right/middle handled by container onContextMenu

                if (active && hasPicker) {
                  // Defer the erase so a long-press can open the picker instead
                  longPosRef.current      = { x: e.clientX, y: e.clientY };
                  paintRef.current        = { value: false, lastStep: i };
                  pendingEraseRef.current = () => onPaintStart(i, false);
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  longTimerRef.current = setTimeout(() => {
                    longTimerRef.current    = null;
                    pendingEraseRef.current = null; // cancel the deferred erase
                    paintRef.current        = null;
                    openPicker(i, rect);
                  }, LONG_PRESS_MS);
                } else {
                  const newVal = !active;
                  paintRef.current = { value: newVal, lastStep: i };
                  onPaintStart(i, newVal);
                }
              }}
              className={cn(
                "h-7 w-7 min-w-7 sm:h-8 sm:w-8 sm:min-w-8 shrink-0 rounded transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900",
                "flex items-center justify-center relative",
                active
                  ? "hover:brightness-110"
                  : isHeld
                    ? "border"
                    : "bg-well hover:bg-rim border border-rim",
                currentStep === i && active  && "ring-2 ring-white/70 ring-offset-1 ring-offset-zinc-900",
                currentStep === i && !active && "bg-rim",
                inSel    && "ring-2 ring-sky-400/70 ring-offset-1 ring-offset-zinc-900",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {/* Held-note continuation bar */}
              {isHeld && (
                <span
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[5px] pointer-events-none"
                  style={{ backgroundColor: activeColor + "cc" }}
                  aria-hidden="true"
                />
              )}

              {/* Note label */}
              {active && label && (
                <span className="text-[8px] font-mono font-bold leading-none text-white/90 select-none pointer-events-none z-10">
                  {label}
                </span>
              )}

              {/* Duration badge — centered when no label */}
              {active && dur > 1 && !label && (
                <span className="text-[9px] font-bold leading-none text-white/95 select-none pointer-events-none z-10">
                  {stepsToLabel(dur)}
                </span>
              )}
              {/* Duration badge — tiny corner overlay when note label is also shown */}
              {active && dur > 1 && label && (
                <span className="absolute bottom-0.5 right-0.5 text-[6px] font-bold leading-none text-white/85 select-none pointer-events-none z-10 bg-black/25 rounded-sm px-px">
                  {stepsToLabel(dur)}
                </span>
              )}

              {/* Velocity indicator — drum tracks only (onVelocityChange present, no onDurationChange) */}
              {active && !label && onVelocityChange && !onDurationChange && vel < 0.9 && dur === 1 && (
                <span className="text-[7px] font-bold leading-none text-white/75 select-none pointer-events-none z-10">
                  {vel < 0.4 ? "p" : "m"}
                </span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>

    {/* Duration / velocity picker — rendered in a portal so it is never clipped */}
    {picker !== null && typeof document !== "undefined" && createPortal(
      <>
        {/* Transparent backdrop — tap/click outside closes picker */}
        <div
          className="fixed inset-0 z-[9998]"
          onPointerDown={() => setPicker(null)}
          aria-hidden="true"
        />

        {/* Picker panel */}
        <div
          role="dialog"
          aria-label={onDurationChange ? "Note duration" : "Note velocity"}
          className="fixed z-[9999]"
          style={{
            left: picker.x,
            top:  picker.above ? picker.y - 8 : picker.y + 8,
            transform: picker.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          }}
        >
          {/* Upward caret when panel opens below the cell */}
          {!picker.above && (
            <div
              className="mx-auto mb-[-1px] w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-rim"
              aria-hidden="true"
            />
          )}

          <div className="bg-panel border border-rim rounded-xl shadow-2xl p-2 flex flex-col gap-2 min-w-max">
            <span className="text-[10px] font-semibold text-ink-ghost text-center leading-none">
              {onDurationChange ? "Note length" : "Velocity"}
            </span>
            <div className="flex gap-1.5">
              {onDurationChange
                ? NOTE_LENGTHS.filter((n) => n.steps <= (stepCount ?? 16)).map(({ steps: s, label: noteLabel, name: noteName }) => {
                    const cur = durations?.[picker.step] ?? 1;
                    return (
                      <button
                        key={s}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => { onDurationChange(picker.step, s); setPicker(null); }}
                        title={noteName}
                        className={cn(
                          "h-10 w-9 rounded-lg text-xs font-bold transition-colors flex flex-col items-center justify-center gap-0.5",
                          cur === s
                            ? "bg-indigo-500 text-white shadow-sm"
                            : "bg-well text-ink-dim hover:bg-rim hover:text-ink",
                        )}
                      >
                        {noteLabel}
                        <span className="text-[6px] font-normal opacity-60 leading-none">
                          {s === 1 ? "1 step" : `${s} steps`}
                        </span>
                      </button>
                    );
                  })
                : onVelocityChange
                ? [
                    { dots: "●●●", value: 1.0,  label: "Full" },
                    { dots: "●●",  value: 0.5,  label: "Med"  },
                    { dots: "●",   value: 0.25, label: "Soft" },
                  ].map(({ dots, value, label }) => {
                    const v = velocities?.[picker.step] ?? 1.0;
                    const isOn =
                      (value === 1.0  && v >  0.6) ||
                      (value === 0.5  && v >  0.3 && v <= 0.6) ||
                      (value === 0.25 && v <= 0.3);
                    return (
                      <button
                        key={label}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => { onVelocityChange(picker.step, value); setPicker(null); }}
                        className={cn(
                          "h-10 px-3 rounded-lg text-xs font-bold transition-colors flex flex-col items-center justify-center gap-0.5",
                          isOn
                            ? "bg-indigo-500 text-white shadow-sm"
                            : "bg-well text-ink-dim hover:bg-rim hover:text-ink",
                        )}
                      >
                        <span className="text-[13px] leading-none">{dots}</span>
                        <span className="text-[7px] font-normal opacity-70 leading-none">{label}</span>
                      </button>
                    );
                  })
                : null}
            </div>
          </div>

          {/* Downward caret when panel opens above the cell */}
          {picker.above && (
            <div
              className="mx-auto mt-[-1px] w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-rim"
              aria-hidden="true"
            />
          )}
        </div>
      </>,
      document.body,
    )}
  </>
  );
}
