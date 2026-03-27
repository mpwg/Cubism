import {
  CubeColor,
  defaultFaceColor,
  faceOrder,
  type CaptureSession,
  type CubeDimension,
  type CubeState,
  type Face,
  totalStickersForDimension
} from "@/domain/cube/types";
import { faceRowColToStickerIndex } from "@/domain/cube/coordinates";

export function createCubeState(dimension: CubeDimension, stickers: Iterable<number> | Uint8Array): CubeState {
  const next = Uint8Array.from(stickers);
  if (next.length !== totalStickersForDimension(dimension)) {
    throw new Error(`Ungültige Sticker-Anzahl: ${next.length}`);
  }

  return { dimension, stickers: next };
}

export function createSolvedCubeState(dimension: CubeDimension): CubeState {
  const stickers = new Uint8Array(totalStickersForDimension(dimension));
  let cursor = 0;

  for (const face of faceOrder) {
    stickers.fill(defaultFaceColor[face], cursor, cursor + dimension * dimension);
    cursor += dimension * dimension;
  }

  return { dimension, stickers };
}

export function cloneCubeState(state: CubeState): CubeState {
  return createCubeState(state.dimension, state.stickers);
}

export function getStickerColor(state: CubeState, face: Face, row: number, col: number): CubeColor {
  return state.stickers[faceRowColToStickerIndex(state.dimension, face, row, col)] as CubeColor;
}

export function setStickerColor(state: CubeState, face: Face, row: number, col: number, color: CubeColor): CubeState {
  const stickers = Uint8Array.from(state.stickers);
  stickers[faceRowColToStickerIndex(state.dimension, face, row, col)] = color;
  return { dimension: state.dimension, stickers };
}

export function setStickerColorAtIndex(state: CubeState, index: number, color: CubeColor): CubeState {
  const stickers = Uint8Array.from(state.stickers);
  stickers[index] = color;
  return { dimension: state.dimension, stickers };
}

export function isSolvedCubeState(state: CubeState): boolean {
  return faceOrder.every((face) => {
    const expected = defaultFaceColor[face];
    for (let row = 0; row < state.dimension; row += 1) {
      for (let col = 0; col < state.dimension; col += 1) {
        if (getStickerColor(state, face, row, col) !== expected) {
          return false;
        }
      }
    }

    return true;
  });
}

export function cubeStateToFaceGrid(state: CubeState, face: Face): CubeColor[] {
  const colors: CubeColor[] = [];
  for (let row = 0; row < state.dimension; row += 1) {
    for (let col = 0; col < state.dimension; col += 1) {
      colors.push(getStickerColor(state, face, row, col));
    }
  }

  return colors;
}

export function buildCubeStateFromCaptureSession(session: CaptureSession): CubeState | null {
  const stickers = new Uint8Array(totalStickersForDimension(session.dimension));

  for (const face of faceOrder) {
    const capture = session.faces[face];
    if (!capture || capture.stickers.length !== session.dimension * session.dimension) {
      return null;
    }

    for (const sticker of capture.stickers) {
      stickers[
        faceRowColToStickerIndex(
          session.dimension,
          face,
          Math.floor(sticker.index / session.dimension),
          sticker.index % session.dimension
        )
      ] = sticker.color;
    }
  }

  return { dimension: session.dimension, stickers };
}
