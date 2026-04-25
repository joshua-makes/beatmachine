"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Recorder, downloadBlob } from "@/lib/audio/recorder";

interface RecordPanelProps {
  getMediaStream: () => MediaStream | null;
}

export function RecordPanel({ getMediaStream }: RecordPanelProps) {
  const [duration, setDuration] = useState<10 | 20 | 30>(10);
  const [isRecording, setIsRecording] = useState(false);
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
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `beatmachine-${ts}.webm`);
      setIsRecording(false);
      setRecorder(null);
    });
    rec.start(stream);
    setRecorder(rec);
    setIsRecording(true);
  }

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <span className="text-xs text-zinc-400">Record:</span>
      {([10, 20, 30] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => setDuration(d)}
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            duration === d
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
          aria-pressed={duration === d}
          aria-label={`Record ${d} seconds`}
        >
          {d}s
        </button>
      ))}
      <Button
        variant={isRecording ? "danger" : "secondary"}
        size="sm"
        onClick={handleRecord}
        aria-label={isRecording ? "Stop recording" : `Start recording ${duration} seconds`}
      >
        {isRecording ? "⏹ Stop" : "⏺ Rec"}
      </Button>
      {isRecording && (
        <span className="text-xs text-red-400 animate-pulse" role="status">
          ● Recording…
        </span>
      )}
    </div>
  );
}
