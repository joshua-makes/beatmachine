"use client";
import React from "react";
import { Tooltip } from "@/components/ui/Tooltip";

const STEP_TIPS: Record<number, string> = {
  8:  "8 steps — half-time / sparse feel",
  16: "16 steps — standard 1-bar pattern",
  32: "32 steps — 2-bar extended pattern",
  64: "64 steps — 4-bar phrase",
};

/** Friendly tempo label shown under the BPM slider */
function bpmLabel(bpm: number): string {
  if (bpm < 70)  return "😴 Very Slow";
  if (bpm < 90)  return "🚶 Slow";
  if (bpm < 110) return "🙂 Medium";
  if (bpm < 130) return "🏃 Fast";
  if (bpm < 160) return "🚀 Very Fast";
  return "⚡ Super Fast";
}

interface TransportProps {
  isPlaying: boolean;
  bpm: number;
  masterVol: number;
  stepCount: 8 | 16 | 32 | 64;
  swing: number;
  activeSlot: 0 | 1;
  easyMode: boolean;
  metronomeActive: boolean;
  chainActive: boolean;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onMasterVolChange: (vol: number) => void;
  onStepCountChange: (count: 8 | 16 | 32 | 64) => void;
  onTapTempo: () => void;
  onSwingChange: (swing: number) => void;
  onSlotChange: (slot: 0 | 1) => void;
  onToggleMetronome: () => void;
  onToggleChain: () => void;
  onToggleEasy: () => void;
}

export function Transport({
  isPlaying, bpm, masterVol, stepCount, swing, activeSlot, easyMode, metronomeActive, chainActive,
  onTogglePlay, onBpmChange, onMasterVolChange, onStepCountChange,
  onTapTempo, onSwingChange, onSlotChange, onToggleMetronome, onToggleChain, onToggleEasy,
}: TransportProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">

      {/* A / B slot selector — hidden in easy mode */}
      {!easyMode && (
      <div className="flex items-center gap-2">
        <Tooltip content="Switch between two independent patterns (A / B)" position="bottom">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Pat</span>
        </Tooltip>
        <div className="flex rounded-lg bg-well border border-rim p-0.5">
          {([0, 1] as const).map((s) => (
            <Tooltip key={s} content={s === 0 ? "Pattern A" : "Pattern B"} position="bottom">
              <button
                type="button"
                onClick={() => onSlotChange(s)}
                aria-pressed={activeSlot === s}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  activeSlot === s ? "bg-indigo-600 text-white" : "text-ink-dim hover:text-ink"
                }`}
              >
                {s === 0 ? "A" : "B"}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      )}

      {/* Play / Pause */}
      <Tooltip content="Play / Pause  ·  Shortcut: Space" position="bottom">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas text-white ${
            isPlaying
              ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-500"
              : "bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-500"
          }`}
        >
          <span className="text-base leading-none" aria-hidden="true">{isPlaying ? "⏸" : "▶"}</span>
          {isPlaying ? "Pause" : "Play"}
          <kbd className="hidden sm:inline-flex items-center ml-1 px-1 py-0.5 text-[9px] font-mono font-semibold bg-white/20 rounded leading-none">
            Space
          </kbd>
        </button>
      </Tooltip>

      <div className="hidden sm:block h-8 w-px bg-rim" aria-hidden="true" />

      {/* BPM */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Tooltip content="Beats per minute (60–200)" position="bottom">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">BPM</span>
          </Tooltip>
          <Tooltip content="Type a BPM value" position="bottom">
            <input
              id="bpm-number"
              type="number"
              min={60}
              max={200}
              value={bpm}
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onBpmChange(v); }}
              className="w-16 rounded-lg bg-well border border-rim px-2 py-1.5 text-sm font-mono text-ink text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="BPM value"
            />
          </Tooltip>
          {/* BPM slider — hidden on small screens to save space */}
          <div className="hidden sm:flex flex-col gap-0.5">
            <Tooltip content="Drag to adjust tempo" position="bottom">
              <input
                type="range"
                min={60}
                max={200}
                step={1}
                value={bpm}
                onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
                className="w-24 accent-indigo-500 cursor-pointer"
                aria-label="BPM slider"
              />
            </Tooltip>
            <span className="text-[10px] text-ink-ghost text-center leading-none select-none">{bpmLabel(bpm)}</span>
          </div>
          <Tooltip content="Tap Tempo — tap 3+ times to set BPM by feel" position="bottom">
            <button
              type="button"
              onClick={onTapTempo}
              className="rounded-lg bg-well border border-rim px-3 py-1.5 text-xs font-semibold text-ink-dim hover:text-ink hover:bg-rim transition-colors"
            >
              Tap
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Swing — advanced only */}
      {!easyMode && (
      <>
      <div className="hidden sm:block h-8 w-px bg-rim" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <Tooltip content="Shuffle feel · 0 = straight 16ths · 100 = triplet swing" position="bottom">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Swing</span>
        </Tooltip>
        <Tooltip content={`Swing: ${swing}%`} position="bottom">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={swing}
            onChange={(e) => onSwingChange(parseInt(e.target.value, 10))}
            className="w-20 accent-indigo-500 cursor-pointer"
            aria-label="Swing amount"
          />
        </Tooltip>
        <span className="text-xs font-mono text-ink-dim w-6 shrink-0">{swing}</span>
      </div>
      </>
      )}

      <div className="hidden sm:block h-8 w-px bg-rim" aria-hidden="true" />

      {/* Master Volume */}
      <div className="flex items-center gap-2">
        <Tooltip content="Master output volume" position="bottom">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Vol</span>
        </Tooltip>
        <Tooltip content={`Master volume: ${Math.round(masterVol * 100)}%`} position="bottom">
          <input
            type="range"
            id="master-vol"
            min={0}
            max={1}
            step={0.01}
            value={masterVol}
            onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
            className="w-20 sm:w-24 accent-indigo-500 cursor-pointer"
            aria-label="Master volume"
          />
        </Tooltip>
        <span className="hidden sm:block text-xs font-mono text-ink-dim w-8 shrink-0">{Math.round(masterVol * 100)}%</span>
      </div>

      <div className="hidden sm:block h-8 w-px bg-rim" aria-hidden="true" />

      {/* Step count — easy mode shows 8/16 only */}
      <div className="flex items-center gap-2">
        <Tooltip content="Number of steps in the pattern loop" position="bottom">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Steps</span>
        </Tooltip>
        <div className="flex items-center rounded-lg bg-well border border-rim p-0.5">
          {([8, 16, 32, 64] as const)
            .filter((n) => easyMode ? n <= 16 : true)
            .map((n) => (
            <Tooltip key={n} content={STEP_TIPS[n]} position="bottom">
              <button
                type="button"
                onClick={() => onStepCountChange(n)}
                aria-pressed={stepCount === n}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  stepCount === n
                    ? "bg-indigo-600 text-white"
                    : "text-ink-dim hover:text-ink"
                }`}
              >
                {n}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="hidden sm:block h-8 w-px bg-rim" aria-hidden="true" />

      {/* Metronome */}
      <Tooltip content={metronomeActive ? "Metronome ON — click on every beat" : "Metronome OFF — click to enable"} position="bottom">
        <button
          type="button"
          onClick={onToggleMetronome}
          aria-pressed={metronomeActive}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            metronomeActive
              ? "bg-amber-600/20 border-amber-500/40 text-amber-400 hover:bg-amber-600/30"
              : "bg-well border-rim text-ink-dim hover:text-ink hover:bg-rim"
          }`}
        >
          ⏱ Metro
        </button>
      </Tooltip>

      {/* Chain A→B — advanced only */}
      {!easyMode && (
        <Tooltip content={chainActive ? "Chain ON — plays A then B alternating" : "Chain OFF — click to loop A→B→A→B"} position="bottom">
          <button
            type="button"
            onClick={onToggleChain}
            aria-pressed={chainActive}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              chainActive
                ? "bg-purple-600/20 border-purple-500/40 text-purple-400 hover:bg-purple-600/30"
                : "bg-well border-rim text-ink-dim hover:text-ink hover:bg-rim"
            }`}
          >
            A→B Chain
          </button>
        </Tooltip>
      )}

      {/* Easy / Advanced mode toggle — always visible, flows at end of wrap */}
      <div className="ml-auto">
        <Tooltip
          content={easyMode ? "Switch to Advanced mode for melody, swing, A/B patterns & MIDI" : "Switch to Easy mode — simpler controls for beginners"}
          position="bottom"
        >
          <button
            type="button"
            onClick={onToggleEasy}
            aria-pressed={easyMode}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              easyMode
                ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30"
                : "bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30"
            }`}
          >
            {easyMode ? "🟢 Easy" : "⚙️ Advanced"}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
