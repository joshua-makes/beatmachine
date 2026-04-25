"use client";
import React from "react";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";

interface TransportProps {
  isPlaying: boolean;
  bpm: number;
  masterVol: number;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onMasterVolChange: (vol: number) => void;
}

export function Transport({ isPlaying, bpm, masterVol, onTogglePlay, onBpmChange, onMasterVolChange }: TransportProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-2">
      <Button
        variant={isPlaying ? "danger" : "primary"}
        size="lg"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "⏸ Pause" : "▶ Play"}
      </Button>
      <div className="flex items-center gap-2">
        <label htmlFor="bpm-number" className="text-sm text-zinc-400">BPM</label>
        <input
          id="bpm-number"
          type="number"
          min={60}
          max={200}
          value={bpm}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onBpmChange(v);
          }}
          className="w-16 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-sm text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="BPM value"
        />
        <Slider
          id="bpm-slider"
          min={60}
          max={200}
          step={1}
          value={bpm}
          onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
          className="w-32"
          aria-label="BPM slider"
        />
      </div>
      <div className="flex items-center gap-2">
        <Slider
          id="master-vol"
          label="Vol"
          min={0}
          max={1}
          step={0.01}
          value={masterVol}
          onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
          className="w-24"
          aria-label="Master volume"
        />
      </div>
    </div>
  );
}
