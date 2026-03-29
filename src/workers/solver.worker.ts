import { expose } from "comlink";
import min2phase from "min2phase.js";
import { solveCubeState } from "@/domain/cube/solver";
import { createValidationResult, validateCubeState } from "@/domain/cube/validation";
import { toReduced3x3FaceletString } from "@/domain/cube/piece-view";
import type { SolverWorkerApi } from "@/workers/worker-types";

let initialized = false;

const api: SolverWorkerApi = {
  async validate(state) {
    const result = validateCubeState(state);
    if (!result.ok) {
      return result;
    }

    if (!initialized) {
      min2phase.initFull();
      initialized = true;
    }

    const solution = min2phase.solve(toReduced3x3FaceletString(state)).trim();
    if (solution.startsWith("Error")) {
      return createValidationResult(
        state,
        [
          {
            code: "solver-unsolvable",
            category: "unsolvable",
            message:
              state.dimension === 3
                ? "Die Farberfassung ist vollständig, ergibt aber keinen lösbaren 3x3-Zustand."
                : "Die Reduktion ist vollständig, ergibt aber noch keinen lösbaren Zustand. Prüfe Erfassung und Parität erneut."
          }
        ],
        { reduced: result.reduced }
      );
    }

    return result;
  },
  async solve(state) {
    if (!initialized) {
      min2phase.initFull();
      initialized = true;
    }

    return solveCubeState(state, min2phase);
  }
};

expose(api);
