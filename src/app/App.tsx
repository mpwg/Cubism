import { Suspense, lazy, startTransition, useEffect } from "react";
import type { AppScreen } from "@/app/types";
import { useAppStore } from "@/app/store";
import { createSolvedCubeState } from "@/domain/cube/cube-state";
import { formatMove } from "@/domain/cube/move";
import { FaceGrid } from "@/features/shared/FaceGrid";
import { CaptureScreen } from "@/features/capture/CaptureScreen";
import { ReviewScreen } from "@/features/capture/ReviewScreen";
import { SolveScreen } from "@/features/solve/SolveScreen";
import { PlaybackScreen } from "@/features/playback/PlaybackScreen";
import { faceDisplayName, faceOrder } from "@/domain/cube/types";
import { loadAppSnapshot, saveAppSnapshot, serializeSnapshotInput } from "@/lib/persistence/snapshot";

const screenLabels: Record<AppScreen, string> = {
  capture: "Capture",
  review: "Review",
  solve: "Solve",
  playback: "Playback"
};

const CubeViewport = lazy(async () => {
  const module = await import("@/features/playback/CubeViewport");
  return { default: module.CubeViewport };
});

export function App() {
  const dimension = useAppStore((state) => state.dimension);
  const screen = useAppStore((state) => state.screen);
  const captureSession = useAppStore((state) => state.captureSession);
  const cubeState = useAppStore((state) => state.cubeState);
  const solveResult = useAppStore((state) => state.solveResult);
  const playback = useAppStore((state) => state.playback);
  const playbackStates = useAppStore((state) => state.playbackStates);
  const solveStatus = useAppStore((state) => state.solveStatus);
  const solveError = useAppStore((state) => state.solveError);
  const validationResult = useAppStore((state) => state.validationResult);
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    let active = true;
    void loadAppSnapshot().then((snapshot) => {
      if (!active || !snapshot) {
        return;
      }

      startTransition(() => {
        hydrate({
          ...snapshot.payload,
          playbackStates: snapshot.playbackStates
        });
      });
    });

    return () => {
      active = false;
    };
  }, [hydrate]);

  useEffect(() => {
    let timeoutId: number | null = null;
    const unsubscribe = useAppStore.subscribe(
      (state) => ({
        dimension: state.dimension,
        screen: state.screen,
        captureSession: state.captureSession,
        cubeState: state.cubeState,
        validationResult: state.validationResult,
        solveStatus: state.solveStatus,
        solveResult: state.solveResult,
        solveError: state.solveError,
        playback: {
          ...state.playback,
          playing: false
        },
        selectedCorrectionColor: state.selectedCorrectionColor
      }),
      (snapshot) => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
          void saveAppSnapshot(serializeSnapshotInput(snapshot));
        }, 250);
      }
    );

    return () => {
      unsubscribe();
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const viewportState = screen === "playback" && playbackStates[playback.moveIndex] ? playbackStates[playback.moveIndex] : cubeState ?? createSolvedCubeState(dimension);
  const activeMove = solveResult && playback.moveIndex > 0 ? solveResult.moves[playback.moveIndex - 1] : undefined;

  return (
    <div className="app-shell">
      <aside className="side-panel">
        <header className="hero-panel">
          <p className="eyebrow">Cubism</p>
          <h1>Lokaler Cube-Solver mit visuellem Lösungsweg</h1>
          <p className="hero-panel__copy">
            Primär für `3x3`, vollständig client-seitig, als PWA installierbar und offline nutzbar.
          </p>
        </header>

        <nav className="step-nav">
          {(["capture", "review", "solve", "playback"] as AppScreen[]).map((step) => (
            <div key={step} className={`step-nav__item${screen === step ? " step-nav__item--active" : ""}`}>
              <span>{screenLabels[step]}</span>
            </div>
          ))}
        </nav>

        <section className="screen-slot">
          {screen === "capture" ? <CaptureScreen /> : null}
          {screen === "review" ? <ReviewScreen /> : null}
          {screen === "solve" ? <SolveScreen /> : null}
          {screen === "playback" ? <PlaybackScreen /> : null}
        </section>
      </aside>

      <main className="stage-panel">
        <section className="stage-panel__viewport">
          <div className="stage-panel__header">
            <div>
              <p className="eyebrow">Viewport</p>
              <h2>
                {dimension}x{dimension} {screen === "playback" && activeMove ? `· ${formatMove(activeMove)}` : ""}
              </h2>
            </div>
            <div className="status-stack">
              <span className="confidence-badge">Solve: {solveStatus}</span>
              {solveError ? <span className="inline-error inline-error--compact">{solveError}</span> : null}
            </div>
          </div>

          <Suspense fallback={<div className="cube-viewport cube-viewport--loading">3D-Viewport lädt …</div>}>
            <CubeViewport state={viewportState} activeMove={activeMove} />
          </Suspense>
        </section>

        <section className="stage-panel__debug">
          <div className="panel-card">
            <div className="panel-card__header">
              <div>
                <p className="eyebrow">Netz</p>
                <h3>Aktueller Zustand</h3>
              </div>
            </div>
            <div className="mini-net">
              {faceOrder.map((face) => {
                const capture = captureSession.faces[face];
                if (!capture) {
                  return null;
                }

                return (
                  <article key={face} className="mini-net__face">
                    <div className="mini-net__label">
                      <span>{face}</span>
                      <small>{faceDisplayName[face]}</small>
                    </div>
                    <FaceGrid capture={capture} />
                  </article>
                );
              })}
            </div>
          </div>

          {validationResult ? (
            <div className="panel-card">
              <div className="panel-card__header">
                <div>
                  <p className="eyebrow">Validierung</p>
                  <h3>{validationResult.ok ? "Konsistent" : "Auffälligkeiten"}</h3>
                </div>
              </div>
              {validationResult.ok ? (
                <p className="success-text">Der aktuelle Zustand ist solverfähig.</p>
              ) : (
                <ul className="message-list">
                  {validationResult.errors.map((validationError) => (
                    <li key={`${validationError.code}-${validationError.index ?? validationError.face ?? "global"}`}>
                      {validationError.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
