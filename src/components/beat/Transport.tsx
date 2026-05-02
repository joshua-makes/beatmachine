"use client";
import React, { useRef, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

const STEP_TIPS: Record<number, string> = {
  8:  "½ bar · 8 steps · 2 beats — half-time, sparse, or intro feel",
  16: "1 bar · 16 steps · 4 beats — standard pattern (most common)",
  32: "2 bars · 32 steps · 8 beats — extended phrase or 2-bar loop",
  64: "4 bars · 64 steps · 16 beats — long loop or full section",
};

/** Bar count labels shown on the step-count buttons */
const BAR_LABELS: Record<number, string> = {
  8:  "½ bar",
  16: "1 bar",
  32: "2 bars",
  64: "4 bars",
};

/**
 * Italian tempo markings + genre context shown under the BPM slider.
 * Ranges follow the standard classical definitions.
 */
function bpmLabel(bpm: number): string {
  if (bpm <  60) return "Larghissimo — very slow / ambient";
  if (bpm <  66) return "Largo — slow and broad";
  if (bpm <  76) return "Adagio — slow / ballad";
  if (bpm <  96) return "Andante — walking pace / hip-hop";
  if (bpm < 112) return "Moderato — moderate / R&B";
  if (bpm < 132) return "Allegro — lively / pop / house";
  if (bpm < 160) return "Vivace — vivacious / techno / trance";
  if (bpm < 184) return "Presto — fast / drum & bass";
  return "Prestissimo — extreme tempo";
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
  humanize: number;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onMasterVolChange: (vol: number) => void;
  onStepCountChange: (count: 8 | 16 | 32 | 64) => void;
  onTapTempo: () => void;
  onSwingChange: (swing: number) => void;
  onSlotChange: (slot: 0 | 1) => void;
  onToggleMetronome: () => void;
  onToggleChain: () => void;
  onHumanizeChange: (v: number) => void;
}

export function Transport({
  isPlaying, bpm, masterVol, stepCount, swing, activeSlot, easyMode, metronomeActive, chainActive, humanize,
  onTogglePlay, onBpmChange, onMasterVolChange, onStepCountChange,
  onTapTempo, onSwingChange, onSlotChange, onToggleMetronome, onToggleChain, onHumanizeChange,
}: TransportProps) {
  // Local tap state for live BPM preview in Tap button
  const localTapTimesRef = useRef<number[]>([]);
  const [tapBpmPreview, setTapBpmPreview] = useState<number | null>(null);

  function handleTap() {
    const now = performance.now();
    const recent = [...localTapTimesRef.current.filter((t) => now - t < 3000), now];
    localTapTimesRef.current = recent;
    if (recent.length >= 2) {
      const intervals = recent.slice(1).map((t, i) => t - recent[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setTapBpmPreview(Math.round(60000 / avg));
    }
    // Also confirm into parent (same logic there)
    onTapTempo();
  }
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // ── Shared sub-elements (used in both desktop and mobile rows) ──

  const playBtn = (
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
      </button>
    </Tooltip>
  );

  const bpmSection = (
    <div className="flex items-center gap-2">
      <Tooltip content="Beats per minute (BPM) · 40–250" position="bottom">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">BPM</span>
      </Tooltip>
      <Tooltip content="Type a BPM value" position="bottom">
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={40}
          max={250}
          value={bpm}
          onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onBpmChange(v); }}
          className="w-16 rounded-lg bg-well border border-rim px-2 py-1.5 text-sm font-mono text-ink text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="BPM value"
        />
      </Tooltip>
      <Tooltip content="Tap Tempo — tap 3+ times to set BPM by feel" position="bottom">
        <button
          type="button"
          onClick={handleTap}
          className="rounded-lg bg-well border border-rim px-3 py-1.5 text-xs font-semibold text-ink-dim hover:text-ink hover:bg-rim transition-colors min-w-[3.5rem] text-center"
        >
          {tapBpmPreview !== null
            ? <><span className="text-ink font-bold">{tapBpmPreview}</span><span className="ml-0.5 opacity-60"> bpm</span></>
            : "Tap"}
        </button>
      </Tooltip>
    </div>
  );

  const stepsSection = (
    <div className="flex items-center gap-2">
      <Tooltip content="Pattern length in bars (1 bar = 4 beats = 16 steps at standard resolution)" position="bottom">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Length</span>
      </Tooltip>
      <div className="flex items-center rounded-lg bg-well border border-rim p-0.5">
        {([8, 16, 32, 64] as const)
          .filter((n) => easyMode ? n <= 32 : true)
          .map((n) => (
          <Tooltip key={n} content={STEP_TIPS[n]} position="bottom">
            <button
              type="button"
              onClick={() => onStepCountChange(n)}
              aria-pressed={stepCount === n}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors leading-none ${
                stepCount === n ? "bg-indigo-600 text-white" : "text-ink-dim hover:text-ink"
              }`}
            >
              {BAR_LABELS[n]}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );

  const volSection = (
    <div className="flex items-center gap-2">
      <Tooltip content="Master output volume" position="bottom">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Vol</span>
      </Tooltip>
      <Tooltip content={`Master volume: ${Math.round(masterVol * 100)}%`} position="bottom">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVol}
          onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
          className="w-20 accent-indigo-500 cursor-pointer"
          aria-label="Master volume"
        />
      </Tooltip>
      <span className="text-xs font-mono text-ink-dim w-8 shrink-0">{Math.round(masterVol * 100)}%</span>
    </div>
  );

  const feelSection = (
    <div className="flex items-center gap-2">
      <Tooltip content="Humanize — adds subtle timing and velocity variation, like a live player (0 = robotic · 100 = loose)" position="bottom">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim cursor-default">Feel</span>
      </Tooltip>
      <Tooltip content={`Humanize: ${humanize}%`} position="bottom">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={humanize}
          onChange={(e) => onHumanizeChange(parseInt(e.target.value, 10))}
          className="w-16 accent-indigo-500 cursor-pointer"
          aria-label="Humanize amount"
        />
      </Tooltip>
      <span className="text-xs font-mono text-ink-dim w-6 shrink-0">{humanize}</span>
    </div>
  );

  const metroBtn = (
    <Tooltip content={metronomeActive ? "Metronome ON" : "Metronome OFF — click to enable"} position="bottom">
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
  );

  const swingSection = !easyMode ? (
    <div className="flex items-center gap-2">
      <Tooltip content="Swing · 0 = straight (no shuffle) · 66 ≈ jazz triplet swing (2:1 ratio) · 100 = maximum" position="bottom">
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
  ) : null;

  const patSlots = !easyMode ? (
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
  ) : null;

  const chainBtn = !easyMode ? (
    <Tooltip content={chainActive ? "Chain ON — plays A then B alternating" : "Chain OFF — click to loop A→B"} position="bottom">
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
  ) : null;

  const div = <div className="h-8 w-px bg-rim" aria-hidden="true" />;

  return (
    <div className="space-y-2">
      {/* ── Primary row — always visible on all screen sizes ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {playBtn}

        {/* BPM with slider — slider hidden on mobile */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {bpmSection}
            <div className="hidden sm:flex flex-col gap-0.5">
              <Tooltip content="Drag to adjust tempo" position="bottom">
                <input
                  type="range"
                  min={40}
                  max={250}
                  step={1}
                  value={bpm}
                  onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
                  className="w-24 accent-indigo-500 cursor-pointer"
                  aria-label="BPM slider"
                />
              </Tooltip>
              <span className="text-[10px] text-ink-ghost text-center leading-none select-none">{bpmLabel(bpm)}</span>
            </div>
          </div>
        </div>

        {stepsSection}

        {/* ── Secondary controls: hidden on mobile; display:contents on sm (slots into flex) ── */}
        <div className="hidden sm:contents">
          {patSlots}
          {div}
          {swingSection}
          {div}
          {volSection}
          {div}
          {metroBtn}
          {feelSection}
          {chainBtn}
        </div>

        {/* Mobile-only: expand toggle */}
        <button
          type="button"
          className="sm:hidden rounded-lg border border-rim px-3 py-1.5 text-xs font-semibold text-ink-dim hover:text-ink hover:bg-well transition-colors"
          onClick={() => setMobileExpanded((e) => !e)}
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? "Hide extra controls" : "Show more controls"}
        >
          {mobileExpanded ? "✕" : "⋯"}
        </button>
      </div>

      {/* ── Mobile secondary row (collapsible) ── */}
      {mobileExpanded && (
        <div className="sm:hidden flex flex-wrap items-center gap-x-4 gap-y-3 pt-2 border-t border-rim">
          {volSection}
          {feelSection}
          {metroBtn}
          {patSlots}
          {swingSection}
          {chainBtn}
        </div>
      )}
    </div>
  );
}
