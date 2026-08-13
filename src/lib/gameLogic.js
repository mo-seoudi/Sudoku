export function createGameBoard(puzzle) {
  return puzzle.map((row) =>
    row.map((value) => ({
      value: value || null,
      given: value !== 0,
      notes: [],
      error: false,
      hinted: false,
    }))
  );
}

export function cloneBoard(board) {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      notes: [...cell.notes],
    }))
  );
}

export function isPeer(rowA, colA, rowB, colB) {
  if (rowA === rowB || colA === colB) return true;

  return (
    Math.floor(rowA / 3) === Math.floor(rowB / 3) &&
    Math.floor(colA / 3) === Math.floor(colB / 3)
  );
}

export function removePeerNotes(board, row, col, number) {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (r === row && c === col) continue;
      if (!isPeer(row, col, r, c)) continue;

      board[r][c].notes = board[r][c].notes.filter(
        (note) => note !== number
      );
    }
  }
}

export function boardIsComplete(board, solution) {
  if (!solution) return false;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col].value !== solution[row][col]) {
        return false;
      }
    }
  }

  return true;
}

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}
