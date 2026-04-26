"use client";
import React from "react";
import { type InstrumentSection, SECTION_EMOJI } from "@/lib/pattern";
import { MiniPatternGrid } from "./MiniPatternGrid";
import { Slider } from "@/components/ui/Slider";
import { Tooltip } from "@/components/ui/Tooltip";

interface SectionRowProps {
  section: InstrumentSection;
  stepCount: number;
  currentStep: number | null;
  isPlaying: boolean;
  isActive: boolean;
  onSelect: () => void;
  onMute: () => void;
  onSolo: () => void;
  onVolChange: (vol: number) => void;
}

export function SectionRow({
  section,
  stepCount,
  currentStep,
  isPlaying,
  isActive,
  onSelect,
  onMute,
  onSolo,
  onVolChange,
}: SectionRowProps) {
  const activeSteps = section.tracks.reduce(
    (sum, t) => sum + t.steps.filter(Boolean).length,
    0,
  );

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive ? "bg-well ring-1 ring-indigo-500/30" : "hover:bg-well/50"
      }`}
    >
      {/* M / S buttons */}
      <div className="flex gap-1 shrink-0">
        <Tooltip content={section.mute ? "Unmute section" : "Mute section"}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMute(); }}
            className={`h-6 w-6 rounded text-[10px] font-bold transition-colors ${
              section.mute
                ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                : "text-ink-ghost hover:text-ink hover:bg-well"
            }`}
            aria-label={section.mute ? "Unmute" : "Mute"}
          >M</button>
        </Tooltip>
        <Tooltip content={section.solo ? "Unsolo section" : "Solo section"}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSolo(); }}
            className={`h-6 w-6 rounded text-[10px] font-bold transition-colors ${
              section.solo
                ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40"
                : "text-ink-ghost hover:text-ink hover:bg-well"
            }`}
            aria-label={section.solo ? "Unsolo" : "Solo"}
          >S</button>
        </Tooltip>
      </div>

      {/* Section name + emoji */}
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2 w-24 shrink-0 text-left"
      >
        <span aria-hidden="true" className="text-sm">{section.emoji ?? SECTION_EMOJI[section.type]}</span>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-ink truncate">{section.name}</span>
          <span className="text-[9px] text-ink-ghost">{section.tracks.length} trk · {activeSteps} steps</span>
        </div>
      </button>

      {/* Volume */}
      <div className="flex items-center gap-1.5 w-20 shrink-0">
        <span className="text-[9px] text-ink-ghost shrink-0">vol</span>
        <Slider
          value={section.vol}
          min={0}
          max={1}
          step={0.01}
          onChange={(e) => onVolChange(parseFloat(e.target.value))}
          aria-label={`${section.name} volume`}
        />
      </div>

      {/* Mini grid */}
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 opacity-80 hover:opacity-100 transition-opacity"
        aria-label={`Open ${section.name} editor`}
      >
        <MiniPatternGrid
          section={section}
          stepCount={stepCount}
          currentStep={currentStep}
          isPlaying={isPlaying}
        />
      </button>

      {/* Accent stripe */}
      <div
        className="w-1 h-8 rounded-full shrink-0"
        style={{ backgroundColor: section.color, opacity: section.mute ? 0.2 : 0.7 }}
        aria-hidden="true"
      />
    </div>
  );
}
