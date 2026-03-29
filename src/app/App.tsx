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
import { describeMove, getPhaseTitle } from "@/features/playback/playback-meta";
import {
  cubeColorHex,
  cubeColorLabels,
  cubeColorOrder,
  faceDisplayName,
  faceOrder,
  type Face
} from "@/domain/cube/types";
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
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [viewportEditMode, setViewportEditMode] = useState(false);
  const [pendingSticker, setPendingSticker] = useState<{ face: Face; index: number; x: number; y: number } | null>(null);
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
  const selectedCorrectionColor = useAppStore((state) => state.selectedCorrectionColor);
  const setSelectedCorrectionColor = useAppStore((state) => state.setSelectedCorrectionColor);
  const setCaptureStickerColor = useAppStore((state) => state.setCaptureStickerColor);
  const setScreen = useAppStore((state) => state.setScreen);
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

  useEffect(() => {
    if (!viewportEditMode) {
      setPendingSticker(null);
    }
  }, [viewportEditMode]);

  useEffect(() => {
    if (screen !== "capture") {
      setWorkbenchOpen(true);
    }
  }, [screen]);

  const viewportState = screen === "playback" && playbackStates[playback.moveIndex] ? playbackStates[playback.moveIndex] : cubeState ?? createSolvedCubeState(dimension);
  const activeMove = solveResult && playback.moveIndex > 0 ? solveResult.moves[playback.moveIndex - 1] : undefined;
  const activeMoveMeta = activeMove ? describeMove(activeMove) : null;
  const activePhase = screen === "playback" && solveResult ? solveResult.phases[playback.phaseIndex] : null;

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

  function renderToolScreen() {
    if (screen === "review") {
      return <ReviewScreen />;
    }

    if (screen === "solve") {
      return <SolveScreen />;
    }

    if (screen === "playback") {
      return <PlaybackScreen />;
    }

    return (
      <p className="panel-card__meta">
        Review, Solve und Playback werden hier eingeblendet, sobald du nach dem Fotografieren weitergehst.
      </p>
    );
  }

  function applyViewportColor(face: Face, index: number, color: (typeof cubeColorOrder)[number]) {
    setSelectedCorrectionColor(color);
    setCaptureStickerColor(face, index, color);
    setPendingSticker(null);
  }

  return (
    <div className="app-shell">
      <main className="app-flow">
        <section className="brand-hero">
          <div>
            <p className="eyebrow">Lokaler Cube-Solver</p>
            <h1>Cubism</h1>
            <p className="brand-hero__copy">
              Das Modell steht zuerst. Danach folgt direkt das Fotografieren. Alles Weitere bleibt darunter erreichbar, ohne die Startoberfläche wieder in ein Werkzeugpanel zu verwandeln.
            </p>
          </div>
          <div className="brand-hero__status">
            <span className="confidence-badge">Aktuell: {screenLabels[screen]}</span>
            <span className="confidence-badge">Solve: {solveStatus}</span>
          </div>
        </section>

        <section className="stage-showcase">
          <div className="stage-showcase__header">
            <div>
              <p className="eyebrow">3D-Modell</p>
              <h2 className="stage-showcase__title">
                {dimension}x{dimension} {screen === "playback" && activeMove ? `· ${formatMove(activeMove)}` : ""}
              </h2>
              <p className="stage-showcase__copy">
                Drehen, zoomen und bei Bedarf direkt korrigieren. Der Edit-Modus öffnet die Farbauswahl unmittelbar auf Klick.
              </p>
            </div>

            <div className="stage-showcase__actions">
              <button
                type="button"
                className={`secondary-button${viewportEditMode ? " secondary-button--active" : ""}`}
                aria-pressed={viewportEditMode}
                onClick={() => setViewportEditMode((current) => !current)}
              >
                {viewportEditMode ? "Edit-Modus aktiv" : "Edit-Modus"}
              </button>
            </div>
          </div>

          <Suspense fallback={<div className="cube-viewport cube-viewport--loading">3D-Viewport lädt …</div>}>
            <CubeViewport
              state={viewportState}
              activeMove={activeMove}
              editable={viewportEditMode}
              playbackMoveIndex={screen === "playback" ? playback.moveIndex : undefined}
              playbackMoves={screen === "playback" ? solveResult?.moves : undefined}
              playbackSpeed={screen === "playback" ? playback.speed : 1}
              onStickerSelect={(selection) =>
                setPendingSticker({
                  face: selection.face,
                  index: selection.index,
                  x: Math.max(180, Math.min(selection.clientX, window.innerWidth - 180)),
                  y: Math.max(170, Math.min(selection.clientY, window.innerHeight - 28))
                })
              }
            />
          </Suspense>

          <div className="stage-showcase__footer">
            <div className="stage-showcase__hints">
              <span className="confidence-badge">{viewportEditMode ? "Sticker direkt anklicken" : "Orbit und Zoom aktiv"}</span>
              {activePhase ? <span className="confidence-badge">Phase: {getPhaseTitle(activePhase.phase)}</span> : null}
              {activeMoveMeta ? <span className="confidence-badge">Layer: {activeMoveMeta.layer}</span> : null}
              {activeMoveMeta ? <span className="confidence-badge">Seite: {activeMoveMeta.face}</span> : null}
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

            {pendingSticker ? (
              <div
                className="viewport-palette"
                role="dialog"
                aria-label="Farbe für Sticker wählen"
                style={{
                  left: pendingSticker.x,
                  top: pendingSticker.y
                }}
              >
                <div className="viewport-palette__header">
                  <div>
                    <p className="eyebrow">Edit</p>
                    <h3>{faceDisplayName[pendingSticker.face]} färben</h3>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => setPendingSticker(null)}>
                    Abbrechen
                  </button>
                </div>

                <div className="palette-row">
                  {cubeColorOrder.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`palette-swatch${selectedCorrectionColor === color ? " palette-swatch--active" : ""}`}
                      style={{ backgroundColor: cubeColorHex[color] }}
                      title={cubeColorLabels[color]}
                      onClick={() => applyViewportColor(pendingSticker.face, pendingSticker.index, color)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="flow-section">
          <div className="flow-section__header">
            <div>
              <p className="eyebrow">Schritt 1</p>
              <h2>Würfel fotografieren</h2>
            </div>
            <p className="flow-section__copy">
              Fotografieren und Demo liegen direkt unter dem Modell. So bleibt der erste nächste Schritt klar sichtbar.
            </p>
          </div>
          <CaptureScreen />
        </section>

        <section className="flow-section flow-section--secondary">
          <div className="panel-card panel-card--compact workbench-card">
            <div className="panel-card__header">
              <div>
                <p className="eyebrow">Weitere Werkzeuge</p>
                <h3>Review, Solve und Playback</h3>
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
              <>
                <nav className="step-nav">
                  {(["capture", "review", "solve", "playback"] as AppScreen[]).map((step) => (
                    <button
                      key={step}
                      type="button"
                      className={`step-nav__item${screen === step ? " step-nav__item--active" : ""}`}
                      onClick={() => setScreen(step)}
                    >
                      <span>{screenLabels[step]}</span>
                    </button>
                  ))}
                </nav>
                <section className="screen-slot">{renderToolScreen()}</section>
              </>
            ) : (
              <p className="panel-card__meta">
                Vertiefende Werkzeuge bleiben darunter gesammelt und treten erst dann nach vorne, wenn du sie wirklich brauchst.
              </p>
            )}
          </div>

          <div className="flow-section__stack">
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
                  Projektmetadaten und Abhängigkeiten bleiben vorhanden, aber bewusst klar unterhalb des primären Flows.
                </p>
              )}
            </section>
          </div>
        </section>
      </main>

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
