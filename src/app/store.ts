import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AppScreen, SolveStatus } from "@/app/types";
import { buildCubeStateFromCaptureSession } from "@/domain/cube/cube-state";
import { createDemoCaptureSession, createSolvedCaptureSession } from "@/domain/cube/demo";
import { CubeColor, type CaptureSession, type CubeDimension, type CubeState, type Face, type FaceCapture, type PlaybackState, type SolveResult, type ValidationResult } from "@/domain/cube/types";
import { mergeFaceCapture, setCaptureStickerColor } from "@/domain/capture/session";
import { buildPlaybackStates } from "@/app/solve-playback";

const defaultPlaybackState: PlaybackState = {
  moveIndex: 0,
  playing: false,
  speed: 1,
  phaseIndex: 0
};

function phaseIndexFromMoveIndex(result: SolveResult | null, moveIndex: number): number {
  if (!result) {
    return 0;
  }

  const index = result.phaseBreaks.findIndex((boundary) => moveIndex <= boundary);
  return index === -1 ? Math.max(result.phaseBreaks.length - 1, 0) : index;
}

function createInitialState(dimension: CubeDimension = 3) {
  const captureSession = createSolvedCaptureSession(dimension);
  return {
    dimension,
    screen: "capture" as AppScreen,
    captureSession,
    cubeState: buildCubeStateFromCaptureSession(captureSession),
    validationResult: null as ValidationResult | null,
    solveStatus: "idle" as SolveStatus,
    solveResult: null as SolveResult | null,
    solveError: null as string | null,
    playback: defaultPlaybackState,
    playbackStates: [] as CubeState[],
    selectedCorrectionColor: CubeColor.White
  };
}

export interface AppStore {
  dimension: CubeDimension;
  screen: AppScreen;
  captureSession: CaptureSession;
  cubeState: CubeState | null;
  validationResult: ValidationResult | null;
  solveStatus: SolveStatus;
  solveResult: SolveResult | null;
  solveError: string | null;
  playback: PlaybackState;
  playbackStates: CubeState[];
  selectedCorrectionColor: CubeColor;
  setDimension: (dimension: CubeDimension) => void;
  setScreen: (screen: AppScreen) => void;
  setSelectedCorrectionColor: (color: CubeColor) => void;
  mergeFaceCapture: (capture: FaceCapture) => void;
  setCaptureStickerColor: (face: Face, index: number, color: CubeColor) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setSolveStatus: (status: SolveStatus) => void;
  setSolveError: (message: string | null) => void;
  acceptSolveResult: (result: SolveResult) => void;
  setPlaybackIndex: (moveIndex: number) => void;
  setPlaybackPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  stepPlayback: (direction: -1 | 1) => void;
  jumpToPhase: (phaseIndex: number) => void;
  loadDemo: (dimension?: CubeDimension) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    ...createInitialState(),
    setDimension(dimension) {
      set({
        ...createInitialState(dimension)
      });
    },
    setScreen(screen) {
      set({ screen });
    },
    setSelectedCorrectionColor(color) {
      set({ selectedCorrectionColor: color });
    },
    mergeFaceCapture(capture) {
      const captureSession = mergeFaceCapture(get().captureSession, capture);
      set({
        dimension: capture.dimension,
        captureSession,
        cubeState: buildCubeStateFromCaptureSession(captureSession),
        validationResult: null,
        solveStatus: "idle",
        solveResult: null,
        solveError: null,
        playback: defaultPlaybackState,
        playbackStates: []
      });
    },
    setCaptureStickerColor(face, index, color) {
      const captureSession = setCaptureStickerColor(get().captureSession, face, index, color);
      set({
        captureSession,
        cubeState: buildCubeStateFromCaptureSession(captureSession),
        validationResult: null,
        solveStatus: "idle",
        solveResult: null,
        solveError: null,
        playback: defaultPlaybackState,
        playbackStates: []
      });
    },
    setValidationResult(result) {
      set({ validationResult: result });
    },
    setSolveStatus(status) {
      set({ solveStatus: status });
    },
    setSolveError(message) {
      set({ solveError: message, solveStatus: message ? "error" : get().solveStatus });
    },
    acceptSolveResult(result) {
      set({
        solveStatus: "done",
        solveResult: result,
        solveError: null,
        playback: {
          ...defaultPlaybackState,
          phaseIndex: 0
        },
        playbackStates: buildPlaybackStates(result),
        screen: "playback"
      });
    },
    setPlaybackIndex(moveIndex) {
      const result = get().solveResult;
      const bounded = Math.max(0, Math.min(moveIndex, get().playbackStates.length - 1));
      set({
        playback: {
          ...get().playback,
          moveIndex: bounded,
          phaseIndex: phaseIndexFromMoveIndex(result, bounded)
        }
      });
    },
    setPlaybackPlaying(playing) {
      set({
        playback: {
          ...get().playback,
          playing
        }
      });
    },
    setPlaybackSpeed(speed) {
      set({
        playback: {
          ...get().playback,
          speed
        }
      });
    },
    stepPlayback(direction) {
      const nextIndex = get().playback.moveIndex + direction;
      get().setPlaybackIndex(nextIndex);
    },
    jumpToPhase(phaseIndex) {
      const result = get().solveResult;
      if (!result) {
        return;
      }

      const boundedPhaseIndex = Math.max(0, Math.min(phaseIndex, result.phases.length - 1));
      const target = boundedPhaseIndex === 0 ? 0 : result.phaseBreaks[boundedPhaseIndex - 1];
      set({
        playback: {
          ...get().playback,
          moveIndex: target,
          phaseIndex: boundedPhaseIndex
        }
      });
    },
    loadDemo(dimension = 3) {
      const captureSession = createDemoCaptureSession(dimension);
      set({
        ...createInitialState(dimension),
        dimension,
        captureSession,
        cubeState: buildCubeStateFromCaptureSession(captureSession),
        screen: "review"
      });
    },
    resetAll() {
      set({
        ...createInitialState(get().dimension)
      });
    }
  }))
);
