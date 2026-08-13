const DIFFICULTIES = ["easy", "medium", "hard", "expert"];

export default function GameDecisionModal({
  mode,
  nextDifficulty,
  onSelectDifficulty,
  onCancel,
  onConfirm,
}) {
  const ending = mode === "end";

  return (
    <div className="decision-backdrop" role="dialog" aria-modal="true">
      <div className={`decision-card ${ending ? "end-mode" : "new-mode"}`}>
        <h2>{ending ? "End game?" : "New game"}</h2>

        {!ending && (
          <div className="decision-difficulty-block">
            <span className="decision-label">Choose difficulty</span>
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

        {ending && <p className="decision-short-copy">Current progress will be discarded.</p>}

        <div className="decision-actions">
          <button type="button" className="decision-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`decision-confirm ${ending ? "danger" : ""}`}
            onClick={onConfirm}
          >
            {ending ? "End game" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
