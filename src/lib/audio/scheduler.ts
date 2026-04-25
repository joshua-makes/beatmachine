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
  onStep: (step: number, time: number) => void;
}

export class Scheduler {
  private audioContext: AudioContext;
  private getBpm: () => number;
  private onStep: (step: number, time: number) => void;
  private currentStep = 0;
  private nextNoteTime = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lookaheadMs = 25;
  private scheduleAheadTime = 0.1;

  constructor(options: SchedulerOptions) {
    this.audioContext = options.audioContext;
    this.getBpm = options.getBpm;
    this.onStep = options.onStep;
  }

  start() {
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
      this.nextNoteTime += stepDurationSec(this.getBpm());
      this.currentStep = advanceStep(this.currentStep);
    }
  }
}
