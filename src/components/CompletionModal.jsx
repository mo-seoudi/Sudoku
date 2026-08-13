import { formatTime } from "../lib/gameLogic";

export default function CompletionModal({
  difficulty,
  elapsedSeconds,
  mistakes,
  hintsUsed,
  onNewGame,
}) {
  return (
    <div className="completion-backdrop" role="dialog" aria-modal="true">
      <div className="completion-card">
        <div className="completion-check">✓</div>
        <h2>Puzzle completed</h2>
        <p>Nicely done.</p>

        <div className="completion-stats">
          <div>
            <span>Difficulty</span>
            <strong>{difficulty}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{formatTime(elapsedSeconds)}</strong>
          </div>
          <div>
            <span>Mistakes</span>
            <strong>{mistakes}</strong>
          </div>
          <div>
            <span>Hints</span>
            <strong>{hintsUsed}</strong>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={onNewGame}>
          New puzzle
        </button>
      </div>
    </div>
  );
}
