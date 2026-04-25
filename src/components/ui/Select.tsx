import React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  /** Label shown as the optgroup header */
  groupLabel: string;
  options: SelectOption[];
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  /** Flat list of options (no grouping). Mutually exclusive with `groups`. */
  options?: SelectOption[];
  /** Grouped options rendered as <optgroup> elements. */
  groups?: SelectGroup[];
}

export function Select({ label, options, groups, className, id, ...props }: SelectProps) {
  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs text-ink-dim shrink-0">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "rounded-lg bg-well px-2 py-1 text-xs text-ink border border-rim focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer",
          className
        )}
        {...props}
      >
        {groups
          ? groups.map((g) => (
              <optgroup key={g.groupLabel} label={g.groupLabel}>
                {g.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))
          : options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
      </select>
    </div>
  );
}
