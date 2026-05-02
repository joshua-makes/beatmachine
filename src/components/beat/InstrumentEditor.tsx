"use client";
import React, { useRef } from "react";
import { type InstrumentSection, type SectionType } from "@/lib/pattern";
import { TrackRow } from "./TrackRow";
import { TRACK_COLORS } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface InstrumentEditorProps {
  section: InstrumentSection;
  stepCount: number;
  currentStep: number | null;
  isPlaying: boolean;
  easyMode: boolean;
  selectedNote: number | null;
  teachMode: boolean;
  dragOver: number | null;
  onDragStart: (trackIndex: number) => void;
  onDragEnter: (trackIndex: number) => void;
  onDragDrop:  (targetIndex: number) => void;
  onDragEnd:   () => void;
  onPaintStart: (trackIndex: number, step: number, value: boolean) => void;
  onPaint:      (trackIndex: number, step: number, value: boolean) => void;
  onVelocityChange: (trackIndex: number, step: number, velocity: number) => void;
  onChangeSample:   (trackIndex: number, sampleId: string) => void;
  onChangeVol:      (trackIndex: number, vol: number) => void;
  onChangeProbability: (trackIndex: number, prob: number) => void;
  onToggleMute:  (trackIndex: number) => void;
  onToggleSolo:  (trackIndex: number) => void;
  onToggleType:  (trackIndex: number) => void;
  onClear:       (trackIndex: number) => void;
  onRandomize:   (trackIndex: number) => void;
  onRemove:      (trackIndex: number) => void;
  onRename:      (trackIndex: number, name: string) => void;
  onEuclidean:   (trackIndex: number) => void;
  onPreviewSample: (sampleId: string) => void;
  onOctaveOffsetChange: (trackIndex: number, offset: number) => void;
  onColorChange:   (trackIndex: number, color: string) => void;
  onDuplicate:     (trackIndex: number) => void;
  onShiftLeft:     (trackIndex: number) => void;
  onShiftRight:    (trackIndex: number) => void;
  onAddTrack:  () => void;
  onFocusTrack: (trackIndex: number) => void;
  /** Melody tracks: right-click a step cycles note duration (1→2→3→4 steps) */
  onDurationChange: (trackIndex: number, step: number, duration: number) => void;
  /** Forwarded to SampleSelect so the picker only shows relevant samples */
  sectionType?: SectionType;
}

export function InstrumentEditor({
  section,
  stepCount,
  currentStep,
  isPlaying,
  easyMode,
  selectedNote,
  teachMode,
  dragOver,
  onDragStart,
  onDragEnter,
  onDragDrop,
  onDragEnd,
  onPaintStart,
  onPaint,
  onVelocityChange,
  onChangeSample,
  onChangeVol,
  onChangeProbability,
  onToggleMute,
  onToggleSolo,
  onToggleType,
  onClear,
  onRandomize,
  onRemove,
  onRename,
  onEuclidean,
  onPreviewSample,
  onOctaveOffsetChange,
  onColorChange,
  onDuplicate,
  onShiftLeft,
  onShiftRight,
  onAddTrack,
  onFocusTrack,
  onDurationChange,
  sectionType,
}: InstrumentEditorProps) {
  const tracks = section.tracks;
  const draggingRef = useRef<number | null>(null);
  const localDragOverRef = useRef<number | null>(null);
  const trackRowsRef = useRef<HTMLDivElement>(null);

  function handleDragHandleDown(trackIdx: number, e: React.PointerEvent) {
    e.preventDefault();
    draggingRef.current = trackIdx;
    onDragStart(trackIdx);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (draggingRef.current === null || !trackRowsRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!el) return;
    const rowEl = el.closest('[data-track-row]') as HTMLElement | null;
    if (!rowEl) return;
    const idx = parseInt(rowEl.dataset.trackRow ?? '-1', 10);
    if (idx >= 0 && idx !== localDragOverRef.current) {
      localDragOverRef.current = idx;
      onDragEnter(idx);
    }
  }

  function handlePointerUp() {
    if (draggingRef.current !== null) {
      if (localDragOverRef.current !== null) {
        onDragDrop(localDragOverRef.current);
      } else {
        onDragEnd();
      }
      draggingRef.current = null;
      localDragOverRef.current = null;
    }
  }

  return (
    <div>
      {/* Step number header */}
      <div className="flex items-center gap-3 px-2 py-1.5 border-b border-rim">
        {/* Spacer matching drag handle column */}
        <div className="w-5 shrink-0" aria-hidden="true" />
        {/* Spacer matching track controls column */}
        <div className="w-48 min-w-48 sm:w-60 sm:min-w-60 shrink-0" aria-hidden="true" />
        <div className="flex gap-1">
          {Array.from({ length: stepCount }, (_, i) => (
            <React.Fragment key={i}>
              {i > 0 && i % 4 === 0 && <div className="w-1 sm:w-1.5 shrink-0" aria-hidden="true" />}
              <div className="w-7 min-w-7 sm:w-8 sm:min-w-8 shrink-0 flex flex-col items-center gap-px">
                <div className={`h-1 w-full rounded-sm transition-colors duration-75 ${
                  isPlaying && currentStep === i ? "bg-emerald-400 shadow-[0_0_5px_1px_#34d399]" : "bg-transparent"
                }`} aria-hidden="true" />
                <span className={`text-[9px] sm:text-[10px] font-mono select-none ${
                  isPlaying && currentStep === i ? "text-emerald-400 font-bold" : i % 4 === 3 ? "text-ink-dim" : "text-ink-ghost"
                }`}>
                  {i % 4 === 3 ? i + 1 : "·"}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="w-16 shrink-0" />
      </div>

      {/* Track rows */}
      <div ref={trackRowsRef} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      {tracks.map((track, i) => (
        <div
          key={track.id}
          data-track-row={i}
          onFocus={() => onFocusTrack(i)}
          className={dragOver === i ? "outline outline-2 outline-indigo-400/60 rounded-lg" : ""}
        >
          <TrackRow
            track={track}
            trackIndex={i}
            currentStep={currentStep}
            isPlaying={isPlaying}
            trackColor={track.color ?? TRACK_COLORS[i % TRACK_COLORS.length]}
            selectedNote={selectedNote}
            easyMode={easyMode}
            teachMode={teachMode}
            stepCount={stepCount}
            onDragHandlePointerDown={(e) => handleDragHandleDown(i, e)}
            sectionType={sectionType}
            onPaintStart={(step, value) => onPaintStart(i, step, value)}
            onPaint={(step, value) => onPaint(i, step, value)}
            onVelocityChange={(step, velocity) => onVelocityChange(i, step, velocity)}
            onChangeSample={(sampleId) => onChangeSample(i, sampleId)}
            onChangeVol={(vol) => onChangeVol(i, vol)}
            onChangeProbability={(prob) => onChangeProbability(i, prob)}
            onToggleMute={() => onToggleMute(i)}
            onToggleSolo={() => onToggleSolo(i)}
            onToggleType={() => onToggleType(i)}
            onClear={() => onClear(i)}
            onRandomize={() => onRandomize(i)}
            onRemove={tracks.length > 1 ? () => onRemove(i) : undefined}
            onRename={(name) => onRename(i, name)}
            onEuclidean={() => onEuclidean(i)}
            onPreviewSample={onPreviewSample}
            onOctaveOffsetChange={(offset) => onOctaveOffsetChange(i, offset)}
            onColorChange={(color) => onColorChange(i, color)}
            onDuplicate={tracks.length < 16 ? () => onDuplicate(i) : undefined}
            onShiftLeft={() => onShiftLeft(i)}
            onShiftRight={() => onShiftRight(i)}
            onDurationChange={(step, duration) => onDurationChange(i, step, duration)}
          />
        </div>
      ))}
      </div>

      {/* Add track button */}
      {tracks.length < 16 && (
        <div className="px-2 py-2 border-t border-rim">
          <Tooltip content={`Add a new track to the ${section.name} section`}>
            <button
              type="button"
              onClick={onAddTrack}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-dim border border-dashed border-rim hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-well transition-colors"
            >
              <span className="text-base leading-none">+</span> Add Track
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
