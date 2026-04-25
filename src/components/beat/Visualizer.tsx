"use client";
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface VisualizerProps {
  analyser: AnalyserNode | null;
  mode: "waveform" | "bars";
  onToggleMode: () => void;
  isPlaying: boolean;
}

export function Visualizer({ analyser, mode, onToggleMode, isPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLen);

    function draw() {
      if (!canvas || !ctx || !analyser) return;
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;

      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, W, H);

      if (mode === "waveform") {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#6366f1";
        ctx.beginPath();
        const sliceWidth = W / bufferLen;
        let x = 0;
        for (let i = 0; i < bufferLen; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * H) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(W, H / 2);
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (W / bufferLen) * 2.5;
        let xPos = 0;
        for (let i = 0; i < bufferLen; i++) {
          const barHeight = (dataArray[i] / 255) * H;
          const hue = (i / bufferLen) * 240 + 200;
          ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
          ctx.fillRect(xPos, H - barHeight, barWidth, barHeight);
          xPos += barWidth + 1;
          if (xPos > W) break;
        }
      }
    }

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, mode, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isPlaying]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <canvas
          ref={canvasRef}
          width={600}
          height={80}
          className="w-full rounded bg-zinc-950 border border-zinc-800"
          aria-hidden="true"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500" aria-live="polite">
          Visualizer: {mode === "waveform" ? "Waveform" : "Frequency Bars"}
        </span>
        <Button variant="ghost" size="sm" onClick={onToggleMode} aria-label="Toggle visualizer mode">
          {mode === "waveform" ? "Switch to Bars" : "Switch to Waveform"}
        </Button>
      </div>
    </div>
  );
}
