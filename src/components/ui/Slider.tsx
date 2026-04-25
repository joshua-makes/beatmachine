import React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Slider({ label, className, id, ...props }: SliderProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <label htmlFor={id} className="text-xs text-zinc-400 whitespace-nowrap">
          {label}
        </label>
      )}
      <input
        type="range"
        id={id}
        className={cn("h-1.5 w-full cursor-pointer accent-indigo-500", className)}
        {...props}
      />
    </div>
  );
}
