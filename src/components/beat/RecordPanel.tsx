"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { Recorder, downloadBlob } from "@/lib/audio/recorder";

interface RecordPanelProps {
  getMediaStream: () => MediaStream | null;
}

export function RecordPanel({ getMediaStream }: RecordPanelProps) {
  const [duration, setDuration] = useState<10 | 20 | 30>(10);
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [recorder, setRecorder] = useState<Recorder | null>(null);

  function handleRecord() {
    if (isRecording && recorder) {
      recorder.stop();
      setIsRecording(false);
      setRecorder(null);
      return;
    }

    const stream = getMediaStream();
    if (!stream) {
      alert("Start playback first to initialize the audio engine.");
      return;
    }

    const rec = new Recorder(duration, (blob) => {
      setIsConverting(true);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `beatmachine-${ts}.wav`);
      setIsConverting(false);
      setIsRecording(false);
      setRecorder(null);
    });
    rec.start(stream);
    setRecorder(rec);
    setIsRecording(true);
  }

  return (
    <div aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim mb-3">Record</p>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg bg-well border border-rim p-0.5">
          {([10, 20, 30] as const).map((d) => (
            <Tooltip key={d} content={`Record ${d} seconds then auto-download as WAV`}>
              <button
                type="button"
                onClick={() => setDuration(d)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  duration === d
                    ? "bg-indigo-600 text-white"
                    : "text-ink-dim hover:text-ink"
                }`}
                aria-pressed={duration === d}
                aria-label={`Record ${d} seconds`}
              >
                {d}s
              </button>
            </Tooltip>
          ))}
        </div>
        <Tooltip content={isRecording ? "Stop recording" : `Record ${duration}s of audio output and download as .wav`}>
          <Button
            variant={isRecording ? "danger" : "secondary"}
            size="sm"
            onClick={handleRecord}
            disabled={isConverting}
            aria-label={isRecording ? "Stop recording" : `Start recording ${duration} seconds`}
          >
            {isRecording ? "⏹ Stop" : "⏺ Rec"}
          </Button>
        </Tooltip>
        {isRecording && (
          <span className="text-xs text-red-400 animate-pulse" role="status">
            ● Recording…
          </span>
        )}
        {isConverting && (
          <span className="text-xs text-indigo-400 animate-pulse" role="status">
            ⏳ Saving WAV…
          </span>
        )}
      </div>
    </div>
  );
}
