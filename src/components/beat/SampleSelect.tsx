"use client";
import React from "react";
import { SAMPLES } from "@/lib/audio/samples";
import { Select } from "@/components/ui/Select";

interface SampleSelectProps {
  value: string;
  trackIndex: number;
  onChange: (sampleId: string) => void;
}

export function SampleSelect({ value, trackIndex, onChange }: SampleSelectProps) {
  return (
    <Select
      id={`sample-track-${trackIndex}`}
      label="Sample:"
      value={value}
      options={SAMPLES.map((s) => ({ value: s.id, label: s.label }))}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
