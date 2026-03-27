import { expose } from "comlink";
import { solveCubeState } from "@/domain/cube/solver";
import { validateCubeState } from "@/domain/cube/validation";
import type { SolverWorkerApi } from "@/workers/worker-types";

let min2phasePromise:
  | Promise<{
      initFull: () => void;
      solve: (state: string) => string;
    }>
  | null = null;

let initialized = false;

async function loadMin2Phase() {
  if (!min2phasePromise) {
    min2phasePromise = import("min2phase.js").then((module) => {
      const moduleShape = module as {
        default?: unknown;
        "module.exports"?: unknown;
      };
      const candidate = moduleShape.default ?? moduleShape["module.exports"];
      return candidate as {
        initFull: () => void;
        solve: (state: string) => string;
      };
    });
  }

  return min2phasePromise;
}

const api: SolverWorkerApi = {
  async validate(state) {
    return validateCubeState(state);
  },
  async solve(state) {
    const min2phase = await loadMin2Phase();
    if (!initialized) {
      min2phase.initFull();
      initialized = true;
    }

    return solveCubeState(state, min2phase);
  }
};

expose(api);
