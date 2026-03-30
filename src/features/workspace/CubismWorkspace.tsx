import { Suspense, lazy } from "react";
import { formatMove } from "@/domain/cube/move";
import { FaceGrid } from "@/features/shared/FaceGrid";
import { getStatusCopy, getStatusTitle, useCubismController } from "@/features/workspace/useCubismController";

const CubeViewport = lazy(async () => {
  const module = await import("@/features/playback/CubeViewport");
  return { default: module.CubeViewport };
});

type CubismController = ReturnType<typeof useCubismController>;

export function CubismWorkspace(controller: CubismController) {
  const {
    appMetadata,
    dimension,
    supportedDimensions,
    cubeColorHex,
    cubeColorLabels,
    cubeColorOrder,
    captureSession,
    faceDisplayName,
    faceOrder,
    selectedCorrectionColor,
    solveStatus,
    solveError,
    solveResult,
    playback,
    inspectorMode,
    captureError,
    captureInfo,
    manualError,
    manualInfo,
    manualBusy,
    tipText,
    busyFace,
    validationResult,
    videoRef,
    overlayRef,
    streamReady,
    cameraOverlayOpen,
    cameraStatus,
    guidedFaceStatuses,
    capturedGuidedFaces,
    nextGuidedFace,
    currentTargetFace,
    nextPlannedFace,
    viewportState,
    activeMove,
    activeMoveMeta,
    currentMoveMeta,
    activePhase,
    activePhaseBounds,
    solutionReady,
    playbackStates,
    pendingSticker,
    highlightedByFace,
    demoScrambleLabel,
    setDimension,
    setSelectedCorrectionColor,
    handleFileSelection,
    openCameraOverlay,
    closeCameraOverlay,
    captureFromCamera,
    handleValidate,
    handleReclassify,
    handleSolve,
    handleTip,
    handleReset,
    handleStickerClick,
    applyViewportColor,
    toggleInspector,
    setPendingSticker,
    setPlaybackPlaying,
    setPlaybackIndex,
    stopAndRun,
    stepPlayback,
    jumpToPhase,
    setPlaybackSpeed,
    atStart,
    atEnd,
    canJumpToPreviousPhase,
    canJumpToNextPhase,
    getPhaseTitle
  } = controller;

  return (
    <div className="app-shell">
      <main className="workspace">
        <header className="workspace__hero">
          <div>
            <p className="workspace__eyebrow">Lokaler Cube-Solver</p>
            <h1>Cubism</h1>
            <p className="workspace__copy">
              Sichtbarer Würfel, direkte Eingriffe und keine versteckten Session-Daten. Scan, manuelle Bearbeitung, Solve und Tipp starten alle vom Hauptscreen aus.
            </p>
          </div>
          <div className="workspace__status">
            <span className="status-pill">{dimension}x{dimension}</span>
            <span className="status-pill">Solve: {solveStatus}</span>
            <span className="status-pill">Session: flüchtig</span>
          </div>
        </header>

        <section className="workspace__stage">
          <div className="stage-card">
            <div className="stage-card__header">
              <div>
                <p className="workspace__eyebrow">3D-Cube</p>
                <h2>
                  {dimension}x{dimension} {activeMove ? `· ${formatMove(activeMove)}` : ""}
                </h2>
              </div>
              <div className="stage-card__meta">
                <span className="status-pill">{inspectorMode === "edit" ? "Edit aktiv" : "Orbit aktiv"}</span>
                {activePhase ? <span className="status-pill">Phase: {getPhaseTitle(activePhase.phase)}</span> : null}
              </div>
            </div>

            <Suspense fallback={<div className="cube-viewport cube-viewport--loading">3D-Viewport lädt …</div>}>
              <CubeViewport
                state={viewportState}
                activeMove={activeMove}
                editable={inspectorMode === "edit"}
                playbackMoveIndex={solveResult ? playback.moveIndex : undefined}
                playbackMoves={solveResult?.moves}
                playbackSpeed={playback.speed}
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

            <div className="stage-card__footer">
              <div className="stage-card__hints">
                <span className="status-pill">{inspectorMode === "edit" ? "Sticker direkt anklicken" : "Drehen und zoomen"}</span>
                {activeMoveMeta ? <span className="status-pill">Layer: {activeMoveMeta.layer}</span> : null}
                {activeMoveMeta ? <span className="status-pill">Seite: {activeMoveMeta.face}</span> : null}
                {solveError ? <span className="inline-message inline-message--error">{solveError}</span> : null}
              </div>
              <div className="stage-card__actions">
                <button type="button" className={`ghost-button${inspectorMode === "scan" ? " ghost-button--active" : ""}`} onClick={() => toggleInspector("scan")}>
                  Cube scannen
                </button>
                <button type="button" className={`ghost-button${inspectorMode === "edit" ? " ghost-button--active" : ""}`} onClick={() => toggleInspector("edit")}>
                  Cube manuell bearbeiten
                </button>
              </div>
            </div>

            <div className="command-bar">
              <button type="button" className="primary-button" onClick={() => void handleSolve()}>
                Lösen
              </button>
              <button type="button" className="ghost-button" onClick={() => void handleTip()}>
                Tipp
              </button>
              <button type="button" className="ghost-button" onClick={handleReset}>
                Zurücksetzen
              </button>
            </div>

            {tipText ? <p className="inline-message inline-message--accent">{tipText}</p> : null}
          </div>

          <aside className="inspector">
            <section className="inspector__panel">
              <div className="inspector__header">
                <div>
                  <p className="workspace__eyebrow">{inspectorMode === "edit" ? "Bearbeitung" : "Scan"}</p>
                  <h2>{inspectorMode === "edit" ? "Sticker und Flächen prüfen" : "Scan-Einstieg"}</h2>
                </div>
                <span className="status-pill">{capturedGuidedFaces.length}/3 geführt</span>
              </div>

              {inspectorMode === "edit" ? (
                <>
                  <div className="palette-row">
                    {cubeColorOrder.map((color, index) => (
                      <button
                        key={color}
                        type="button"
                        className={`palette-swatch${selectedCorrectionColor === color ? " palette-swatch--active" : ""}`}
                        style={{ backgroundColor: cubeColorHex[color] }}
                        aria-label={`Farbe ${cubeColorLabels[color]} wählen`}
                        title={`${cubeColorLabels[color]} (${index + 1})`}
                        onClick={() => setSelectedCorrectionColor(color)}
                      />
                    ))}
                  </div>

                  <p className="inspector__copy">
                    Aktive Farbe: {cubeColorLabels[selectedCorrectionColor]}. Du kannst direkt im 3D-Cube oder in den Flächenrastern korrigieren.
                  </p>

                  <div className="command-bar command-bar--compact">
                    <button type="button" className="ghost-button" onClick={() => void handleReclassify()}>
                      {manualBusy === "reclassify" ? "Reklassifiziere …" : "Farben neu klassifizieren"}
                    </button>
                    <button type="button" className="primary-button" onClick={() => void handleValidate()}>
                      {manualBusy === "validate" ? "Prüfe …" : "Zustand prüfen"}
                    </button>
                  </div>

                  {validationResult ? (
                    <p className={`inline-message${validationResult.ok ? " inline-message--success" : ""}`}>
                      {validationResult.nextAction}
                    </p>
                  ) : null}
                  {manualInfo ? <p className="inline-message">{manualInfo}</p> : null}
                  {manualError ? <p className="inline-message inline-message--error">{manualError}</p> : null}
                </>
              ) : (
                <>
                  <p className="inspector__copy">
                    Direkt neben dem Cube liegt der geführte Einstieg für `U`, `R` und `F`. Danach kannst du den Zustand sofort manuell präzisieren.
                  </p>

                  <div className="dimension-switch">
                    {supportedDimensions.map((candidate) => (
                      <button
                        key={candidate}
                        type="button"
                        className={`pill-button${candidate === dimension ? " pill-button--active" : ""}`}
                        onClick={() => setDimension(candidate)}
                      >
                        {candidate}x{candidate}
                      </button>
                    ))}
                  </div>

                  <p className="inspector__copy">Standardpfad: drei benachbarte Seiten scannen, danach direkt weiter in Prüfung und Lösung.</p>
                  <p className="inspector__copy">Demo-Scramble: {demoScrambleLabel}</p>

                  <div className="guided-face-strip" aria-label="Scan-Fortschritt">
                    {guidedFaceStatuses.map((entry, index) => (
                      <article
                        key={entry.face}
                        className={`guided-face-chip guided-face-chip--${entry.state}`}
                        aria-current={entry.state === "active" ? "step" : undefined}
                      >
                        <span className="guided-face-chip__step">Schritt {index + 1}</span>
                        <strong>{faceDisplayName[entry.face]}</strong>
                        <small>
                          {entry.state === "done" ? "erfasst" : entry.state === "active" ? "jetzt im Fokus" : "folgt"}
                        </small>
                      </article>
                    ))}
                  </div>

                  {captureInfo ? <p className="inline-message">{captureInfo}</p> : null}
                  {captureError ? <p className="inline-message inline-message--error">{captureError}</p> : null}
                  <p className="inspector__copy">
                    {nextGuidedFace
                      ? `Nächste Zielseite: ${faceDisplayName[nextGuidedFace]}.`
                      : "Alle drei Standardseiten sind vorhanden. Wechsle direkt in die manuelle Bearbeitung oder löse den Würfel."}
                  </p>
                </>
              )}
            </section>
          </aside>
        </section>

        <section className="workspace__faces">
          {faceOrder.map((face) => {
            const capture = captureSession.faces[face]!;
            const highlightedIndices = Array.from(highlightedByFace.get(face) ?? []);
            const faceHighlighted = validationResult?.highlightedFaces.includes(face) ?? false;

            return (
              <article key={face} className={`face-card${faceHighlighted ? " face-card--highlighted" : ""}`}>
                <div className="face-card__header">
                  <div>
                    <p className="workspace__eyebrow">{face}</p>
                    <h3>{faceDisplayName[face]}</h3>
                  </div>
                  <div className="face-card__meta">
                    <span className="status-pill">{Math.round(capture.confidence * 100)}%</span>
                    <label className="ghost-button file-button">
                      Bild laden
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                          void handleFileSelection(face, event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                <FaceGrid
                  capture={capture}
                  editable={inspectorMode === "edit"}
                  selectedColor={selectedCorrectionColor}
                  highlightedIndices={highlightedIndices}
                  onStickerClick={inspectorMode === "edit" ? (index) => handleStickerClick(face, index, selectedCorrectionColor) : undefined}
                />

                {busyFace === face ? <p className="inline-message">Analyse läuft …</p> : null}
              </article>
            );
          })}
        </section>

        <section className="workspace__solution">
          <div className="solution-card solution-card--primary">
            <div className="solution-card__header">
              <div>
                <p className="workspace__eyebrow">Lösung</p>
                <h2>{solutionReady ? "Visuelle Abfolge" : "Noch keine Lösung geladen"}</h2>
              </div>
              {solveResult ? <span className="status-pill">{solveResult.moves.length} Züge</span> : null}
            </div>

            {solveResult ? (
              <>
                <div className="solution-summary">
                  <div>
                    <p className="workspace__eyebrow">Aktiver Zug</p>
                    <h3>{currentMoveMeta ? currentMoveMeta.notation : "Startzustand"}</h3>
                    <p className="inspector__copy">
                      {currentMoveMeta
                        ? `${currentMoveMeta.face} · ${currentMoveMeta.layer} · ${currentMoveMeta.rotation}`
                        : "Noch kein Zug ausgeführt."}
                    </p>
                  </div>
                  <div>
                    <p className="workspace__eyebrow">Aktive Phase</p>
                    <h3>{activePhase ? getPhaseTitle(activePhase.phase) : "Bereit"}</h3>
                    <p className="inspector__copy">
                      {activePhaseBounds
                        ? `Schritte ${activePhaseBounds.startMoveIndex} bis ${activePhaseBounds.endMoveIndex}`
                        : "Sobald eine Lösung vorliegt, erscheint hier die Einordnung."}
                    </p>
                  </div>
                </div>

                <div className="command-bar command-bar--compact">
                  <button type="button" className="ghost-button" onClick={() => stopAndRun(() => setPlaybackIndex(0))} disabled={atStart}>
                    An den Start
                  </button>
                  <button type="button" className="ghost-button" onClick={() => stopAndRun(() => jumpToPhase(playback.phaseIndex - 1))} disabled={!canJumpToPreviousPhase}>
                    Phase zurück
                  </button>
                  <button type="button" className="ghost-button" onClick={() => stopAndRun(() => stepPlayback(-1))} disabled={atStart}>
                    Schritt zurück
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={atEnd && !playback.playing}
                    onClick={() => setPlaybackPlaying(!playback.playing)}
                  >
                    {playback.playing ? "Pause" : "Play"}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => stopAndRun(() => stepPlayback(1))} disabled={atEnd}>
                    Schritt vor
                  </button>
                  <button type="button" className="ghost-button" onClick={() => stopAndRun(() => jumpToPhase(playback.phaseIndex + 1))} disabled={!canJumpToNextPhase}>
                    Phase weiter
                  </button>
                  <button type="button" className="ghost-button" onClick={() => stopAndRun(() => setPlaybackIndex(solveResult.moves.length))} disabled={atEnd}>
                    Ans Ende
                  </button>
                </div>

                <div className="scrubber">
                  <input
                    type="range"
                    min={0}
                    max={solveResult.moves.length}
                    step={1}
                    value={playback.moveIndex}
                    onChange={(event) => stopAndRun(() => setPlaybackIndex(Number(event.target.value)))}
                  />
                  <span>
                    {playback.moveIndex} / {solveResult.moves.length}
                  </span>
                </div>

                <div className="dimension-switch">
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={`pill-button${playback.speed === speed ? " pill-button--active" : ""}`}
                      onClick={() => setPlaybackSpeed(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="inspector__copy">
                `Lösen` berechnet die vollständige Abfolge. `Tipp` zeigt den ersten nötigen Zug und setzt denselben Solve-Pfad für die weitere Navigation ein.
              </p>
            )}
          </div>

          <div className="solution-card">
            <div className="solution-card__header">
              <div>
                <p className="workspace__eyebrow">Zugliste</p>
                <h2>Aktueller Zug hervorgehoben</h2>
              </div>
            </div>

            {solveResult ? (
              <ol className="move-list">
                {solveResult.moves.map((move, index) => {
                  const moveMeta = controller.activeMoveMeta && playback.moveIndex - 1 === index ? controller.activeMoveMeta : null;
                  const isActive = playback.moveIndex === index + 1;

                  return (
                    <li key={`${formatMove(move)}-${index}`} className={`move-list__item${isActive ? " move-list__item--active" : ""}`}>
                      <button
                        type="button"
                        className={`move-list__button${isActive ? " move-list__button--active" : ""}`}
                        aria-current={isActive ? "step" : undefined}
                        onClick={() => stopAndRun(() => setPlaybackIndex(index + 1))}
                      >
                        <span>{index + 1}. {formatMove(move)}</span>
                        <small>{moveMeta ? `${moveMeta.face} · ${moveMeta.layer}` : "Zum Schritt springen"}</small>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="inspector__copy">Die Zugliste erscheint, sobald ein Solve berechnet wurde.</p>
            )}
          </div>
        </section>

        <footer className="workspace__footer">
          <div>
            <p className="workspace__eyebrow">Projekt</p>
            <h2>Transparenter Abschluss</h2>
          </div>

          <div className="footer-grid">
            <section>
              <h3>Links</h3>
              <ul>
                {appMetadata.repositoryUrl ? (
                  <li>
                    <a href={appMetadata.repositoryUrl} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  </li>
                ) : null}
                <li>
                  <a href={appMetadata.licenseUrl} target="_blank" rel="noreferrer">
                    {appMetadata.licenseName}
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h3>Verwendete Komponenten</h3>
              <ul className="component-list">
                {appMetadata.components.map((component) => (
                  <li key={component.name}>
                    <span>{component.name}</span>
                    <span>{component.license}</span>
                    <a href={component.url} target="_blank" rel="noreferrer">
                      {component.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </footer>
      </main>

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
              <p className="workspace__eyebrow">Edit</p>
              <h3>{faceDisplayName[pendingSticker.face]} färben</h3>
            </div>
            <button type="button" className="ghost-button" onClick={() => setPendingSticker(null)}>
              Schließen
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

      {cameraOverlayOpen ? (
        <div className="camera-overlay-layer" role="presentation">
          <button
            type="button"
            className="camera-overlay-backdrop"
            aria-label="Kamera-Overlay schließen"
            onClick={closeCameraOverlay}
          />

          <section
            className="camera-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-overlay-title"
            data-testid="camera-overlay"
            ref={overlayRef}
          >
            <div className="camera-overlay__header">
              <div>
                <p className="workspace__eyebrow">Kamera-Scan</p>
                <h2 id="camera-overlay-title">
                  {currentTargetFace ? `${faceDisplayName[currentTargetFace]} scannen` : "Scan vorbereiten"}
                </h2>
              </div>
              <div className="stage-card__meta">
                <span className="status-pill">
                  {capturedGuidedFaces.length}/{guidedFaceStatuses.length} erfasst
                </span>
                <button type="button" className="ghost-button" onClick={closeCameraOverlay}>
                  Schließen
                </button>
              </div>
            </div>

            <div className="camera-overlay__body">
              <div className="camera-stage">
                <video ref={videoRef} muted playsInline className="camera-stage__video" />
                <div className="camera-stage__grid" aria-hidden="true">
                  <div className="camera-stage__grid-frame" />
                </div>
                {!streamReady ? (
                  <div className="camera-stage__placeholder">
                    <strong>Kamera wird geöffnet …</strong>
                    <span>Falls nichts erscheint, prüfe die Browser-Berechtigung für die Rückkamera.</span>
                  </div>
                ) : null}
              </div>

              <aside className="camera-sidebar">
                <div className="camera-sidebar__card">
                  <p className="workspace__eyebrow">Status</p>
                  <h3>{getStatusTitle(cameraStatus)}</h3>
                  <p className="inspector__copy">
                    {getStatusCopy({
                      currentTargetFace,
                      lastCapturedFace: null,
                      nextPlannedFace
                    })}
                  </p>
                </div>

                <div className="camera-sidebar__card">
                  <p className="workspace__eyebrow">Reihenfolge</p>
                  <div className="guided-face-strip guided-face-strip--stacked">
                    {guidedFaceStatuses.map((entry, index) => (
                      <article key={`${entry.face}-overlay`} className={`guided-face-chip guided-face-chip--${entry.state}`}>
                        <span className="guided-face-chip__step">Schritt {index + 1}</span>
                        <strong>{faceDisplayName[entry.face]}</strong>
                        <small>
                          {entry.state === "done" ? "bereits übernommen" : entry.state === "active" ? "jetzt ausrichten" : "anschließend scannen"}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            <div className="command-bar">
              <button
                type="button"
                className="primary-button"
                onClick={() => void captureFromCamera()}
                disabled={!streamReady || !currentTargetFace || busyFace === currentTargetFace}
              >
                {busyFace === currentTargetFace ? "Analysiere …" : "Seite übernehmen"}
              </button>
              <button type="button" className="ghost-button" onClick={() => void openCameraOverlay()}>
                Kamera neu starten
              </button>
              <button type="button" className="ghost-button" onClick={closeCameraOverlay}>
                Abbrechen
              </button>
            </div>

            {captureError ? <p className="inline-message inline-message--error">{captureError}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
