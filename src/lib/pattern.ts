import LZString from "lz-string";

export interface TrackState {
  id: string;
  sampleId: string;
  /** User-editable display name */
  name?: string;
  /** "drum" plays a sample; "melody" plays a pitched tone */
  type: "drum" | "melody";
  vol: number;
  mute: boolean;
  solo: boolean;
  steps: boolean[];
  /** MIDI note number per step — single note or chord array. Only used by melody tracks. */
  notes: (number | number[] | null)[];
  /** Per-step velocity 0–1 (default 1.0). Right-click active steps to cycle soft/ghost. */
  velocity: number[];
  /** Per-step fire probability 0–1 (default 1.0). 1 = always fires, 0.5 = 50% chance. */
  probability: number[];
  /** Octave transpose for melody tracks: -3 to +3. Default 0. */
  octaveOffset?: number;
  /** Custom track color hex string. Falls back to palette color when absent. */
  color?: string;
}

export interface Pattern {
  bpm: number;
  masterVol: number;
  stepCount: 8 | 16 | 32 | 64;
  /** 0 = straight, 100 = max swing (~2:1 triplet feel) */
  swing: number;
  /** 0 = robotic perfect timing, 100 = heavy human feel (timing + velocity variation) */
  humanize: number;
  tracks: TrackState[];
}

export const TRACK_COUNT = 8;
export const STEP_COUNT = 16;

export const DEFAULT_SAMPLES = ["kick", "snare", "hat", "clap", "tom", "perc", "bass", "synth"];

export function createDefaultPattern(): Pattern {
  return {
    bpm: 120,
    masterVol: 0.8,
    stepCount: 16,
    swing: 0,
    humanize: 0,
    tracks: Array.from({ length: TRACK_COUNT }, (_, i) => ({
      id: `track-${i}`,
      sampleId: DEFAULT_SAMPLES[i] ?? "kick",
      type: "drum" as const,
      vol: 0.8,
      mute: false,
      solo: false,
      steps: Array(STEP_COUNT).fill(false) as boolean[],
      notes: Array(STEP_COUNT).fill(null) as (number | null)[],
      velocity: Array(STEP_COUNT).fill(1) as number[],
      probability: Array(STEP_COUNT).fill(1) as number[],
    })),
  };
}

export function serializePattern(pattern: Pattern): string {
  return JSON.stringify(pattern);
}

export function deserializePattern(data: string): Pattern {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (!isPattern(parsed)) return createDefaultPattern();
    // Back-compat: fill in fields added after initial release
    const raw = parsed as unknown as Record<string, unknown>;
    if (typeof raw.swing !== "number") raw.swing = 0;
    if (typeof raw.humanize !== "number") raw.humanize = 0;
    // Back-compat: ensure each track has type + notes fields
    if (Array.isArray(raw.tracks)) {
      raw.tracks = (raw.tracks as Array<Record<string, unknown>>).map((t) => ({
        type: "drum",
        notes: Array((t.steps as boolean[]).length).fill(null),
        velocity: Array((t.steps as boolean[]).length).fill(1),
        probability: Array((t.steps as boolean[]).length).fill(1),
        ...t,
      }));
    }
    return raw as unknown as Pattern;
  } catch {
    return createDefaultPattern();
  }
}

function isPattern(v: unknown): v is Pattern {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  if (typeof p.bpm !== "number") return false;
  if (typeof p.masterVol !== "number") return false;
  if (!Array.isArray(p.tracks)) return false;
  return true;
}

export function encodeShareUrl(pattern: Pattern): string {
  const json = serializePattern(pattern);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeShareUrl(encoded: string): Pattern {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return createDefaultPattern();
    return deserializePattern(json);
  } catch {
    return createDefaultPattern();
  }
}

export function buildShareLink(pattern: Pattern, baseUrl: string): string {
  const encoded = encodeShareUrl(pattern);
  // Use hash fragment — never sent to server, works for static deployments
  return `${baseUrl}#s=${encoded}`;
}
