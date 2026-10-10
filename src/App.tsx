import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cloneBoard,
  conflictsAt,
  generatePuzzle,
  isComplete,
  SIZE,
  type Board,
  type Difficulty,
} from "./sudoku";
import { getTheme, themes } from "./themes";

const THEME_KEY = "sudoku-theme";
const DIFFICULTY_KEY = "sudoku-difficulty";
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type CellPos = { row: number; col: number };

type GameState = {
  board: Board;
  fixed: boolean[][];
  selected: CellPos | null;
  won: boolean;
};

function readStoredTheme(): string {
  return localStorage.getItem(THEME_KEY) || themes[0].id;
}

function readStoredDifficulty(): Difficulty {
  const stored = localStorage.getItem(DIFFICULTY_KEY);
  if (stored === "easy" || stored === "medium" || stored === "hard") {
    return stored;
  }
  return "medium";
}

function applyThemeToDocument(themeId: string): string {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.style.setProperty("--font-display", theme.fonts.display);
  root.style.setProperty("--font-body", theme.fonts.body);
  root.style.setProperty("--font-board", theme.fonts.board);
  localStorage.setItem(THEME_KEY, theme.id);
  return theme.id;
}

function createGame(difficulty: Difficulty): GameState {
  const { puzzle } = generatePuzzle(difficulty);
  return {
    board: cloneBoard(puzzle),
    fixed: puzzle.map((row) => row.map((v) => v !== 0)),
    selected: null,
    won: false,
  };
}

function cellClassName(
  r: number,
  c: number,
  board: Board,
  fixed: boolean[][],
  selected: CellPos | null,
  won: boolean,
): string {
  const val = board[r][c];
  const classes = ["cell"];
  if (fixed[r][c]) classes.push("cell--fixed");

  const selectedVal =
    selected != null ? board[selected.row][selected.col] : 0;

  if (selected?.row === r && selected?.col === c) {
    classes.push("cell--selected");
  } else if (selected) {
    const sr = selected.row;
    const sc = selected.col;
    if (
      r === sr ||
      c === sc ||
      (Math.floor(r / 3) === Math.floor(sr / 3) &&
        Math.floor(c / 3) === Math.floor(sc / 3))
    ) {
      classes.push("cell--related");
    }
  }

  if (selectedVal && val === selectedVal) classes.push("cell--same");
  if (val && conflictsAt(board, r, c)) classes.push("cell--conflict");
  if ((c + 1) % 3 === 0 && c < 8) classes.push("cell--box-r");
  if ((r + 1) % 3 === 0 && r < 8) classes.push("cell--box-b");
  if (won) classes.push("cell--won");
  return classes.join(" ");
}

export default function App() {
  const [themeId, setThemeId] = useState(() =>
    applyThemeToDocument(readStoredTheme()),
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(readStoredDifficulty);
  const [game, setGame] = useState<GameState | null>(null);
  const [generating, setGenerating] = useState(true);
  const [newGameSpin, setNewGameSpin] = useState(false);
  const [pressedPad, setPressedPad] = useState<number | null>(null);
  const [keyboardNav, setKeyboardNav] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const genTimerRef = useRef<number | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const pressTimerRef = useRef<number | null>(null);

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const filled = useMemo(
    () => (game ? game.board.flat().filter(Boolean).length : 0),
    [game],
  );

  const clearGenTimer = () => {
    if (genTimerRef.current != null) {
      window.clearTimeout(genTimerRef.current);
      genTimerRef.current = null;
    }
  };

  const startNewGame = useCallback((nextDifficulty: Difficulty, spin = false) => {
    clearGenTimer();
    setGenerating(true);
    if (spin) {
      setNewGameSpin(true);
      if (spinTimerRef.current != null) window.clearTimeout(spinTimerRef.current);
      spinTimerRef.current = window.setTimeout(() => {
        setNewGameSpin(false);
        spinTimerRef.current = null;
      }, 450);
    }

    // Defer heavy generation so React can paint the busy state first.
    // A short delay (one frame+) is more reliable than 0ms with batching.
    genTimerRef.current = window.setTimeout(() => {
      setGame(createGame(nextDifficulty));
      setGenerating(false);
      genTimerRef.current = null;
    }, 50);
  }, []);

  useEffect(() => {
    startNewGame(readStoredDifficulty());
    return () => {
      clearGenTimer();
      if (spinTimerRef.current != null) window.clearTimeout(spinTimerRef.current);
      if (pressTimerRef.current != null) window.clearTimeout(pressTimerRef.current);
    };
  }, [startNewGame]);

  const setCell = useCallback((row: number, col: number, value: number) => {
    setGame((prev) => {
      if (!prev || prev.fixed[row][col]) return prev;
      const board = cloneBoard(prev.board);
      board[row][col] = value;
      return { ...prev, board, won: isComplete(board) };
    });
  }, []);

  const selectCell = useCallback((row: number, col: number) => {
    setGame((prev) => (prev ? { ...prev, selected: { row, col } } : prev));
  }, []);

  const handleTheme = (id: string) => {
    const next = applyThemeToDocument(id);
    setThemeId(next);
    document.body.classList.remove("theme-flash");
    void document.body.offsetWidth;
    document.body.classList.add("theme-flash");
  };

  const handleDifficulty = (d: Difficulty) => {
    if (d === difficulty && !generating) return;
    setDifficulty(d);
    localStorage.setItem(DIFFICULTY_KEY, d);
    startNewGame(d, true);
  };

  const handleNewGame = () => {
    if (generating) return;
    startNewGame(difficulty, true);
  };

  const handlePad = (num: number) => {
    if (!game?.selected || generating) return;
    setCell(game.selected.row, game.selected.col, num);
    setPressedPad(num);
    if (pressTimerRef.current != null) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => {
      setPressedPad(null);
      pressTimerRef.current = null;
    }, 280);
  };

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (!game?.selected || generating) return;
      const { row, col } = game.selected;

      if (e.key >= "1" && e.key <= "9") {
        setCell(row, col, Number(e.key));
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        setCell(row, col, 0);
        return;
      }

      let nr = row;
      let nc = col;
      if (e.key === "ArrowUp") nr = Math.max(0, row - 1);
      if (e.key === "ArrowDown") nr = Math.min(8, row + 1);
      if (e.key === "ArrowLeft") nc = Math.max(0, col - 1);
      if (e.key === "ArrowRight") nc = Math.min(8, col + 1);
      if (nr !== row || nc !== col) {
        e.preventDefault();
        setKeyboardNav(true);
        selectCell(nr, nc);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [game?.selected, generating, setCell, selectCell]);

  // Keep DOM focus on the selected cell so a previously clicked cell does not
  // keep its own :focus-visible ring after keyboard navigation.
  const selectedRow = game?.selected?.row;
  const selectedCol = game?.selected?.col;
  useEffect(() => {
    const board = boardRef.current;
    if (!board || selectedRow == null || selectedCol == null) return;
    if (!board.contains(document.activeElement)) return;
    const cell = board.children[selectedRow * SIZE + selectedCol];
    if (cell instanceof HTMLElement && cell !== document.activeElement) {
      cell.focus();
    }
  }, [selectedRow, selectedCol]);

  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = game?.board[r][c] ?? 0;
      const fixed = game?.fixed[r][c] ?? false;
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          className={
            game
              ? cellClassName(
                  r,
                  c,
                  game.board,
                  game.fixed,
                  game.selected,
                  game.won,
                )
              : "cell"
          }
          role="gridcell"
          aria-readonly={fixed || undefined}
          aria-label={`Row ${r + 1} column ${c + 1}${val ? `, ${val}` : ", empty"}`}
          disabled={generating || !game}
          onClick={() => selectCell(r, c)}
        >
          {val || ""}
        </button>,
      );
    }
  }

  const statusText = generating
    ? "Generating puzzle…"
    : game?.won
      ? "Solved — nice work."
      : `${filled} of 81 filled · tap a cell, then a number`;

  return (
    <>
      <div className="atmosphere" aria-hidden="true">
        <div className="atmosphere__orb atmosphere__orb--a" />
        <div className="atmosphere__orb atmosphere__orb--b" />
        <div className="atmosphere__orb atmosphere__orb--c" />
      </div>
      <main className="shell">
        <header className="brand">
          <p className="brand__eyebrow">Playable puzzle</p>
          <h1 className="brand__title">Sudoku</h1>
          <p className="brand__tag">{theme.name} edition</p>
        </header>

        <section className="controls" aria-label="Game controls">
          <div className="field field--wide">
            <span>Theme</span>
            <div className="chip-row" id="theme-picker" aria-label="Theme">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${t.id === themeId ? "chip--active" : ""}`}
                  aria-pressed={t.id === themeId}
                  onClick={() => handleTheme(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="field field--wide">
            <span>Difficulty</span>
            <div
              className="chip-row"
              id="difficulty-picker"
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${d === difficulty ? "chip--active" : ""}`}
                  aria-pressed={d === difficulty}
                  disabled={generating}
                  onClick={() => handleDifficulty(d)}
                >
                  {d[0].toUpperCase()}
                  {d.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={`btn btn--accent ${newGameSpin ? "is-spinning" : ""}`}
            disabled={generating}
            onClick={handleNewGame}
          >
            {generating ? "Generating…" : "New puzzle"}
          </button>
        </section>

        <p
          className={`status ${game?.won && !generating ? "status--win" : ""}`}
          id="status"
          role="status"
          aria-busy={generating}
        >
          {statusText}
        </p>

        <div className={`board-wrap ${game?.won && !generating ? "is-won" : ""}`}>
          <div
            ref={boardRef}
            className={`board ${keyboardNav ? "board--keyboard" : ""}`}
            id="board"
            role="grid"
            aria-label="Sudoku board"
            onPointerMove={() => {
              if (keyboardNav) setKeyboardNav(false);
            }}
          >
            {cells}
          </div>
        </div>

        <div className="pad" role="group" aria-label="Number pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              className={`pad__btn ${pressedPad === n ? "is-pressed" : ""}`}
              disabled={generating || !game}
              onClick={() => handlePad(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className={`pad__btn pad__btn--clear ${pressedPad === 0 ? "is-pressed" : ""}`}
            disabled={generating || !game}
            onClick={() => handlePad(0)}
          >
            Clear
          </button>
        </div>
      </main>
    </>
  );
}
