const SIZE = 9;
const BOX = 3;

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(board, row, col, num) {
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

function findEmpty(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function solve(board, countSolutions = false, limit = 2) {
  const empty = findEmpty(board);
  if (!empty) return countSolutions ? 1 : true;

  const [row, col] = empty;
  let solutions = 0;
  for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (!isValid(board, row, col, num)) continue;
    board[row][col] = num;
    if (countSolutions) {
      solutions += solve(board, true, limit);
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

function fillBoard(board) {
  return solve(board, false);
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function countSolutions(board) {
  return solve(cloneBoard(board), true, 2);
}

/**
 * Generate a playable puzzle.
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {{ puzzle: number[][], solution: number[][] }}
 */
export function generatePuzzle(difficulty = "medium") {
  const clues = { easy: 40, medium: 32, hard: 26 }[difficulty] ?? 32;
  const solution = emptyBoard();
  fillBoard(solution);

  const puzzle = cloneBoard(solution);
  const positions = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE]),
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

export function conflictsAt(board, row, col) {
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

export function isComplete(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c] || conflictsAt(board, r, c)) return false;
    }
  }
  return true;
}

export { SIZE, cloneBoard };
