import { wrap } from "comlink";
import type { CubeState, SolveResult, ValidationResult } from "@/domain/cube/types";
import type { SolverWorkerApi } from "@/workers/worker-types";

let solverWorker: Worker | null = null;
let solverClientPromise: Promise<SolverWorkerApi> | null = null;

function getSolverClient(): Promise<SolverWorkerApi> {
  if (!solverWorker) {
    solverWorker = new Worker(new URL("../../workers/solver.worker.ts", import.meta.url), { type: "module" });
  }

  if (!solverClientPromise) {
    solverClientPromise = Promise.resolve(wrap<SolverWorkerApi>(solverWorker));
  }

  return solverClientPromise;
}

export async function validateWithWorker(state: CubeState): Promise<ValidationResult> {
  const client = await getSolverClient();
  return client.validate(state);
}

export async function solveWithWorker(state: CubeState): Promise<SolveResult> {
  const client = await getSolverClient();
  return client.solve(state);
}
