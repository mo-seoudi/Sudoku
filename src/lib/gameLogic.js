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


export function getNewlyCompletedCells(previousBoard, nextBoard, solution) {
  if (!solution) return [];

  const isUnitComplete = (board, cells) =>
    cells.every(({ row, col }) => board[row][col].value === solution[row][col]);

  const completed = new Set();
  const units = [];

  for (let row = 0; row < 9; row += 1) {
    units.push(Array.from({ length: 9 }, (_, col) => ({ row, col })));
  }

  for (let col = 0; col < 9; col += 1) {
    units.push(Array.from({ length: 9 }, (_, row) => ({ row, col })));
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const cells = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          cells.push({ row, col });
        }
      }
      units.push(cells);
    }
  }

  units.forEach((cells) => {
    if (!isUnitComplete(previousBoard, cells) && isUnitComplete(nextBoard, cells)) {
      cells.forEach(({ row, col }) => completed.add(`${row}-${col}`));
    }
  });

  return [...completed];
}
