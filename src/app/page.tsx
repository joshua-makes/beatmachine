"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Transport } from "@/components/beat/Transport";
import { Visualizer } from "@/components/beat/Visualizer";
import { SessionMenu } from "@/components/beat/SessionMenu";
import { RecordPanel } from "@/components/beat/RecordPanel";
import { getEngine } from "@/lib/audio/engine";
import { Scheduler, stepDurationSec } from "@/lib/audio/scheduler";
import {
  createDefaultPattern, decodeShareUrl,
  type Pattern, type TrackState, type InstrumentSection, type SectionPreset,
  SECTION_COLORS,
} from "@/lib/pattern";
import { clamp } from "@/lib/utils";
import { PianoKeyboard } from "@/components/beat/PianoKeyboard";
import { MidiPanel } from "@/components/beat/MidiPanel";
import { GroovePresets } from "@/components/beat/GroovePresets";
import { noteFrequency, midiNoteNumber, getScaleMidiSet, type NoteName, type ScaleName } from "@/lib/scales";
import { sendDrumNote, sendMelodicNote } from "@/lib/audio/midi";
import { EuclideanDialog } from "@/components/beat/EuclideanDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { autoSavePatterns, loadAutoSave } from "@/lib/session";
import { SoundPackSwitcher } from "@/components/beat/SoundPackSwitcher";
import { DEFAULT_PACK_ID } from "@/lib/audio/samples";
import { InstrumentTabs } from "@/components/beat/InstrumentTabs";
import { SectionMixer } from "@/components/beat/SectionMixer";
import { InstrumentEditor } from "@/components/beat/InstrumentEditor";

export default function Home() {
  // Pattern A / B slots
  const [patternSlots, setPatternSlots] = useState<[Pattern, Pattern]>(() => [
    createDefaultPattern(),
    createDefaultPattern(),
  ]);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const pattern = patternSlots[activeSlot];

  const setPattern = useCallback(
    (update: Pattern | ((prev: Pattern) => Pattern)) => {
      setPatternSlots((prev) => {
        const current = prev[activeSlot];
        const next = typeof update === "function" ? update(current) : update;
        return activeSlot === 0 ? [next, prev[1]] : [prev[0], next];
      });
    },
    [activeSlot],
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [vizMode, setVizMode] = useState<"waveform" | "bars" | "circle" | "spectrum">("waveform");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [initialized, setInitialized] = useState(false);
  /** Easy mode hides advanced controls for younger users */
  const [easyMode, setEasyMode] = useState(true);

  // Undo / redo history (per active slot)
  const undoStackRef = useRef<Pattern[]>([]);
  const redoStackRef = useRef<Pattern[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Clipboard: stores a copied track's steps/notes/velocity
  const [clipboardTrack, setClipboardTrack] = useState<Pick<TrackState, "steps" | "notes" | "velocity"> | null>(null);
  // Step-range clipboard: stores a copied region of steps from a single track
  const [stepRangeClipboard, setStepRangeClipboard] = useState<{
    steps: boolean[];
    notes: (number | number[] | null)[];
    velocity: number[];
  } | null>(null);

  // Metronome
  const [metronomeActive, setMetronomeActive] = useState(false);
  const metronomeActiveRef = useRef(false);

  // Pattern chain A→B
  const [chainActive, setChainActive] = useState(false);
  const chainActiveRef = useRef(false);

  // Euclidean dialog — now scoped to (sectionId, trackIndex)
  const [euclidTrack, setEuclidTrack] = useState<{ sectionId: string; trackIndex: number } | null>(null);

  // Active instrument tab: "mix" | section.id
  const [activeTab, setActiveTab] = useState<string>("section-drums");

  // Focused track for keyboard shortcuts — now relative to active section
  const [focusedTrack, setFocusedTrack] = useState<number | null>(null);

  // Drag-reorder state — per active section
  const dragIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Loop range — [startStep, endStep] inclusive, 0-indexed. null = full loop.
  const [loopRange, setLoopRange] = useState<[number, number] | null>(null);
  const loopRangeRef = useRef<[number, number] | null>(null);

  // Sound pack
  const [soundPackId, setSoundPackId] = useState(DEFAULT_PACK_ID);
  const [soundPackLoading, setSoundPackLoading] = useState(false);

  // Teach Me mode — shows notation strip below each track row
  const [teachMode, setTeachMode] = useState(false);

  // Auto-save status toast
  const [autoSavedAt, setAutoSavedAt] = useState<number | null>(null);

  // Piano / keyboard state
  const [pianoRoot,     setPianoRoot]     = useState<NoteName>("C");
  const [pianoScale,    setPianoScale]    = useState<ScaleName>("major");
  const [pianoOctave,   setPianoOctave]   = useState(3);
  /** Currently armed MIDI note — set when user clicks a piano key, painted into melody steps */
  const [selectedNote,  setSelectedNote]  = useState<number | null>(null);
  /** Currently armed chord — set when user clicks a chord button, painted into melody steps */
  const [selectedChord, setSelectedChord] = useState<number[] | null>(null);
  /** Notes currently sounding during playback — used to light up piano keys */
  const [playingNotes,  setPlayingNotes]  = useState<number[]>([]);

  const schedulerRef    = useRef<Scheduler | null>(null);
  const patternRef      = useRef<Pattern>(pattern);
  const tapTimesRef     = useRef<number[]>([]);
  const midiAccessRef   = useRef<MIDIAccess | null>(null);
  const midiOutputIdRef = useRef<string | null>(null);

  useEffect(() => { loopRangeRef.current = loopRange; }, [loopRange]);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    metronomeActiveRef.current = metronomeActive;
  }, [metronomeActive]);

  useEffect(() => {
    chainActiveRef.current = chainActive;
  }, [chainActive]);

  useEffect(() => {
    // Support both #s= (hash, new) and ?s= (query, legacy)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const s = hashParams.get("s") ?? queryParams.get("s");
    if (s) {
      const loaded = decodeShareUrl(s);
      setPattern(loaded);
      return;
    }
    // No share URL — restore auto-save if available
    const saved = loadAutoSave();
    if (saved) {
      setPatternSlots(saved);
      // Don't carry over any undo history from a previous session
      undoStackRef.current = [];
      redoStackRef.current = [];
    }
  }, []);

  // Debounced auto-save: persist both slots on every change
  useEffect(() => {
    const t = setTimeout(() => {
      autoSavePatterns(patternSlots);
      setAutoSavedAt(Date.now());
    }, 800);
    return () => clearTimeout(t);
  }, [patternSlots]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      }
      // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z = redo
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // M = mute focused track, S = solo focused track
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeSection = patternRef.current.sections.find((s) => s.id === activeTab);
        if (e.code === "KeyM" && focusedTrack !== null && activeSection) {
          e.preventDefault();
          handleToggleMute(activeTab, focusedTrack);
        }
        if (e.code === "KeyS" && focusedTrack !== null && activeSection) {
          e.preventDefault();
          handleToggleSolo(activeTab, focusedTrack);
        }
        // Arrow keys to move focused track
        if (e.code === "ArrowUp") {
          e.preventDefault();
          setFocusedTrack((f) => (f === null || f === 0) ? 0 : f - 1);
        }
        if (e.code === "ArrowDown") {
          e.preventDefault();
          setFocusedTrack((f) => {
            const sec = patternRef.current.sections.find((s) => s.id === activeTab);
            const last = (sec?.tracks.length ?? 1) - 1;
            return f === null ? 0 : Math.min(f + 1, last);
          });
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, initialized, focusedTrack]);

  async function initEngine() {
    if (initialized) return;
    const engine = getEngine();
    await engine.init();
    engine.setMasterVolume(patternRef.current.masterVol);
    patternRef.current.sections.forEach((sec) => {
      sec.tracks.forEach((t) => {
        engine.setTrackVolume(t.id, t.vol * sec.vol);
      });
    });
    setAnalyser(engine.getAnalyser());
    setInitialized(true);
  }

  const onStep = useCallback((step: number, time: number) => {
    setCurrentStep(step);

    // Metronome: click on every beat (every 4 steps), accent on beat 1
    if (metronomeActiveRef.current) {
      if (step % 4 === 0) {
        const accent = step === 0;
        getEngine().playClick(time, accent);
      }
    }
    const p = patternRef.current;
    const engine = getEngine();
    const hasSoloSection = p.sections.some((s) => s.solo);
    const notesThisStep: number[] = [];
    const humanize = p.humanize ?? 0;

    for (const section of p.sections) {
      if (section.mute) continue;
      if (hasSoloSection && !section.solo) continue;
      // Per-section step count override (Phase 5 feature — safe to compute now)
      const secStep = section.sectionStepCount
        ? step % section.sectionStepCount
        : step;
      const hasSoloTrack = section.tracks.some((t) => t.solo);

      for (const track of section.tracks) {
        if (track.mute) continue;
        if (hasSoloTrack && !track.solo) continue;
        if (!track.steps[secStep]) continue;

        // Per-step probability gate
        const prob = track.probability?.[secStep] ?? 1;
        if (prob < 1 && Math.random() > prob) return;

        if (track.type === "melody") {
          const midi = track.notes?.[secStep];
          if (midi != null) {
            const dur = stepDurationSec(p.bpm) * (track.durations?.[secStep] ?? 1) * 0.95;
            const octaveShift = (track.octaveOffset ?? 0) * 12;
            const midiArr = Array.isArray(midi) ? midi : [midi];
            const timeJitter = humanize > 0 ? (Math.random() - 0.3) * humanize * 0.0006 : 0;
            const playTime = time + Math.max(0, timeJitter);
            for (const m of midiArr) {
              const shifted = m + octaveShift;
              engine.playVoiceAt(track.voice ?? "piano", noteFrequency(shifted), track.vol * section.vol * 0.85, dur, playTime);
              notesThisStep.push(shifted);
              if (midiAccessRef.current && midiOutputIdRef.current) {
                sendMelodicNote(midiAccessRef.current, midiOutputIdRef.current, shifted, Math.round(track.vol * 85), Math.round(dur * 1000));
              }
            }
          }
        } else {
          const baseVel = track.velocity?.[secStep] ?? 1.0;
          const velJitter = humanize > 0 ? (1 - Math.random() * humanize * 0.003) : 1;
          const vel = Math.max(0.05, baseVel * velJitter) * section.vol;
          const timeJitter = humanize > 0 ? (Math.random() - 0.3) * humanize * 0.0006 : 0;
          engine.playBuffer(track.sampleId, track.id, time + Math.max(0, timeJitter), vel);
          if (midiAccessRef.current && midiOutputIdRef.current) {
            sendDrumNote(midiAccessRef.current, midiOutputIdRef.current, track.sampleId);
          }
        }
      }
    }
    // Update lit keys on piano keyboard
    setPlayingNotes(notesThisStep);
  }, []);

  async function handleTogglePlay() {
    await initEngine();
    const engine = getEngine();
    await engine.resume();

    if (isPlaying) {
      schedulerRef.current?.stop();
      setIsPlaying(false);
      setCurrentStep(null);
      setPlayingNotes([]);
    } else {
      const ctx = engine.getAudioContext();
      if (!ctx) return;
      const scheduler = new Scheduler({
        audioContext: ctx,
        getBpm: () => patternRef.current.bpm,
        getStepCount: () => patternRef.current.stepCount,
        getSwing: () => patternRef.current.swing,
        getChain: () => chainActiveRef.current,
        getLoopStart: () => loopRangeRef.current?.[0] ?? 0,
        getLoopEnd: () => loopRangeRef.current?.[1] ?? (patternRef.current.stepCount - 1),
        onBarEnd: () => {
          // Flip between slot 0 and 1 at bar boundaries
          setActiveSlot((s) => (s === 0 ? 1 : 0));
        },
        onStep,
      });
      schedulerRef.current = scheduler;
      scheduler.start();
      setIsPlaying(true);
    }
  }

  // ── Section + track update helpers ──────────────────────────────────────

  function updateSection(sectionId: string, updater: (s: InstrumentSection) => InstrumentSection) {
    setPattern((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? updater(s) : s),
    }));
  }

  function updateTrack(sectionId: string, trackIndex: number, updater: (t: TrackState) => TrackState) {
    updateSection(sectionId, (sec) => ({
      ...sec,
      tracks: sec.tracks.map((t, i) => i === trackIndex ? updater(t) : t),
    }));
  }

  /** Returns the active section, or undefined if the active tab is "mix" or not found */
  function getActiveSection(): InstrumentSection | undefined {
    return pattern.sections.find((s) => s.id === activeTab);
  }

  function handleBpmChange(bpm: number) {
    setPattern((prev) => ({ ...prev, bpm: clamp(bpm, 40, 250) }));
  }

  function handleMasterVolChange(vol: number) {
    const clamped = clamp(vol, 0, 1);
    setPattern((prev) => ({ ...prev, masterVol: clamped }));
    if (initialized) getEngine().setMasterVolume(clamped);
  }

  function handleChangeSample(sectionId: string, trackIndex: number, sampleId: string) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, sampleId }));
  }

  function handleChangeVol(sectionId: string, trackIndex: number, vol: number) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, vol }));
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (initialized && sec) getEngine().setTrackVolume(sec.tracks[trackIndex].id, vol * sec.vol);
  }

  function handleToggleMute(sectionId: string, trackIndex: number) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, mute: !t.mute }));
  }

  function handleToggleSolo(sectionId: string, trackIndex: number) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, solo: !t.solo }));
  }

  function handleSectionMute(sectionId: string) {
    updateSection(sectionId, (s) => ({ ...s, mute: !s.mute }));
  }

  function handleSectionSolo(sectionId: string) {
    updateSection(sectionId, (s) => ({ ...s, solo: !s.solo }));
  }

  function handleSectionVolChange(sectionId: string, vol: number) {
    updateSection(sectionId, (s) => ({ ...s, vol: clamp(vol, 0, 1) }));
  }

  function handleStepCountChange(count: 8 | 16 | 32 | 64) {
    setPattern((prev) => ({
      ...prev,
      stepCount: count,
      sections: prev.sections.map((sec) => ({
        ...sec,
        tracks: sec.tracks.map((t) => ({
          ...t,
          steps: count > t.steps.length
            ? [...t.steps, ...Array(count - t.steps.length).fill(false)]
            : t.steps.slice(0, count),
          notes: count > t.notes.length
            ? [...t.notes, ...Array(count - t.notes.length).fill(null)]
            : t.notes.slice(0, count),
          velocity: count > t.velocity.length
            ? [...t.velocity, ...Array(count - t.velocity.length).fill(1)]
            : t.velocity.slice(0, count),
          probability: count > (t.probability?.length ?? 0)
            ? [...(t.probability ?? []), ...Array(count - (t.probability?.length ?? 0)).fill(1)]
            : (t.probability ?? Array(count).fill(1)).slice(0, count),
          durations: count > (t.durations?.length ?? 0)
            ? [...(t.durations ?? Array(t.steps.length).fill(1)), ...Array(count - (t.durations?.length ?? t.steps.length)).fill(1)]
            : (t.durations ?? Array(count).fill(1)).slice(0, count),
        })),
      })),
    }));
    setLoopRange((r) => r
      ? [Math.min(r[0], count - 1), Math.min(r[1], count - 1)]
      : null
    );
  }

  function handleTapTempo() {
    const now = performance.now();
    const recent = [...tapTimesRef.current.filter((t) => now - t < 3000), now];
    tapTimesRef.current = recent;
    if (recent.length >= 2) {
      const intervals = recent.slice(1).map((t, i) => t - recent[i]);
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      handleBpmChange(Math.round(60000 / avgMs));
    }
  }

  function handleHumanizeChange(v: number) {
    setPattern((prev) => ({ ...prev, humanize: v }));
  }

  function handleOctaveOffsetChange(sectionId: string, trackIndex: number, offset: number) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, octaveOffset: offset }));
  }

  function handleColorChange(sectionId: string, trackIndex: number, color: string) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, color }));
  }

  function handleDurationChange(sectionId: string, trackIndex: number, step: number, duration: number) {
    updateTrack(sectionId, trackIndex, (t) => {
      const durations = [...(t.durations ?? Array(t.steps.length).fill(1))];
      durations[step] = duration;
      return { ...t, durations };
    });
  }

  function handleVoiceChange(sectionId: string, trackIndex: number, voice: string) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, voice }));
  }

  async function handleSoundPackSwitch(packId: string, folder: string) {
    setSoundPackId(packId);
    if (initialized) {
      setSoundPackLoading(true);
      await getEngine().loadSamplePack(folder);
      setSoundPackLoading(false);
    }
  }

  /** Click a step number while loop range is active to move the nearest endpoint */
  function handleLoopStepClick(step: number) {
    if (!loopRange) return;
    const [s, e] = loopRange;
    if (step < s) {
      setLoopRange([step, e]);
    } else if (step > e) {
      setLoopRange([s, step]);
    } else {
      const mid = (s + e) / 2;
      if (step <= mid) {
        setLoopRange([step === e ? Math.max(0, step - 1) : step, e]);
      } else {
        setLoopRange([s, step === s ? Math.min(pattern.stepCount - 1, step + 1) : step]);
      }
    }
  }

  function handleReset() {
    pushHistory();
    setPattern((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => ({
        ...sec,
        tracks: sec.tracks.map((t) => ({
          ...t,
          steps:       Array(prev.stepCount).fill(false) as boolean[],
          notes:       Array(prev.stepCount).fill(null),
          velocity:    Array(prev.stepCount).fill(1) as number[],
          probability: Array(prev.stepCount).fill(1) as number[],
          durations:   Array(prev.stepCount).fill(1) as number[],
        })),
      })),
    }));
  }

  function handleClearTrack(sectionId: string, trackIndex: number) {
    pushHistory();
    updateTrack(sectionId, trackIndex, (t) => ({
      ...t,
      steps: t.steps.map(() => false),
      notes: t.notes.map(() => null),
      durations: t.durations?.map(() => 1),
    }));
  }

  // ── Undo / redo ───────────────────────────────────────────────────────────

  function pushHistory() {
    undoStackRef.current = [...undoStackRef.current.slice(-49), patternRef.current];
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function undo() {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    redoStackRef.current = [...redoStackRef.current.slice(-49), patternRef.current];
    undoStackRef.current = stack.slice(0, -1);
    setPattern(prev);
    setCanUndo(stack.length > 1);
    setCanRedo(true);
  }

  function redo() {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    undoStackRef.current = [...undoStackRef.current.slice(-49), patternRef.current];
    redoStackRef.current = stack.slice(0, -1);
    setPattern(next);
    setCanUndo(true);
    setCanRedo(stack.length > 1);
  }

  // ── Step set ──────────────────────────────────────────────────────────────

  function handleSetStep(sectionId: string, trackIndex: number, step: number, value: boolean) {
    updateTrack(sectionId, trackIndex, (t) => ({
      ...t,
      steps: t.steps.map((v, i) => (i === step ? value : v)),
    }));
  }

  function handleSetMelodyStep(sectionId: string, trackIndex: number, step: number, value: boolean) {
    const noteValue: number | number[] | null = value
      ? (selectedChord ?? selectedNote ?? midiNoteNumber(pianoRoot, pianoOctave))
      : null;
    updateTrack(sectionId, trackIndex, (t) => ({
      ...t,
      steps: t.steps.map((v, i) => (i === step ? value : v)),
      notes: t.notes.map((n, i) => (i === step ? noteValue : n)),
    }));
  }

  // ── Per-step velocity ─────────────────────────────────────────────────────

  function handleVelocityChange(sectionId: string, trackIndex: number, step: number, velocity: number) {
    updateTrack(sectionId, trackIndex, (t) => ({
      ...t,
      velocity: t.velocity.map((v, i) => (i === step ? velocity : v)),
    }));
  }

  // ── Add / remove tracks ───────────────────────────────────────────────────

  function handleAddTrack(sectionId: string) {
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (!sec || sec.tracks.length >= 16) return;
    pushHistory();
    const id = `track-${Date.now()}`;
    const defaultType = sec.type === "drums" ? "drum" : "melody";
    const newTrack: TrackState = {
      id,
      sampleId: defaultType === "drum" ? "kick" : "synth",
      type: defaultType,
      vol: 0.8,
      mute: false,
      solo: false,
      steps: Array(pattern.stepCount).fill(false) as boolean[],
      notes: Array(pattern.stepCount).fill(null) as (number | null)[],
      velocity: Array(pattern.stepCount).fill(1) as number[],
      probability: Array(pattern.stepCount).fill(1) as number[],
      durations: Array(pattern.stepCount).fill(1) as number[],
    };
    updateSection(sectionId, (s) => ({ ...s, tracks: [...s.tracks, newTrack] }));
  }

  function handleRemoveTrack(sectionId: string, trackIndex: number) {
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (!sec || sec.tracks.length <= 1) return;
    pushHistory();
    updateSection(sectionId, (s) => ({
      ...s,
      tracks: s.tracks.filter((_, i) => i !== trackIndex),
    }));
  }

  // ── Copy / paste track ────────────────────────────────────────────────────

  function handleCopyTrack(sectionId: string, trackIndex: number) {
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const t = sec.tracks[trackIndex];
    setClipboardTrack({ steps: [...t.steps], notes: [...t.notes], velocity: [...t.velocity] });
  }

  function handlePasteTrack(sectionId: string, trackIndex: number) {
    if (!clipboardTrack) return;
    pushHistory();
    updateTrack(sectionId, trackIndex, (t) => {
      const len = t.steps.length;
      function padArr<T>(arr: T[], fill: T): T[] {
        return arr.length >= len ? arr.slice(0, len) : [...arr, ...Array(len - arr.length).fill(fill)];
      }
      return {
        ...t,
        steps:    padArr(clipboardTrack.steps,    false),
        notes:    padArr(clipboardTrack.notes,    null),
        velocity: padArr(clipboardTrack.velocity, 1),
      };
    });
  }

  // ── Duplicate track ───────────────────────────────────────────────────────

  function handleDuplicateTrack(sectionId: string, trackIndex: number) {
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (!sec || sec.tracks.length >= 16) return;
    pushHistory();
    updateSection(sectionId, (s) => {
      const tracks = [...s.tracks];
      const original = tracks[trackIndex];
      const clone: TrackState = {
        ...original,
        id: `track-${Date.now()}`,
        steps: [...original.steps],
        notes: [...original.notes],
        velocity: [...original.velocity],
        probability: [...original.probability],
        durations: original.durations ? [...original.durations] : undefined,
      };
      tracks.splice(trackIndex + 1, 0, clone);
      return { ...s, tracks };
    });
  }

  // ── Shift track steps ─────────────────────────────────────────────────────

  function handleShiftTrack(sectionId: string, trackIndex: number, dir: -1 | 1) {
    pushHistory();
    updateTrack(sectionId, trackIndex, (t) => {
      const n = t.steps.length;
      function rotateArr<T>(arr: T[]): T[] {
        if (dir === 1) return [arr[n - 1], ...arr.slice(0, n - 1)] as T[];
        return [...arr.slice(1), arr[0]] as T[];
      }
      return {
        ...t,
        steps:    rotateArr(t.steps),
        notes:    rotateArr(t.notes),
        velocity: rotateArr(t.velocity),
        durations: t.durations ? rotateArr(t.durations) : undefined,
      };
    });
  }

  // ── Double pattern ────────────────────────────────────────────────────────

  function handleDoublePattern() {
    if (pattern.stepCount >= 64) return;
    const newCount = (pattern.stepCount * 2) as 8 | 16 | 32 | 64;
    pushHistory();
    setPattern((prev) => ({
      ...prev,
      stepCount: newCount,
      sections: prev.sections.map((sec) => ({
        ...sec,
        tracks: sec.tracks.map((t) => ({
          ...t,
          steps:    [...t.steps,    ...t.steps],
          notes:    [...t.notes,    ...t.notes],
          velocity: [...t.velocity, ...t.velocity],
          probability: [...t.probability, ...t.probability],
          durations: t.durations ? [...t.durations, ...t.durations] : undefined,
        })),
      })),
    }));
    setLoopRange((r) => r ? [r[0], Math.min(r[1], newCount - 1)] : null);
  }

  // ── Step-range copy / paste / fill ────────────────────────────────────────

  function handleCopyRange(sectionId: string, trackIndex: number, start: number, end: number) {
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const t = sec.tracks[trackIndex];
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    setStepRangeClipboard({
      steps:    t.steps.slice(s, e + 1),
      notes:    t.notes.slice(s, e + 1),
      velocity: t.velocity.slice(s, e + 1),
    });
  }

  function handlePasteRange(sectionId: string, trackIndex: number, at: number) {
    if (!stepRangeClipboard) return;
    pushHistory();
    updateTrack(sectionId, trackIndex, (t) => {
      const newSteps    = [...t.steps];
      const newNotes    = [...t.notes];
      const newVelocity = [...t.velocity];
      stepRangeClipboard.steps.forEach((sv, j) => {
        const idx = at + j;
        if (idx < t.steps.length) {
          newSteps[idx]    = sv;
          newNotes[idx]    = stepRangeClipboard.notes[j] ?? null;
          newVelocity[idx] = stepRangeClipboard.velocity[j] ?? 1;
        }
      });
      return { ...t, steps: newSteps, notes: newNotes, velocity: newVelocity };
    });
  }

  function handleFillFromRange(sectionId: string, trackIndex: number, start: number, end: number) {
    pushHistory();
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const t = sec.tracks[trackIndex];
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const len = e - s + 1;
    const srcSteps    = t.steps.slice(s, e + 1);
    const srcNotes    = t.notes.slice(s, e + 1);
    const srcVelocity = t.velocity.slice(s, e + 1);
    updateTrack(sectionId, trackIndex, (track) => {
      const newSteps    = [...track.steps];
      const newNotes    = [...track.notes];
      const newVelocity = [...track.velocity];
      for (let i = e + 1; i < track.steps.length; i++) {
        const j = (i - s) % len;
        newSteps[i]    = srcSteps[j];
        newNotes[i]    = srcNotes[j] ?? null;
        newVelocity[i] = srcVelocity[j] ?? 1;
      }
      return { ...track, steps: newSteps, notes: newNotes, velocity: newVelocity };
    });
  }

  // ── Rename track ──────────────────────────────────────────────────────────

  function handleRenameTrack(sectionId: string, trackIndex: number, name: string) {
    updateTrack(sectionId, trackIndex, (t) => ({ ...t, name: name || undefined }));
  }

  // ── Per-track probability ─────────────────────────────────────────────────

  function handleChangeProbability(sectionId: string, trackIndex: number, prob: number) {
    updateTrack(sectionId, trackIndex, (t) => ({
      ...t,
      probability: t.probability.map(() => prob),
    }));
  }

  // ── Euclidean rhythm ──────────────────────────────────────────────────────

  function handleApplyEuclidean(sectionId: string, trackIndex: number, steps: boolean[]) {
    pushHistory();
    updateTrack(sectionId, trackIndex, (t) => ({
      ...t,
      steps: steps.slice(0, t.steps.length),
    }));
  }

  // ── Drag-to-reorder (within a section) ───────────────────────────────────

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragEnter(index: number) {
    setDragOver(index);
  }

  function handleDragDrop(sectionId: string, targetIndex: number) {
    const from = dragIndexRef.current;
    if (from === null || from === targetIndex) {
      dragIndexRef.current = null;
      setDragOver(null);
      return;
    }
    pushHistory();
    updateSection(sectionId, (sec) => {
      const tracks = [...sec.tracks];
      const [moved] = tracks.splice(from, 1);
      tracks.splice(targetIndex, 0, moved);
      return { ...sec, tracks };
    });
    dragIndexRef.current = null;
    setDragOver(null);
  }

  function handleRandomizeTrack(sectionId: string, trackIndex: number) {
    const sec = pattern.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    pushHistory();
    const track = sec.tracks[trackIndex];
    if (track.type === "melody") {
      const scaleMidi = getScaleMidiSet(pianoRoot, pianoScale);
      const lo = midiNoteNumber(pianoRoot, pianoOctave) - 12;
      const hi = midiNoteNumber(pianoRoot, pianoOctave) + 14;
      const pool = Array.from(scaleMidi).filter((m) => m >= lo && m <= hi);
      if (pool.length === 0) return;
      updateTrack(sectionId, trackIndex, (t) => {
        const newSteps = t.steps.map(() => Math.random() < 0.3);
        const newNotes = newSteps.map((on) =>
          on ? pool[Math.floor(Math.random() * pool.length)] : null
        );
        return { ...t, steps: newSteps, notes: newNotes };
      });
    } else {
      updateTrack(sectionId, trackIndex, (t) => ({ ...t, steps: t.steps.map(() => Math.random() < 0.3) }));
    }
  }

  function handleToggleTrackType(sectionId: string, trackIndex: number) {
    pushHistory();
    updateTrack(sectionId, trackIndex, (t) => ({
      ...t,
      type: t.type === "melody" ? "drum" : "melody",
    }));
  }

  function handleSwingChange(swing: number) {
    setPattern((prev) => ({ ...prev, swing: clamp(swing, 0, 100) }));
  }

  function handleSlotChange(slot: 0 | 1) {
    setActiveSlot(slot);
  }

  async function handlePlayNote(midi: number) {
    await initEngine();
    const engine = getEngine();
    await engine.resume();
    engine.playTone(noteFrequency(midi), 0.8, 1.5);
    setSelectedNote(midi);
    setSelectedChord(null);
    if (midiAccessRef.current && midiOutputIdRef.current) {
      sendMelodicNote(midiAccessRef.current, midiOutputIdRef.current, midi, 90, 500);
    }
  }

  async function handlePlayChord(midiNotes: number[]) {
    await initEngine();
    const engine = getEngine();
    await engine.resume();
    for (const midi of midiNotes) {
      engine.playTone(noteFrequency(midi), 0.6, 2.0);
    }
    setSelectedChord(midiNotes);
    setSelectedNote(null);
    if (midiAccessRef.current && midiOutputIdRef.current) {
      for (const midi of midiNotes) {
        sendMelodicNote(midiAccessRef.current, midiOutputIdRef.current, midi, 80, 600);
      }
    }
  }

  function handleMidiReady(access: MIDIAccess, outputId: string) {
    midiAccessRef.current   = access;
    midiOutputIdRef.current = outputId;
  }

  function handleMidiCleared() {
    midiAccessRef.current   = null;
    midiOutputIdRef.current = null;
  }

  function handleGrooveLoad(patch: Pick<Pattern, "bpm" | "stepCount" | "sections">) {
    pushHistory();
    setPattern((prev) => ({
      ...prev,
      bpm: patch.bpm,
      stepCount: patch.stepCount,
      sections: patch.sections,
    }));
  }

  // ── Add / remove sections ─────────────────────────────────────────────────

  function handleAddSection(preset: SectionPreset) {
    pushHistory();
    const id = `section-${preset.id}-${Date.now()}`;
    const isDrum = preset.type === "drums";
    const newSection: InstrumentSection = {
      id,
      type: preset.type,
      name: preset.name,
      color: preset.color,
      vol: 1,
      mute: false,
      solo: false,
      tracks: [{
        id: `track-${Date.now()}`,
        sampleId: isDrum ? "kick" : "synth",
        type: isDrum ? "drum" : "melody",
        voice: isDrum ? undefined : preset.defaultVoice,
        vol: 0.8,
        mute: false,
        solo: false,
        steps: Array(pattern.stepCount).fill(false) as boolean[],
        notes: Array(pattern.stepCount).fill(null) as (number | null)[],
        velocity: Array(pattern.stepCount).fill(1) as number[],
        probability: Array(pattern.stepCount).fill(1) as number[],
        durations: Array(pattern.stepCount).fill(1) as number[],
      }],
    };
    setPattern((prev) => ({ ...prev, sections: [...prev.sections, newSection] }));
    setActiveTab(id);
  }

  function handleRemoveSection(sectionId: string) {
    if (pattern.sections.length <= 1) return; // always keep at least one section
    pushHistory();
    const remaining = pattern.sections.filter((s) => s.id !== sectionId);
    setPattern((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) }));
    if (activeTab === sectionId) setActiveTab(remaining[0]?.id ?? "");
  }

  // Derive active section — fallback to first section if activeTab is invalid/"mix"
  const activeSection = pattern.sections.find((s) => s.id === activeTab) ?? pattern.sections[0] ?? null;

  return (
    <Container className="py-6 space-y-4">

      {/* ── Visualizer ── */}
      <Card className="p-0 overflow-hidden">
        <Visualizer
          analyser={analyser}
          mode={vizMode}
          onSetMode={setVizMode}
          isPlaying={isPlaying}
        />
      </Card>

      {/* ── Controls + Mixer ── */}
      <Card className="p-0">
        {/* Stable header — Easy/Adv toggle always lives here */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-rim">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Controls</span>
          <Tooltip content={easyMode ? "Switch to Advanced — unlocks melody, swing, MIDI & more" : "Switch to Easy mode"}>
            <button
              type="button"
              onClick={() => setEasyMode((m) => !m)}
              aria-pressed={!easyMode}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all active:scale-95 ${
                easyMode
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
              }`}
            >
              {easyMode ? "🟢 Easy" : "⚙️ Advanced"}
            </button>
          </Tooltip>
        </div>
        <div className="px-4 py-3 border-b border-rim">
          <Transport
            isPlaying={isPlaying}
            bpm={pattern.bpm}
            masterVol={pattern.masterVol}
            stepCount={pattern.stepCount}
            swing={pattern.swing}
            activeSlot={activeSlot}
            easyMode={easyMode}
            metronomeActive={metronomeActive}
            humanize={pattern.humanize ?? 0}
            onTogglePlay={handleTogglePlay}
            onBpmChange={handleBpmChange}
            onMasterVolChange={handleMasterVolChange}
            onStepCountChange={handleStepCountChange}
            onTapTempo={handleTapTempo}
            onSwingChange={handleSwingChange}
            onSlotChange={handleSlotChange}
            onToggleMetronome={() => setMetronomeActive((m) => !m)}
            chainActive={chainActive}
            onToggleChain={() => {
              setChainActive((c) => !c);
              chainActiveRef.current = !chainActiveRef.current;
            }}
            onHumanizeChange={handleHumanizeChange}
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-rim">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Mixer</span>
          <GroovePresets onLoad={handleGrooveLoad} compact />
        </div>
        <SectionMixer
          sections={pattern.sections}
          stepCount={pattern.stepCount}
          currentStep={currentStep}
          isPlaying={isPlaying}
          activeTabId={activeTab}
          onSelectSection={(id) => setActiveTab(id)}
          onSectionMute={handleSectionMute}
          onSectionSolo={handleSectionSolo}
          onSectionVolChange={handleSectionVolChange}
        />
      </Card>

      {/* Step sequencer — tabbed by instrument section */}
      <Card className="p-0">

        {/* ── Grid toolbar ── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-rim">
          <Tooltip content="Undo last edit — shortcut: Ctrl+Z">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="h-7 px-2.5 flex items-center gap-1 rounded text-xs font-medium transition-colors text-ink-dim hover:text-ink hover:bg-well disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Undo"
            >
              <span aria-hidden="true">↩</span> Undo
            </button>
          </Tooltip>
          <Tooltip content="Redo — shortcut: Ctrl+Y">
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="h-7 px-2.5 flex items-center gap-1 rounded text-xs font-medium transition-colors text-ink-dim hover:text-ink hover:bg-well disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Redo"
            >
              <span aria-hidden="true">↪</span> Redo
            </button>
          </Tooltip>

          <div className="h-4 w-px bg-rim shrink-0" aria-hidden="true" />

          <Tooltip content="Erase all steps — tracks, samples, and settings are kept">
            <button
              type="button"
              onClick={handleReset}
              className="h-7 px-2.5 flex items-center gap-1 rounded text-xs font-medium transition-colors text-ink-dim hover:text-rose-400 hover:bg-well"
              aria-label="Clear all steps"
            >
              <span aria-hidden="true">✕</span> Clear steps
            </button>
          </Tooltip>

          <Tooltip content={pattern.stepCount >= 64 ? "Already at maximum 64 steps" : `Double to ${pattern.stepCount * 2} steps`}>
            <button
              type="button"
              onClick={handleDoublePattern}
              disabled={pattern.stepCount >= 64}
              className="h-7 px-2.5 flex items-center gap-1 rounded text-xs font-medium transition-colors text-ink-dim hover:text-amber-400 hover:bg-well disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Double pattern length"
            >
              <span aria-hidden="true">×2</span> Double
            </button>
          </Tooltip>

          <div className="flex-1" />

          <Tooltip content={teachMode ? "Hide notation" : "Teach Me — see note values below each track"}>
            <button
              type="button"
              onClick={() => setTeachMode((t) => !t)}
              className={`h-7 px-3 flex items-center gap-1.5 rounded text-xs font-semibold transition-colors ${
                teachMode
                  ? "text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 ring-1 ring-amber-500/40"
                  : "text-ink-dim hover:text-ink hover:bg-well"
              }`}
              aria-pressed={teachMode}
            >
              <span aria-hidden="true">🎓</span>
              Teach Me
            </button>
          </Tooltip>

          <div className="h-4 w-px bg-rim shrink-0" aria-hidden="true" />

          <SoundPackSwitcher
            currentPackId={soundPackId}
            loading={soundPackLoading}
            onSwitch={handleSoundPackSwitch}
          />

          <div className="h-4 w-px bg-rim shrink-0" aria-hidden="true" />

          <Tooltip content={loopRange
            ? `Only steps ${loopRange[0] + 1}–${loopRange[1] + 1} will play. Click Loop to turn off.`
            : "Loop range — play only a portion of steps"}>
            <button
              type="button"
              onClick={() => setLoopRange(loopRange ? null : [0, Math.min(7, pattern.stepCount - 1)])}
              className={`h-7 px-3 flex items-center gap-1.5 rounded text-xs font-semibold transition-colors ${
                loopRange
                  ? "text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 ring-1 ring-indigo-500/40"
                  : "text-ink-dim hover:text-ink hover:bg-well"
              }`}
              aria-pressed={!!loopRange}
            >
              <span aria-hidden="true">⟳</span>
              {loopRange ? `Loop: ${loopRange[0] + 1}–${loopRange[1] + 1}` : "Loop range"}
            </button>
          </Tooltip>
        </div>

        {loopRange && (
          <div className="px-3 py-1.5 flex items-center gap-2 bg-indigo-500/5 border-b border-indigo-500/20 text-xs text-indigo-400">
            <span aria-hidden="true">💡</span>
            Playing steps <strong>{loopRange[0] + 1}–{loopRange[1] + 1}</strong> only.
            Click any step number to move the loop edges.
          </div>
        )}

        {/* ── Instrument tabs ── */}
        <InstrumentTabs
          sections={pattern.sections}
          activeTabId={activeTab}
          onTabChange={setActiveTab}
          onAddSection={handleAddSection}
          onRemoveSection={pattern.sections.length > 1 ? handleRemoveSection : undefined}
        />

        {/* ── Tab content ── */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {activeSection ? (
              <InstrumentEditor
                section={activeSection}
                stepCount={pattern.stepCount}
                currentStep={currentStep}
                isPlaying={isPlaying}
                easyMode={easyMode}
                selectedNote={selectedNote}
                canPaste={!!clipboardTrack}
                canPasteRange={!!stepRangeClipboard}
                teachMode={teachMode}
                loopRange={loopRange}
                clipboardTrack={clipboardTrack}
                dragOver={dragOver}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragDrop={(targetIdx) => handleDragDrop(activeSection.id, targetIdx)}
                onDragEnd={() => setDragOver(null)}
                onPaintStart={(trackIdx, step, value) => {
                  pushHistory();
                  const track = activeSection.tracks[trackIdx];
                  if (track?.type === "melody") {
                    handleSetMelodyStep(activeSection.id, trackIdx, step, value);
                  } else {
                    handleSetStep(activeSection.id, trackIdx, step, value);
                  }
                }}
                onPaint={(trackIdx, step, value) => {
                  const track = activeSection.tracks[trackIdx];
                  if (track?.type === "melody") {
                    handleSetMelodyStep(activeSection.id, trackIdx, step, value);
                  } else {
                    handleSetStep(activeSection.id, trackIdx, step, value);
                  }
                }}
                onVelocityChange={(ti, step, vel) => handleVelocityChange(activeSection.id, ti, step, vel)}
                onChangeSample={(ti, sampleId) => handleChangeSample(activeSection.id, ti, sampleId)}
                onChangeVol={(ti, vol) => handleChangeVol(activeSection.id, ti, vol)}
                onChangeProbability={(ti, prob) => handleChangeProbability(activeSection.id, ti, prob)}
                onToggleMute={(ti) => handleToggleMute(activeSection.id, ti)}
                onToggleSolo={(ti) => handleToggleSolo(activeSection.id, ti)}
                onToggleType={(ti) => handleToggleTrackType(activeSection.id, ti)}
                onClear={(ti) => handleClearTrack(activeSection.id, ti)}
                onRandomize={(ti) => handleRandomizeTrack(activeSection.id, ti)}
                onCopy={(ti) => handleCopyTrack(activeSection.id, ti)}
                onPaste={(ti) => handlePasteTrack(activeSection.id, ti)}
                onRemove={(ti) => handleRemoveTrack(activeSection.id, ti)}
                onRename={(ti, name) => handleRenameTrack(activeSection.id, ti, name)}
                onEuclidean={(ti) => setEuclidTrack({ sectionId: activeSection.id, trackIndex: ti })}
                onPreviewSample={(sampleId) => getEngine().previewSample(sampleId)}
                onOctaveOffsetChange={(ti, offset) => handleOctaveOffsetChange(activeSection.id, ti, offset)}
                onColorChange={(ti, color) => handleColorChange(activeSection.id, ti, color)}
                onDuplicate={(ti) => handleDuplicateTrack(activeSection.id, ti)}
                onShiftLeft={(ti) => handleShiftTrack(activeSection.id, ti, -1)}
                onShiftRight={(ti) => handleShiftTrack(activeSection.id, ti, 1)}
                onCopyRange={(ti, start, end) => handleCopyRange(activeSection.id, ti, start, end)}
                onPasteRange={(ti, at) => handlePasteRange(activeSection.id, ti, at)}
                onFillFromRange={(ti, start, end) => handleFillFromRange(activeSection.id, ti, start, end)}
                onDurationChange={(ti, step, dur) => handleDurationChange(activeSection.id, ti, step, dur)}
                onVoiceChange={(ti, v) => handleVoiceChange(activeSection.id, ti, v)}
                onAddTrack={() => handleAddTrack(activeSection.id)}
                onFocusTrack={setFocusedTrack}
                sectionType={activeSection.type}
              />
            ) : null}
          </div>
        </div>

        {/* Piano keyboard — shown for melody sections (piano, bass, synth, custom) */}
        {activeSection && activeSection.type !== "drums" && (
          <div className="border-t border-rim">
            <PianoKeyboard
              root={pianoRoot}
              scale={pianoScale}
              octave={pianoOctave}
              selectedNote={selectedNote}
              selectedChord={selectedChord}
              activeNotes={playingNotes}
              onRootChange={setPianoRoot}
              onScaleChange={setPianoScale}
              onOctaveChange={setPianoOctave}
              onPlayNote={handlePlayNote}
              onPlayChord={handlePlayChord}
              onArmChord={(notes) => { setSelectedChord(notes.length ? notes : null); setSelectedNote(null); }}
            />
          </div>
        )}
      </Card>

      {/* Record + Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <RecordPanel getMediaStream={() => getEngine().getMediaStream()} />
        </Card>
        <Card>
          <SessionMenu pattern={pattern} onLoad={(p) => {
            setPattern(p);
            setLoopRange(null);
            undoStackRef.current = [];
            redoStackRef.current = [];
            setCanUndo(false);
            setCanRedo(false);
            // Reset active tab to first section
            if (p.sections.length > 0) setActiveTab(p.sections[0].id);
          }} />
        </Card>
      </div>

      {/* MIDI — advanced only */}
      {!easyMode && (
        <Card>
          <MidiPanel
            onAccessReady={handleMidiReady}
            onAccessCleared={handleMidiCleared}
          />
        </Card>
      )}

      {!initialized && (
        <p className="text-center text-xs text-ink-dim pb-2">
          Press <kbd className="rounded bg-well border border-rim px-1.5 py-0.5 font-mono text-ink-dim">Space</kbd> or click Play to start the audio engine.
        </p>
      )}

      {autoSavedAt && (
        <div
          key={autoSavedAt}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-panel border border-rim px-3 py-2 text-xs text-ink-dim shadow-lg animate-[fadeout_2.5s_ease-out_forwards]"
          aria-live="polite"
        >
          <span aria-hidden="true">💾</span> Auto-saved
        </div>
      )}

      {euclidTrack !== null && (
        <EuclideanDialog
          stepCount={pattern.stepCount}
          onApply={(steps) => {
            handleApplyEuclidean(euclidTrack.sectionId, euclidTrack.trackIndex, steps);
            setEuclidTrack(null);
          }}
          onClose={() => setEuclidTrack(null)}
        />
      )}
    </Container>
  );
}
