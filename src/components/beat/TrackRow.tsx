"use client";
import React, { useState, useRef } from "react";
import { type TrackState, type SectionType } from "@/lib/pattern";
import { NOTE_NAMES } from "@/lib/scales";
import { SampleSelect } from "./SampleSelect";
import { StepGrid } from "./StepGrid";
import { NotationStrip } from "./NotationStrip";
import { Toggle } from "@/components/ui/Toggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { TRACK_COLORS, cn } from "@/lib/utils";

/** Format MIDI note as e.g. "C4", "F#3" */
function midiLabel(midi: number): string {
  return NOTE_NAMES[midi % 12] + String(Math.floor(midi / 12) - 1);
}

interface TrackRowProps {
  track: TrackState;
  trackIndex: number;
  currentStep: number | null;
  isPlaying: boolean;
  trackColor: string;
  selectedNote: number | null;
  easyMode?: boolean;
  canPaste?: boolean;
  /** Called when the drag handle is pointerdown — parent manages reorder */
  onDragHandlePointerDown?: (e: React.PointerEvent) => void;
  /** Filters the sample picker to only show sounds relevant to this section type */
  sectionType?: SectionType;
  onPaintStart: (step: number, value: boolean) => void;
  onPaint: (step: number, value: boolean) => void;
  onVelocityChange: (step: number, velocity: number) => void;
  onChangeSample: (sampleId: string) => void;
  onChangeVol: (vol: number) => void;
  onChangeProbability: (prob: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onToggleType: () => void;
  onClear: () => void;
  onRandomize: () => void;
  onCopy: () => void;
  onPaste?: () => void;
  onRemove?: () => void;
  onRename: (name: string) => void;
  onEuclidean: () => void;
  onPreviewSample?: (sampleId: string) => void;
  onOctaveOffsetChange?: (offset: number) => void;
  onColorChange?: (color: string) => void;
  teachMode?: boolean;
  stepCount?: number;
  /** Duplicate this track (inserts a copy immediately below) */
  onDuplicate?: () => void;
  /** Rotate all steps one position to the left (wraps) */
  onShiftLeft?: () => void;
  /** Rotate all steps one position to the right (wraps) */
  onShiftRight?: () => void;
  /** True when the step-range clipboard has content to paste */
  canPasteRange?: boolean;
  onCopyRange?: (start: number, end: number) => void;
  onPasteRange?: (at: number) => void;
  onFillFromRange?: (start: number, end: number) => void;
  /** Melody tracks: right-click cycles note duration (1→2→3→4 steps) */
  onDurationChange?: (step: number, duration: number) => void;
}

export function TrackRow({
  track,
  trackIndex,
  currentStep,
  isPlaying,
  trackColor,
  selectedNote,
  easyMode = false,
  canPaste = false,
  sectionType,
  onDragHandlePointerDown,
  onPaintStart,
  onPaint,
  onVelocityChange,
  onChangeSample,
  onChangeVol,
  onChangeProbability,
  onToggleMute,
  onToggleSolo,
  onToggleType,
  onClear,
  onRandomize,
  onCopy,
  onPaste,
  onRemove,
  onRename,
  onEuclidean,
  onPreviewSample,
  onOctaveOffsetChange,
  onColorChange,
  teachMode = false,
  stepCount,
  onDuplicate,
  onShiftLeft,
  onShiftRight,
  canPasteRange = false,
  onCopyRange,
  onPasteRange,
  onFillFromRange,
  onDurationChange,
}: TrackRowProps) {
  const isMelody = track.type === "melody";
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(track.name ?? "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<[number, number] | null>(null);

  // Build note labels for melody steps
  const noteLabels = isMelody
    ? track.notes.map((midi) => {
        if (midi == null) return null;
        if (Array.isArray(midi)) return (midi as number[]).map((m) => NOTE_NAMES[m % 12]).join("+");
        return midiLabel(midi as number);
      })
    : undefined;

  // Per-track probability (avg across all steps)
  const avgProb = track.probability.length > 0
    ? track.probability.reduce((a, b) => a + b, 0) / track.probability.length
    : 1;

  function commitName() {
    setEditingName(false);
    onRename(nameValue.trim());
  }

  const displayName = track.name?.trim() || null;

  return (
    <div
      className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-opacity ${track.mute ? "opacity-40" : ""}`}
      data-track-index={trackIndex}
    >
      {/* Drag handle — hidden on mobile (HTML5 drag doesn't work on touch) */}
      <div
        onPointerDown={onDragHandlePointerDown}
        className="hidden sm:flex w-5 h-full items-center justify-center cursor-grab active:cursor-grabbing text-ink-ghost hover:text-ink-dim select-none shrink-0 touch-none text-base"
        aria-label="Drag to reorder track"
        title="Drag to reorder"
      >
        ⠿
      </div>

      {/* Track controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 w-48 min-w-48 sm:w-60 sm:min-w-60 shrink-0">
        {/* Color strip — click to cycle through palette */}
        <Tooltip content="Click to change track color">
          <button
            type="button"
            onClick={() => {
              if (!onColorChange) return;
              const idx = TRACK_COLORS.indexOf(trackColor as typeof TRACK_COLORS[number]);
              const next = TRACK_COLORS[(idx + 1) % TRACK_COLORS.length];
              onColorChange(next);
            }}
            className="w-1 h-7 rounded-full shrink-0 cursor-pointer hover:scale-125 transition-transform"
            style={{ backgroundColor: trackColor }}
            aria-label="Change track color"
          />
        </Tooltip>

        {/* Mute / Solo — front of track */}
        <Toggle pressed={track.mute} onToggle={onToggleMute} label="M" variant="mute" tooltip={track.mute ? "Unmute this track" : "Mute this track"} />
        <Toggle pressed={track.solo} onToggle={onToggleSolo} label="S" variant="solo" tooltip={track.solo ? "Unsolo" : "Solo — mute all other tracks"} />

        {/* Track number / inline rename */}
        {editingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={nameValue}
            maxLength={12}
            autoFocus
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") { setEditingName(false); setNameValue(track.name ?? ""); }
            }}
            className="w-10 sm:w-14 rounded bg-well border border-indigo-500 px-1 py-0 text-xs font-mono text-ink focus:outline-none"
          />
        ) : (
          <Tooltip content="Click to rename this track">
            <button
              type="button"
              onClick={() => { setNameValue(track.name ?? ""); setEditingName(true); }}
              className="text-xs font-mono text-ink-ghost hover:text-ink-dim w-10 sm:w-14 text-right shrink-0 truncate"
              aria-label="Rename track"
            >
              {displayName ?? `${trackIndex + 1}`}
            </button>
          </Tooltip>
        )}

        {/* Type toggle — hidden in easy mode */}
        {!easyMode && (
          <Tooltip content={isMelody ? "Switch to drum/sample track" : "Switch to melody track (uses piano notes)"} position="right">
            <button
              type="button"
              onClick={onToggleType}
              className="text-sm shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-well transition-colors"
              aria-label={isMelody ? "Switch to drum" : "Switch to melody"}
            >
              {isMelody ? "🎵" : "🥁"}
            </button>
          </Tooltip>
        )}

        {isMelody ? (
          <div className="flex flex-col min-w-0 flex-1 gap-0.5">
            <span className="text-[11px] font-semibold text-indigo-400 leading-tight">Melody</span>
            {selectedNote !== null ? (
              <span className="text-[9px] text-emerald-400 font-mono leading-tight">
                ● armed: {midiLabel(selectedNote)}
              </span>
            ) : (
              <span className="text-[9px] text-ink-ghost leading-tight">click a key to arm</span>
            )}
            {/* Octave offset control for melody tracks */}
            {onOctaveOffsetChange && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onOctaveOffsetChange(Math.max(-3, (track.octaveOffset ?? 0) - 1))}
                  disabled={(track.octaveOffset ?? 0) <= -3}
                  className="h-3.5 w-3.5 flex items-center justify-center rounded text-[9px] text-ink-ghost hover:text-ink hover:bg-well transition-colors disabled:opacity-30"
                  aria-label="Octave down"
                >−</button>
                <span className="text-[9px] font-mono text-ink-dim w-7 text-center">
                  {(track.octaveOffset ?? 0) === 0 ? "oct" : `oct${(track.octaveOffset ?? 0) > 0 ? "+" : ""}${track.octaveOffset ?? 0}`}
                </span>
                <button
                  type="button"
                  onClick={() => onOctaveOffsetChange(Math.min(3, (track.octaveOffset ?? 0) + 1))}
                  disabled={(track.octaveOffset ?? 0) >= 3}
                  className="h-3.5 w-3.5 flex items-center justify-center rounded text-[9px] text-ink-ghost hover:text-ink hover:bg-well transition-colors disabled:opacity-30"
                  aria-label="Octave up"
                >+</button>
              </div>
            )}

          </div>
        ) : (
          <>
            <Tooltip content="Choose which drum or instrument sound this track plays">
              <SampleSelect
                value={track.sampleId}
                trackIndex={trackIndex}
                sectionType={sectionType}
                onChange={(sampleId) => {
                  onChangeSample(sampleId);
                  onPreviewSample?.(sampleId);
                }}
              />
            </Tooltip>
            {onPreviewSample && (
              <Tooltip content={`Hear the sound: ${track.sampleId}`}>
                <button
                  type="button"
                  onClick={() => onPreviewSample(track.sampleId)}
                  className="h-5 w-5 flex items-center justify-center rounded text-ink-ghost hover:text-emerald-400 hover:bg-well text-[10px] transition-colors shrink-0"
                  aria-label="Preview sample"
                >
                  ▶
                </button>
              </Tooltip>
            )}
          </>
        )}
      </div>

      {/* Step grid + optional notation strip */}
      <div className="flex flex-col shrink-0 overflow-visible">
        <StepGrid
          steps={track.steps}
          currentStep={isPlaying ? currentStep : null}
          trackIndex={trackIndex}
          trackColor={isMelody ? "#6366f1" : trackColor}
          onPaintStart={onPaintStart}
          onPaint={onPaint}
          onVelocityChange={isMelody ? undefined : onVelocityChange}
          onDurationChange={isMelody ? onDurationChange : undefined}
          durations={isMelody ? track.durations : undefined}
          noteLabels={noteLabels}
          velocities={track.velocity}
          stepCount={stepCount}
          selection={selection}
          selectionMode={selectionMode}
          onRangeSelect={(start, end) => setSelection([start, end])}
        />
        {/* Range selection action bar */}
        {selectionMode && selection && (
          <div className="flex items-center gap-1 pt-1 flex-wrap">
            <span className="text-[10px] font-mono text-sky-400 shrink-0">
              steps {selection[0] + 1}–{selection[1] + 1}
            </span>
            <button
              type="button"
              onClick={() => { onCopyRange?.(selection[0], selection[1]); }}
              className="h-5 px-1.5 rounded text-[10px] font-medium bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition-colors"
            >Copy</button>
            {canPasteRange && (
              <button
                type="button"
                onClick={() => { onPasteRange?.(selection[0]); }}
                className="h-5 px-1.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
              >Paste here</button>
            )}
            <button
              type="button"
              onClick={() => { onFillFromRange?.(selection[0], selection[1]); }}
              className="h-5 px-1.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >Fill →</button>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="h-5 w-5 flex items-center justify-center rounded text-[10px] text-ink-ghost hover:text-rose-400 hover:bg-well transition-colors"
              aria-label="Clear selection"
            >✕</button>
          </div>
        )}
        {teachMode && (
          <NotationStrip
            steps={track.steps}
            currentStep={isPlaying ? currentStep : null}
            isPlaying={isPlaying}
            stepCount={stepCount ?? track.steps.length}
          />
        )}
      </div>

      {/* Per-track volume + quick actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Tooltip content={`Track volume: ${Math.round(track.vol * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.vol}
            onChange={(e) => onChangeVol(parseFloat(e.target.value))}
            className="w-10 sm:w-12 accent-indigo-500 cursor-pointer"
            aria-label={`Track ${trackIndex + 1} volume`}
          />
        </Tooltip>

        {/* Probability — shown in advanced mode */}
        {!easyMode && (
          <Tooltip content={`Fire probability: ${Math.round(avgProb * 100)}% — steps only fire this % of the time`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={avgProb}
              onChange={(e) => onChangeProbability(parseFloat(e.target.value))}
              className="w-10 accent-purple-500 cursor-pointer"
              aria-label={`Track ${trackIndex + 1} probability`}
              style={{ accentColor: "#a855f7" }}
            />
          </Tooltip>
        )}

        {/* Euclidean generator button — hidden on mobile to save space */}
        <Tooltip content="Euclidean rhythm — distribute hits evenly across steps">
          <button
            type="button"
            onClick={onEuclidean}
            className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-ink-ghost hover:text-emerald-400 hover:bg-well text-xs transition-colors shrink-0 font-mono"
            aria-label="Euclidean rhythm"
          >
            ∿
          </button>
        </Tooltip>

        <Tooltip content="Randomize — fill steps randomly (~30% density)">
          <button
            type="button"
            onClick={onRandomize}
            className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-ink-ghost hover:text-ink hover:bg-well text-sm transition-colors shrink-0"
          >
            ⚄
          </button>
        </Tooltip>

        {/* Shift steps left/right (rotate) — desktop only */}
        <Tooltip content="Shift all steps one position left (wraps around)">
          <button
            type="button"
            onClick={onShiftLeft}
            className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-ink-ghost hover:text-amber-400 hover:bg-well text-xs transition-colors shrink-0"
            aria-label="Shift steps left"
          >←</button>
        </Tooltip>
        <Tooltip content="Shift all steps one position right (wraps around)">
          <button
            type="button"
            onClick={onShiftRight}
            className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-ink-ghost hover:text-amber-400 hover:bg-well text-xs transition-colors shrink-0"
            aria-label="Shift steps right"
          >→</button>
        </Tooltip>

        {/* Range-select mode toggle */}
        <Tooltip content={selectionMode ? "Exit selection mode" : "Select a range of steps to copy, paste or fill"}>
          <button
            type="button"
            onClick={() => { setSelectionMode((m) => !m); if (selectionMode) setSelection(null); }}
            className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors shrink-0 ${
              selectionMode
                ? "text-sky-300 bg-sky-500/20 ring-1 ring-sky-500/40"
                : "text-ink-ghost hover:text-sky-400 hover:bg-well"
            }`}
            aria-label={selectionMode ? "Exit selection mode" : "Select range"}
            aria-pressed={selectionMode}
          >▣</button>
        </Tooltip>

        <Tooltip content="Copy this track's pattern">
          <button
            type="button"
            onClick={onCopy}
            className="h-6 w-6 flex items-center justify-center rounded text-ink-ghost hover:text-ink hover:bg-well text-xs transition-colors shrink-0"
            aria-label="Copy track"
          >
            ⧉
          </button>
        </Tooltip>
        {canPaste && onPaste && (
          <Tooltip content="Paste copied pattern onto this track">
            <button
              type="button"
              onClick={onPaste}
              className="h-6 w-6 flex items-center justify-center rounded text-ink-ghost hover:text-indigo-400 hover:bg-well text-xs transition-colors shrink-0"
              aria-label="Paste track"
            >
              ⤵
            </button>
          </Tooltip>
        )}
        {onDuplicate && (
          <Tooltip content="Duplicate this track — inserts a copy below">
            <button
              type="button"
              onClick={onDuplicate}
              className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-ink-ghost hover:text-indigo-400 hover:bg-well text-xs transition-colors shrink-0"
              aria-label="Duplicate track"
            >⎘</button>
          </Tooltip>
        )}
        <Tooltip content="Clear — erase all steps on this track">
          <button
            type="button"
            onClick={onClear}
            className="h-6 w-6 flex items-center justify-center rounded text-ink-ghost hover:text-ink hover:bg-well text-xs transition-colors shrink-0"
          >
            ○
          </button>
        </Tooltip>
        {onRemove && (
          <Tooltip content="Remove this track">
            <button
              type="button"
              onClick={onRemove}
              className="h-6 w-6 flex items-center justify-center rounded text-ink-ghost hover:text-rose-400 hover:bg-well text-xs transition-colors shrink-0"
              aria-label="Remove track"
            >
              ✕
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
