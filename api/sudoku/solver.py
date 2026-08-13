from copy import deepcopy

GRID_SIZE = 9
BOX_SIZE = 3
EMPTY = 0


def get_candidates(board, row, col):
    if board[row][col] != EMPTY:
        return []

    used = set(board[row])
    used.update(board[r][col] for r in range(GRID_SIZE))

    box_row = (row // BOX_SIZE) * BOX_SIZE
    box_col = (col // BOX_SIZE) * BOX_SIZE

    for r in range(box_row, box_row + BOX_SIZE):
        for c in range(box_col, box_col + BOX_SIZE):
            used.add(board[r][c])

    return [n for n in range(1, 10) if n not in used]


def find_best_empty_cell(board):
    best = None
    best_count = 10

    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            if board[row][col] != EMPTY:
                continue

            candidates = get_candidates(board, row, col)
            if not candidates:
                return row, col, []

            if len(candidates) < best_count:
                best = (row, col, candidates)
                best_count = len(candidates)

                if best_count == 1:
                    return best

    return best


def solve(board):
    working = deepcopy(board)
    if _solve_recursive(working):
        return working
    return None


def _solve_recursive(board):
    cell = find_best_empty_cell(board)
    if cell is None:
        return True

    row, col, candidates = cell
    if not candidates:
        return False

    for number in candidates:
        board[row][col] = number
        if _solve_recursive(board):
            return True
        board[row][col] = EMPTY

    return False


def count_solutions(board, limit=2):
    working = deepcopy(board)
    return _count_recursive(working, limit)


def _count_recursive(board, limit):
    cell = find_best_empty_cell(board)
    if cell is None:
        return 1

    row, col, candidates = cell
    if not candidates:
        return 0

    total = 0
    for number in candidates:
        board[row][col] = number
        total += _count_recursive(board, limit - total)
        board[row][col] = EMPTY

        if total >= limit:
            break

    return total


def has_unique_solution(board):
    return count_solutions(board, limit=2) == 1
