import { describe, expect, it } from "vitest";
import { createSolvedCubeState, isSolvedCubeState } from "@/domain/cube/cube-state";
import { applyMove, invertMove, parseMove } from "@/domain/cube/move";

describe("move engine", () => {
  it("invertiert Basiszüge auf 3x3 korrekt", () => {
    const solved = createSolvedCubeState(3);

    for (const token of ["U", "R", "F2", "L'", "B", "D2"]) {
      const move = parseMove(token);
      const rotated = applyMove(solved, move);
      const restored = applyMove(rotated, invertMove(move));
      expect(isSolvedCubeState(restored)).toBe(true);
    }
  });

  it("invertiert Wide-Moves auf 4x4 korrekt", () => {
    const solved = createSolvedCubeState(4);
    const move = parseMove("Rw");
    const rotated = applyMove(solved, move);
    const restored = applyMove(rotated, invertMove(move));
    expect(isSolvedCubeState(restored)).toBe(true);
  });
});
