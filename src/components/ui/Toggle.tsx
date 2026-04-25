import React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  pressed: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
  variant?: "mute" | "solo" | "default";
}

export function Toggle({ pressed, onToggle, label, className, variant = "default" }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-semibold transition-colors",
        !pressed && "bg-zinc-700 text-zinc-400 hover:bg-zinc-600",
        pressed && variant === "mute" && "bg-red-600 text-white",
        pressed && variant === "solo" && "bg-yellow-500 text-black",
        pressed && variant === "default" && "bg-indigo-600 text-white",
        className
      )}
    >
      {label}
    </button>
  );
}
