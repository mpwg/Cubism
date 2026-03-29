import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMove, parseAlgorithm, parseMove } from "@/domain/cube/move";
import { createSolvedCaptureSession } from "@/domain/cube/demo";
import { createSolvedCubeState } from "@/domain/cube/cube-state";
import { CubeColor, type SolveResult } from "@/domain/cube/types";

const records = new Map<string, { id: string; updatedAt: number; payload: unknown }>();

vi.mock("@/lib/persistence/db", () => ({
  CubismDatabase: class {
    snapshots = {
      put: vi.fn(async (record: { id: string; updatedAt: number; payload: unknown }) => {
        records.set(record.id, record);
      }),
      get: vi.fn(async (id: string) => records.get(id))
    };
  }
}));

function createSolveResult(): SolveResult {
  const initial = applyMove(createSolvedCubeState(3), parseMove("R"));
  const moves = parseAlgorithm("R'");
  const final = applyMove(initial, moves[0]);

  return {
    initial,
    final,
    moves,
    phaseBreaks: [1],
    durationMs: 9,
    phases: [
      {
        phase: "finish",
        moves,
        state: final,
        diagnostics: ["Roundtrip"]
      }
    ]
  };
}

describe("snapshot persistence", () => {
  beforeEach(() => {
    records.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("serialisiert und lädt Snapshots inklusive Playback-Zuständen zurück", async () => {
    const { loadAppSnapshot, saveAppSnapshot, serializeSnapshotInput } = await import("@/lib/persistence/snapshot");
    const solveResult = createSolveResult();
    const captureSession = createSolvedCaptureSession(3);

    await saveAppSnapshot(
      serializeSnapshotInput({
        dimension: 3,
        screen: "playback",
        captureSession,
        cubeState: solveResult.initial,
        validationResult: { ok: true, errors: [], normalizedState: solveResult.initial, reduced: true },
        solveStatus: "done",
        solveResult,
        solveError: null,
        playback: {
          moveIndex: 1,
          playing: false,
          speed: 1.5,
          phaseIndex: 0
        },
        selectedCorrectionColor: CubeColor.Orange
      })
    );

    const snapshot = await loadAppSnapshot();

    expect(snapshot).not.toBeNull();
    expect(snapshot?.payload.screen).toBe("playback");
    expect(snapshot?.payload.cubeState?.stickers).toBeInstanceOf(Uint8Array);
    expect(snapshot?.payload.validationResult?.normalizedState?.stickers).toBeInstanceOf(Uint8Array);
    expect(snapshot?.payload.solveResult?.final.stickers).toBeInstanceOf(Uint8Array);
    expect(snapshot?.payload.selectedCorrectionColor).toBe(CubeColor.Orange);
    expect(snapshot?.playbackStates).toHaveLength(2);
    expect(snapshot?.playbackStates.at(-1)?.stickers).toEqual(solveResult.final.stickers);
  });

  it("liefert null zurück, wenn noch kein Snapshot gespeichert wurde", async () => {
    const { loadAppSnapshot } = await import("@/lib/persistence/snapshot");

    await expect(loadAppSnapshot()).resolves.toBeNull();
  });
});
