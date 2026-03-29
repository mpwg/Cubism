import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSolvedCubeState } from "@/domain/cube/cube-state";

describe("solver client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("verwendet einen Worker-Client als Singleton für Validierung und Solve", async () => {
    const api = {
      validate: vi.fn(async () => ({
        ok: true,
        status: "ok",
        errors: [],
        groups: [],
        highlightedFaces: [],
        highlightedStickers: [],
        nextAction: "Der Zustand ist belastbar validiert und kann in den Solve-Schritt übernommen werden.",
        reduced: true
      })),
      solve: vi.fn(async () => ({
        initial: createSolvedCubeState(3),
        final: createSolvedCubeState(3),
        moves: [],
        phaseBreaks: [0],
        durationMs: 0,
        phases: []
      }))
    };
    const wrap = vi.fn(() => api);
    const workerInstances: unknown[] = [];

    vi.doMock("comlink", () => ({
      wrap
    }));

    class MockWorker {
      constructor(...args: unknown[]) {
        workerInstances.push(args);
      }
    }

    vi.stubGlobal("Worker", MockWorker);

    const client = await import("@/lib/workers/solver-client");
    const state = createSolvedCubeState(3);

    await client.validateWithWorker(state);
    await client.solveWithWorker(state);

    expect(workerInstances).toHaveLength(1);
    expect(wrap).toHaveBeenCalledTimes(1);
    expect(api.validate).toHaveBeenCalledWith(state);
    expect(api.solve).toHaveBeenCalledWith(state);
  });
});
