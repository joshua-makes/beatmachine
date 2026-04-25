"use client";
import React from "react";
import { type TrackState } from "@/lib/pattern";
import { NOTE_NAMES } from "@/lib/scales";
import { SampleSelect } from "./SampleSelect";
import { StepGrid } from "./StepGrid";
import { Toggle } from "@/components/ui/Toggle";
import { Tooltip } from "@/components/ui/Tooltip";

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
  onToggleStep: (step: number) => void;
  onChangeSample: (sampleId: string) => void;
  onChangeVol: (vol: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onToggleType: () => void;
  onClear: () => void;
  onRandomize: () => void;
}

export function TrackRow({
  track,
  trackIndex,
  currentStep,
  isPlaying,
  trackColor,
  selectedNote,
  onToggleStep,
  onChangeSample,
  onChangeVol,
  onToggleMute,
  onToggleSolo,
  onToggleType,
  onClear,
  onRandomize,
}: TrackRowProps) {
  const isMelody = track.type === "melody";

  // Build note labels for melody steps
  const noteLabels = isMelody
    ? track.notes.map((midi) => (midi != null ? midiLabel(midi) : null))
    : undefined;

  return (
    <div className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-opacity ${track.mute ? "opacity-40" : ""}`}>
      {/* Track controls */}
      <div className="flex items-center gap-1.5 w-52 min-w-52 shrink-0">
        {/* Color strip */}
        <div className="w-1 h-7 rounded-full shrink-0" style={{ backgroundColor: trackColor }} />
        <span className="text-xs font-mono text-ink-ghost w-4 text-right shrink-0">{trackIndex + 1}</span>

        {/* Type toggle — small icon button */}
        <Tooltip content={isMelody ? "Switch to drum/sample track" : "Switch to melody track (uses piano notes)"}>
          <button
            type="button"
            onClick={onToggleType}
            className="text-sm shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-well transition-colors"
            aria-label={isMelody ? "Switch to drum" : "Switch to melody"}
          >
            {isMelody ? "🎵" : "🥁"}
          </button>
        </Tooltip>

        {isMelody ? (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-indigo-400 leading-tight">Melody</span>
            {selectedNote !== null ? (
              <span className="text-[9px] text-emerald-400 font-mono leading-tight">
                ● armed: {midiLabel(selectedNote)}
              </span>
            ) : (
              <span className="text-[9px] text-ink-ghost leading-tight">click a key to arm</span>
            )}
          </div>
        ) : (
          <SampleSelect value={track.sampleId} trackIndex={trackIndex} onChange={onChangeSample} />
        )}

        <Toggle pressed={track.mute} onToggle={onToggleMute} label="M" variant="mute" tooltip={track.mute ? "Unmute this track" : "Mute this track"} />
        <Toggle pressed={track.solo} onToggle={onToggleSolo} label="S" variant="solo" tooltip={track.solo ? "Unsolo" : "Solo — mute all other tracks"} />
      </div>

      {/* Step grid */}
      <StepGrid
        steps={track.steps}
        currentStep={isPlaying ? currentStep : null}
        trackIndex={trackIndex}
        trackColor={isMelody ? "#6366f1" : trackColor}
        onToggle={onToggleStep}
        noteLabels={noteLabels}
      />

      {/* Per-track volume + quick actions */}
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <Tooltip content={`Track volume: ${Math.round(track.vol * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.vol}
            onChange={(e) => onChangeVol(parseFloat(e.target.value))}
            className="w-14 accent-indigo-500 cursor-pointer"
            aria-label={`Track ${trackIndex + 1} volume`}
          />
        </Tooltip>
        <Tooltip content={isMelody ? "Randomize — fill with random scale notes" : "Randomize — fill steps randomly (~30% density)"}>
          <button
            type="button"
            onClick={onRandomize}
            className="h-6 w-6 flex items-center justify-center rounded text-ink-ghost hover:text-ink hover:bg-well text-sm transition-colors shrink-0"
          >
            ⚄
          </button>
        </Tooltip>
        <Tooltip content="Clear — erase all steps on this track">
          <button
            type="button"
            onClick={onClear}
            className="h-6 w-6 flex items-center justify-center rounded text-ink-ghost hover:text-ink hover:bg-well text-xs transition-colors shrink-0"
          >
            ✕
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
