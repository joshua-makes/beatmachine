import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

interface ToggleProps {
  pressed: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
  variant?: "mute" | "solo" | "default";
  tooltip?: string;
}

export function Toggle({ pressed, onToggle, label, className, variant = "default", tooltip }: ToggleProps) {
  const btn = (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={label === "M" ? "Mute track" : label === "S" ? "Solo track" : label}
      onClick={onToggle}
      className={cn(
        "rounded px-2 py-1.5 text-xs font-bold tracking-wide transition-colors min-h-[28px]",
        !pressed && "bg-well text-ink-dim hover:bg-rim hover:text-ink border border-rim",
        pressed && variant === "mute" && "bg-red-600 text-white border border-red-500",
        pressed && variant === "solo" && "bg-yellow-400 text-zinc-900 border border-yellow-300",
        pressed && variant === "default" && "bg-indigo-600 text-white border border-indigo-500",
        className
      )}
    >
      {label}
    </button>
  );
  if (!tooltip) return btn;
  return <Tooltip content={tooltip}>{btn}</Tooltip>;
}
