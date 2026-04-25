import { describe, it, expect } from "vitest";
import { stepDurationSec, nextStepTime, advanceStep, STEPS } from "@/lib/audio/scheduler";

describe("scheduler math", () => {
  it("stepDurationSec(120) === 0.125", () => {
    expect(stepDurationSec(120)).toBe(0.125);
  });

  it("stepDurationSec(60) === 0.25", () => {
    expect(stepDurationSec(60)).toBe(0.25);
  });

  it("nextStepTime advances by one step duration", () => {
    const current = 1.0;
    const bpm = 120;
    const next = nextStepTime(current, bpm);
    expect(next).toBeCloseTo(1.125);
  });

  it("advanceStep(15) wraps to 0", () => {
    expect(advanceStep(15)).toBe(0);
  });

  it("advanceStep(0) advances to 1", () => {
    expect(advanceStep(0)).toBe(1);
  });

  it("advanceStep(STEPS - 1) wraps to 0", () => {
    expect(advanceStep(STEPS - 1)).toBe(0);
  });
});
