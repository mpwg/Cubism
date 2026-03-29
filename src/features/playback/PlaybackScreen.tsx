import { useDeferredValue, useEffect } from "react";
import { formatMove } from "@/domain/cube/move";
import { useAppStore } from "@/app/store";
import { describeMove, getPhaseBounds, getPhaseTitle, getPlaybackMove } from "@/features/playback/playback-meta";

export function PlaybackScreen() {
  const solveResult = useAppStore((state) => state.solveResult);
  const playback = useAppStore((state) => state.playback);
  const setPlaybackPlaying = useAppStore((state) => state.setPlaybackPlaying);
  const setPlaybackIndex = useAppStore((state) => state.setPlaybackIndex);
  const stepPlayback = useAppStore((state) => state.stepPlayback);
  const jumpToPhase = useAppStore((state) => state.jumpToPhase);
  const setPlaybackSpeed = useAppStore((state) => state.setPlaybackSpeed);
  const deferredMoveIndex = useDeferredValue(playback.moveIndex);

  useEffect(() => {
    if (!playback.playing || !solveResult) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (playback.moveIndex >= solveResult.moves.length) {
        setPlaybackPlaying(false);
        return;
      }

      stepPlayback(1);
    }, 900 / playback.speed);

    return () => window.clearTimeout(timeout);
  }, [playback.playing, playback.speed, playback.moveIndex, solveResult, setPlaybackPlaying, stepPlayback]);

  if (!solveResult) {
    return (
      <div className="panel-card">
        <p className="inline-error">Es liegt noch kein Lösungsweg vor.</p>
      </div>
    );
  }

  const activePhase = solveResult.phases[playback.phaseIndex] ?? solveResult.phases[0];
  const activePhaseBounds = getPhaseBounds(solveResult, playback.phaseIndex);
  const currentMove = getPlaybackMove(solveResult, playback.moveIndex);
  const currentMoveMeta = currentMove ? describeMove(currentMove) : null;
  const atStart = playback.moveIndex === 0;
  const atEnd = playback.moveIndex === solveResult.moves.length;
  const canJumpToPreviousPhase = playback.phaseIndex > 0;
  const canJumpToNextPhase = playback.phaseIndex < solveResult.phases.length - 1;

  function stopAndRun(action: () => void) {
    setPlaybackPlaying(false);
    action();
  }

  return (
    <div className="panel-stack">
      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Playback</p>
            <h2>Lösungsweg abspielen</h2>
          </div>
          <p className="panel-card__meta">{solveResult.moves.length} Züge</p>
        </div>

        <div className="playback-status">
          <div className="playback-status__phase">
            <p className="eyebrow">Aktive Phase</p>
            <h3>{getPhaseTitle(activePhase.phase)}</h3>
            <p className="panel-card__meta">
              Schritte {activePhaseBounds.startMoveIndex} bis {activePhaseBounds.endMoveIndex}
              {activePhaseBounds.moveCount === 0 ? " · ohne eigene Züge" : ` · ${activePhaseBounds.moveCount} Zug${activePhaseBounds.moveCount === 1 ? "" : "e"}`}
            </p>
            <p className="playback-status__text">{activePhase.diagnostics[0]}</p>
          </div>

          <div className="playback-status__move">
            <p className="eyebrow">Aktueller Zug</p>
            {currentMoveMeta ? (
              <>
                <h3>{currentMoveMeta.notation}</h3>
                <div className="playback-status__badges">
                  <span className="confidence-badge">Seite: {currentMoveMeta.face}</span>
                  <span className="confidence-badge">Layer: {currentMoveMeta.layer}</span>
                  <span className="confidence-badge">Drehung: {currentMoveMeta.rotation}</span>
                </div>
              </>
            ) : (
              <>
                <h3>Startzustand</h3>
                <p className="playback-status__text">Noch kein Zug ausgeführt. Du kannst direkt in eine Phase springen oder den Solve abspielen.</p>
              </>
            )}
          </div>
        </div>

        <div className="action-row">
          <button type="button" className="secondary-button" onClick={() => stopAndRun(() => setPlaybackIndex(0))} disabled={atStart}>
            An den Start
          </button>
          <button type="button" className="secondary-button" onClick={() => stopAndRun(() => jumpToPhase(playback.phaseIndex - 1))} disabled={!canJumpToPreviousPhase}>
            Phase zurück
          </button>
          <button type="button" className="secondary-button" onClick={() => stopAndRun(() => stepPlayback(-1))} disabled={atStart}>
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
          <button type="button" className="secondary-button" onClick={() => stopAndRun(() => stepPlayback(1))} disabled={atEnd}>
            Schritt vor
          </button>
          <button type="button" className="secondary-button" onClick={() => stopAndRun(() => jumpToPhase(playback.phaseIndex + 1))} disabled={!canJumpToNextPhase}>
            Phase weiter
          </button>
          <button type="button" className="secondary-button" onClick={() => stopAndRun(() => setPlaybackIndex(solveResult.moves.length))} disabled={atEnd}>
            Ans Ende
          </button>
        </div>

        <div className="range-row">
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

        <div className="action-row">
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
      </div>

      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Phasen</p>
            <h3>Solver-Übergänge</h3>
          </div>
        </div>
        <div className="phase-list">
          {solveResult.phases.map((phase, index) => {
            const bounds = getPhaseBounds(solveResult, index);

            return (
              <button
                key={`${phase.phase}-${index}`}
                type="button"
                className={`phase-item${playback.phaseIndex === index ? " phase-item--active" : ""}`}
                aria-label={getPhaseTitle(phase.phase)}
                aria-pressed={playback.phaseIndex === index}
                onClick={() => stopAndRun(() => jumpToPhase(index))}
              >
                <span>{getPhaseTitle(phase.phase)}</span>
                <small>
                  Schritte {bounds.startMoveIndex} bis {bounds.endMoveIndex}
                </small>
                <small>{phase.diagnostics[0]}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-card move-list-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Moves</p>
            <h3>Zugliste</h3>
          </div>
        </div>
        <ol className="move-list">
          {solveResult.moves.map((move, index) => {
            const moveMeta = describeMove(move);

            return (
              <li key={`${formatMove(move)}-${index}`} className="move-list__item">
                <button
                  type="button"
                  className={`move-list__button${deferredMoveIndex === index + 1 ? " move-list__button--active" : ""}`}
                  aria-label={`${index + 1}. ${moveMeta.notation}`}
                  aria-current={deferredMoveIndex === index + 1 ? "step" : undefined}
                  onClick={() => stopAndRun(() => setPlaybackIndex(index + 1))}
                >
                  <span>{index + 1}. {moveMeta.notation}</span>
                  <small>
                    {moveMeta.face} · {moveMeta.layer}
                  </small>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
