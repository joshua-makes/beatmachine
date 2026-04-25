"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Transport } from "@/components/beat/Transport";
import { TrackRow } from "@/components/beat/TrackRow";
import { Visualizer } from "@/components/beat/Visualizer";
import { SessionMenu } from "@/components/beat/SessionMenu";
import { RecordPanel } from "@/components/beat/RecordPanel";
import { getEngine } from "@/lib/audio/engine";
import { Scheduler, stepDurationSec } from "@/lib/audio/scheduler";
import { createDefaultPattern, decodeShareUrl, type Pattern, type TrackState } from "@/lib/pattern";
import { clamp, TRACK_COLORS } from "@/lib/utils";
import { PianoKeyboard } from "@/components/beat/PianoKeyboard";
import { MidiPanel } from "@/components/beat/MidiPanel";
import { GroovePresets } from "@/components/beat/GroovePresets";
import { noteFrequency, midiNoteNumber, getScaleMidiSet, type NoteName, type ScaleName } from "@/lib/scales";
import { sendDrumNote, sendMelodicNote } from "@/lib/audio/midi";
import { EuclideanDialog } from "@/components/beat/EuclideanDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { autoSavePatterns, loadAutoSave } from "@/lib/session";

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

  // Metronome
  const [metronomeActive, setMetronomeActive] = useState(false);
  const metronomeActiveRef = useRef(false);

  // Pattern chain A→B
  const [chainActive, setChainActive] = useState(false);
  const chainActiveRef = useRef(false);

  // Euclidean dialog
  const [euclidTrack, setEuclidTrack] = useState<number | null>(null);

  // Focused track index for keyboard shortcuts (M = mute, S = solo)
  const [focusedTrack, setFocusedTrack] = useState<number | null>(null);

  // Drag-reorder state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Loop range — [startStep, endStep] inclusive, 0-indexed. null = full loop.
  const [loopRange, setLoopRange] = useState<[number, number] | null>(null);
  const loopRangeRef = useRef<[number, number] | null>(null);

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
        if (e.code === "KeyM" && focusedTrack !== null) {
          e.preventDefault();
          handleToggleMute(focusedTrack);
        }
        if (e.code === "KeyS" && focusedTrack !== null) {
          e.preventDefault();
          handleToggleSolo(focusedTrack);
        }
        // Arrow keys to move focused track
        if (e.code === "ArrowUp") {
          e.preventDefault();
          setFocusedTrack((f) => (f === null || f === 0) ? 0 : f - 1);
        }
        if (e.code === "ArrowDown") {
          e.preventDefault();
          setFocusedTrack((f) => {
            const last = patternRef.current.tracks.length - 1;
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
    patternRef.current.tracks.forEach((t) => {
      engine.setTrackVolume(t.id, t.vol);
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
    const hasSolo = p.tracks.some((t) => t.solo);
    const notesThisStep: number[] = [];
    const humanize = p.humanize ?? 0;
    p.tracks.forEach((track) => {
      if (track.mute) return;
      if (hasSolo && !track.solo) return;
      if (!track.steps[step]) return;

      // Per-step probability gate
      const prob = track.probability?.[step] ?? 1;
      if (prob < 1 && Math.random() > prob) return;

      if (track.type === "melody") {
        const midi = track.notes?.[step];
        if (midi != null) {
          const dur = stepDurationSec(p.bpm) * 1.8;
          const octaveShift = (track.octaveOffset ?? 0) * 12;
          const midiArr = Array.isArray(midi) ? midi : [midi];
          const timeJitter = humanize > 0 ? (Math.random() - 0.3) * humanize * 0.0006 : 0;
          const playTime = time + Math.max(0, timeJitter);
          for (const m of midiArr) {
            const shifted = m + octaveShift;
            engine.playToneAt(noteFrequency(shifted), track.vol * 0.85, dur, playTime);
            notesThisStep.push(shifted);
            if (midiAccessRef.current && midiOutputIdRef.current) {
              sendMelodicNote(midiAccessRef.current, midiOutputIdRef.current, shifted, Math.round(track.vol * 85), Math.round(dur * 1000));
            }
          }
        }
      } else {
        const baseVel = track.velocity?.[step] ?? 1.0;
        const velJitter = humanize > 0 ? (1 - Math.random() * humanize * 0.003) : 1;
        const vel = Math.max(0.05, baseVel * velJitter);
        const timeJitter = humanize > 0 ? (Math.random() - 0.3) * humanize * 0.0006 : 0;
        engine.playBuffer(track.sampleId, track.id, time + Math.max(0, timeJitter), vel);
        if (midiAccessRef.current && midiOutputIdRef.current) {
          sendDrumNote(midiAccessRef.current, midiOutputIdRef.current, track.sampleId);
        }
      }
    });
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

  function updateTrack(index: number, updater: (t: TrackState) => TrackState) {
    setPattern((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t, i) => (i === index ? updater(t) : t)),
    }));
  }

  function handleBpmChange(bpm: number) {
    setPattern((prev) => ({ ...prev, bpm: clamp(bpm, 60, 200) }));
  }

  function handleMasterVolChange(vol: number) {
    const clamped = clamp(vol, 0, 1);
    setPattern((prev) => ({ ...prev, masterVol: clamped }));
    if (initialized) getEngine().setMasterVolume(clamped);
  }

  function handleChangeSample(trackIndex: number, sampleId: string) {
    updateTrack(trackIndex, (t) => ({ ...t, sampleId }));
  }

  function handleChangeVol(trackIndex: number, vol: number) {
    updateTrack(trackIndex, (t) => ({ ...t, vol }));
    if (initialized) getEngine().setTrackVolume(pattern.tracks[trackIndex].id, vol);
  }

  function handleToggleMute(trackIndex: number) {
    updateTrack(trackIndex, (t) => ({ ...t, mute: !t.mute }));
  }

  function handleToggleSolo(trackIndex: number) {
    updateTrack(trackIndex, (t) => ({ ...t, solo: !t.solo }));
  }

  function handleStepCountChange(count: 8 | 16 | 32 | 64) {
    setPattern((prev) => ({
      ...prev,
      stepCount: count,
      tracks: prev.tracks.map((t) => ({
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
      })),
    }));
    // Clamp loop range to new step count
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

  function handleOctaveOffsetChange(trackIndex: number, offset: number) {
    updateTrack(trackIndex, (t) => ({ ...t, octaveOffset: offset }));
  }

  function handleColorChange(trackIndex: number, color: string) {
    updateTrack(trackIndex, (t) => ({ ...t, color }));
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
      tracks: prev.tracks.map((t) => ({
        ...t,
        steps: Array(prev.stepCount).fill(false) as boolean[],
        notes: Array(prev.stepCount).fill(null),
        velocity: Array(prev.stepCount).fill(1) as number[],
      })),
    }));
  }

  function handleClearTrack(trackIndex: number) {
    pushHistory();
    updateTrack(trackIndex, (t) => ({
      ...t,
      steps: t.steps.map(() => false),
      notes: t.notes.map(() => null),
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

  // ── Step set (used by drag painting — value-based, not toggle-based) ──────

  function handleSetStep(trackIndex: number, step: number, value: boolean) {
    updateTrack(trackIndex, (t) => ({
      ...t,
      steps: t.steps.map((v, i) => (i === step ? value : v)),
    }));
  }

  function handleSetMelodyStep(trackIndex: number, step: number, value: boolean) {
    // Use armed chord if available, else armed note, else root of current octave
    const noteValue: number | number[] | null = value
      ? (selectedChord ?? selectedNote ?? midiNoteNumber(pianoRoot, pianoOctave))
      : null;
    updateTrack(trackIndex, (t) => ({
      ...t,
      steps: t.steps.map((v, i) => (i === step ? value : v)),
      notes: t.notes.map((n, i) => (i === step ? noteValue : n)),
    }));
  }

  // ── Per-step velocity ─────────────────────────────────────────────────────

  function handleVelocityChange(trackIndex: number, step: number, velocity: number) {
    updateTrack(trackIndex, (t) => ({
      ...t,
      velocity: t.velocity.map((v, i) => (i === step ? velocity : v)),
    }));
  }

  // ── Add / remove tracks ───────────────────────────────────────────────────

  function handleAddTrack() {
    if (pattern.tracks.length >= 16) return;
    pushHistory();
    const id = `track-${Date.now()}`;
    const newTrack: TrackState = {
      id,
      sampleId: "kick",
      type: "drum",
      vol: 0.8,
      mute: false,
      solo: false,
      steps: Array(pattern.stepCount).fill(false) as boolean[],
      notes: Array(pattern.stepCount).fill(null) as (number | null)[],
      velocity: Array(pattern.stepCount).fill(1) as number[],
      probability: Array(pattern.stepCount).fill(1) as number[],
    };
    setPattern((prev) => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
  }

  function handleRemoveTrack(trackIndex: number) {
    if (pattern.tracks.length <= 1) return;
    pushHistory();
    setPattern((prev) => ({ ...prev, tracks: prev.tracks.filter((_, i) => i !== trackIndex) }));
  }

  // ── Copy / paste track ────────────────────────────────────────────────────

  function handleCopyTrack(trackIndex: number) {
    const t = pattern.tracks[trackIndex];
    setClipboardTrack({ steps: [...t.steps], notes: [...t.notes], velocity: [...t.velocity] });
  }

  function handlePasteTrack(trackIndex: number) {
    if (!clipboardTrack) return;
    pushHistory();
    updateTrack(trackIndex, (t) => {
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

  // ── Rename track ──────────────────────────────────────────────────────────

  function handleRenameTrack(trackIndex: number, name: string) {
    updateTrack(trackIndex, (t) => ({ ...t, name: name || undefined }));
  }

  // ── Per-track probability ─────────────────────────────────────────────────

  function handleChangeProbability(trackIndex: number, prob: number) {
    updateTrack(trackIndex, (t) => ({
      ...t,
      probability: t.probability.map(() => prob),
    }));
  }

  // ── Euclidean rhythm ──────────────────────────────────────────────────────

  function handleApplyEuclidean(trackIndex: number, steps: boolean[]) {
    pushHistory();
    updateTrack(trackIndex, (t) => ({
      ...t,
      steps: steps.slice(0, t.steps.length),
    }));
  }

  // ── Drag-to-reorder ───────────────────────────────────────────────────────

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragEnter(index: number) {
    setDragOver(index);
  }

  function handleDragDrop(targetIndex: number) {
    const from = dragIndexRef.current;
    if (from === null || from === targetIndex) {
      dragIndexRef.current = null;
      setDragOver(null);
      return;
    }
    pushHistory();
    setPattern((prev) => {
      const tracks = [...prev.tracks];
      const [moved] = tracks.splice(from, 1);
      tracks.splice(targetIndex, 0, moved);
      return { ...prev, tracks };
    });
    dragIndexRef.current = null;
    setDragOver(null);
  }

  function handleRandomizeTrack(trackIndex: number) {
    pushHistory();
    const track = pattern.tracks[trackIndex];
    if (track.type === "melody") {
      // Pick random notes from the current scale in the piano octave range
      const scaleMidi = getScaleMidiSet(pianoRoot, pianoScale);
      const lo = midiNoteNumber(pianoRoot, pianoOctave) - 12;
      const hi = midiNoteNumber(pianoRoot, pianoOctave) + 14;
      const pool = Array.from(scaleMidi).filter((m) => m >= lo && m <= hi);
      if (pool.length === 0) return;
      updateTrack(trackIndex, (t) => {
        const newSteps = t.steps.map(() => Math.random() < 0.3);
        const newNotes = newSteps.map((on) =>
          on ? pool[Math.floor(Math.random() * pool.length)] : null
        );
        return { ...t, steps: newSteps, notes: newNotes };
      });
    } else {
      updateTrack(trackIndex, (t) => ({ ...t, steps: t.steps.map(() => Math.random() < 0.3) }));
    }
  }

  function handleToggleTrackType(trackIndex: number) {
    pushHistory();
    updateTrack(trackIndex, (t) => ({
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
    setSelectedNote(midi);   // arm this note for melody step painting
    setSelectedChord(null);  // clear any armed chord
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
    // Arm the chord for step painting
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

  function handleGrooveLoad(patch: Pick<Pattern, "bpm" | "stepCount" | "tracks">) {
    pushHistory();
    setPattern((prev) => ({ ...prev, ...patch }));
  }

  return (
    <Container className="py-6 space-y-4">

      {/* Easy / Advanced mode toggle — top of page, always visible */}
      <div className={`flex items-center justify-between gap-3 rounded-xl border px-5 py-3 transition-colors ${
        easyMode
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
      }`}>
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${
            easyMode ? "text-emerald-700 dark:text-emerald-300" : "text-indigo-700 dark:text-indigo-300"
          }`}>
            {easyMode ? "🟢 Easy Mode" : "⚙️ Advanced Mode"}
          </span>
          <span className="text-xs text-ink-dim">
            {easyMode ? "Simple beat making — great for getting started" : "Melody, swing, A/B patterns, chords & MIDI"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEasyMode((m) => !m)}
          aria-pressed={easyMode}
          className={`shrink-0 rounded-full border px-5 py-2 text-sm font-semibold transition-all active:scale-95 ${
            easyMode
              ? "bg-white dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/60"
              : "bg-white dark:bg-indigo-900/40 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/60"
          }`}
        >
          {easyMode ? "Switch to Advanced" : "Switch to Easy"}
        </button>
      </div>

      {/* Groove presets — always shown */}
      <Card>
        <GroovePresets onLoad={handleGrooveLoad} />
      </Card>

      {/* Empty-state nudge — shown when no steps are active yet */}
      {!pattern.tracks.some((t) => t.steps.some(Boolean)) && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/60 bg-indigo-50/60 dark:bg-indigo-950/20 px-5 py-3 text-sm text-indigo-600 dark:text-indigo-400">
          <span className="text-2xl" aria-hidden="true">🎶</span>
          <div>
            <span className="font-semibold">Pick a groove above to get started</span>
            <span className="hidden sm:inline text-ink-dim">, or tap any step in the grid below to begin building your beat.</span>
          </div>
        </div>
      )}

      {/* Transport */}
      <Card>
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
      </Card>

      {/* Visualizer */}
      <Card className="p-0 overflow-hidden">
        <Visualizer
          analyser={analyser}
          mode={vizMode}
          onSetMode={setVizMode}
          isPlaying={isPlaying}
        />
      </Card>

      {/* Piano / Keyboard — advanced only */}
      {!easyMode && (
      <Card>
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
      </Card>
      )}

      {/* Step sequencer */}
      <Card className="p-0">
        <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Step number header */}
          <div className="flex items-center gap-3 px-2 py-2 border-b border-rim">
            {/* Spacer that matches the drag handle column (hidden on mobile like the handle) */}
            <div className="hidden sm:block w-5 shrink-0" aria-hidden="true" />
            <div className="w-48 min-w-48 sm:w-60 sm:min-w-60 shrink-0 flex items-center gap-1 flex-wrap">
              {/* Undo / Redo */}
              <Tooltip content="Undo (Ctrl+Z)">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className="h-6 px-2 flex items-center justify-center rounded text-ink-ghost hover:text-ink hover:bg-well text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Undo"
                >
                  ↩
                </button>
              </Tooltip>
              <Tooltip content="Redo (Ctrl+Y)">
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  className="h-6 px-2 flex items-center justify-center rounded text-ink-ghost hover:text-ink hover:bg-well text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Redo"
                >
                  ↪
                </button>
              </Tooltip>
              <Tooltip content="Clear all steps (keeps tracks and settings)">
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-6 px-2 flex items-center justify-center rounded text-ink-ghost hover:text-rose-400 hover:bg-well text-xs transition-colors"
                  aria-label="Reset all steps"
                >
                  ⦲ Reset
                </button>
              </Tooltip>
              {/* Loop range toggle */}
              <Tooltip content={loopRange
                ? `Loop ${loopRange[0] + 1}–${loopRange[1] + 1} — click step numbers to adjust ends · click again to clear`
                : "Loop range — constrain playback to a subset of steps"}>
                <button
                  type="button"
                  onClick={() => setLoopRange(loopRange
                    ? null
                    : [0, Math.min(7, pattern.stepCount - 1)])}
                  className={`h-6 px-2 flex items-center justify-center rounded text-xs font-mono transition-colors ${
                    loopRange
                      ? "text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/25"
                      : "text-ink-ghost hover:text-ink hover:bg-well"
                  }`}
                  aria-pressed={!!loopRange}
                  aria-label={loopRange ? `Clear loop range (${loopRange[0]+1}–${loopRange[1]+1})` : "Set loop range"}
                >
                  {loopRange ? `⟳ ${loopRange[0]+1}–${loopRange[1]+1}` : "⟳"}
                </button>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: pattern.stepCount }, (_, i) => (
                <React.Fragment key={i}>
                  {i > 0 && i % 4 === 0 && <div className="w-1 sm:w-1.5 shrink-0" aria-hidden="true" />}
                  <div className="w-7 min-w-7 sm:w-8 sm:min-w-8 shrink-0 flex flex-col items-center gap-px">
                    {/* Playhead pip / loop range indicator */}
                    <div className={`h-1 w-full rounded-sm transition-colors duration-75 ${
                      isPlaying && currentStep === i
                        ? "bg-emerald-400 shadow-[0_0_5px_1px_#34d399]"
                        : loopRange && i >= loopRange[0] && i <= loopRange[1]
                          ? "bg-indigo-500/50"
                          : "bg-transparent"
                    }`} aria-hidden="true" />
                    {/* Step number — clickable when loop range is active to adjust endpoints */}
                    <span
                      onClick={loopRange ? () => handleLoopStepClick(i) : undefined}
                      className={`text-[9px] sm:text-[10px] font-mono select-none ${loopRange ? "cursor-pointer" : ""} ${
                        isPlaying && currentStep === i
                          ? "text-emerald-400 font-bold"
                          : loopRange && i >= loopRange[0] && i <= loopRange[1]
                            ? "text-indigo-400 font-semibold"
                            : i % 4 === 3 ? "text-ink-dim" : "text-ink-ghost"
                      }`}
                    >
                      {i % 4 === 3 ? i + 1 : "·"}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="w-16 shrink-0" />
          </div>

          {/* Track rows */}
          {pattern.tracks.map((track, i) => (
            <div
              key={track.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => { e.preventDefault(); handleDragEnter(i); }}
              onDrop={() => handleDragDrop(i)}
              onDragEnd={() => setDragOver(null)}
              className={dragOver === i ? "outline outline-2 outline-indigo-400/60 rounded-lg" : ""}
            >
              <TrackRow
              key={track.id}
              track={track}
              trackIndex={i}
              currentStep={currentStep}
              isPlaying={isPlaying}
              trackColor={track.color ?? TRACK_COLORS[i % TRACK_COLORS.length]}
              selectedNote={selectedNote}
              easyMode={easyMode}
              canPaste={!!clipboardTrack}
              onDragHandlePointerDown={() => handleDragStart(i)}
              onPaintStart={(step, value) => {
                pushHistory();
                if (track.type === "melody") {
                  handleSetMelodyStep(i, step, value);
                } else {
                  handleSetStep(i, step, value);
                }
              }}
              onPaint={(step, value) => {
                if (track.type === "melody") {
                  handleSetMelodyStep(i, step, value);
                } else {
                  handleSetStep(i, step, value);
                }
              }}
              onVelocityChange={(step, velocity) => handleVelocityChange(i, step, velocity)}
              onChangeSample={(sampleId) => handleChangeSample(i, sampleId)}
              onChangeVol={(vol) => handleChangeVol(i, vol)}
              onChangeProbability={(prob) => handleChangeProbability(i, prob)}
              onToggleMute={() => handleToggleMute(i)}
              onToggleSolo={() => handleToggleSolo(i)}
              onToggleType={() => handleToggleTrackType(i)}
              onClear={() => handleClearTrack(i)}
              onRandomize={() => handleRandomizeTrack(i)}
              onCopy={() => handleCopyTrack(i)}
              onPaste={() => handlePasteTrack(i)}
              onRemove={pattern.tracks.length > 1 ? () => handleRemoveTrack(i) : undefined}
              onRename={(name) => handleRenameTrack(i, name)}
              onEuclidean={() => setEuclidTrack(i)}
              onPreviewSample={(sampleId) => getEngine().previewSample(sampleId)}
              onOctaveOffsetChange={(offset) => handleOctaveOffsetChange(i, offset)}
              onColorChange={(color) => handleColorChange(i, color)}
            />
            </div>
          ))}

          {/* Add track button */}
          {pattern.tracks.length < 16 && (
            <div className="px-2 py-2 border-t border-rim">
              <button
                type="button"
                onClick={handleAddTrack}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-dim border border-dashed border-rim hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-well transition-colors"
              >
                <span className="text-base leading-none">+</span> Add Track
              </button>
            </div>
          )}
        </div>        </div>      </Card>

      {/* Record + Session — always shown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <RecordPanel getMediaStream={() => getEngine().getMediaStream()} />
        </Card>
        <Card>
          <SessionMenu pattern={pattern} onLoad={setPattern} />
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

      {/* Auto-save toast */}
      {autoSavedAt && (
        <div
          key={autoSavedAt}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-panel border border-rim px-3 py-2 text-xs text-ink-dim shadow-lg animate-[fadeout_2.5s_ease-out_forwards]"
          aria-live="polite"
        >
          <span aria-hidden="true">💾</span> Auto-saved
        </div>
      )}

      {/* Euclidean rhythm dialog */}
      {euclidTrack !== null && (
        <EuclideanDialog
          stepCount={pattern.stepCount}
          onApply={(steps) => {
            handleApplyEuclidean(euclidTrack, steps);
            setEuclidTrack(null);
          }}
          onClose={() => setEuclidTrack(null)}
        />
      )}
    </Container>
  );
}
