"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { type Pattern } from "@/lib/pattern";
import { saveSession, loadSessions, deleteSession, getSessionPattern, exportPatternJson, type SavedSession } from "@/lib/session";
import { exportPatternMidi } from "@/lib/audio/midiExport";
import { buildShareLink } from "@/lib/pattern";

interface SessionMenuProps {
  pattern: Pattern;
  onLoad: (pattern: Pattern) => void;
}

export function SessionMenu({ pattern, onLoad }: SessionMenuProps) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [saveName, setSaveName] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [showSessions, setShowSessions] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  function handleSave() {
    const name = saveName.trim() || `Session ${Date.now()}`;
    saveSession(name, pattern);
    setSessions(loadSessions());
    setSaveName("");
  }

  function handleLoad(session: SavedSession) {
    onLoad(getSessionPattern(session));
    setShowSessions(false);
  }

  function handleDelete(id: string) {
    deleteSession(id);
    setSessions(loadSessions());
  }

  function handleShare() {
    const link = buildShareLink(pattern, window.location.origin + window.location.pathname);
    setShareLink(link);
    // Update the browser URL bar so the current URL is already shareable
    window.history.replaceState(null, "", `#s=${link.split("#s=")[1]}`);
    navigator.clipboard.writeText(link).catch(() => {});
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const p = JSON.parse(text) as Pattern;
        onLoad(p);
      } catch {
        alert("Invalid session file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim mb-3">Session</p>

      {/* Save row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <input
          type="text"
          placeholder="Session name…"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="rounded-lg bg-well border border-rim px-2.5 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-36 placeholder:text-ink-ghost"
          aria-label="Session name"
        />
        <Tooltip content="Save current pattern to browser storage">
          <Button variant="secondary" size="sm" onClick={handleSave}>Save</Button>
        </Tooltip>
        <Tooltip content="Browse and load previously saved sessions">
          <Button variant="secondary" size="sm" onClick={() => setShowSessions(!showSessions)}>
            {showSessions ? "Hide" : "Load"} ({sessions.length})
          </Button>
        </Tooltip>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tooltip content="Generate shareable URL — pattern is encoded and copied to clipboard">
          <Button variant="ghost" size="sm" onClick={handleShare}>Share Link</Button>
        </Tooltip>
        <Tooltip content="Download pattern as MIDI — open in GarageBand, Ableton, or any DAW">
          <Button variant="ghost" size="sm" onClick={() => exportPatternMidi(pattern)}>Export MIDI</Button>
        </Tooltip>
        <Tooltip content="Download the current pattern as a .json file">
          <Button variant="ghost" size="sm" onClick={() => exportPatternJson(pattern)}>Export JSON</Button>
        </Tooltip>
        <Tooltip content="Load a pattern from a .json file">
          <label className="cursor-pointer">
            <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-medium text-ink-dim hover:text-ink hover:bg-well transition-colors">
              Import JSON
            </span>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} aria-label="Import JSON session file" />
          </label>
        </Tooltip>
      </div>

      {shareLink && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-3 py-2">
          <span className="text-indigo-400 text-base shrink-0" aria-hidden="true">🔗</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-indigo-300">Copied to clipboard!</p>
            <p className="text-[10px] text-ink-dim break-all mt-0.5 font-mono">{shareLink.slice(0, 72)}{shareLink.length > 72 ? "…" : ""}</p>
          </div>
        </div>
      )}

      {showSessions && (
        <div className="mt-3 rounded-lg bg-panel border border-rim overflow-hidden">
          {sessions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-dim">No saved sessions yet.</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 border-b border-rim last:border-0">
                <span className="text-xs text-ink truncate flex-1 mr-2">{s.name}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleLoad(s)}>Load</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>✕</Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
