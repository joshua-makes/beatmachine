export interface SampleDef {
  id: string;
  label: string;
  url: string;
}

/** Each sound pack maps sample IDs to a URL prefix folder */
export interface SoundPack {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Sub-folder under /samples/  e.g. "electronic" → /samples/electronic/kick.wav.
   *  Empty string means the default /samples/ folder. */
  folder: string;
}

export const SOUND_PACKS: SoundPack[] = [
  { id: "acoustic",    label: "Acoustic",    emoji: "🥁", description: "Real drum kit recorded in a studio", folder: "" },
  { id: "electronic",  label: "Electronic",  emoji: "🎛️", description: "Punchy synthesised 808/909-style sounds",  folder: "electronic" },
  { id: "lofi",        label: "Lo-Fi",       emoji: "📼", description: "Dusty vinyl-flavoured hip-hop kit",         folder: "lofi" },
  { id: "kids",        label: "Toy Kit",     emoji: "🧸", description: "Fun toy & cartoon sounds for young makers", folder: "kids" },
];

export const DEFAULT_PACK_ID = "acoustic";

export const SAMPLES: SampleDef[] = [
  { id: "kick",       label: "🥁 Kick",        url: "/samples/kick.wav" },
  { id: "snare",      label: "🪘 Snare",        url: "/samples/snare.wav" },
  { id: "hat",        label: "🎩 Hi-Hat",       url: "/samples/hat.wav" },
  { id: "open-hat",   label: "🎩 Open Hat",     url: "/samples/open-hat.wav" },
  { id: "crash",      label: "💥 Crash",        url: "/samples/crash.wav" },
  { id: "ride",       label: "🔔 Ride",         url: "/samples/ride.wav" },
  { id: "clap",       label: "👏 Clap",         url: "/samples/clap.wav" },
  { id: "snap",       label: "🫰 Snap",         url: "/samples/snap.wav" },
  { id: "rimshot",    label: "🥢 Rimshot",      url: "/samples/rimshot.wav" },
  { id: "tom",        label: "🪗 Tom",          url: "/samples/tom.wav" },
  { id: "hi-tom",     label: "🔺 Hi Tom",       url: "/samples/hi-tom.wav" },
  { id: "floor-tom",  label: "🔻 Floor Tom",    url: "/samples/floor-tom.wav" },
  { id: "conga",      label: "🪘 Conga",        url: "/samples/conga.wav" },
  { id: "shaker",     label: "🪄 Shaker",       url: "/samples/shaker.wav" },
  { id: "tambourine", label: "🎶 Tambourine",   url: "/samples/tambourine.wav" },
  { id: "woodblock",  label: "🪵 Woodblock",    url: "/samples/woodblock.wav" },
  { id: "cowbell",    label: "🐄 Cowbell",      url: "/samples/cowbell.wav" },
  { id: "perc",       label: "🎶 Perc",         url: "/samples/perc.wav" },
  { id: "fx",         label: "✨ FX",           url: "/samples/fx.wav" },
  { id: "laser",      label: "🔫 Laser",        url: "/samples/laser.wav" },
  { id: "sub",        label: "💢 Sub",          url: "/samples/sub.wav" },
  { id: "bass",       label: "🎸 Bass",         url: "/samples/bass.wav" },
  { id: "chord",      label: "🎹 Chord",        url: "/samples/chord.wav" },
  { id: "synth",      label: "🎛️ Synth",        url: "/samples/synth.wav" },
];

/** Build a URL for a sample given a pack folder.
 *  Falls back to the default /samples/ folder if the pack-specific file is not expected. */
export function sampleUrl(sampleId: string, packFolder: string): string {
  if (!packFolder) return `/samples/${sampleId}.wav`;
  return `/samples/${packFolder}/${sampleId}.wav`;
}

export function getSampleById(id: string): SampleDef | undefined {
  return SAMPLES.find((s) => s.id === id);
}
