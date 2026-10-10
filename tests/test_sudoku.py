import io
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import sudoku

# Project Euler problem 96, grid 01, and its unique solution.
PUZZLE = """
003020600
900305001
001806400
008102900
700000008
006708200
002609500
800203009
005010300
"""

SOLUTION = """
483921657
967345821
251876493
548132976
729564138
136798245
372689514
814253769
695417382
"""


class ParseTests(unittest.TestCase):
    def test_ignores_blank_lines_comments_and_separators(self):
        text = "# comment\n\n5 3 . . 7 . . . .\n" + "\n".join(["0" * 9] * 8)
        board = sudoku.parse(text)
        self.assertEqual(board[0][0], 5)
        self.assertEqual(board[0][2], 0)
        self.assertEqual(len(board), 9)

    def test_rejects_short_row(self):
        with self.assertRaises(sudoku.SudokuError):
            sudoku.parse("123\n" + "\n".join(["0" * 9] * 8))

    def test_rejects_bad_character(self):
        with self.assertRaises(sudoku.SudokuError):
            sudoku.parse("\n".join(["12345678x"] + ["0" * 9] * 8))

    def test_rejects_non_board_shapes(self):
        with self.assertRaises(sudoku.SudokuError):
            sudoku.find_conflicts([[1, 2], [3, 4]])
        with self.assertRaises(sudoku.SudokuError):
            sudoku.find_conflicts([[True] * 9 for _ in range(9)])


class ConflictTests(unittest.TestCase):
    def test_reports_row_column_and_box_duplicates(self):
        board = [[0] * 9 for _ in range(9)]
        board[0][0] = 5
        board[0][1] = 5
        board[1][0] = 5
        conflicts = sudoku.find_conflicts(board)
        self.assertEqual(
            [(item.kind, item.index, item.value) for item in conflicts],
            [("row", 1, 5), ("column", 1, 5), ("box", 1, 5)],
        )

    def test_partial_puzzle_without_duplicates_is_valid(self):
        board = sudoku.parse(PUZZLE)
        self.assertEqual(sudoku.find_conflicts(board), [])
        self.assertFalse(sudoku.is_complete(board))
        self.assertFalse(sudoku.is_solved(board))

    def test_known_solution_is_solved(self):
        puzzle = sudoku.parse(PUZZLE)
        solution = sudoku.parse(SOLUTION)
        self.assertTrue(sudoku.is_solved(solution))
        for row in range(9):
            for col in range(9):
                given = puzzle[row][col]
                if given:
                    self.assertEqual(solution[row][col], given)


class SolveTests(unittest.TestCase):
    def test_solves_known_puzzle_without_mutating_input(self):
        board = sudoku.parse(PUZZLE)
        original = [row[:] for row in board]
        solved = sudoku.solve(board)
        self.assertEqual(board, original)
        self.assertEqual(solved, sudoku.parse(SOLUTION))

    def test_returns_none_when_no_digit_fits(self):
        lines = ["12345678."] + ["........."] * 7 + ["........9"]
        board = sudoku.parse("\n".join(lines))
        self.assertEqual(sudoku.find_conflicts(board), [])
        self.assertIsNone(sudoku.solve(board))

    def test_returns_none_for_conflicting_givens(self):
        board = sudoku.parse("\n".join(["55......."] + ["........."] * 8))
        self.assertIsNone(sudoku.solve(board))

    def test_already_solved_board_is_returned_unchanged(self):
        board = sudoku.parse(SOLUTION)
        self.assertEqual(sudoku.solve(board), board)
        self.assertIsNot(sudoku.solve(board), board)


class CliTests(unittest.TestCase):
    def test_check_and_solve(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        code = self._run(["--check"], PUZZLE, stdout, stderr)
        self.assertEqual(code, 0)
        self.assertEqual(stdout.getvalue().strip(), "valid")
        self.assertEqual(stderr.getvalue(), "")

        stdout, stderr = io.StringIO(), io.StringIO()
        code = self._run([], PUZZLE, stdout, stderr)
        self.assertEqual(code, 0)
        self.assertEqual(stdout.getvalue().strip(), SOLUTION.strip())

    def test_check_reports_a_solved_board(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        code = self._run(["--check"], SOLUTION, stdout, stderr)
        self.assertEqual(code, 0)
        self.assertEqual(stdout.getvalue().strip(), "solved")

    def test_conflict_and_unsolvable_exit_codes(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        code = self._run([], "55.......\n" + ".........\n" * 8, stdout, stderr)
        self.assertEqual(code, 1)
        self.assertIn("row 1: duplicate 5", stderr.getvalue())

        stdout, stderr = io.StringIO(), io.StringIO()
        code = self._run([], "12345678.\n" + ".........\n" * 7 + "........9\n", stdout, stderr)
        self.assertEqual(code, 1)
        self.assertIn("no solution", stderr.getvalue())

    def test_malformed_input_exits_2(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        code = self._run([], "123\n", stdout, stderr)
        self.assertEqual(code, 2)
        self.assertIn("invalid puzzle", stderr.getvalue())

    def test_reads_a_puzzle_file(self):
        path = ROOT / "tests" / "_puzzle.txt"
        path.write_text(SOLUTION, encoding="utf-8")
        try:
            stdout, stderr = io.StringIO(), io.StringIO()
            code = sudoku.main([str(path), "--check"], stdout=stdout, stderr=stderr)
        finally:
            path.unlink()
        self.assertEqual(code, 0)
        self.assertEqual(stdout.getvalue().strip(), "solved")

    def _run(self, args, text, stdout, stderr):
        original = sys.stdin
        sys.stdin = io.StringIO(text)
        try:
            return sudoku.main(args, stdout=stdout, stderr=stderr)
        finally:
            sys.stdin = original


if __name__ == "__main__":
    unittest.main()
