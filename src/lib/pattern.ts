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
  /** Per-track fire probability 0–1 (default 1.0). 1 = always fires, 0.5 = 50% chance. */
  probability: number;
  /** Per-step note duration in steps (default 1). Melody tracks only — sets how many steps the note rings. */
  durations?: number[];
  /** Octave transpose for melody tracks: -3 to +3. Default 0. */
  octaveOffset?: number;
  /** Custom track color hex string. Falls back to palette color when absent. */
  color?: string;
  /** Synthesized instrument voice for melody tracks. Default: "piano" */
  voice?: string;
}

/** The instrument category for a section */
export type SectionType = "drums" | "piano" | "bass" | "synth" | "custom";

export interface InstrumentSection {
  id: string;
  type: SectionType;
  /** User-editable display name */
  name: string;
  /** Hex accent color for the section tab */
  color: string;
  /** Emoji icon — stored so it persists for custom preset types */
  emoji?: string;
  /** Section-level volume applied on top of individual track volumes */
  vol: number;
  mute: boolean;
  solo: boolean;
  tracks: TrackState[];
  /**
   * Advanced mode: per-section step count override. When set the section
   * loops at this length while the global stepCount is used by other sections.
   * undefined = use the global pattern.stepCount.
   */
  sectionStepCount?: 8 | 16 | 32 | 64;
}

export interface Pattern {
  bpm: number;
  masterVol: number;
  stepCount: 8 | 16 | 32 | 64;
  /** 0 = straight, 100 = max swing (~2:1 triplet feel) */
  swing: number;
  /** 0 = robotic perfect timing, 100 = heavy human feel (timing + velocity variation) */
  humanize: number;
  sections: InstrumentSection[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TRACK_COUNT = 8;
export const STEP_COUNT = 16;

export const DEFAULT_SAMPLES = ["kick", "snare", "hat", "clap", "tom", "perc", "bass", "synth"];

/** Emoji icon per section type */
export const SECTION_EMOJI: Record<SectionType, string> = {
  drums:  "🥁",
  piano:  "🎹",
  bass:   "🎸",
  synth:  "🎹",
  custom: "🎵",
};

/** Synthesized instrument voices available for melody tracks */
export const MELODY_VOICES = [
  { id: "piano",  label: "Piano",  emoji: "🎹", description: "Classic electric piano tone" },
  { id: "violin", label: "Violin", emoji: "🎻", description: "Bowed string with vibrato" },
  { id: "flute",  label: "Flute",  emoji: "🪈", description: "Pure breathy wind tone" },
  { id: "guitar", label: "Guitar", emoji: "🎸", description: "Plucked acoustic string" },
  { id: "brass",  label: "Brass",  emoji: "🎺", description: "Bright horn / trumpet tone" },
  { id: "organ",  label: "Organ",  emoji: "🎼", description: "Hammond-style drawbar organ" },
  { id: "bell",   label: "Bell",   emoji: "🔔", description: "Metallic bell / marimba" },
] as const;

export type MelodyVoice = typeof MELODY_VOICES[number]["id"];

/**
 * Instrument presets shown in the "Add section" picker.
 * Each maps to an existing SectionType for behavioral purposes
 * (drums = sample-based, anything else = melody + piano keyboard).
 * `defaultVoice` is the synthesized timbre pre-selected for new tracks.
 */
export const SECTION_PRESETS = [
  // ── Keyboards ──────────────────────────────────────────────────────────────
  { id: "piano",      name: "Piano",       type: "piano"  as SectionType, color: "#6366f1", emoji: "🎹", defaultVoice: "piano",  group: "Keys",       description: "Grand piano" },
  { id: "organ",      name: "Organ",       type: "synth"  as SectionType, color: "#8b5cf6", emoji: "🎼", defaultVoice: "organ",  group: "Keys",       description: "Hammond drawbar organ" },
  { id: "synth",      name: "Synth",       type: "synth"  as SectionType, color: "#a855f7", emoji: "🎛️", defaultVoice: "piano",  group: "Keys",       description: "Synthesizer / lead" },
  { id: "bell",       name: "Bells",       type: "custom" as SectionType, color: "#0ea5e9", emoji: "🔔", defaultVoice: "bell",   group: "Keys",       description: "Bells, marimba, glockenspiel" },
  // ── Strings ────────────────────────────────────────────────────────────────
  { id: "strings",    name: "Strings",     type: "custom" as SectionType, color: "#ec4899", emoji: "🎻", defaultVoice: "violin", group: "Strings",    description: "String section / orchestra" },
  { id: "violin",     name: "Violin",      type: "custom" as SectionType, color: "#f43f5e", emoji: "🎻", defaultVoice: "violin", group: "Strings",    description: "Solo violin" },
  { id: "guitar",     name: "Guitar",      type: "custom" as SectionType, color: "#d97706", emoji: "🎸", defaultVoice: "guitar", group: "Strings",    description: "Acoustic / electric guitar" },
  // ── Bass ───────────────────────────────────────────────────────────────────
  { id: "bass",       name: "Bass",        type: "bass"   as SectionType, color: "#22c55e", emoji: "🎸", defaultVoice: "guitar", group: "Bass",       description: "Bass guitar / synth bass" },
  // ── Brass & Woodwinds ──────────────────────────────────────────────────────
  { id: "brass",      name: "Brass",       type: "custom" as SectionType, color: "#f59e0b", emoji: "🎺", defaultVoice: "brass",  group: "Brass & WW", description: "Trumpet, trombone, horn" },
  { id: "flute",      name: "Flute",       type: "custom" as SectionType, color: "#06b6d4", emoji: "🪈", defaultVoice: "flute",  group: "Brass & WW", description: "Flute, piccolo" },
  { id: "woodwinds",  name: "Woodwinds",   type: "custom" as SectionType, color: "#22d3ee", emoji: "🎷", defaultVoice: "flute",  group: "Brass & WW", description: "Clarinet, sax, oboe" },
  // ── Vocals ─────────────────────────────────────────────────────────────────
  { id: "choir",      name: "Choir",       type: "custom" as SectionType, color: "#14b8a6", emoji: "🎤", defaultVoice: "flute",  group: "Vocals",     description: "Choir / vocal pad" },
  // ── Percussion & Drums ─────────────────────────────────────────────────────
  { id: "drums",      name: "Drums",       type: "drums"  as SectionType, color: "#f97316", emoji: "🥁", defaultVoice: "piano",  group: "Percussion", description: "Full drum kit" },
  { id: "percussion", name: "Percussion",  type: "drums"  as SectionType, color: "#fb923c", emoji: "🪘", defaultVoice: "piano",  group: "Percussion", description: "Latin & world percussion" },
  // ── Custom ─────────────────────────────────────────────────────────────────
  { id: "custom",     name: "Custom",      type: "custom" as SectionType, color: "#64748b", emoji: "🎵", defaultVoice: "piano",  group: "Other",      description: "Blank section — configure yourself" },
] as const;

export type SectionPreset = typeof SECTION_PRESETS[number];

/** Default accent colors per section type */
export const SECTION_COLORS: Record<SectionType, string> = {
  drums:  "#f97316",
  piano:  "#6366f1",
  bass:   "#22c55e",
  synth:  "#a855f7",
  custom: "#64748b",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyTrack(id: string, sampleId: string, type: TrackState["type"], stepCount: number): TrackState {
  return {
    id,
    sampleId,
    type,
    vol: 0.8,
    mute: false,
    solo: false,
    steps: Array(stepCount).fill(false) as boolean[],
    notes: Array(stepCount).fill(null) as (number | null)[],
    velocity: Array(stepCount).fill(1) as number[],
    probability: 1,
    durations: Array(stepCount).fill(1) as number[],
  };
}

// ── Default pattern ───────────────────────────────────────────────────────────

export function createDefaultPattern(): Pattern {
  const sc = STEP_COUNT;
  const drumSamples = ["kick", "snare", "hat", "clap", "tom", "perc", "open-hat", "crash"];
  return {
    bpm: 120,
    masterVol: 0.8,
    stepCount: sc,
    swing: 0,
    humanize: 0,
    sections: [
      {
        id: "section-drums",
        type: "drums",
        name: "Drums",
        color: SECTION_COLORS.drums,
        vol: 1,
        mute: false,
        solo: false,
        tracks: drumSamples.map((s, i) => emptyTrack(`track-d${i}`, s, "drum", sc)),
      },
      {
        id: "section-piano",
        type: "piano",
        name: "Piano",
        color: SECTION_COLORS.piano,
        vol: 1,
        mute: false,
        solo: false,
        tracks: [
          emptyTrack("track-p0", "synth", "melody", sc),
          emptyTrack("track-p1", "chord", "melody", sc),
        ],
      },
      {
        id: "section-bass",
        type: "bass",
        name: "Bass",
        color: SECTION_COLORS.bass,
        vol: 1,
        mute: false,
        solo: false,
        tracks: [emptyTrack("track-b0", "bass", "melody", sc)],
      },
      {
        id: "section-synth",
        type: "synth",
        name: "Synth",
        color: SECTION_COLORS.synth,
        vol: 1,
        mute: false,
        solo: false,
        tracks: [emptyTrack("track-s0", "synth", "melody", sc)],
      },
    ],
  };
}

// ── Migration: flat tracks[] → sections[] ─────────────────────────────────────

const BASS_SAMPLES  = new Set(["bass", "sub"]);
const SYNTH_SAMPLES = new Set(["chord", "synth"]);

export function migrateTracksToSections(
  tracks: TrackState[],
  stepCount: number,
): InstrumentSection[] {
  const drumTracks:  TrackState[] = [];
  const pianoTracks: TrackState[] = [];
  const bassTracks:  TrackState[] = [];
  const synthTracks: TrackState[] = [];

  for (const t of tracks) {
    if (BASS_SAMPLES.has(t.sampleId) || (t.type === "melody" && BASS_SAMPLES.has(t.sampleId))) {
      bassTracks.push(t);
    } else if (SYNTH_SAMPLES.has(t.sampleId)) {
      synthTracks.push(t);
    } else if (t.type === "melody") {
      pianoTracks.push(t);
    } else {
      drumTracks.push(t);
    }
  }

  function fallback(arr: TrackState[], sampleId: string, type: TrackState["type"]): TrackState[] {
    if (arr.length > 0) return arr;
    return [emptyTrack(`track-${Date.now()}-fb`, sampleId, type, stepCount)];
  }

  return [
    {
      id: "section-drums",
      type: "drums",
      name: "Drums",
      color: SECTION_COLORS.drums,
      vol: 1,
      mute: false,
      solo: false,
      tracks: fallback(drumTracks, "kick", "drum"),
    },
    {
      id: "section-piano",
      type: "piano",
      name: "Piano",
      color: SECTION_COLORS.piano,
      vol: 1,
      mute: false,
      solo: false,
      tracks: fallback(pianoTracks, "synth", "melody"),
    },
    {
      id: "section-bass",
      type: "bass",
      name: "Bass",
      color: SECTION_COLORS.bass,
      vol: 1,
      mute: false,
      solo: false,
      tracks: fallback(bassTracks, "bass", "melody"),
    },
    {
      id: "section-synth",
      type: "synth",
      name: "Synth",
      color: SECTION_COLORS.synth,
      vol: 1,
      mute: false,
      solo: false,
      tracks: fallback(synthTracks, "synth", "melody"),
    },
  ];
}

// ── Serialize / deserialize ───────────────────────────────────────────────────

export function serializePattern(pattern: Pattern): string {
  return JSON.stringify(pattern);
}

export function deserializePattern(data: string): Pattern {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (typeof parsed !== "object" || parsed === null) return createDefaultPattern();
    const raw = parsed as Record<string, unknown>;

    // Back-compat: fill in scalar fields added over time
    if (typeof raw.swing     !== "number") raw.swing     = 0;
    if (typeof raw.humanize  !== "number") raw.humanize  = 0;
    if (typeof raw.masterVol !== "number") raw.masterVol = 0.8;
    if (typeof raw.bpm       !== "number") raw.bpm       = 120;

    // Determine step count
    let stepCount: number = typeof raw.stepCount === "number" ? raw.stepCount : 16;
    if (![8, 16, 32, 64].includes(stepCount)) stepCount = 16;
    raw.stepCount = stepCount;

    // ── NEW FORMAT: has sections[] ─────────────────────────────────────────
    if (Array.isArray(raw.sections)) {
      raw.sections = (raw.sections as Array<Record<string, unknown>>).map((sec) => ({
        id:    sec.id    ?? `section-${Date.now()}`,
        type:  sec.type  ?? "custom",
        name:  sec.name  ?? "Section",
        color: sec.color ?? SECTION_COLORS.custom,
        vol:   typeof sec.vol === "number" ? sec.vol : 1,
        mute:  Boolean(sec.mute),
        solo:  Boolean(sec.solo),
        tracks: Array.isArray(sec.tracks)
          ? (sec.tracks as Array<Record<string, unknown>>).map((t) => ({
              type:        "drum",
              notes:       Array((t.steps as boolean[])?.length ?? stepCount).fill(null),
              velocity:    Array((t.steps as boolean[])?.length ?? stepCount).fill(1),
              probability: Array.isArray(t.probability) ? ((t.probability as number[])[0] ?? 1) : (t.probability ?? 1),
              durations:   Array((t.steps as boolean[])?.length ?? stepCount).fill(1),
              ...t,
            }))
          : [],
        sectionStepCount: [8, 16, 32, 64].includes(sec.sectionStepCount as number)
          ? sec.sectionStepCount
          : undefined,
      }));
      return raw as unknown as Pattern;
    }

    // ── LEGACY FORMAT: has tracks[] — migrate to sections[] ───────────────
    if (Array.isArray(raw.tracks)) {
      // Back-compat: ensure each track has all required fields
      const tracks = (raw.tracks as Array<Record<string, unknown>>).map((t) => ({
        type:        "drum",
        notes:       Array((t.steps as boolean[])?.length ?? stepCount).fill(null),
        velocity:    Array((t.steps as boolean[])?.length ?? stepCount).fill(1),
        probability: Array.isArray(t.probability) ? ((t.probability as number[])[0] ?? 1) : (t.probability ?? 1),
        durations:   Array((t.steps as boolean[])?.length ?? stepCount).fill(1),
        ...t,
      })) as TrackState[];

      // Infer stepCount from first track if not in header
      if (tracks[0] && Array.isArray(tracks[0].steps)) {
        const len = tracks[0].steps.length;
        if ([8, 16, 32, 64].includes(len)) raw.stepCount = len;
      }

      raw.sections = migrateTracksToSections(tracks, raw.stepCount as number);
      delete raw.tracks;
      return raw as unknown as Pattern;
    }

    return createDefaultPattern();
  } catch {
    return createDefaultPattern();
  }
}

// ── Share URL ─────────────────────────────────────────────────────────────────

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
  return `${baseUrl}#s=${encoded}`;
}

