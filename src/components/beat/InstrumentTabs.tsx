"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  type InstrumentSection,
  type SectionType,
  type SectionPreset,
  SECTION_PRESETS,
} from "@/lib/pattern";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface InstrumentTabsProps {
  sections: InstrumentSection[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  /** Called with the chosen preset when the user picks an instrument to add */
  onAddSection: (preset: SectionPreset) => void;
  /** Called when the user clicks × on a tab. Only provided when >1 section exists. */
  onRemoveSection?: (sectionId: string) => void;
}

const TYPE_LABEL: Record<SectionType, string> = {
  drums:  "Drums",
  piano:  "Piano",
  bass:   "Bass",
  synth:  "Synth",
  custom: "Custom",
};

// Unique groups in display order
const GROUPS = Array.from(new Set(SECTION_PRESETS.map((p) => p.group)));

export function InstrumentTabs({
  sections,
  activeTabId,
  onTabChange,
  onAddSection,
  onRemoveSection,
}: InstrumentTabsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos]   = useState({ x: 0, y: 0, maxH: 0 });
  const [pickerFlip, setPickerFlip] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!pickerOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setPickerOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  function openPicker() {
    const rect = addBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelW = 288; // w-72
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const flip = spaceAbove > spaceBelow;
    const maxH = Math.max(flip ? spaceAbove : spaceBelow, 120);
    const y = flip ? rect.top - margin : rect.bottom + margin;
    const x = Math.min(rect.left, window.innerWidth - panelW - margin);
    setPickerPos({ x: Math.max(margin, x), y, maxH });
    setPickerFlip(flip);
    setPickerOpen(true);
  }

  function pick(preset: SectionPreset) {
    setPickerOpen(false);
    onAddSection(preset);
  }

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-rim px-2 pt-2">
        {/* One tab per section */}
        {sections.map((sec) => {
          const isActive = activeTabId === sec.id;
          return (
            <div key={sec.id} className="flex items-stretch">
              <Tooltip content={`${TYPE_LABEL[sec.type]} — ${sec.tracks.length} track${sec.tracks.length !== 1 ? "s" : ""}`}>
                <button
                  type="button"
                  onClick={() => onTabChange(sec.id)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-tl-lg px-3 py-2 text-xs font-semibold transition-colors border border-b-0",
                    isActive
                      ? "bg-panel border-rim text-ink"
                      : "bg-transparent border-transparent text-ink-dim hover:text-ink hover:bg-well",
                  )}
                  style={isActive ? { borderTopColor: sec.color } : undefined}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: sec.color }}
                    aria-hidden="true"
                  />
                  {sec.name}
                  {sec.mute && (
                    <span className="ml-0.5 text-[9px] text-red-400 font-bold" aria-label="muted">M</span>
                  )}
                </button>
              </Tooltip>

              {/* Remove tab button */}
              {onRemoveSection && (
                <Tooltip content={`Remove “${sec.name}” section`}>
                  <button
                    type="button"
                    onClick={() => onRemoveSection(sec.id)}
                    aria-label={`Remove ${sec.name} section`}
                    className={cn(
                      "px-1.5 text-[12px] font-bold transition-colors rounded-tr-lg border-t border-r border-b-0",
                      isActive
                        ? "bg-panel border-rim text-ink-ghost hover:text-red-400"
                        : "bg-transparent border-transparent text-ink-ghost hover:text-red-400 hover:bg-well",
                    )}
                    style={isActive ? { borderTopColor: sec.color } : undefined}
                  >
                    ×
                  </button>
                </Tooltip>
              )}
            </div>
          );
        })}

        {/* Add section button */}
        <Tooltip content="Add an instrument section">
          <button
            ref={addBtnRef}
            type="button"
            onClick={openPicker}
            aria-label="Add instrument section"
            aria-expanded={pickerOpen}
            className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-ghost hover:text-indigo-400 hover:bg-well transition-colors"
          >
            <span aria-hidden="true" className="text-sm leading-none">+</span>
          </button>
        </Tooltip>

        {/* Bottom border fill */}
        <div className="flex-1 border-b border-rim mb-0 h-full" aria-hidden="true" />
      </div>

      {/* ── Instrument picker portal ── */}
      {pickerOpen && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onPointerDown={() => setPickerOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-label="Choose instrument"
            className="fixed z-[9999] bg-panel border border-rim rounded-xl shadow-2xl p-3 w-72 overflow-y-auto"
            style={pickerFlip
              ? { left: pickerPos.x, bottom: window.innerHeight - pickerPos.y, maxHeight: pickerPos.maxH }
              : { left: pickerPos.x, top: pickerPos.y, maxHeight: pickerPos.maxH }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold text-ink-ghost uppercase tracking-widest mb-2 px-1">
              Add instrument
            </p>
            {GROUPS.map((group) => (
              <div key={group} className="mb-3">
                <p className="text-[9px] font-bold text-ink-ghost uppercase tracking-widest px-1 mb-1">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {(SECTION_PRESETS as readonly SectionPreset[]).filter((p) => p.group === group).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => pick(preset)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-well transition-colors"
                    >
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: preset.color + "28" }}
                      >
                        {preset.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink leading-none truncate">{preset.name}</p>
                        <p className="text-[9px] text-ink-ghost leading-tight mt-0.5 truncate">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
