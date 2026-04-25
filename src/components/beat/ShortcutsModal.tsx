"use client";
import React, { useState, useEffect } from "react";

const SHORTCUTS = [
  { keys: ["Space"],            desc: "Play / Pause" },
  { keys: ["Ctrl", "Z"],        desc: "Undo" },
  { keys: ["Ctrl", "Y"],        desc: "Redo" },
  { keys: ["Ctrl", "Shift", "Z"], desc: "Redo (alternate)" },
  { keys: ["↑", "↓"],          desc: "Move focus between tracks" },
  { keys: ["M"],                desc: "Mute focused track" },
  { keys: ["S"],                desc: "Solo focused track" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded-md bg-well border border-rim text-[11px] font-mono text-ink font-semibold shadow-sm">
      {children}
    </kbd>
  );
}

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?" || (e.code === "Slash" && e.shiftKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-ink-dim hover:text-ink hover:bg-well transition-colors text-sm font-mono leading-none"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

          {/* Panel */}
          <div
            className="relative w-full max-w-sm rounded-2xl bg-panel border border-rim shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Keyboard Shortcuts</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-ink-ghost hover:text-ink hover:bg-well transition-colors"
                aria-label="Close shortcuts"
              >
                ✕
              </button>
            </div>

            <table className="w-full text-sm border-collapse">
              <tbody>
                {SHORTCUTS.map(({ keys, desc }, i) => (
                  <tr key={i} className="border-t border-rim first:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {keys.map((k, j) => (
                          <React.Fragment key={k}>
                            {j > 0 && <span className="text-ink-ghost text-xs">+</span>}
                            <Kbd>{k}</Kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-ink-dim">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-[11px] text-ink-ghost text-center">Press <Kbd>?</Kbd> to toggle this panel</p>
          </div>
        </div>
      )}
    </>
  );
}
