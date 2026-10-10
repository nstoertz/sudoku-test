export const SIZE = 9;
const BOX = 3;

export type Board = number[][];
export type Difficulty = "easy" | "medium" | "hard";

export type PuzzleResult = {
  puzzle: Board;
  solution: Board;
};

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(board: Board, row: number, col: number, num: number): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }
  const br = Math.floor(row / BOX) * BOX;
  const bc = Math.floor(col / BOX) * BOX;
  for (let r = br; r < br + BOX; r++) {
    for (let c = bc; c < bc + BOX; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function findEmpty(board: Board): [number, number] | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function solve(
  board: Board,
  countSolutions = false,
  limit = 2,
): boolean | number {
  const empty = findEmpty(board);
  if (!empty) return countSolutions ? 1 : true;

  const [row, col] = empty;
  let solutions = 0;
  for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (!isValid(board, row, col, num)) continue;
    board[row][col] = num;
    if (countSolutions) {
      solutions += solve(board, true, limit) as number;
      board[row][col] = 0;
      if (solutions >= limit) return solutions;
    } else if (solve(board, false)) {
      return true;
    } else {
      board[row][col] = 0;
    }
  }
  return countSolutions ? solutions : false;
}

function fillBoard(board: Board): boolean {
  return solve(board, false) === true;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function countSolutions(board: Board): number {
  return solve(cloneBoard(board), true, 2) as number;
}

/**
 * Generate a playable puzzle with a unique solution.
 */
export function generatePuzzle(difficulty: Difficulty = "medium"): PuzzleResult {
  const clues = ({ easy: 40, medium: 32, hard: 26 } as const)[difficulty] ?? 32;
  const solution = emptyBoard();
  fillBoard(solution);

  const puzzle = cloneBoard(solution);
  const positions = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i) => [
      Math.floor(i / SIZE),
      i % SIZE,
    ] as [number, number]),
  );

  let removed = 0;
  const targetRemove = SIZE * SIZE - clues;

  for (const [r, c] of positions) {
    if (removed >= targetRemove) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle) !== 1) {
      puzzle[r][c] = backup;
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}

export function conflictsAt(board: Board, row: number, col: number): boolean {
  const val = board[row][col];
  if (!val) return false;

  for (let i = 0; i < SIZE; i++) {
    if (i !== col && board[row][i] === val) return true;
    if (i !== row && board[i][col] === val) return true;
  }

  const br = Math.floor(row / BOX) * BOX;
  const bc = Math.floor(col / BOX) * BOX;
  for (let r = br; r < br + BOX; r++) {
    for (let c = bc; c < bc + BOX; c++) {
      if ((r !== row || c !== col) && board[r][c] === val) return true;
    }
  }
  return false;
}

export function isComplete(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c] || conflictsAt(board, r, c)) return false;
    }
  }
  return true;
}
