import { formatMove } from "@/domain/cube/move";
import { faceDisplayName, type Move, type SolvePhaseName, type SolveResult } from "@/domain/cube/types";

const phaseTitles: Record<SolvePhaseName, string> = {
  centers: "Zentren",
  edges: "Kanten",
  parity: "Parität",
  reduce3x3: "3x3-Reduktion",
  finish: "Finalisierung"
};

export function getPhaseTitle(phase: SolvePhaseName): string {
  return phaseTitles[phase];
}

export function getPhaseBounds(result: SolveResult, phaseIndex: number) {
  const safeIndex = Math.max(0, Math.min(phaseIndex, result.phases.length - 1));
  const startMoveIndex = safeIndex === 0 ? 0 : result.phaseBreaks[safeIndex - 1] ?? 0;
  const endMoveIndex = result.phaseBreaks[safeIndex] ?? result.moves.length;

  return {
    startMoveIndex,
    endMoveIndex,
    moveCount: Math.max(endMoveIndex - startMoveIndex, 0)
  };
}

export function getPlaybackMove(result: SolveResult, moveIndex: number): Move | null {
  if (moveIndex <= 0) {
    return null;
  }

  return result.moves[moveIndex - 1] ?? null;
}

export function describeMove(move: Move) {
  const rotation =
    move.turns === 2 ? "180°" : move.turns === 3 ? "90° gegen den Uhrzeigersinn" : "90° im Uhrzeigersinn";
  const layer =
    move.depth === 1 ? "innerer Layer" : move.width === 2 ? "äußere Doppellage" : "äußere Lage";

  return {
    notation: formatMove(move),
    face: faceDisplayName[move.face],
    layer,
    rotation
  };
}
