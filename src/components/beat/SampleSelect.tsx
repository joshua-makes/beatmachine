"use client";
import React from "react";
import { SAMPLES } from "@/lib/audio/samples";
import { Select, type SelectGroup } from "@/components/ui/Select";

interface SampleSelectProps {
  value: string;
  trackIndex: number;
  onChange: (sampleId: string) => void;
}

/** Maps sample IDs into visually-separated optgroups. */
const SAMPLE_GROUPS: SelectGroup[] = [
  {
    groupLabel: "── Kicks",
    options: ["kick", "sub"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id);
      return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Snares & Claps",
    options: ["snare", "clap", "snap", "rimshot"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id);
      return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Cymbals",
    options: ["hat", "open-hat", "ride", "crash"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id);
      return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Toms & Congas",
    options: ["tom", "hi-tom", "floor-tom", "conga"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id);
      return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Percussion",
    options: ["shaker", "tambourine", "woodblock", "cowbell", "perc"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id);
      return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Melodic & FX",
    options: ["bass", "chord", "synth", "fx", "laser"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id);
      return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
];

export function SampleSelect({ value, trackIndex, onChange }: SampleSelectProps) {
  return (
    <Select
      id={`sample-track-${trackIndex}`}
      value={value}
      groups={SAMPLE_GROUPS}
      onChange={(e) => onChange(e.target.value)}
      className="w-[120px]"
    />
  );
}
