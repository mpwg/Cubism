import { createSolvedCubeState } from "@/domain/cube/cube-state";
import { faceRowColToStickerIndex } from "@/domain/cube/coordinates";
import { applyMoves, createDemoScramble, formatAlgorithm } from "@/domain/cube/move";
import { CubeColor, faceOrder, type CaptureSession, type CubeDimension, type CubeState, type FaceCapture } from "@/domain/cube/types";

export function createDemoCubeState(dimension: CubeDimension = 3): CubeState {
  return applyMoves(createSolvedCubeState(dimension), createDemoScramble());
}

export function createSolvedCaptureSession(dimension: CubeDimension = 3): CaptureSession {
  return createCaptureSessionFromState(createSolvedCubeState(dimension));
}

export function createDemoCaptureSession(dimension: CubeDimension = 3): CaptureSession {
  return createCaptureSessionFromState(createDemoCubeState(dimension));
}

export function createCaptureSessionFromState(state: CubeState): CaptureSession {
  const faces = Object.fromEntries(
    faceOrder.map((face) => {
      const stickers = Array.from({ length: state.dimension * state.dimension }, (_, index) => ({
        index,
        color: state.stickers[
          faceRowColToStickerIndex(state.dimension, face, Math.floor(index / state.dimension), index % state.dimension)
        ] as CubeColor,
        confidence: 1,
        sample: { l: 80, a: 0, b: 0 }
      }));

      const capture: FaceCapture = {
        dimension: state.dimension,
        face,
        stickers,
        source: "upload",
        confidence: 1
      };

      return [face, capture];
    })
  );

  return {
    dimension: state.dimension,
    faces,
    status: "complete"
  };
}

export function demoScrambleLabel(): string {
  return formatAlgorithm(createDemoScramble());
}
