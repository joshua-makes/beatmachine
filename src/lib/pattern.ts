import LZString from "lz-string";

export interface TrackState {
  id: string;
  sampleId: string;
  vol: number;
  mute: boolean;
  solo: boolean;
  steps: boolean[];
}

export interface Pattern {
  bpm: number;
  masterVol: number;
  tracks: TrackState[];
}

export const TRACK_COUNT = 8;
export const STEP_COUNT = 16;

export const DEFAULT_SAMPLES = ["kick", "snare", "hat", "clap", "tom", "perc", "bass", "synth"];

export function createDefaultPattern(): Pattern {
  return {
    bpm: 120,
    masterVol: 0.8,
    tracks: Array.from({ length: TRACK_COUNT }, (_, i) => ({
      id: `track-${i}`,
      sampleId: DEFAULT_SAMPLES[i] ?? "kick",
      vol: 0.8,
      mute: false,
      solo: false,
      steps: Array(STEP_COUNT).fill(false) as boolean[],
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
    return parsed;
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
