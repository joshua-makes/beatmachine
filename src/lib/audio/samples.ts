export interface SampleDef {
  id: string;
  label: string;
  url: string;
}

export const SAMPLES: SampleDef[] = [
  { id: "kick", label: "Kick", url: "/samples/kick.wav" },
  { id: "snare", label: "Snare", url: "/samples/snare.wav" },
  { id: "hat", label: "Hi-Hat", url: "/samples/hat.wav" },
  { id: "clap", label: "Clap", url: "/samples/clap.wav" },
  { id: "tom", label: "Tom", url: "/samples/tom.wav" },
  { id: "perc", label: "Perc", url: "/samples/perc.wav" },
  { id: "bass", label: "Bass", url: "/samples/bass.wav" },
  { id: "synth", label: "Synth", url: "/samples/synth.wav" },
];

export function getSampleById(id: string): SampleDef | undefined {
  return SAMPLES.find((s) => s.id === id);
}
