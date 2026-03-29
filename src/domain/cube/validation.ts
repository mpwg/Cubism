import {
  cubeColorLabels,
  cubeColorOrder,
  CubeColor,
  defaultFaceColor,
  faceDisplayName,
  faceOrder,
  type CubeState,
  type Face,
  type ValidationError,
  type ValidationGroup,
  type ValidationResult
} from "@/domain/cube/types";
import { stickerIndexToAddress } from "@/domain/cube/coordinates";
import { allCentersSolved, allFaceEdgePairsUniform, centersSolvedOnFace, isReducedState } from "@/domain/cube/piece-view";

function createValidationGroups(errors: ValidationError[]): ValidationGroup[] {
  const groups: ValidationGroup[] = [];
  const categoryOrder: ValidationError["category"][] = ["incomplete", "inconsistent", "unsolvable"];
  const definitions: Record<ValidationError["category"], { title: string; description: string }> = {
    incomplete: {
      title: "Erfassung unvollständig",
      description: "Mindestens ein Sticker fehlt noch oder ist farblich nicht sauber erfasst."
    },
    inconsistent: {
      title: "Zustand inkonsistent",
      description: "Farbverteilung oder Seitenzuordnung passen noch nicht zu einem belastbaren Würfelzustand."
    },
    unsolvable: {
      title: "Zustand nicht lösbar",
      description: "Die Farbverteilung wirkt vollständig, ergibt aber keinen solverfähigen Würfel."
    }
  };

  for (const category of categoryOrder) {
    const count = errors.filter((error) => error.category === category).length;
    if (count === 0) {
      continue;
    }

    groups.push({
      category,
      title: definitions[category].title,
      description: definitions[category].description,
      count
    });
  }

  return groups;
}

function createNextAction(status: ValidationResult["status"]): string {
  switch (status) {
    case "incomplete":
      return "Ergänze zuerst die markierten Sticker oder Seiten und prüfe den Zustand danach erneut.";
    case "inconsistent":
      return "Korrigiere die markierten Farben oder Zentren und validiere anschließend noch einmal.";
    case "unsolvable":
      return "Prüfe die markierten Seiten erneut. Die Erfassung ist vollständig, ergibt aktuell aber keinen lösbaren Würfel.";
    default:
      return "Der Zustand ist belastbar validiert und kann in den Solve-Schritt übernommen werden.";
  }
}

export function createValidationResult(
  state: CubeState,
  errors: ValidationError[],
  overrides?: Partial<Pick<ValidationResult, "reduced">>
): ValidationResult {
  const status: ValidationResult["status"] =
    errors.find((error) => error.category === "incomplete")?.category ??
    errors.find((error) => error.category === "inconsistent")?.category ??
    errors.find((error) => error.category === "unsolvable")?.category ??
    "ok";
  const groups = createValidationGroups(errors);
  const highlightedFaces = Array.from(new Set(errors.flatMap((error) => (error.face ? [error.face] : [])))) as Face[];
  const highlightedStickers = errors.flatMap((error) =>
    error.face !== undefined && error.index !== undefined ? [{ face: error.face, index: error.index }] : []
  );

  return {
    ok: errors.length === 0,
    status,
    errors,
    groups,
    highlightedFaces,
    highlightedStickers,
    nextAction: createNextAction(status),
    normalizedState: errors.length === 0 ? state : undefined,
    reduced: overrides?.reduced ?? isReducedState(state)
  };
}

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
      const address = stickerIndexToAddress(state.dimension, index);
      errors.push({
        code: "unknown-sticker",
        category: "incomplete",
        message: `${faceDisplayName[address.face]} enthält noch einen unbekannten Sticker.`,
        face: address.face,
        index: address.row * state.dimension + address.col
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
        category: "inconsistent",
        message: `${cubeColorLabels[color]} kommt ${count} Mal vor, erwartet werden ${requiredColorCount}.`
      });
    }
  }

  if (!allCentersSolved(state)) {
    for (const face of faceOrder) {
      if (centersSolvedOnFace(state, face)) {
        continue;
      }

      errors.push({
        code: "centers-unsolved",
        category: "inconsistent",
        face,
        message:
          state.dimension === 3
            ? `Der Mittelsticker von ${faceDisplayName[face]} passt noch nicht zur erwarteten Seitenfarbe.`
            : `Die Zentren von ${faceDisplayName[face]} sind noch nicht einheitlich zur Seitenfarbe.`
      });
    }
  }

  if (state.dimension === 4 && !allFaceEdgePairsUniform(state)) {
    for (const face of faceOrder) {
      errors.push({
        code: "edges-unpaired",
        category: "inconsistent",
        face,
        message: `Auf ${faceDisplayName[face]} ist mindestens eine 4x4-Kante noch nicht sauber als Paar reduziert.`
      });
    }
  }

  return createValidationResult(state, errors);
}

export function describeValidationTarget(): string {
  return faceOrder.map((face) => `${face}=${cubeColorLabels[defaultFaceColor[face]]}`).join(", ");
}
