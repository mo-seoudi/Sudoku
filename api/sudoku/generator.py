import random
from copy import deepcopy

from .puzzle_bank import PUZZLE_BANK

VALID_DIFFICULTIES = ("easy", "medium", "hard", "expert", "master")


def _normalize_difficulty(difficulty):
    requested = str(difficulty or "medium").lower().strip()
    if requested == "extreme":
        requested = "master"
    if requested not in VALID_DIFFICULTIES:
        requested = "medium"
    return requested


def _random_grouped_order():
    """Return a valid row/column order preserving 3x3 Sudoku structure."""
    groups = [0, 1, 2]
    random.shuffle(groups)

    order = []
    for group in groups:
        members = [group * 3, group * 3 + 1, group * 3 + 2]
        random.shuffle(members)
        order.extend(members)
    return order


def _transpose(board):
    return [list(row) for row in zip(*board)]


def _reorder(board, row_order, col_order):
    return [[board[row][col] for col in col_order] for row in row_order]


def _remap_digits(board, mapping):
    return [
        [0 if value == 0 else mapping[value] for value in row]
        for row in board
    ]


def _transform_pair(puzzle, solution):
    """
    Randomly transform a puzzle and its solution using Sudoku isomorphisms.

    These operations preserve uniqueness and logical structure:
    - digit renaming
    - row swaps inside bands
    - band swaps
    - column swaps inside stacks
    - stack swaps
    - transpose
    """
    puzzle = deepcopy(puzzle)
    solution = deepcopy(solution)

    if random.choice((True, False)):
        puzzle = _transpose(puzzle)
        solution = _transpose(solution)

    row_order = _random_grouped_order()
    col_order = _random_grouped_order()
    puzzle = _reorder(puzzle, row_order, col_order)
    solution = _reorder(solution, row_order, col_order)

    digits = list(range(1, 10))
    shuffled = digits[:]
    random.shuffle(shuffled)
    mapping = dict(zip(digits, shuffled))

    puzzle = _remap_digits(puzzle, mapping)
    solution = _remap_digits(solution, mapping)

    return puzzle, solution


def generate_puzzle(difficulty="medium"):
    """
    Return an instantly generated puzzle of the requested certified difficulty.

    Difficulty work is deliberately done ahead of the player's request. A
    pre-certified seed is selected and randomized using structure-preserving
    Sudoku transformations. This makes Expert as fast to open as Easy while
    retaining human-logic-based difficulty instead of reverting to clue count.

    Player-facing scale: Easy / Medium / Hard / Expert / Master.
    """
    requested = _normalize_difficulty(difficulty)
    seed = random.choice(PUZZLE_BANK[requested])
    puzzle, solution = _transform_pair(seed["puzzle"], seed["solution"])

    return {
        "difficulty": requested,
        "puzzle": puzzle,
        "solution": solution,
        "clues": seed["clues"],
        "difficultyScore": seed["difficultyScore"],
        "minimumTechniqueTier": seed.get("minimumTechniqueTier"),
        "hardestTechnique": seed.get("hardestTechnique"),
        "techniqueCounts": deepcopy(seed.get("techniqueCounts", {})),
        "logicalSolved": True,
        "generationMode": "certified_transform",
    }
