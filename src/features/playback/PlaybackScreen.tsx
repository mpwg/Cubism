import { useDeferredValue, useEffect } from "react";
import { formatMove } from "@/domain/cube/move";
import { useAppStore } from "@/app/store";

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

        <div className="action-row">
          <button type="button" className="secondary-button" onClick={() => stepPlayback(-1)}>
            Schritt zurück
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setPlaybackPlaying(!playback.playing)}
          >
            {playback.playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="secondary-button" onClick={() => stepPlayback(1)}>
            Schritt vor
          </button>
        </div>

        <div className="range-row">
          <input
            type="range"
            min={0}
            max={solveResult.moves.length}
            step={1}
            value={playback.moveIndex}
            onChange={(event) => setPlaybackIndex(Number(event.target.value))}
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
          {solveResult.phases.map((phase, index) => (
            <button
              key={`${phase.phase}-${index}`}
              type="button"
              className={`phase-item${playback.phaseIndex === index ? " phase-item--active" : ""}`}
              onClick={() => jumpToPhase(index)}
            >
              <span>{phase.phase}</span>
              <small>{phase.diagnostics[0]}</small>
            </button>
          ))}
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
          {solveResult.moves.map((move, index) => (
            <li key={`${formatMove(move)}-${index}`} className={deferredMoveIndex === index + 1 ? "move-list__item move-list__item--active" : "move-list__item"}>
              {index + 1}. {formatMove(move)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
