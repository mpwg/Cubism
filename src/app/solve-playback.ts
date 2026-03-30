import { applyMove } from "@/domain/cube/move";
import type { CubeState, SolveResult } from "@/domain/cube/types";

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
