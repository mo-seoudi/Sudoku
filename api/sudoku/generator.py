import random
from copy import deepcopy

from .difficulty import rate_difficulty
from .solver import get_candidates, has_unique_solution, search_complexity

# Clue count is now only a generation guardrail. The final difficulty label is
# determined by the minimum human-logic technique tier needed to solve it.
DIFFICULTY_PROFILES = {
    "easy": {
        "clues": (31, 35),
        "max_unit_givens": 5,
        "target_clues": 33,
    },
    "medium": {
        "clues": (27, 31),
        "max_unit_givens": 5,
        "target_clues": 29,
    },
    "hard": {
        "clues": (25, 29),
        "max_unit_givens": 4,
        "target_clues": 27,
    },
    "expert": {
        "clues": (23, 28),
        "max_unit_givens": 4,
        "target_clues": 25,
    },
}

MAX_GENERATION_ATTEMPTS = 24


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


def _unit_counts(puzzle):
    rows = [sum(1 for value in row if value) for row in puzzle]
    cols = [sum(1 for row in range(9) if puzzle[row][col]) for col in range(9)]
    boxes = []

    for box_row in range(0, 9, 3):
        for box_col in range(0, 9, 3):
            boxes.append(
                sum(
                    1
                    for row in range(box_row, box_row + 3)
                    for col in range(box_col, box_col + 3)
                    if puzzle[row][col]
                )
            )

    return rows, cols, boxes


def _distribution_score(puzzle, max_unit_givens):
    rows, cols, boxes = _unit_counts(puzzle)
    all_counts = rows + cols + boxes
    overflow = sum(max(0, count - max_unit_givens) for count in all_counts)
    spread = (max(rows) - min(rows)) + (max(cols) - min(cols)) + (max(boxes) - min(boxes))
    return overflow * 100 + spread


def _is_well_distributed(puzzle, max_unit_givens):
    rows, cols, boxes = _unit_counts(puzzle)
    return max(rows + cols + boxes) <= max_unit_givens


def _removal_priority(puzzle, row, col):
    rows, cols, boxes = _unit_counts(puzzle)
    box_index = (row // 3) * 3 + (col // 3)
    return rows[row] + cols[col] + boxes[box_index] + random.random()


def _candidate_rank(puzzle, clues, rating, profile):
    min_clues, max_clues = profile["clues"]
    target = profile["target_clues"]

    clue_penalty = 0
    if clues < min_clues:
        clue_penalty += (min_clues - clues) * 30
    if clues > max_clues:
        clue_penalty += (clues - max_clues) * 30

    distribution = _distribution_score(puzzle, profile["max_unit_givens"])
    target_distance = abs(clues - target)
    score_bonus = min(rating.get("score", 0), 999) / 10000

    return clue_penalty * 1000 + distribution * 10 + target_distance - score_bonus


def _carve_for_difficulty(solution, requested_difficulty, profile):
    puzzle = deepcopy(solution)
    clues = 81
    min_clues, max_clues = profile["clues"]
    max_unit_givens = profile["max_unit_givens"]

    best_match = None
    best_rank = None

    # Multiple randomized passes let the board settle into a human-rated tier
    # without allowing one row/column/box to remain almost complete.
    for _ in range(6):
        cells = [
            (row, col)
            for row in range(9)
            for col in range(9)
            if puzzle[row][col] != 0
        ]
        cells.sort(
            key=lambda cell: _removal_priority(puzzle, cell[0], cell[1]),
            reverse=True,
        )

        removed_this_pass = 0

        for row, col in cells:
            # There is little value in going below the lower guardrail. Expert
            # gets one extra clue of tolerance because very sparse logical
            # boards are comparatively rare.
            floor = min_clues - (1 if requested_difficulty == "expert" else 0)
            if clues <= floor:
                break

            previous = puzzle[row][col]
            puzzle[row][col] = 0

            if not has_unique_solution(puzzle):
                puzzle[row][col] = previous
                continue

            clues -= 1
            removed_this_pass += 1

            # Only start human-rating once we are near the useful clue range.
            if clues <= max_clues + 3:
                rating = rate_difficulty(puzzle)

                if rating["logical_solved"] and rating["difficulty"] == requested_difficulty:
                    rank = _candidate_rank(puzzle, clues, rating, profile)
                    candidate = {
                        "puzzle": deepcopy(puzzle),
                        "clues": clues,
                        "rating": rating,
                    }

                    if best_match is None or rank < best_rank:
                        best_match = candidate
                        best_rank = rank

                    # If it is in range and nicely distributed, this is already
                    # a strong match. Keep carving only when we are still above
                    # the target density.
                    if (
                        min_clues <= clues <= max_clues
                        and _is_well_distributed(puzzle, max_unit_givens)
                        and clues <= profile["target_clues"]
                    ):
                        return best_match

                # Once a puzzle has moved beyond the requested tier, keeping
                # more removals usually makes it harder rather than bringing it back.
                if rating["logical_solved"]:
                    tier_order = {"easy": 0, "medium": 1, "hard": 2, "expert": 3}
                    if tier_order[rating["difficulty"]] > tier_order[requested_difficulty] and best_match:
                        return best_match

        if removed_this_pass == 0 or clues <= min_clues:
            break

    return best_match


def generate_puzzle(difficulty="medium"):
    requested = difficulty.lower().strip()
    if requested == "extreme":
        # Backward compatibility for an older deployed frontend/bookmarked URL.
        requested = "expert"
    if requested not in DIFFICULTY_PROFILES:
        requested = "medium"

    profile = DIFFICULTY_PROFILES[requested]

    fallback = None
    fallback_rank = None

    for _ in range(MAX_GENERATION_ATTEMPTS):
        solution = generate_full_board()
        match = _carve_for_difficulty(solution, requested, profile)

        if match:
            puzzle = match["puzzle"]
            clues = match["clues"]
            rating = match["rating"]
            stats = search_complexity(puzzle)

            result = {
                "difficulty": requested,
                "puzzle": puzzle,
                "solution": solution,
                "clues": clues,
                "difficultyScore": rating["score"],
                "minimumTechniqueTier": rating.get("minimumTechniqueTier"),
                "hardestTechnique": rating["hardest_technique"],
                "techniqueCounts": rating["technique_counts"],
                "logicalSolved": True,
                "searchStats": stats,
            }

            rank = _candidate_rank(puzzle, clues, rating, profile)
            if fallback is None or rank < fallback_rank:
                fallback = result
                fallback_rank = rank

            min_clues, max_clues = profile["clues"]
            if (
                min_clues <= clues <= max_clues
                and _is_well_distributed(puzzle, profile["max_unit_givens"])
            ):
                return result

    if fallback:
        return fallback

    # Generation should very rarely reach here. Raise rather than silently
    # returning a wrongly-rated puzzle; the API can retry on the next request.
    raise RuntimeError(
        f"Could not generate a logically rated {requested} puzzle. Please try again."
    )
