import { formatTime } from "../lib/gameLogic";

export default function GameHeader({
  difficulty,
  mistakes,
  elapsedSeconds,
  gameStatus,
  onPauseToggle,
}) {
  const canPause = gameStatus === "playing" || gameStatus === "paused";
  const paused = gameStatus === "paused";

  return (
    <div className="game-header">
      <div>
        <span className="eyebrow">Difficulty</span>
        <strong className="difficulty-label">{difficulty}</strong>
      </div>

      <div className="game-meta">
        <div className="meta-item">
          <span className="eyebrow">Mistakes</span>
          <strong>{mistakes}</strong>
        </div>

        <div className="meta-item timer-item">
          <span className="eyebrow">Time</span>
          <strong>{formatTime(elapsedSeconds)}</strong>
        </div>

        <button
          type="button"
          className="pause-button"
          onClick={onPauseToggle}
          disabled={!canPause}
          aria-label={paused ? "Resume game" : "Pause game"}
          title={paused ? "Resume" : "Pause"}
        >
          {paused ? (
            <span className="resume-symbol" aria-hidden="true" />
          ) : (
            <span className="pause-symbol" aria-hidden="true">
              <span />
              <span />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
