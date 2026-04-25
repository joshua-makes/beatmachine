export const STEPS = 16;

export function stepDurationSec(bpm: number): number {
  return 60 / bpm / 4;
}

export function nextStepTime(currentTime: number, bpm: number): number {
  return currentTime + stepDurationSec(bpm);
}

export function advanceStep(step: number): number {
  return (step + 1) % STEPS;
}

export interface SchedulerOptions {
  audioContext: AudioContext;
  getBpm: () => number;
  getStepCount: () => number;
  /** 0 = straight, 100 = max swing (~triplet 2:1 ratio) */
  getSwing: () => number;
  /**
   * Called every step with (globalStep, time).
   * globalStep increments monotonically; use modulo with stepCount for position.
   */
  onStep: (step: number, time: number) => void;
  /**
   * Optional: when chain mode is active, called at the end of each bar so the
   * caller can flip the active slot. Returns the step count for the NEXT bar.
   */
  onBarEnd?: () => void;
  /** Whether chain A→B is active — reads each tick so toggling takes effect next bar */
  getChain?: () => boolean;
  /** First step to play in loop range (inclusive, 0-indexed). Defaults to 0. */
  getLoopStart?: () => number;
  /** Last step to play in loop range (inclusive, 0-indexed). Defaults to stepCount-1. */
  getLoopEnd?: () => number;
}

export class Scheduler {
  private audioContext: AudioContext;
  private getBpm: () => number;
  private getStepCount: () => number;
  private getSwing: () => number;
  private onStep: (step: number, time: number) => void;
  private onBarEnd?: () => void;
  private getChain?: () => boolean;
  private getLoopStart?: () => number;
  private getLoopEnd?: () => number;
  private currentStep = 0;
  private nextNoteTime = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lookaheadMs = 25;
  private scheduleAheadTime = 0.1;

  constructor(options: SchedulerOptions) {
    this.audioContext = options.audioContext;
    this.getBpm = options.getBpm;
    this.getStepCount = options.getStepCount;
    this.getSwing = options.getSwing;
    this.onStep = options.onStep;
    this.onBarEnd = options.onBarEnd;
    this.getChain = options.getChain;
    this.getLoopStart = options.getLoopStart;
    this.getLoopEnd = options.getLoopEnd;
  }

  start() {
    this.currentStep = this.getLoopStart?.() ?? 0;
    this.nextNoteTime = this.audioContext.currentTime;
    this.intervalId = setInterval(() => this.tick(), this.lookaheadMs);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentStep = 0;
  }

  private tick() {
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.onStep(this.currentStep, this.nextNoteTime);
      const stepDur = stepDurationSec(this.getBpm());
      // Swing: offset odd steps so even steps are longer, odd steps shorter
      // swingAmt=0 → straight; swingAmt=0.33 → 2:1 triplet feel
      const swingAmt = (this.getSwing() / 100) * 0.33;
      const isEven = this.currentStep % 2 === 0;
      this.nextNoteTime += stepDur * (isEven ? 1 + swingAmt : 1 - swingAmt);

      const stepCount = this.getStepCount();
      const loopStart = this.getLoopStart?.() ?? 0;
      const loopEnd   = Math.min(this.getLoopEnd?.() ?? stepCount - 1, stepCount - 1);

      this.currentStep++;
      if (this.currentStep > loopEnd || this.currentStep >= stepCount) {
        this.currentStep = loopStart;
        if (this.getChain?.() && this.onBarEnd) {
          this.onBarEnd();
        }
      }
    }
  }
}
