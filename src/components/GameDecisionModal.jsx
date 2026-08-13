const DIFFICULTIES = ["easy", "medium", "hard", "extreme"];

export default function GameDecisionModal({
  mode,
  currentDifficulty,
  nextDifficulty,
  onSelectDifficulty,
  onCancel,
  onConfirm,
}) {
  const ending = mode === "end";

  return (
    <div className="decision-backdrop" role="dialog" aria-modal="true">
      <div className="decision-card">
        <div className={`decision-icon ${ending ? "danger" : ""}`}>
          {ending ? "×" : "+"}
        </div>

        <h2>{ending ? "End this game?" : "Start a new game?"}</h2>
        <p>
          {ending
            ? "Your current puzzle will be closed and its progress will be lost."
            : "Starting a new puzzle will end your current game and discard its progress."}
        </p>

        {!ending && (
          <div className="decision-difficulty-block">
            <span className="decision-label">New difficulty</span>
            <div className="decision-difficulties">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={nextDifficulty === level ? "active" : ""}
                  onClick={() => onSelectDifficulty(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        {ending && (
          <div className="decision-current-game">
            Current game: <strong>{currentDifficulty}</strong>
          </div>
        )}

        <div className="decision-actions">
          <button type="button" className="decision-cancel" onClick={onCancel}>
            Keep playing
          </button>
          <button
            type="button"
            className={`decision-confirm ${ending ? "danger" : ""}`}
            onClick={onConfirm}
          >
            {ending ? "End game" : "End & start new"}
          </button>
        </div>
      </div>
    </div>
  );
}
