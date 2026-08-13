import SudokuCell from "./SudokuCell";
import { isPeer } from "../lib/gameLogic";

export default function SudokuBoard({
  board,
  selectedCell,
  onSelectCell,
  paused,
}) {
  const selected = selectedCell
    ? board[selectedCell.row][selectedCell.col]
    : null;

  const selectedNumber = selected?.value || null;

  return (
    <div className="board-shell">
      <div className={`sudoku-board ${paused ? "is-paused" : ""}`}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isSelected =
              selectedCell?.row === rowIndex &&
              selectedCell?.col === colIndex;

            const peerHighlighted = selectedCell
              ? isPeer(
                  selectedCell.row,
                  selectedCell.col,
                  rowIndex,
                  colIndex
                )
              : false;

            const sameNumberHighlighted = Boolean(
              selectedNumber && cell.value === selectedNumber
            );

            return (
              <SudokuCell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                selected={isSelected}
                peerHighlighted={peerHighlighted}
                sameNumberHighlighted={sameNumberHighlighted}
                selectedNumber={selectedNumber}
                onSelect={onSelectCell}
              />
            );
          })
        )}
      </div>

      {paused && (
        <div className="pause-overlay">
          <div className="pause-card">
            <span className="pause-icon">Ⅱ</span>
            <strong>Game paused</strong>
            <span>Your board is hidden while the timer is stopped.</span>
          </div>
        </div>
      )}
    </div>
  );
}
