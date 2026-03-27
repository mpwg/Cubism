import { beforeAll, describe, expect, it } from "vitest";
import min2phase from "min2phase.js";
import { createDemoCubeState } from "@/domain/cube/demo";
import { isSolvedCubeState } from "@/domain/cube/cube-state";
import { solveCubeState } from "@/domain/cube/solver";

describe("solver", () => {
  beforeAll(() => {
    min2phase.initFull();
  });

  it("löst den primären 3x3-Demopfad", async () => {
    const state = createDemoCubeState(3);
    const result = await solveCubeState(state, min2phase);
    expect(result.moves.length).toBeGreaterThan(0);
    expect(isSolvedCubeState(result.final)).toBe(true);
  });

  it("löst reduzierte 4x4-Zustände über den 3x3-Kern", async () => {
    const state = createDemoCubeState(4);
    const result = await solveCubeState(state, min2phase);
    expect(result.moves.length).toBeGreaterThan(0);
    expect(isSolvedCubeState(result.final)).toBe(true);
  });
});
