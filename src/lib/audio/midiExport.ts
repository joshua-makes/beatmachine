import { type Pattern, type TrackState } from "@/lib/pattern";

const TICKS_PER_BEAT = 480;
const TICKS_PER_STEP = TICKS_PER_BEAT / 4; // 16th note

/** General MIDI drum channel (0-indexed = 9, 1-indexed = 10) */
const DRUM_CH = 9;

/** Map sample IDs to GM drum note numbers */
const GM_DRUM: Record<string, number> = {
  kick: 36, sub: 35,
  snare: 38, rimshot: 37,
  hat: 42, "open-hat": 46,
  clap: 39, snap: 39,
  tom: 41, "floor-tom": 43, "hi-tom": 50,
  crash: 49, ride: 51,
  perc: 56, conga: 63, cowbell: 56,
  shaker: 70, tambourine: 54,
  woodblock: 76, laser: 37,
  bass: 36, synth: 81, chord: 48, fx: 48,
};

type MidiEvent = { tick: number; bytes: number[] };

/** MIDI variable-length quantity encoding */
function varLen(n: number): number[] {
  const out: number[] = [n & 0x7f];
  n >>>= 7;
  while (n > 0) {
    out.unshift((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  return out;
}

function word32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function word16(n: number): number[] {
  return [(n >>> 8) & 0xff, n & 0xff];
}

function buildTrackChunk(events: MidiEvent[]): number[] {
  events.sort((a, b) => a.tick - b.tick);
  const data: number[] = [];
  let last = 0;
  for (const ev of events) {
    data.push(...varLen(ev.tick - last), ...ev.bytes);
    last = ev.tick;
  }
  data.push(0x00, 0xff, 0x2f, 0x00); // end-of-track
  return [0x4d, 0x54, 0x72, 0x6b, ...word32(data.length), ...data];
}

function drumEvents(track: TrackState): MidiEvent[] {
  const note = GM_DRUM[track.sampleId] ?? 38;
  const events: MidiEvent[] = [];
  for (let i = 0; i < track.steps.length; i++) {
    if (!track.steps[i]) continue;
    const tick = i * TICKS_PER_STEP;
    const vel = Math.max(1, Math.min(127, Math.round((track.velocity?.[i] ?? 1) * 100)));
    events.push({ tick, bytes: [0x90 | DRUM_CH, note, vel] });
    events.push({ tick: tick + TICKS_PER_STEP - 1, bytes: [0x80 | DRUM_CH, note, 0] });
  }
  return events;
}

function melodyEvents(track: TrackState, channel: number): MidiEvent[] {
  const shift = (track.octaveOffset ?? 0) * 12;
  const events: MidiEvent[] = [];
  for (let i = 0; i < track.steps.length; i++) {
    if (!track.steps[i]) continue;
    const raw = track.notes?.[i];
    if (raw == null) continue;
    const tick = i * TICKS_PER_STEP;
    const vel = Math.max(1, Math.min(127, Math.round((track.velocity?.[i] ?? 0.85) * 100)));
    const notes = (Array.isArray(raw) ? raw : [raw]).map((m) =>
      Math.max(0, Math.min(127, m + shift))
    );
    for (const n of notes) {
      events.push({ tick, bytes: [0x90 | channel, n, vel] });
      events.push({ tick: tick + TICKS_PER_STEP - 1, bytes: [0x80 | channel, n, 0] });
    }
  }
  return events;
}

export function exportPatternMidi(pattern: Pattern, filename = "groove.mid"): void {
  const active = pattern.tracks.filter((t) => t.steps.some(Boolean));
  const numTracks = 1 + active.length; // tempo track + data tracks

  // Header chunk
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    ...word32(6),
    ...word16(1),             // format 1 (multi-track, sync)
    ...word16(numTracks),
    ...word16(TICKS_PER_BEAT),
  ];

  // Tempo track
  const microsPerBeat = Math.round(60_000_000 / pattern.bpm);
  const tempoChunk = buildTrackChunk([
    {
      tick: 0,
      bytes: [
        0xff, 0x51, 0x03,
        (microsPerBeat >>> 16) & 0xff,
        (microsPerBeat >>> 8) & 0xff,
        microsPerBeat & 0xff,
      ],
    },
  ]);

  // Data tracks
  const dataChunks: number[] = [];
  let melCh = 0;
  for (const t of active) {
    if (t.type === "melody") {
      dataChunks.push(...buildTrackChunk(melodyEvents(t, melCh)));
      melCh++;
      if (melCh === DRUM_CH) melCh++; // skip drum channel
      if (melCh > 15) melCh = 0;
    } else {
      dataChunks.push(...buildTrackChunk(drumEvents(t)));
    }
  }

  const bytes = new Uint8Array([...header, ...tempoChunk, ...dataChunks]);
  const blob = new Blob([bytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
