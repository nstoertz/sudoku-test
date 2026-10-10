import { describe, expect, it } from "vitest";
import {
  cloneBoard,
  conflictsAt,
  generatePuzzle,
  isComplete,
  SIZE,
  type Board,
} from "./sudoku";

function filledCount(board: Board): number {
  return board.flat().filter(Boolean).length;
}

describe("generatePuzzle", () => {
  it.each([
    ["easy", 40],
    ["medium", 32],
    ["hard", 26],
  ] as const)("%s targets ~%i clues and matches solution givens", (difficulty, target) => {
    const { puzzle, solution } = generatePuzzle(difficulty);
    expect(puzzle).toHaveLength(SIZE);
    expect(solution).toHaveLength(SIZE);
    expect(isComplete(solution)).toBe(true);

    const clues = filledCount(puzzle);
    expect(clues).toBeGreaterThanOrEqual(target);
    expect(clues).toBeLessThanOrEqual(target + 2);

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (puzzle[r][c] !== 0) {
          expect(puzzle[r][c]).toBe(solution[r][c]);
          expect(conflictsAt(puzzle, r, c)).toBe(false);
        }
      }
    }
  });
});

describe("conflictsAt", () => {
  it("detects row, column, and box duplicates", () => {
    const board: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    board[0][0] = 5;
    board[0][3] = 5;
    expect(conflictsAt(board, 0, 0)).toBe(true);
    expect(conflictsAt(board, 0, 3)).toBe(true);

    board[0][3] = 0;
    board[4][0] = 5;
    expect(conflictsAt(board, 0, 0)).toBe(true);

    board[4][0] = 0;
    board[1][1] = 5;
    expect(conflictsAt(board, 0, 0)).toBe(true);
    expect(conflictsAt(board, 1, 1)).toBe(true);
  });

  it("returns false for an empty cell", () => {
    const board: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    expect(conflictsAt(board, 0, 0)).toBe(false);
  });
});

describe("isComplete", () => {
  it("accepts a generated solution and rejects a conflicted full board", () => {
    const { solution } = generatePuzzle("easy");
    expect(isComplete(solution)).toBe(true);

    const bad = cloneBoard(solution);
    bad[0][0] = bad[0][1];
    expect(isComplete(bad)).toBe(false);
  });
});
