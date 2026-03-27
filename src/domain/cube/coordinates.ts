import { faceOrder, type CubeDimension, type Face, type Move, type Vector3 } from "@/domain/cube/types";

const faceNormals: Record<Face, Vector3> = {
  U: { x: 0, y: 1, z: 0 },
  R: { x: 1, y: 0, z: 0 },
  F: { x: 0, y: 0, z: 1 },
  D: { x: 0, y: -1, z: 0 },
  L: { x: -1, y: 0, z: 0 },
  B: { x: 0, y: 0, z: -1 }
};

const faceRights: Record<Face, Vector3> = {
  U: { x: 1, y: 0, z: 0 },
  R: { x: 0, y: 0, z: -1 },
  F: { x: 1, y: 0, z: 0 },
  D: { x: 1, y: 0, z: 0 },
  L: { x: 0, y: 0, z: 1 },
  B: { x: -1, y: 0, z: 0 }
};

const faceDowns: Record<Face, Vector3> = {
  U: { x: 0, y: 0, z: 1 },
  R: { x: 0, y: -1, z: 0 },
  F: { x: 0, y: -1, z: 0 },
  D: { x: 0, y: 0, z: -1 },
  L: { x: 0, y: -1, z: 0 },
  B: { x: 0, y: -1, z: 0 }
};

export interface StickerAddress {
  readonly face: Face;
  readonly row: number;
  readonly col: number;
}

function near(value: number): number {
  return Math.round(value * 2) / 2;
}

function outerLayerForDimension(dimension: CubeDimension): number {
  return dimension / 2 - 0.5;
}

function gridCoordinatesForDimension(dimension: CubeDimension): number[] {
  const outerLayer = outerLayerForDimension(dimension);
  return Array.from({ length: dimension }, (_, index) => -outerLayer + index);
}

function positiveLayerCoordinatesForDimension(dimension: CubeDimension): number[] {
  return gridCoordinatesForDimension(dimension)
    .filter((value) => value > 0)
    .slice()
    .sort((left, right) => right - left);
}

function dot(left: Vector3, right: Vector3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function cross(left: Vector3, right: Vector3): Vector3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function scale(vector: Vector3, scalar: number): Vector3 {
  return {
    x: near(vector.x * scalar),
    y: near(vector.y * scalar),
    z: near(vector.z * scalar)
  };
}

function add(left: Vector3, right: Vector3): Vector3 {
  return {
    x: near(left.x + right.x),
    y: near(left.y + right.y),
    z: near(left.z + right.z)
  };
}

function vectorEquals(left: Vector3, right: Vector3): boolean {
  return near(left.x) === right.x && near(left.y) === right.y && near(left.z) === right.z;
}

function nearestCoordinateIndexForDimension(dimension: CubeDimension, value: number): number {
  const gridCoordinates = gridCoordinatesForDimension(dimension);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < gridCoordinates.length; index += 1) {
    const distance = Math.abs(gridCoordinates[index] - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function normalToFace(normal: Vector3): Face {
  const rounded: Vector3 = {
    x: near(normal.x),
    y: near(normal.y),
    z: near(normal.z)
  };

  const face = faceOrder.find((candidate) => vectorEquals(faceNormals[candidate], rounded));
  if (!face) {
    throw new Error(`Unbekannte Face-Normalenrichtung: ${JSON.stringify(rounded)}`);
  }

  return face;
}

export function faceToIndex(face: Face): number {
  return faceOrder.indexOf(face);
}

export function stickerIndexToAddress(dimension: CubeDimension, index: number): StickerAddress {
  const stickersPerFace = dimension * dimension;
  const faceIndex = Math.floor(index / stickersPerFace);
  const face = faceOrder[faceIndex];
  const faceOffset = index % stickersPerFace;

  return {
    face,
    row: Math.floor(faceOffset / dimension),
    col: faceOffset % dimension
  };
}

export function faceRowColToStickerIndex(dimension: CubeDimension, face: Face, row: number, col: number): number {
  return faceToIndex(face) * dimension * dimension + row * dimension + col;
}

export function getFaceNormal(face: Face): Vector3 {
  return faceNormals[face];
}

export function faceRowColToWorld(
  dimension: CubeDimension,
  face: Face,
  row: number,
  col: number
): { position: Vector3; normal: Vector3 } {
  const outerLayer = outerLayerForDimension(dimension);
  const gridCoordinates = gridCoordinatesForDimension(dimension);

  const position = add(
    scale(faceNormals[face], outerLayer),
    add(scale(faceRights[face], gridCoordinates[col]), scale(faceDowns[face], gridCoordinates[row]))
  );

  return {
    position,
    normal: faceNormals[face]
  };
}

export function worldToStickerAddress(dimension: CubeDimension, position: Vector3, normal: Vector3): StickerAddress {
  const face = normalToFace(normal);
  const row = nearestCoordinateIndexForDimension(dimension, dot(position, faceDowns[face]));
  const col = nearestCoordinateIndexForDimension(dimension, dot(position, faceRights[face]));
  return { face, row, col };
}

export function rotateVector(vector: Vector3, axis: Vector3, rightHandQuarterTurns: number): Vector3 {
  const normalizedTurns = ((rightHandQuarterTurns % 4) + 4) % 4;
  if (normalizedTurns === 0) {
    return vector;
  }

  const parallel = scale(axis, dot(axis, vector));
  const perpendicular = {
    x: near(vector.x - parallel.x),
    y: near(vector.y - parallel.y),
    z: near(vector.z - parallel.z)
  };

  if (normalizedTurns === 2) {
    return add(parallel, scale(perpendicular, -1));
  }

  const crossed = cross(axis, vector);
  return normalizedTurns === 1 ? add(parallel, crossed) : add(parallel, scale(crossed, -1));
}

export function isPositionAffectedByMove(dimension: CubeDimension, position: Vector3, move: Move): boolean {
  const projected = near(dot(position, faceNormals[move.face]));
  const selectedLayers = positiveLayerCoordinatesForDimension(dimension).slice(move.depth, move.depth + move.width);
  return selectedLayers.some((layer) => near(layer) === projected);
}
