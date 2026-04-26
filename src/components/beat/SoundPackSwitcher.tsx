"use client";
import React, { useState } from "react";
import { SOUND_PACKS } from "@/lib/audio/samples";
import { Tooltip } from "@/components/ui/Tooltip";

interface SoundPackSwitcherProps {
  currentPackId: string;
  loading: boolean;
  onSwitch: (packId: string, folder: string) => void;
}

export function SoundPackSwitcher({ currentPackId, loading, onSwitch }: SoundPackSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = SOUND_PACKS.find((p) => p.id === currentPackId) ?? SOUND_PACKS[0];

  return (
    <div className="relative">
      <Tooltip content="Sound Pack — swap the drum kit used for all tracks">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`h-8 px-3 flex items-center gap-2 rounded-lg border text-xs font-medium transition-colors ${
            currentPackId !== "acoustic"
              ? "border-violet-500/50 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20"
              : "border-rim text-ink-dim hover:text-ink hover:bg-well"
          }`}
        >
          <span aria-hidden="true">{current.emoji}</span>
          <span>{current.label}</span>
          {loading && <span className="animate-spin text-[10px]" aria-label="Loading">⏳</span>}
          <span className="text-ink-ghost text-[10px]" aria-hidden="true">{open ? "▲" : "▼"}</span>
        </button>
      </Tooltip>

      {open && (
        <div
          role="listbox"
          aria-label="Sound packs"
          className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-rim bg-panel shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-rim">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-dim">Choose a sound kit</p>
          </div>
          {SOUND_PACKS.map((pack) => {
            const active = pack.id === currentPackId;
            return (
              <button
                key={pack.id}
                role="option"
                aria-selected={active}
                type="button"
                onClick={() => {
                  onSwitch(pack.id, pack.folder);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  active
                    ? "bg-violet-500/15 text-violet-300"
                    : "hover:bg-well text-ink"
                }`}
              >
                <span className="text-xl shrink-0 leading-none mt-0.5" aria-hidden="true">{pack.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{pack.label}</span>
                    {active && <span className="text-[9px] text-violet-400 bg-violet-500/20 rounded-full px-1.5 py-0.5">active</span>}
                  </div>
                  <p className="text-[11px] text-ink-dim mt-0.5 leading-snug">{pack.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Click-away dismiss */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
