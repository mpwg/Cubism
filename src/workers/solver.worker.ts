import { expose } from "comlink";
import min2phase from "min2phase.js";
import { solveCubeState } from "@/domain/cube/solver";
import { validateCubeState } from "@/domain/cube/validation";
import type { SolverWorkerApi } from "@/workers/worker-types";

let initialized = false;

const api: SolverWorkerApi = {
  async validate(state) {
    return validateCubeState(state);
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
