import { describe, expect, it } from "vitest";
import { createSolvedCubeState } from "@/domain/cube/cube-state";
import { validateCubeState } from "@/domain/cube/validation";

describe("validation", () => {
  it("akzeptiert einen gelösten 3x3-Zustand", () => {
    const result = validateCubeState(createSolvedCubeState(3));
    expect(result.ok).toBe(true);
    expect(result.reduced).toBe(true);
  });

  it("akzeptiert einen gelösten 4x4-Zustand", () => {
    const result = validateCubeState(createSolvedCubeState(4));
    expect(result.ok).toBe(true);
    expect(result.reduced).toBe(true);
  });
});
