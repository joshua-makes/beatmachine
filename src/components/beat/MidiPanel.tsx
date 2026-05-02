"use client";
import React, { useState } from "react";
import {
  ensureMidiAccess,
  listMidiOutputs,
  type MidiOutputInfo,
} from "@/lib/audio/midi";
import { Tooltip } from "@/components/ui/Tooltip";

interface MidiPanelProps {
  onAccessReady: (access: MIDIAccess, outputId: string) => void;
  onAccessCleared: () => void;
}

export function MidiPanel({ onAccessReady, onAccessCleared }: MidiPanelProps) {
  const [enabled, setEnabled]     = useState(false);
  const [outputs, setOutputs]     = useState<MidiOutputInfo[]>([]);
  const [selected, setSelected]   = useState<string>("");
  const [access, setAccess]       = useState<MIDIAccess | null>(null);
  const [error, setError]         = useState<string | null>(null);

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      setOutputs([]);
      setSelected("");
      setAccess(null);
      onAccessCleared();
      return;
    }
    const a = await ensureMidiAccess();
    if (!a) {
      setError("Web MIDI not available in this browser.");
      return;
    }
    const outs = listMidiOutputs(a);
    setAccess(a);
    setOutputs(outs);
    setEnabled(true);
    if (outs.length > 0) {
      setSelected(outs[0].id);
      onAccessReady(a, outs[0].id);
    }
  }

  function handleSelect(id: string) {
    setSelected(id);
    if (access) onAccessReady(access, id);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim">
          MIDI Out
        </span>
        <Tooltip content="Connect to a MIDI output — drums on channel 10, piano on channel 1" position="bottom">
          <button
            type="button"
            onClick={toggle}
            className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors ${
              enabled
                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30"
                : "bg-well border-rim text-ink-dim hover:bg-rim"
            }`}
          >
            {enabled ? "Enabled" : "Enable"}
          </button>
        </Tooltip>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {enabled && outputs.length === 0 && (
        <p className="text-xs text-ink-dim">No MIDI outputs found.</p>
      )}

      {enabled && outputs.length > 0 && (
        <select
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full rounded-lg bg-well border border-rim px-2 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {outputs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}

      {enabled && outputs.length > 0 && (
        <p className="text-[10px] text-ink-ghost">
          Drum steps → ch.10 · Piano notes → ch.1
        </p>
      )}
    </div>
  );
}
