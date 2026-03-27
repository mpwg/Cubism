import type { CubeState, Face, Move } from "@/domain/cube/types";
import {
  faceRowColToStickerIndex,
  faceRowColToWorld,
  getFaceNormal,
  isPositionAffectedByMove,
  rotateVector,
  stickerIndexToAddress,
  worldToStickerAddress
} from "@/domain/cube/coordinates";

const innerSlicePattern = /^2([URFDLB])(2|')?$/;
const movePattern = /^([URFDLBurfdlb])(?:w)?(2|')?$/;

function parseTurnSuffix(token: string | undefined): 1 | 2 | 3 {
  if (!token) {
    return 1;
  }

  if (token === "2") {
    return 2;
  }

  return 3;
}

export function parseMove(token: string): Move {
  const trimmed = token.trim();
  const innerSliceMatch = innerSlicePattern.exec(trimmed);
  if (innerSliceMatch) {
    return {
      face: innerSliceMatch[1] as Face,
      depth: 1,
      width: 1,
      turns: parseTurnSuffix(innerSliceMatch[2])
    };
  }

  const match = movePattern.exec(trimmed);
  if (!match) {
    throw new Error(`Ungültiger Zug: ${token}`);
  }

  const faceToken = match[1];
  const isWideAlias = faceToken === faceToken.toLowerCase();
  return {
    face: faceToken.toUpperCase() as Face,
    depth: 0,
    width: isWideAlias || trimmed.includes("w") ? 2 : 1,
    turns: parseTurnSuffix(match[2])
  };
}

export function parseAlgorithm(algorithm: string): Move[] {
  return algorithm
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !token.startsWith("("))
    .map(parseMove);
}

export function formatMove(move: Move): string {
  const suffix = move.turns === 1 ? "" : move.turns === 2 ? "2" : "'";
  if (move.depth === 1 && move.width === 1) {
    return `2${move.face}${suffix}`;
  }

  const wide = move.width === 2 ? "w" : "";
  return `${move.face}${wide}${suffix}`;
}

export function formatAlgorithm(moves: Move[]): string {
  return moves.map(formatMove).join(" ");
}

export function invertMove(move: Move): Move {
  return {
    ...move,
    turns: (move.turns === 2 ? 2 : move.turns === 1 ? 3 : 1) as 1 | 2 | 3
  };
}

export function invertAlgorithm(moves: Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}

export function applyMove(state: CubeState, move: Move): CubeState {
  const next = new Uint8Array(state.stickers.length);
  const rightHandTurns = move.turns === 2 ? 2 : move.turns === 1 ? 3 : 1;
  const axis = getFaceNormal(move.face);

  if (move.width > state.dimension / 2 || move.depth + move.width > state.dimension / 2) {
    throw new Error(`Zug ${formatMove(move)} passt nicht zur Dimension ${state.dimension}.`);
  }

  for (let index = 0; index < state.stickers.length; index += 1) {
    const address = stickerIndexToAddress(state.dimension, index);
    const { position, normal } = faceRowColToWorld(state.dimension, address.face, address.row, address.col);
    const color = state.stickers[index];

    if (!isPositionAffectedByMove(state.dimension, position, move)) {
      next[index] = color;
      continue;
    }

    const rotatedPosition = rotateVector(position, axis, rightHandTurns);
    const rotatedNormal = rotateVector(normal, axis, rightHandTurns);
    const rotatedAddress = worldToStickerAddress(state.dimension, rotatedPosition, rotatedNormal);
    const rotatedIndex = faceRowColToStickerIndex(state.dimension, rotatedAddress.face, rotatedAddress.row, rotatedAddress.col);
    next[rotatedIndex] = color;
  }

  return { dimension: state.dimension, stickers: next };
}

export function applyMoves(state: CubeState, moves: Move[]): CubeState {
  return moves.reduce(applyMove, state);
}

export function createDemoScramble(): Move[] {
  return parseAlgorithm("R U F2 U' L2 D R2 B U2 F'");
}
