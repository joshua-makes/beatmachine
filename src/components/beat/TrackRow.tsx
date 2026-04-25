"use client";
import React from "react";
import { type TrackState } from "@/lib/pattern";
import { SampleSelect } from "./SampleSelect";
import { StepGrid } from "./StepGrid";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";

interface TrackRowProps {
  track: TrackState;
  trackIndex: number;
  currentStep: number | null;
  isPlaying: boolean;
  onToggleStep: (step: number) => void;
  onChangeSample: (sampleId: string) => void;
  onChangeVol: (vol: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
}

export function TrackRow({
  track,
  trackIndex,
  currentStep,
  isPlaying,
  onToggleStep,
  onChangeSample,
  onChangeVol,
  onToggleMute,
  onToggleSolo,
}: TrackRowProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1 w-56 min-w-56 shrink-0">
        <span className="text-xs text-zinc-500 w-4">{trackIndex + 1}</span>
        <SampleSelect
          value={track.sampleId}
          trackIndex={trackIndex}
          onChange={onChangeSample}
        />
        <Toggle
          pressed={track.mute}
          onToggle={onToggleMute}
          label="M"
          variant="mute"
        />
        <Toggle
          pressed={track.solo}
          onToggle={onToggleSolo}
          label="S"
          variant="solo"
        />
        <Slider
          id={`vol-track-${trackIndex}`}
          min={0}
          max={1}
          step={0.01}
          value={track.vol}
          onChange={(e) => onChangeVol(parseFloat(e.target.value))}
          className="w-16"
          aria-label={`Track ${trackIndex + 1} volume`}
        />
      </div>
      <StepGrid
        steps={track.steps}
        currentStep={isPlaying ? currentStep : null}
        trackIndex={trackIndex}
        onToggle={onToggleStep}
      />
    </div>
  );
}
