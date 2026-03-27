import { applyMoves, parseAlgorithm } from "@/domain/cube/move";
import { isReducedState, reductionDiagnostics, toReduced3x3FaceletString } from "@/domain/cube/piece-view";
import { validateCubeState } from "@/domain/cube/validation";
import type { CubeState, SolvePhaseResult, SolveResult } from "@/domain/cube/types";

export interface Min2PhaseApi {
  initFull: () => void;
  solve: (facelets: string) => string;
}

export async function solveCubeState(state: CubeState, api: Min2PhaseApi): Promise<SolveResult> {
  const startedAt = performance.now();
  const validation = validateCubeState(state);
  if (!validation.ok) {
    throw new Error(validation.errors.map((error) => error.message).join(" "));
  }

  const phases: SolvePhaseResult[] =
    state.dimension === 3
      ? [
          {
            phase: "reduce3x3",
            moves: [],
            state,
            diagnostics: ["3x3 ist der Primärpfad. Der Zustand wird direkt an min2phase.js übergeben."]
          }
        ]
      : [
          {
            phase: "centers",
            moves: [],
            state,
            diagnostics: ["Die Zentren sind bereits gruppiert und farblich konsistent."]
          },
          {
            phase: "edges",
            moves: [],
            state,
            diagnostics: ["Die Kantenpaare sind bereits auf 3x3-Form reduziert."]
          }
        ];

  if (state.dimension === 4 && !isReducedState(state)) {
    phases.push({
      phase: "reduce3x3",
      moves: [],
      state,
      diagnostics: reductionDiagnostics(state)
    });

    throw new Error(
      "Die technische Basis löst aktuell 3x3 vollständig und 4x4 dann, wenn der Zustand bereits auf 3x3 reduziert ist."
    );
  }

  const reducedState = toReduced3x3FaceletString(state);
  if (state.dimension === 4) {
    phases.push({
      phase: "reduce3x3",
      moves: [],
      state,
      diagnostics: ["Der 4x4-Zustand wurde in ein gültiges 3x3-Facelet-Format überführt."]
    });
  }

  api.initFull();
  const rawSolution = api.solve(reducedState).trim();

  if (rawSolution.startsWith("Error")) {
    phases.push({
      phase: "parity",
      moves: [],
      state,
      diagnostics: [
        state.dimension === 3
          ? "Der 3x3-Adapter meldet einen ungültigen Zustand."
          : "Der 3x3-Adapter meldet einen nicht lösbaren Reduktionszustand. Das deutet aktuell auf Parität oder eine noch nicht unterstützte 4x4-Konstellation hin."
      ]
    });
    throw new Error(
      state.dimension === 3
        ? "Der 3x3-Zustand ist nicht lösbar oder wurde inkonsistent erfasst."
        : "Parität oder nicht unterstützte Reduktionslage erkannt. Die vollständige 4x4-Paritätsbehandlung ist noch nicht implementiert."
    );
  }

  const finishMoves = parseAlgorithm(rawSolution);
  const finalState = applyMoves(state, finishMoves);
  phases.push({
    phase: "finish",
    moves: finishMoves,
    state: finalState,
    diagnostics: [state.dimension === 3 ? "Der 3x3-Zustand wurde mit min2phase.js gelöst." : "Der reduzierte 3x3-Zustand wurde mit min2phase.js gelöst."]
  });

  let cumulative = 0;
  const phaseBreaks = phases.map((phase) => {
    cumulative += phase.moves.length;
    return cumulative;
  });

  return {
    initial: state,
    final: finalState,
    moves: finishMoves,
    phaseBreaks,
    durationMs: performance.now() - startedAt,
    phases
  };
}
