import { getStickerColor } from "@/domain/cube/cube-state";
import { cubeColorLabels, CubeColor, defaultFaceColor, faceOrder, type CubeState, type Face } from "@/domain/cube/types";

const centerCoordinates4x4 = [
  [1, 1],
  [1, 2],
  [2, 1],
  [2, 2]
] as const;

const edgePairs4x4 = {
  top: [
    [0, 1],
    [0, 2]
  ],
  right: [
    [1, 3],
    [2, 3]
  ],
  bottom: [
    [3, 1],
    [3, 2]
  ],
  left: [
    [1, 0],
    [2, 0]
  ]
} as const;

const colorToFacelet: Record<CubeColor, string> = {
  [CubeColor.White]: "U",
  [CubeColor.Red]: "R",
  [CubeColor.Green]: "F",
  [CubeColor.Yellow]: "D",
  [CubeColor.Orange]: "L",
  [CubeColor.Blue]: "B",
  [CubeColor.Unknown]: "X"
};

function pairColor4x4(state: CubeState, face: Face, pair: readonly (readonly [number, number])[]): CubeColor | null {
  const first = getStickerColor(state, face, pair[0][0], pair[0][1]);
  const second = getStickerColor(state, face, pair[1][0], pair[1][1]);
  return first === second ? first : null;
}

export function centersSolvedOnFace(state: CubeState, face: Face): boolean {
  const expected = defaultFaceColor[face];
  if (state.dimension === 3) {
    return getStickerColor(state, face, 1, 1) === expected;
  }

  return centerCoordinates4x4.every(([row, col]) => getStickerColor(state, face, row, col) === expected);
}

export function allCentersSolved(state: CubeState): boolean {
  return faceOrder.every((face) => centersSolvedOnFace(state, face));
}

export function allFaceEdgePairsUniform(state: CubeState): boolean {
  if (state.dimension === 3) {
    return true;
  }

  return faceOrder.every((face) => Object.values(edgePairs4x4).every((pair) => pairColor4x4(state, face, pair) !== null));
}

export function reductionDiagnostics(state: CubeState): string[] {
  if (state.dimension === 3) {
    return ["3x3-Zustände sind direkt solverfähig und benötigen keine Reduktion."];
  }

  const diagnostics: string[] = [];
  for (const face of faceOrder) {
    if (!centersSolvedOnFace(state, face)) {
      diagnostics.push(`Die Zentren von ${face} sind noch nicht gruppiert.`);
    }

    for (const [edgeName, pair] of Object.entries(edgePairs4x4)) {
      if (!pairColor4x4(state, face, pair)) {
        diagnostics.push(`Die ${edgeName}-Kante auf ${face} ist noch nicht als Paar reduziert.`);
      }
    }
  }

  return diagnostics;
}

export function isReducedState(state: CubeState): boolean {
  return state.dimension === 3 || (allCentersSolved(state) && allFaceEdgePairsUniform(state));
}

function faceCenterColor(state: CubeState, face: Face): CubeColor {
  if (state.dimension === 3) {
    return getStickerColor(state, face, 1, 1);
  }

  const color = getStickerColor(state, face, centerCoordinates4x4[0][0], centerCoordinates4x4[0][1]);
  if (!centerCoordinates4x4.every(([row, col]) => getStickerColor(state, face, row, col) === color)) {
    throw new Error(`Die Zentren auf ${face} sind nicht einheitlich.`);
  }

  return color;
}

export function toReduced3x3FaceletString(state: CubeState): string {
  if (state.dimension === 3) {
    const facelets: string[] = [];
    for (const face of faceOrder) {
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          facelets.push(colorToFacelet[getStickerColor(state, face, row, col)]);
        }
      }
    }

    return facelets.join("");
  }

  if (!isReducedState(state)) {
    throw new Error("Der 4x4-Zustand ist noch nicht auf 3x3 reduziert.");
  }

  const facelets: string[] = [];
  for (const face of faceOrder) {
    const top = pairColor4x4(state, face, edgePairs4x4.top);
    const right = pairColor4x4(state, face, edgePairs4x4.right);
    const bottom = pairColor4x4(state, face, edgePairs4x4.bottom);
    const left = pairColor4x4(state, face, edgePairs4x4.left);
    const center = faceCenterColor(state, face);

    if (top === null || right === null || bottom === null || left === null) {
      throw new Error(`Die Kanten auf ${face} sind nicht sauber gepaart.`);
    }

    facelets.push(
      colorToFacelet[getStickerColor(state, face, 0, 0)],
      colorToFacelet[top],
      colorToFacelet[getStickerColor(state, face, 0, 3)],
      colorToFacelet[left],
      colorToFacelet[center],
      colorToFacelet[right],
      colorToFacelet[getStickerColor(state, face, 3, 0)],
      colorToFacelet[bottom],
      colorToFacelet[getStickerColor(state, face, 3, 3)]
    );
  }

  return facelets.join("");
}

export function describeColor(color: CubeColor): string {
  return cubeColorLabels[color];
}
