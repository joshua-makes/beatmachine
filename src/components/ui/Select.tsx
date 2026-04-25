import React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  return (
    <div className="flex items-center gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-zinc-400">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "rounded bg-zinc-800 px-1.5 py-1 text-xs text-zinc-200 border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
