from copy import deepcopy
from itertools import combinations

GRID_SIZE = 9
DIGITS = set(range(1, 10))

TECHNIQUE_WEIGHTS = {
    "naked_single": 1,
    "hidden_single": 2,
    "locked_candidate": 4,
    "naked_pair": 6,
    "hidden_pair": 8,
    "naked_triple": 10,
    "hidden_triple": 12,
    "x_wing": 18,
    "swordfish": 26,
}

TECHNIQUE_TIER = {
    "naked_single": "easy",
    "hidden_single": "easy",
    "locked_candidate": "medium",
    "naked_pair": "medium",
    "hidden_pair": "hard",
    "naked_triple": "hard",
    "hidden_triple": "hard",
    "x_wing": "expert",
    "swordfish": "expert",
}

TIER_TECHNIQUES = {
    "easy": {
        "naked_single",
        "hidden_single",
    },
    "medium": {
        "naked_single",
        "hidden_single",
        "locked_candidate",
        "naked_pair",
    },
    "hard": {
        "naked_single",
        "hidden_single",
        "locked_candidate",
        "naked_pair",
        "hidden_pair",
        "naked_triple",
        "hidden_triple",
    },
    "expert": set(TECHNIQUE_WEIGHTS),
}

TIER_ORDER = ["easy", "medium", "hard", "expert"]


def _box_index(row, col):
    return (row // 3) * 3 + (col // 3)


def _row_units():
    return [[(r, c) for c in range(9)] for r in range(9)]


def _col_units():
    return [[(r, c) for r in range(9)] for c in range(9)]


def _box_units():
    units = []
    for br in range(0, 9, 3):
        for bc in range(0, 9, 3):
            units.append([(r, c) for r in range(br, br + 3) for c in range(bc, bc + 3)])
    return units


ROWS = _row_units()
COLS = _col_units()
BOXES = _box_units()
ALL_UNITS = ROWS + COLS + BOXES


def _peers(row, col):
    peers = set(ROWS[row]) | set(COLS[col]) | set(BOXES[_box_index(row, col)])
    peers.discard((row, col))
    return peers


PEERS = {(r, c): _peers(r, c) for r in range(9) for c in range(9)}


class LogicalState:
    def __init__(self, board):
        self.board = deepcopy(board)
        self.candidates = {}
        self.steps = []
        self.valid = self._initialize_candidates()

    def _initialize_candidates(self):
        for row in range(9):
            for col in range(9):
                value = self.board[row][col]
                if value:
                    continue

                used = set(self.board[row])
                used.update(self.board[r][col] for r in range(9))

                br = (row // 3) * 3
                bc = (col // 3) * 3
                for r in range(br, br + 3):
                    for c in range(bc, bc + 3):
                        used.add(self.board[r][c])

                possible = DIGITS - used
                if not possible:
                    return False
                self.candidates[(row, col)] = set(possible)

        return True

    def solved(self):
        return not self.candidates

    def place(self, row, col, value, technique):
        cell = (row, col)
        if cell not in self.candidates or value not in self.candidates[cell]:
            return False

        self.board[row][col] = value
        del self.candidates[cell]
        self.steps.append({
            "technique": technique,
            "action": "place",
            "row": row,
            "col": col,
            "value": value,
        })

        for peer in PEERS[cell]:
            if peer in self.candidates and value in self.candidates[peer]:
                self.candidates[peer].discard(value)
                if not self.candidates[peer]:
                    self.valid = False
                    return False
        return True

    def eliminate(self, cells, value, technique):
        changed = False
        for cell in cells:
            if cell in self.candidates and value in self.candidates[cell]:
                self.candidates[cell].discard(value)
                self.steps.append({
                    "technique": technique,
                    "action": "eliminate",
                    "row": cell[0],
                    "col": cell[1],
                    "value": value,
                })
                changed = True
                if not self.candidates[cell]:
                    self.valid = False
                    return True
        return changed


def _apply_naked_single(state):
    for (row, col), candidates in list(state.candidates.items()):
        if len(candidates) == 1:
            value = next(iter(candidates))
            state.place(row, col, value, "naked_single")
            return True
    return False


def _apply_hidden_single(state):
    for unit in ALL_UNITS:
        for value in range(1, 10):
            cells = [cell for cell in unit if cell in state.candidates and value in state.candidates[cell]]
            if len(cells) == 1:
                row, col = cells[0]
                state.place(row, col, value, "hidden_single")
                return True
    return False


def _apply_locked_candidate(state):
    # Box -> line (pointing)
    for box in BOXES:
        for value in range(1, 10):
            cells = [cell for cell in box if cell in state.candidates and value in state.candidates[cell]]
            if len(cells) < 2:
                continue

            rows = {r for r, _ in cells}
            cols = {c for _, c in cells}

            if len(rows) == 1:
                row = next(iter(rows))
                targets = [cell for cell in ROWS[row] if cell not in box]
                if state.eliminate(targets, value, "locked_candidate"):
                    return True

            if len(cols) == 1:
                col = next(iter(cols))
                targets = [cell for cell in COLS[col] if cell not in box]
                if state.eliminate(targets, value, "locked_candidate"):
                    return True

    # Line -> box (claiming)
    for unit in ROWS + COLS:
        for value in range(1, 10):
            cells = [cell for cell in unit if cell in state.candidates and value in state.candidates[cell]]
            if len(cells) < 2:
                continue
            boxes = {_box_index(r, c) for r, c in cells}
            if len(boxes) == 1:
                box = BOXES[next(iter(boxes))]
                targets = [cell for cell in box if cell not in unit]
                if state.eliminate(targets, value, "locked_candidate"):
                    return True

    return False


def _apply_naked_pair(state):
    for unit in ALL_UNITS:
        pair_cells = [cell for cell in unit if cell in state.candidates and len(state.candidates[cell]) == 2]
        for cell_a, cell_b in combinations(pair_cells, 2):
            if state.candidates[cell_a] != state.candidates[cell_b]:
                continue
            pair_values = set(state.candidates[cell_a])
            others = [cell for cell in unit if cell not in (cell_a, cell_b)]
            for value in pair_values:
                if state.eliminate(others, value, "naked_pair"):
                    return True
    return False


def _apply_hidden_pair(state):
    for unit in ALL_UNITS:
        locations = {
            value: {cell for cell in unit if cell in state.candidates and value in state.candidates[cell]}
            for value in range(1, 10)
        }
        for a, b in combinations(range(1, 10), 2):
            if len(locations[a]) == 2 and locations[a] == locations[b]:
                cells = locations[a]
                changed = False
                for cell in cells:
                    extras = state.candidates[cell] - {a, b}
                    for value in list(extras):
                        state.candidates[cell].discard(value)
                        state.steps.append({
                            "technique": "hidden_pair",
                            "action": "eliminate",
                            "row": cell[0],
                            "col": cell[1],
                            "value": value,
                        })
                        changed = True
                if changed:
                    return True
    return False


def _apply_naked_triple(state):
    for unit in ALL_UNITS:
        cells = [
            cell for cell in unit
            if cell in state.candidates and 2 <= len(state.candidates[cell]) <= 3
        ]
        for combo in combinations(cells, 3):
            union = set().union(*(state.candidates[cell] for cell in combo))
            if len(union) != 3:
                continue
            others = [cell for cell in unit if cell not in combo]
            for value in union:
                if state.eliminate(others, value, "naked_triple"):
                    return True
    return False


def _apply_hidden_triple(state):
    for unit in ALL_UNITS:
        locations = {
            value: {cell for cell in unit if cell in state.candidates and value in state.candidates[cell]}
            for value in range(1, 10)
        }
        for values in combinations(range(1, 10), 3):
            loc_union = set().union(*(locations[value] for value in values))
            if len(loc_union) != 3 or any(not locations[value] for value in values):
                continue

            allowed = set(values)
            changed = False
            for cell in loc_union:
                extras = state.candidates[cell] - allowed
                for value in list(extras):
                    state.candidates[cell].discard(value)
                    state.steps.append({
                        "technique": "hidden_triple",
                        "action": "eliminate",
                        "row": cell[0],
                        "col": cell[1],
                        "value": value,
                    })
                    changed = True
            if changed:
                return True
    return False


def _apply_x_wing(state):
    for value in range(1, 10):
        row_positions = []
        for row in range(9):
            cols = tuple(col for col in range(9) if (row, col) in state.candidates and value in state.candidates[(row, col)])
            if len(cols) == 2:
                row_positions.append((row, cols))

        for (r1, cols1), (r2, cols2) in combinations(row_positions, 2):
            if cols1 != cols2:
                continue
            targets = [
                (row, col)
                for row in range(9)
                if row not in (r1, r2)
                for col in cols1
            ]
            if state.eliminate(targets, value, "x_wing"):
                return True

        col_positions = []
        for col in range(9):
            rows = tuple(row for row in range(9) if (row, col) in state.candidates and value in state.candidates[(row, col)])
            if len(rows) == 2:
                col_positions.append((col, rows))

        for (c1, rows1), (c2, rows2) in combinations(col_positions, 2):
            if rows1 != rows2:
                continue
            targets = [
                (row, col)
                for col in range(9)
                if col not in (c1, c2)
                for row in rows1
            ]
            if state.eliminate(targets, value, "x_wing"):
                return True

    return False


def _fish_patterns(state, value, by_rows=True, size=3):
    primary_range = range(9)
    patterns = []

    for primary in primary_range:
        secondary = {
            s
            for s in range(9)
            if ((primary, s) if by_rows else (s, primary)) in state.candidates
            and value in state.candidates[((primary, s) if by_rows else (s, primary))]
        }
        if 2 <= len(secondary) <= size:
            patterns.append((primary, secondary))

    for combo in combinations(patterns, size):
        primary_indices = {item[0] for item in combo}
        secondary_union = set().union(*(item[1] for item in combo))
        if len(secondary_union) != size:
            continue

        targets = []
        for secondary in secondary_union:
            for primary in range(9):
                if primary in primary_indices:
                    continue
                cell = (primary, secondary) if by_rows else (secondary, primary)
                targets.append(cell)
        yield targets


def _apply_swordfish(state):
    for value in range(1, 10):
        for targets in _fish_patterns(state, value, by_rows=True, size=3):
            if state.eliminate(targets, value, "swordfish"):
                return True
        for targets in _fish_patterns(state, value, by_rows=False, size=3):
            if state.eliminate(targets, value, "swordfish"):
                return True
    return False


TECHNIQUE_FUNCTIONS = [
    ("naked_single", _apply_naked_single),
    ("hidden_single", _apply_hidden_single),
    ("locked_candidate", _apply_locked_candidate),
    ("naked_pair", _apply_naked_pair),
    ("hidden_pair", _apply_hidden_pair),
    ("naked_triple", _apply_naked_triple),
    ("hidden_triple", _apply_hidden_triple),
    ("x_wing", _apply_x_wing),
    ("swordfish", _apply_swordfish),
]


def solve_logically(board, allowed_techniques=None, max_iterations=2000):
    allowed = set(allowed_techniques or TECHNIQUE_WEIGHTS.keys())
    state = LogicalState(board)

    if not state.valid:
        return {
            "solved": False,
            "board": state.board,
            "steps": state.steps,
            "score": 0,
            "hardest_technique": None,
        }

    iterations = 0
    while not state.solved() and state.valid and iterations < max_iterations:
        iterations += 1
        progress = False

        for technique, func in TECHNIQUE_FUNCTIONS:
            if technique not in allowed:
                continue
            if func(state):
                progress = True
                break

        if not progress:
            break

    technique_counts = {}
    for step in state.steps:
        technique = step["technique"]
        technique_counts[technique] = technique_counts.get(technique, 0) + 1

    # Eliminations are useful but should not make a long sequence explode the score.
    score = 0
    for technique, count in technique_counts.items():
        weight = TECHNIQUE_WEIGHTS[technique]
        score += weight * max(1, min(count, 12))

    hardest = None
    if technique_counts:
        order = list(TECHNIQUE_WEIGHTS)
        hardest = max(technique_counts, key=lambda name: order.index(name))

    return {
        "solved": state.solved() and state.valid,
        "board": state.board,
        "steps": state.steps,
        "score": score,
        "hardest_technique": hardest,
        "technique_counts": technique_counts,
    }


def _classify_from_tier_and_score(minimum_tier, score):
    """
    Combine the minimum required technique tier with cumulative logical effort.

    Technique tier remains the dominant signal. The score prevents a long,
    demanding puzzle made of many modest deductions from being underrated.
    These thresholds are intentionally centralized so they can be calibrated
    later from real player completion data.
    """
    if minimum_tier == "easy":
        return "easy" if score <= 24 else "medium"

    if minimum_tier == "medium":
        if score < 40:
            return "medium"
        if score < 75:
            return "hard"
        return "expert"

    if minimum_tier == "hard":
        return "hard" if score < 50 else "expert"

    return "expert"


def rate_difficulty(board):
    """
    Rate a puzzle using human-style logic only.

    1. Find the minimum technique tier able to solve the puzzle.
    2. Measure cumulative logical effort within that tier.
    3. Combine both signals into Easy / Medium / Hard / Expert.

    No guessing/backtracking is used for the rating. If the Expert technique
    set cannot finish the board, logical_solved=False and generation rejects it.
    """
    minimum_tier = None
    result = None

    for tier in TIER_ORDER:
        tier_result = solve_logically(board, TIER_TECHNIQUES[tier])
        if tier_result["solved"]:
            minimum_tier = tier
            result = tier_result
            break

    if minimum_tier is None:
        expert_result = solve_logically(board, TIER_TECHNIQUES["expert"])
        return {
            "difficulty": None,
            "minimumTechniqueTier": None,
            "logical_solved": False,
            "score": expert_result["score"],
            "hardest_technique": expert_result["hardest_technique"],
            "technique_counts": expert_result.get("technique_counts", {}),
        }

    classification = _classify_from_tier_and_score(minimum_tier, result["score"])

    return {
        "difficulty": classification,
        "minimumTechniqueTier": minimum_tier,
        "logical_solved": True,
        "score": result["score"],
        "hardest_technique": result["hardest_technique"],
        "technique_counts": result.get("technique_counts", {}),
    }
