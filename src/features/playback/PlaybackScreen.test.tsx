import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyMoves, parseAlgorithm } from "@/domain/cube/move";
import { createSolvedCubeState } from "@/domain/cube/cube-state";
import type { SolveResult } from "@/domain/cube/types";
import { useAppStore } from "@/app/store";
import { PlaybackScreen } from "@/features/playback/PlaybackScreen";

function createSolveResult(): SolveResult {
  const initial = createSolvedCubeState(3);
  const phaseOneMoves = parseAlgorithm("R U");
  const phaseTwoMoves = parseAlgorithm("F2");
  const allMoves = [...phaseOneMoves, ...phaseTwoMoves];
  const final = applyMoves(initial, allMoves);

  return {
    initial,
    final,
    moves: allMoves,
    phaseBreaks: [0, 2, 3],
    durationMs: 18,
    phases: [
      {
        phase: "reduce3x3",
        moves: [],
        state: initial,
        diagnostics: ["Vorbereitung ohne eigene Züge"]
      },
      {
        phase: "finish",
        moves: phaseOneMoves,
        state: applyMoves(initial, phaseOneMoves),
        diagnostics: ["Erster Solve-Block"]
      },
      {
        phase: "parity",
        moves: phaseTwoMoves,
        state: final,
        diagnostics: ["Abschlussblock"]
      }
    ]
  };
}

describe("PlaybackScreen", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.getState().acceptSolveResult(createSolveResult());
  });

  it("erlaubt Sprünge an Start und Ende", async () => {
    const user = userEvent.setup();
    render(<PlaybackScreen />);

    await user.click(screen.getByRole("button", { name: "Ans Ende" }));
    expect(useAppStore.getState().playback.moveIndex).toBe(3);

    await user.click(screen.getByRole("button", { name: "An den Start" }));
    const state = useAppStore.getState().playback;
    expect(state.moveIndex).toBe(0);
    expect(state.phaseIndex).toBe(0);
  });

  it("hält Phasensprünge auch für Phasen ohne eigene Züge stabil", async () => {
    const user = userEvent.setup();
    render(<PlaybackScreen />);

    await user.click(screen.getByRole("button", { name: "Finalisierung" }));

    const state = useAppStore.getState().playback;
    expect(state.moveIndex).toBe(0);
    expect(state.phaseIndex).toBe(1);
  });

  it("synchronisiert Zugliste und aktuellen Playback-Index", async () => {
    const user = userEvent.setup();
    render(<PlaybackScreen />);

    await user.click(screen.getByRole("button", { name: /2\. U/i }));

    expect(useAppStore.getState().playback.moveIndex).toBe(2);
    expect(screen.getByRole("button", { name: /2\. U/i })).toHaveAttribute("aria-current", "step");
  });
});
