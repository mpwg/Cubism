import { CubismDatabase, type SnapshotRecord } from "@/lib/persistence/db";
import type { AppScreen, SolveStatus } from "@/app/types";
import { applyMove } from "@/domain/cube/move";
import type { CaptureSession, CubeColor, CubeDimension, CubeState, Move, PlaybackState, SolveResult, ValidationResult } from "@/domain/cube/types";

interface SerializedCubeState {
  dimension: CubeDimension;
  stickers: number[];
}

interface SerializedValidationResult extends Omit<ValidationResult, "normalizedState"> {
  normalizedState?: SerializedCubeState;
}

interface SerializedSolveResult extends Omit<SolveResult, "initial" | "final" | "phases"> {
  initial: SerializedCubeState;
  final: SerializedCubeState;
  phases: Array<{
    phase: SolveResult["phases"][number]["phase"];
    moves: Move[];
    state: SerializedCubeState;
    diagnostics: string[];
  }>;
}

export interface AppSnapshotPayload {
  dimension: CubeDimension;
  screen: AppScreen;
  captureSession: CaptureSession;
  cubeState: SerializedCubeState | null;
  validationResult: SerializedValidationResult | null;
  solveStatus: SolveStatus;
  solveResult: SerializedSolveResult | null;
  solveError: string | null;
  playback: PlaybackState;
  selectedCorrectionColor: CubeColor;
}

const database = new CubismDatabase<AppSnapshotPayload>();
const snapshotId = "app";

function serializeCubeState(state: CubeState | null): SerializedCubeState | null {
  if (!state) {
    return null;
  }

  return {
    dimension: state.dimension,
    stickers: Array.from(state.stickers)
  };
}

function deserializeCubeState(state: SerializedCubeState | null): CubeState | null {
  if (!state) {
    return null;
  }

  return {
    dimension: state.dimension,
    stickers: Uint8Array.from(state.stickers)
  };
}

function serializeValidationResult(result: ValidationResult | null): SerializedValidationResult | null {
  if (!result) {
    return null;
  }

  return {
    ...result,
    normalizedState: serializeCubeState(result.normalizedState ?? null) ?? undefined
  };
}

function deserializeValidationResult(result: SerializedValidationResult | null): ValidationResult | null {
  if (!result) {
    return null;
  }

  return {
    ...result,
    normalizedState: deserializeCubeState(result.normalizedState ?? null) ?? undefined
  };
}

function serializeSolveResult(result: SolveResult | null): SerializedSolveResult | null {
  if (!result) {
    return null;
  }

  return {
    ...result,
    initial: serializeCubeState(result.initial)!,
    final: serializeCubeState(result.final)!,
    phases: result.phases.map((phase) => ({
      ...phase,
      state: serializeCubeState(phase.state)!
    }))
  };
}

function deserializeSolveResult(result: SerializedSolveResult | null): SolveResult | null {
  if (!result) {
    return null;
  }

  return {
    ...result,
    initial: deserializeCubeState(result.initial)!,
    final: deserializeCubeState(result.final)!,
    phases: result.phases.map((phase) => ({
      ...phase,
      state: deserializeCubeState(phase.state)!
    }))
  };
}

export function buildPlaybackStates(result: SolveResult | null): CubeState[] {
  if (!result) {
    return [];
  }

  const states: CubeState[] = [result.initial];
  let current = result.initial;
  for (const move of result.moves) {
    current = applyMove(current, move);
    states.push(current);
  }

  return states;
}

export async function saveAppSnapshot(payload: AppSnapshotPayload): Promise<void> {
  const record: SnapshotRecord<AppSnapshotPayload> = {
    id: snapshotId,
    updatedAt: Date.now(),
    payload: {
      ...payload,
      cubeState: payload.cubeState,
      validationResult: payload.validationResult,
      solveResult: payload.solveResult
    }
  };

  await database.snapshots.put(record);
}

export async function loadAppSnapshot(): Promise<{
  payload: Omit<AppSnapshotPayload, "cubeState" | "validationResult" | "solveResult"> & {
    cubeState: CubeState | null;
    validationResult: ValidationResult | null;
    solveResult: SolveResult | null;
  };
  playbackStates: CubeState[];
} | null> {
  const record = await database.snapshots.get(snapshotId);
  if (!record) {
    return null;
  }

  const solveResult = deserializeSolveResult(record.payload.solveResult);
  return {
    payload: {
      ...record.payload,
      cubeState: deserializeCubeState(record.payload.cubeState),
      validationResult: deserializeValidationResult(record.payload.validationResult),
      solveResult
    },
    playbackStates: buildPlaybackStates(solveResult)
  };
}

export function serializeSnapshotInput(input: {
  dimension: CubeDimension;
  screen: AppScreen;
  captureSession: CaptureSession;
  cubeState: CubeState | null;
  validationResult: ValidationResult | null;
  solveStatus: SolveStatus;
  solveResult: SolveResult | null;
  solveError: string | null;
  playback: PlaybackState;
  selectedCorrectionColor: CubeColor;
}): AppSnapshotPayload {
  return {
    ...input,
    cubeState: serializeCubeState(input.cubeState),
    validationResult: serializeValidationResult(input.validationResult),
    solveResult: serializeSolveResult(input.solveResult)
  };
}
