import { describe, expect, it } from "vitest";
import { createSolvedCubeState, setStickerColor, setStickerColorAtIndex } from "@/domain/cube/cube-state";
import { CubeColor } from "@/domain/cube/types";
import { validateCubeState } from "@/domain/cube/validation";

describe("validation", () => {
  it("akzeptiert einen gelösten 3x3-Zustand", () => {
    const result = validateCubeState(createSolvedCubeState(3));
    expect(result.ok).toBe(true);
    expect(result.status).toBe("ok");
    expect(result.reduced).toBe(true);
  });

  it("akzeptiert einen gelösten 4x4-Zustand", () => {
    const result = validateCubeState(createSolvedCubeState(4));
    expect(result.ok).toBe(true);
    expect(result.status).toBe("ok");
    expect(result.reduced).toBe(true);
  });

  it("ordnet unbekannte Sticker als unvollständige Erfassung ein", () => {
    const state = setStickerColorAtIndex(createSolvedCubeState(3), 0, CubeColor.Unknown);
    const result = validateCubeState(state);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("incomplete");
    expect(result.highlightedFaces).toContain("U");
    expect(result.highlightedStickers).toContainEqual({ face: "U", index: 0 });
    expect(result.groups[0]?.category).toBe("incomplete");
  });

  it("ordnet falsche Zentren als inkonsistent ein", () => {
    const state = setStickerColor(createSolvedCubeState(3), "U", 1, 1, CubeColor.Blue);
    const result = validateCubeState(state);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("inconsistent");
    expect(result.errors.some((error) => error.code === "centers-unsolved" && error.face === "U")).toBe(true);
  });
});
