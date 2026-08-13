export default function GameControls({
  notesMode,
  canUndo,
  disabled,
  onUndo,
  onToggleNotes,
  onErase,
  onHint,
}) {
  return (
    <div className="game-controls">
      <button
        type="button"
        className="control-button"
        onClick={onUndo}
        disabled={disabled || !canUndo}
      >
        <span className="control-icon">↶</span>
        <span>Undo</span>
      </button>

      <button
        type="button"
        className={`control-button ${notesMode ? "active" : ""}`}
        onClick={onToggleNotes}
        disabled={disabled}
      >
        <span className="control-icon">✎</span>
        <span>{notesMode ? "Notes On" : "Notes"}</span>
      </button>

      <button
        type="button"
        className="control-button"
        onClick={onErase}
        disabled={disabled}
      >
        <span className="control-icon">⌫</span>
        <span>Erase</span>
      </button>

      <button
        type="button"
        className="control-button"
        onClick={onHint}
        disabled={disabled}
      >
        <span className="control-icon">◇</span>
        <span>Hint</span>
      </button>
    </div>
  );
}
