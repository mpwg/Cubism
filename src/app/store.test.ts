import { beforeEach, describe, expect, it } from "vitest";
import { applyMove, parseAlgorithm, parseMove } from "@/domain/cube/move";
import { createSolvedCubeState } from "@/domain/cube/cube-state";
import { createSolvedCaptureSession } from "@/domain/cube/demo";
import { CubeColor, type SolveResult } from "@/domain/cube/types";
import { useAppStore } from "@/app/store";

function createSolveResult(): SolveResult {
  const initial = applyMove(createSolvedCubeState(3), parseMove("R"));
  const moves = parseAlgorithm("R'");
  const final = applyMove(initial, moves[0]);

  return {
    initial,
    final,
    moves,
    phaseBreaks: [1],
    durationMs: 12,
    phases: [
      {
        phase: "finish",
        moves,
        state: final,
        diagnostics: ["Testpfad"]
      }
    ]
  };
}

describe("app store", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  it("übernimmt Solve-Ergebnisse in den Playback-Zustand", () => {
    const result = createSolveResult();

    useAppStore.getState().acceptSolveResult(result);

    const state = useAppStore.getState();
    expect(state.screen).toBe("playback");
    expect(state.solveStatus).toBe("done");
    expect(state.solveError).toBeNull();
    expect(state.playback.moveIndex).toBe(0);
    expect(state.playbackStates).toHaveLength(result.moves.length + 1);
  });

  it("begrenzt den Playback-Index auf vorhandene Zustände", () => {
    useAppStore.getState().acceptSolveResult(createSolveResult());

    useAppStore.getState().setPlaybackIndex(99);

    expect(useAppStore.getState().playback.moveIndex).toBe(1);
  });

  it("setzt Validierung, Solve-Status und Playback nach Capture-Änderungen zurück", () => {
    const solvedSession = createSolvedCaptureSession(3);
    const result = createSolveResult();

    useAppStore.getState().acceptSolveResult(result);
    useAppStore.getState().setValidationResult({
      ok: true,
      status: "ok",
      errors: [],
      groups: [],
      highlightedFaces: [],
      highlightedStickers: [],
      nextAction: "Der Zustand ist belastbar validiert und kann in den Solve-Schritt übernommen werden.",
      reduced: true
    });
    useAppStore.getState().setSolveError("Vorheriger Fehler");
    useAppStore.getState().setSelectedCorrectionColor(CubeColor.Blue);

    useAppStore.getState().mergeFaceCapture({
      ...solvedSession.faces.U!,
      confidence: 0.42
    });

    const state = useAppStore.getState();
    expect(state.dimension).toBe(3);
    expect(state.validationResult).toBeNull();
    expect(state.solveStatus).toBe("idle");
    expect(state.solveResult).toBeNull();
    expect(state.solveError).toBeNull();
    expect(state.playbackStates).toHaveLength(0);
    expect(state.captureSession.faces.U?.confidence).toBe(0.42);
    expect(state.cubeState).not.toBeNull();
  });
});
