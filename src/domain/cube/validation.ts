import { cubeColorLabels, cubeColorOrder, CubeColor, defaultFaceColor, faceOrder, type CubeState, type ValidationError, type ValidationResult } from "@/domain/cube/types";
import { allCentersSolved, allFaceEdgePairsUniform, isReducedState } from "@/domain/cube/piece-view";

export function validateCubeState(state: CubeState): ValidationResult {
  const errors: ValidationError[] = [];
  const counts = new Map<CubeColor, number>();
  const requiredColorCount = state.dimension * state.dimension;

  for (const color of cubeColorOrder) {
    counts.set(color, 0);
  }

  for (let index = 0; index < state.stickers.length; index += 1) {
    const color = state.stickers[index] as CubeColor;
    if (color === CubeColor.Unknown) {
      errors.push({
        code: "unknown-sticker",
        message: "Mindestens ein Sticker ist noch unbekannt.",
        index
      });
      continue;
    }

    counts.set(color, (counts.get(color) ?? 0) + 1);
  }

  for (const color of cubeColorOrder) {
    const count = counts.get(color) ?? 0;
    if (count !== requiredColorCount) {
      errors.push({
        code: "wrong-color-count",
        message: `${cubeColorLabels[color]} kommt ${count} Mal vor, erwartet werden ${requiredColorCount}.`
      });
    }
  }

  if (!allCentersSolved(state)) {
    errors.push({
      code: "centers-unsolved",
      message: "Die Mittelsticker bzw. Zentren entsprechen noch nicht den erwarteten Seitenfarben."
    });
  }

  if (state.dimension === 4 && !allFaceEdgePairsUniform(state)) {
    errors.push({
      code: "edges-unpaired",
      message: "Mindestens eine 4x4-Kante ist noch nicht als Paar reduziert."
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    normalizedState: errors.length === 0 ? state : undefined,
    reduced: isReducedState(state)
  };
}

export function describeValidationTarget(): string {
  return faceOrder.map((face) => `${face}=${cubeColorLabels[defaultFaceColor[face]]}`).join(", ");
}
