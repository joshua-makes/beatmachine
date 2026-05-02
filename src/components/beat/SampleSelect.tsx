"use client";
import React from "react";
import { SAMPLES } from "@/lib/audio/samples";
import { Select, type SelectGroup } from "@/components/ui/Select";
import { type SectionType } from "@/lib/pattern";

interface SampleSelectProps {
  value: string;
  trackIndex: number;
  sectionType?: SectionType;
  onChange: (sampleId: string) => void;
}

const BASS_IDS   = ["bass","sub"];
const MELODY_IDS = ["bass","chord","synth","fx","laser"];

function makeGroups(label: string, ids: string[]): SelectGroup[] {
  const opts = ids.flatMap((id) => {
    const s = SAMPLES.find((x) => x.id === id);
    return s ? [{ value: s.id, label: s.label }] : [];
  });
  return [{ groupLabel: label, options: opts }];
}

/** All drum samples broken into logical groups */
const DRUM_GROUPS: SelectGroup[] = [
  {
    groupLabel: "── Kicks",
    options: ["kick","sub"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id); return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Snares & Claps",
    options: ["snare","clap","snap","rimshot"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id); return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Cymbals",
    options: ["hat","open-hat","ride","crash"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id); return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Toms & Congas",
    options: ["tom","hi-tom","floor-tom","conga"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id); return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── Percussion",
    options: ["shaker","tambourine","woodblock","cowbell","perc"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id); return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
  {
    groupLabel: "── FX",
    options: ["fx","laser"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id); return s ? [{ value: s.id, label: s.label }] : [];
    }),
  },
];

function groupsForType(sectionType?: SectionType): SelectGroup[] {
  if (sectionType === "drums")  return DRUM_GROUPS;
  if (sectionType === "bass")   return makeGroups("── Bass", BASS_IDS);
  if (sectionType === "piano" || sectionType === "synth") return makeGroups("── Melodic", MELODY_IDS);
  // "custom" or undefined → show everything
  return DRUM_GROUPS.concat([{
    groupLabel: "── Melodic",
    options: ["bass","chord","synth","fx","laser"].flatMap((id) => {
      const s = SAMPLES.find((x) => x.id === id); return s ? [{ value: s.id, label: s.label }] : [];
    }),
  }]);
}

export function SampleSelect({ value, trackIndex, sectionType, onChange }: SampleSelectProps) {
  return (
    <Select
      id={`sample-track-${trackIndex}`}
      value={value}
      groups={groupsForType(sectionType)}
      onChange={(e) => onChange(e.target.value)}
      className="w-[120px]"
    />
  );
}

