"""Validate and solve 9x9 Sudoku puzzles.

Empty cells are 0. Text puzzles use 0 or "." for empty cells, one row per line.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from typing import Iterable, Sequence, TextIO

SIZE = 9
BOX = 3
EMPTY = 0

Board = list[list[int]]


class SudokuError(ValueError):
    """The puzzle text or board shape cannot be read as Sudoku."""


@dataclass(frozen=True)
class Conflict:
    """A repeated digit in one row, column, or 3x3 box."""

    kind: str
    index: int
    value: int

    def __str__(self) -> str:
        return f"{self.kind} {self.index}: duplicate {self.value}"


def parse(text: str) -> Board:
    """Parse a 9-line puzzle. Blank lines and lines starting with # are ignored."""
    rows: list[list[int]] = []
    for line_number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        cells = line.replace(" ", "").replace(",", "")
        if len(cells) != SIZE:
            raise SudokuError(
                f"line {line_number}: expected {SIZE} cells, got {len(cells)}"
            )
        row: list[int] = []
        for ch in cells:
            if ch in ".0":
                row.append(EMPTY)
            elif ch.isdigit():
                row.append(int(ch))
            else:
                raise SudokuError(f"line {line_number}: invalid cell {ch!r}")
        rows.append(row)
    if len(rows) != SIZE:
        raise SudokuError(f"expected {SIZE} rows, got {len(rows)}")
    return rows


def format_board(board: Board) -> str:
    """Render a board as nine lines of digits, with '.' for empty cells."""
    _require_board(board)
    return "\n".join(
        "".join(str(value) if value else "." for value in row) for row in board
    )


def find_conflicts(board: Board) -> list[Conflict]:
    """Return duplicate digits in rows, columns, and boxes."""
    _require_board(board)
    found: list[Conflict] = []
    for index, row in enumerate(board, start=1):
        duplicate = _first_duplicate(row)
        if duplicate is not None:
            found.append(Conflict("row", index, duplicate))
    for index in range(SIZE):
        duplicate = _first_duplicate(board[row][index] for row in range(SIZE))
        if duplicate is not None:
            found.append(Conflict("column", index + 1, duplicate))
    for index in range(SIZE):
        box_row, box_col = divmod(index, BOX)
        values = [
            board[row][col]
            for row in range(box_row * BOX, box_row * BOX + BOX)
            for col in range(box_col * BOX, box_col * BOX + BOX)
        ]
        duplicate = _first_duplicate(values)
        if duplicate is not None:
            found.append(Conflict("box", index + 1, duplicate))
    return found


def is_complete(board: Board) -> bool:
    """True when every cell holds a digit from 1 to 9."""
    _require_board(board)
    return all(value != EMPTY for row in board for value in row)


def is_solved(board: Board) -> bool:
    """True when the board is complete and has no conflicts."""
    return is_complete(board) and not find_conflicts(board)


def solve(board: Board) -> Board | None:
    """Return one completed board, or None if the puzzle has no solution.

    The input board is not modified. Conflicting givens fail immediately.
    """
    _require_board(board)
    if find_conflicts(board):
        return None

    grid = [row[:] for row in board]

    def options(row: int, col: int) -> list[int]:
        used = set(grid[row])
        used.update(grid[other][col] for other in range(SIZE))
        box_row = (row // BOX) * BOX
        box_col = (col // BOX) * BOX
        for rr in range(box_row, box_row + BOX):
            used.update(grid[rr][box_col : box_col + BOX])
        used.discard(EMPTY)
        return [digit for digit in range(1, SIZE + 1) if digit not in used]

    def search() -> bool:
        target: tuple[int, int] | None = None
        target_options: list[int] = []
        for row in range(SIZE):
            for col in range(SIZE):
                if grid[row][col] != EMPTY:
                    continue
                choices = options(row, col)
                if not choices:
                    return False
                if target is None or len(choices) < len(target_options):
                    target = (row, col)
                    target_options = choices
                    if len(choices) == 1:
                        break
            if target is not None and len(target_options) == 1:
                break
        if target is None:
            return True
        row, col = target
        for digit in target_options:
            grid[row][col] = digit
            if search():
                return True
            grid[row][col] = EMPTY
        return False

    if not search():
        return None
    return grid


def main(argv: Sequence[str] | None = None, stdout: TextIO | None = None, stderr: TextIO | None = None) -> int:
    """Validate a puzzle, or print one solution.

    Exit 0 on success, 1 when the puzzle conflicts or has no solution,
    and 2 when the input cannot be parsed.
    """
    out = stdout or sys.stdout
    err = stderr or sys.stderr
    parser = argparse.ArgumentParser(description="Validate or solve a Sudoku puzzle.")
    parser.add_argument(
        "puzzle",
        nargs="?",
        help="puzzle file (9 rows). Reads stdin when omitted.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="only validate; print 'valid' or 'solved' instead of a solution",
    )
    args = parser.parse_args(argv)

    try:
        if args.puzzle:
            with open(args.puzzle, encoding="utf-8") as handle:
                text = handle.read()
        else:
            text = sys.stdin.read()
        board = parse(text)
    except SudokuError as exc:
        print(f"invalid puzzle: {exc}", file=err)
        return 2
    except OSError as exc:
        print(f"cannot read puzzle: {exc}", file=err)
        return 2

    conflicts = find_conflicts(board)
    if conflicts:
        print("conflicts:", file=err)
        for conflict in conflicts:
            print(f"  {conflict}", file=err)
        return 1

    if args.check:
        print("solved" if is_complete(board) else "valid", file=out)
        return 0

    if is_complete(board):
        print(format_board(board), file=out)
        return 0

    solved = solve(board)
    if solved is None:
        print("no solution", file=err)
        return 1
    print(format_board(solved), file=out)
    return 0


def _require_board(board: Board) -> None:
    if len(board) != SIZE or any(len(row) != SIZE for row in board):
        raise SudokuError(f"board must be {SIZE}x{SIZE}")
    for row in board:
        for value in row:
            if type(value) is not int or not 0 <= value <= SIZE:
                raise SudokuError(f"cell values must be integers 0-{SIZE}, got {value!r}")


def _first_duplicate(values: Iterable[int]) -> int | None:
    seen: set[int] = set()
    for value in values:
        if value == EMPTY:
            continue
        if value in seen:
            return value
        seen.add(value)
    return None


if __name__ == "__main__":
    sys.exit(main())
