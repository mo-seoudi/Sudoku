import random
from copy import deepcopy

from .solver import get_candidates, has_unique_solution

DIFFICULTY_CLUES = {
    "easy": (40, 44),
    "medium": (35, 39),
    "hard": (30, 34),
    "extreme": (26, 29),
}


def generate_full_board():
    board = [[0 for _ in range(9)] for _ in range(9)]
    _fill_board(board)
    return board


def _fill_board(board):
    empty = _find_random_best_empty(board)
    if empty is None:
        return True

    row, col, candidates = empty
    random.shuffle(candidates)

    for number in candidates:
        board[row][col] = number
        if _fill_board(board):
            return True
        board[row][col] = 0

    return False


def _find_random_best_empty(board):
    best_count = 10
    best_cells = []

    for row in range(9):
        for col in range(9):
            if board[row][col] != 0:
                continue

            candidates = get_candidates(board, row, col)
            count = len(candidates)

            if count < best_count:
                best_count = count
                best_cells = [(row, col, candidates)]
            elif count == best_count:
                best_cells.append((row, col, candidates))

    if not best_cells:
        return None

    return random.choice(best_cells)


def generate_puzzle(difficulty="medium"):
    difficulty = difficulty.lower()
    if difficulty not in DIFFICULTY_CLUES:
        difficulty = "medium"

    solution = generate_full_board()
    puzzle = deepcopy(solution)

    min_clues, max_clues = DIFFICULTY_CLUES[difficulty]
    target_clues = random.randint(min_clues, max_clues)

    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)

    clues = 81

    for row, col in cells:
        if clues <= target_clues:
            break

        previous = puzzle[row][col]
        puzzle[row][col] = 0

        if has_unique_solution(puzzle):
            clues -= 1
        else:
            puzzle[row][col] = previous

    return {
        "difficulty": difficulty,
        "puzzle": puzzle,
        "solution": solution,
        "clues": clues,
    }
