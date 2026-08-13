const NOTE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function SudokuCell({
  cell,
  row,
  col,
  selected,
  peerHighlighted,
  sameNumberHighlighted,
  selectedNumber,
  completionPulse,
  onSelect,
}) {
  const classNames = ["sudoku-cell"];

  if (selected) classNames.push("is-selected");
  else if (sameNumberHighlighted) classNames.push("is-same-number");
  else if (peerHighlighted) classNames.push("is-peer");

  if (col === 2 || col === 5) classNames.push("box-right");
  if (row === 2 || row === 5) classNames.push("box-bottom");

  if (cell.error) classNames.push("has-error");
  if (completionPulse) classNames.push("is-completion-pulse");

  const valueClass = cell.given
    ? "cell-value given"
    : cell.error
      ? "cell-value player error"
      : cell.hinted
        ? "cell-value hinted"
        : "cell-value player";

  return (
    <button
      type="button"
      className={classNames.join(" ")}
      onClick={() => onSelect(row, col)}
      aria-label={`Row ${row + 1}, column ${col + 1}`}
    >
      {cell.value ? (
        <span className={valueClass}>{cell.value}</span>
      ) : (
        <span className="notes-grid" aria-hidden="true">
          {NOTE_NUMBERS.map((number) => {
            const active = cell.notes.includes(number);
            const emphasized = active && selectedNumber === number;

            return (
              <span
                key={number}
                className={`note ${active ? "active" : ""} ${
                  emphasized ? "emphasized" : ""
                }`}
              >
                {active ? number : ""}
              </span>
            );
          })}
        </span>
      )}
    </button>
  );
}
