import { startTransition, useState } from "react";
import { solveWithWorker } from "@/lib/workers/solver-client";
import { useAppStore } from "@/app/store";

export function SolveScreen() {
  const cubeState = useAppStore((state) => state.cubeState);
  const validationResult = useAppStore((state) => state.validationResult);
  const solveStatus = useAppStore((state) => state.solveStatus);
  const solveError = useAppStore((state) => state.solveError);
  const setSolveStatus = useAppStore((state) => state.setSolveStatus);
  const setSolveError = useAppStore((state) => state.setSolveError);
  const acceptSolveResult = useAppStore((state) => state.acceptSolveResult);
  const setScreen = useAppStore((state) => state.setScreen);
  const dimension = useAppStore((state) => state.dimension);
  const [localError, setLocalError] = useState<string | null>(null);
  const solveBlocked = !validationResult?.ok;

  async function handleSolve() {
    if (!cubeState) {
      setLocalError("Der Würfelzustand ist noch nicht vollständig ergänzt.");
      return;
    }

    setLocalError(null);
    setSolveError(null);
    setSolveStatus("running");
    try {
      const result = await solveWithWorker(cubeState);
      startTransition(() => {
        acceptSolveResult(result);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lösung konnte nicht berechnet werden.";
      setLocalError(message);
      setSolveError(message);
      setSolveStatus("error");
    }
  }

  return (
    <div className="panel-stack">
      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Solve</p>
            <h2>Lösungsweg berechnen</h2>
          </div>
          <p className="panel-card__meta">{dimension}x{dimension}</p>
        </div>

        {validationResult?.ok ? (
          <p className="success-text">Der erfasste Zustand ist solverfähig.</p>
        ) : (
          <p className="inline-error">
            {validationResult ? validationResult.nextAction : "Der Zustand wurde nach der letzten Änderung noch nicht erneut validiert."}
          </p>
        )}

        {dimension === 3 ? (
          <p className="panel-card__meta">
            `3x3` läuft als Primärpfad direkt über `min2phase.js` im Worker.
          </p>
        ) : (
          <p className="panel-card__meta">
            `4x4` nutzt aktuell denselben Kern, sobald der Zustand bereits auf `3x3` reduziert ist.
          </p>
        )}

        <div className="action-row">
          <button type="button" className="secondary-button" onClick={() => setScreen("review")}>
            Zurück
          </button>
          <button type="button" className="primary-button" onClick={() => void handleSolve()} disabled={solveBlocked || solveStatus === "running"}>
            {solveStatus === "running" ? "Berechne …" : "Lösung berechnen"}
          </button>
        </div>

        {localError || solveError ? <p className="inline-error">{localError ?? solveError}</p> : null}
      </div>
    </div>
  );
}
