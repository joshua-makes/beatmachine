import LZString from "lz-string";

export interface TrackState {
  id: string;
  sampleId: string;
  /** "drum" plays a sample; "melody" plays a pitched tone */
  type: "drum" | "melody";
  vol: number;
  mute: boolean;
  solo: boolean;
  steps: boolean[];
  /** MIDI note number per step — only used by melody tracks */
  notes: (number | null)[];
}

export interface Pattern {
  bpm: number;
  masterVol: number;
  stepCount: 8 | 16 | 32 | 64;
  /** 0 = straight, 100 = max swing (~2:1 triplet feel) */
  swing: number;
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
    tracks: Array.from({ length: TRACK_COUNT }, (_, i) => ({
      id: `track-${i}`,
      sampleId: DEFAULT_SAMPLES[i] ?? "kick",
      type: "drum" as const,
      vol: 0.8,
      mute: false,
      solo: false,
      steps: Array(STEP_COUNT).fill(false) as boolean[],
      notes: Array(STEP_COUNT).fill(null) as (number | null)[],
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
    // Back-compat: ensure each track has type + notes fields
    if (Array.isArray(raw.tracks)) {
      raw.tracks = (raw.tracks as Array<Record<string, unknown>>).map((t) => ({
        type: "drum",
        notes: Array((t.steps as boolean[]).length).fill(null),
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
  return `${baseUrl}?s=${encoded}`;
}
