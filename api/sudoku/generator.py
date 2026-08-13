import random
from copy import deepcopy

from .solver import get_candidates, has_unique_solution

# These ranges control the visual density only. They are not yet the final
# human-logic difficulty classifier. That will be layered on top later.
DIFFICULTY_CLUES = {
    "easy": (34, 38),
    "medium": (30, 33),
    "hard": (27, 29),
    "extreme": (24, 26),
}

MAX_GENERATION_ATTEMPTS = 6


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


def _carve_puzzle(solution, target_clues):
    puzzle = deepcopy(solution)
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)
    clues = 81

    # Several shuffled passes give the generator another opportunity to remove
    # cells that could not be removed earlier, while preserving one solution.
    for _ in range(3):
        if clues <= target_clues:
            break

        random.shuffle(cells)
        removed_this_pass = 0

        for row, col in cells:
            if clues <= target_clues:
                break
            if puzzle[row][col] == 0:
                continue

            previous = puzzle[row][col]
            puzzle[row][col] = 0

            if has_unique_solution(puzzle):
                clues -= 1
                removed_this_pass += 1
            else:
                puzzle[row][col] = previous

        if removed_this_pass == 0:
            break

    return puzzle, clues


def generate_puzzle(difficulty="medium"):
    difficulty = difficulty.lower()
    if difficulty not in DIFFICULTY_CLUES:
        difficulty = "medium"

    min_clues, max_clues = DIFFICULTY_CLUES[difficulty]
    target_clues = random.randint(min_clues, max_clues)

    best_result = None

    # Some completed grids carve down more cleanly than others. Trying a few
    # fresh grids makes the requested clue range much more reliable.
    for _ in range(MAX_GENERATION_ATTEMPTS):
        solution = generate_full_board()
        puzzle, clues = _carve_puzzle(solution, target_clues)

        result = {
            "difficulty": difficulty,
            "puzzle": puzzle,
            "solution": solution,
            "clues": clues,
        }

        if best_result is None or clues < best_result["clues"]:
            best_result = result

        if clues <= max_clues:
            return result

    return best_result
