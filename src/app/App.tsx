import { Suspense, lazy, startTransition, useEffect, useState } from "react";
import type { AppScreen } from "@/app/types";
import { useAppStore } from "@/app/store";
import { appMetadata } from "@/app/app-metadata";
import { createSolvedCubeState } from "@/domain/cube/cube-state";
import { formatMove } from "@/domain/cube/move";
import { FaceGrid } from "@/features/shared/FaceGrid";
import { CaptureScreen } from "@/features/capture/CaptureScreen";
import { ReviewScreen } from "@/features/capture/ReviewScreen";
import { SolveScreen } from "@/features/solve/SolveScreen";
import { PlaybackScreen } from "@/features/playback/PlaybackScreen";
import { faceDisplayName, faceOrder } from "@/domain/cube/types";
import { loadAppSnapshot, saveAppSnapshot, serializeSnapshotInput } from "@/lib/persistence/snapshot";
import { applyPwaUpdate, promptForInstall, usePwaState } from "@/pwa/state";

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
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(true);
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [pwaActionError, setPwaActionError] = useState<string | null>(null);
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
  const pwaState = usePwaState();

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

  useEffect(() => {
    if (!debugConsoleOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDebugConsoleOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [debugConsoleOpen]);

  const viewportState = screen === "playback" && playbackStates[playback.moveIndex] ? playbackStates[playback.moveIndex] : cubeState ?? createSolvedCubeState(dimension);
  const activeMove = solveResult && playback.moveIndex > 0 ? solveResult.moves[playback.moveIndex - 1] : undefined;

  async function handleInstall() {
    setPwaActionError(null);
    const result = await promptForInstall();
    if (result === "unavailable") {
      setPwaActionError("Auf dieser Plattform steht gerade kein Installationsprompt bereit.");
    }
  }

  async function handleUpdate() {
    setPwaActionError(null);
    const applied = await applyPwaUpdate();
    if (!applied) {
      setPwaActionError("Das Update konnte gerade nicht angewendet werden.");
    }
  }

  return (
    <div className="app-shell">
      <main className="stage-panel">
        <section className="stage-panel__lead">
          <div>
            <p className="eyebrow">Cubism</p>
            <h1>3D zuerst, alles andere bei Bedarf.</h1>
            <p className="stage-panel__copy">
              Der Viewport bleibt die Hauptbühne. Die 2D-Arbeitsfläche ist weiterhin da, aber nur noch als sekundäre Ebene.
            </p>
          </div>
          <div className="stage-panel__lead-actions">
            <span className="confidence-badge">{screenLabels[screen]}</span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setWorkbenchOpen((current) => !current)}
            >
              {workbenchOpen ? "2D-Fläche ausblenden" : "2D-Fläche einblenden"}
            </button>
          </div>
        </section>

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
              <button
                type="button"
                className="secondary-button debug-console-toggle"
                aria-expanded={debugConsoleOpen}
                aria-controls="debug-console"
                onClick={() => setDebugConsoleOpen(true)}
              >
                Debug-Konsole
              </button>
            </div>
          </div>

          <Suspense fallback={<div className="cube-viewport cube-viewport--loading">3D-Viewport lädt …</div>}>
            <CubeViewport state={viewportState} activeMove={activeMove} />
          </Suspense>
        </section>
      </main>

      <aside className="side-panel">
        <header className="hero-panel hero-panel--compact">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>Steuerung und 2D-Fläche</h2>
          </div>
          <p className="hero-panel__copy">
            Die Bedienfläche bleibt erreichbar, nimmt aber nicht mehr permanent die gleiche Aufmerksamkeit wie der Viewport ein.
          </p>
        </header>

        <nav className="step-nav">
          {(["capture", "review", "solve", "playback"] as AppScreen[]).map((step) => (
            <div key={step} className={`step-nav__item${screen === step ? " step-nav__item--active" : ""}`}>
              <span>{screenLabels[step]}</span>
            </div>
          ))}
        </nav>

        <section className="panel-card panel-card--compact workbench-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">2D</p>
              <h3>Arbeitsfläche</h3>
            </div>
            <button
              type="button"
              className="secondary-button"
              aria-expanded={workbenchOpen}
              onClick={() => setWorkbenchOpen((current) => !current)}
            >
              {workbenchOpen ? "Einklappen" : "Öffnen"}
            </button>
          </div>

          {workbenchOpen ? (
            <section className="screen-slot">
              {screen === "capture" ? <CaptureScreen /> : null}
              {screen === "review" ? <ReviewScreen /> : null}
              {screen === "solve" ? <SolveScreen /> : null}
              {screen === "playback" ? <PlaybackScreen /> : null}
            </section>
          ) : (
            <p className="panel-card__meta">
              Aktiver Schritt: {screenLabels[screen]}. Öffne die 2D-Arbeitsfläche, wenn du Eingaben, Review oder Playback-Details brauchst.
            </p>
          )}
        </section>

        {pwaState.isOffline ? (
          <div className="inline-info" data-testid="offline-banner">
            Offline: Es läuft der zuletzt geladene App-Stand aus dem lokalen Cache.
          </div>
        ) : null}

        {pwaState.isOfflineReady ? (
          <div className="success-text">
            Offline bereit: Nach diesem erfolgreichen Laden bleibt die App-Shell auch ohne Netzwerk startfähig.
          </div>
        ) : null}

        {pwaState.needsRefresh ? (
          <div className="panel-card panel-card--compact">
            <div>
              <p className="eyebrow">Update</p>
              <h3>Neuer App-Stand verfügbar</h3>
            </div>
            <p className="panel-card__meta">
              Ein neuer Build liegt bereit. Das Update wird erst nach deiner Bestätigung aktiviert, damit App-Shell und lokaler Zustand konsistent bleiben.
            </p>
            <div className="action-row">
              <button type="button" className="primary-button" onClick={() => void handleUpdate()}>
                Update anwenden
              </button>
            </div>
          </div>
        ) : null}

        {pwaState.installPromptAvailable ? (
          <div className="panel-card panel-card--compact">
            <div>
              <p className="eyebrow">Installation</p>
              <h3>Cubism als App installieren</h3>
            </div>
            <p className="panel-card__meta">
              Für den produktiven Offline-Einsatz empfiehlt sich die Installation als PWA auf dem Gerät.
            </p>
            <div className="action-row">
              <button type="button" className="primary-button" onClick={() => void handleInstall()}>
                App installieren
              </button>
            </div>
          </div>
        ) : null}

        {pwaActionError ? <p className="inline-error">{pwaActionError}</p> : null}

        <section className="panel-card panel-card--compact app-meta-card">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Projekt</p>
              <h3>Build-Info</h3>
            </div>
            <div className="panel-card__actions">
              <span className="confidence-badge">v{appMetadata.version}</span>
              <button
                type="button"
                className="secondary-button"
                aria-expanded={projectInfoOpen}
                onClick={() => setProjectInfoOpen((current) => !current)}
              >
                {projectInfoOpen ? "Weniger" : "Mehr"}
              </button>
            </div>
          </div>

          {projectInfoOpen ? (
            <>
              <div className="app-meta-card__links">
                {appMetadata.repositoryUrl ? (
                  <a
                    className="app-meta-card__link"
                    href={appMetadata.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub-Repository
                  </a>
                ) : (
                  <span className="panel-card__meta">Kein Repository-Link in den Build-Metadaten hinterlegt.</span>
                )}
              </div>

              <div className="app-meta-card__groups">
                <section className="app-meta-card__group">
                  <div className="app-meta-card__group-header">
                    <strong>Dependencies</strong>
                    <span>{appMetadata.dependencies.length}</span>
                  </div>
                  <ul className="app-meta-card__list">
                    {appMetadata.dependencies.map((dependency) => (
                      <li key={dependency.name}>
                        <span>{dependency.name}</span>
                        <code>{dependency.version}</code>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="app-meta-card__group">
                  <div className="app-meta-card__group-header">
                    <strong>Dev-Dependencies</strong>
                    <span>{appMetadata.devDependencies.length}</span>
                  </div>
                  <ul className="app-meta-card__list">
                    {appMetadata.devDependencies.map((dependency) => (
                      <li key={dependency.name}>
                        <span>{dependency.name}</span>
                        <code>{dependency.version}</code>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          ) : (
            <p className="panel-card__meta">
              Version und Paketlisten bleiben verfügbar, treten aber standardmäßig hinter den eigentlichen Solve-Flow zurück.
            </p>
          )}
        </section>
      </aside>

      {debugConsoleOpen ? (
        <div className="debug-console-layer" role="presentation">
          <button
            type="button"
            className="debug-console-backdrop"
            aria-label="Debug-Konsole schließen"
            onClick={() => setDebugConsoleOpen(false)}
          />

          <section
            id="debug-console"
            className="debug-console"
            role="dialog"
            aria-modal="true"
            aria-labelledby="debug-console-title"
          >
            <div className="debug-console__header">
              <div>
                <p className="eyebrow">Debug</p>
                <h2 id="debug-console-title">Technische Konsole</h2>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDebugConsoleOpen(false)}
              >
                Schließen
              </button>
            </div>

            <div className="debug-console__content">
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
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
