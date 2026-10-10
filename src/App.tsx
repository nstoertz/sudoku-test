import { useCallback, useEffect, useMemo, useState } from "react";
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

function createGame(difficulty: Difficulty) {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    puzzle,
    solution,
    board: cloneBoard(puzzle),
    fixed: puzzle.map((row) => row.map((v) => v !== 0)),
    selected: null as CellPos | null,
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
  if (val && !fixed[r][c]) classes.push("cell--user");

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
  const [themeId, setThemeId] = useState(() => applyThemeToDocument(readStoredTheme()));
  const [difficulty, setDifficulty] = useState<Difficulty>(readStoredDifficulty);
  const [game, setGame] = useState(() => createGame(readStoredDifficulty()));
  const [newGameSpin, setNewGameSpin] = useState(false);
  const [pressedPad, setPressedPad] = useState<number | null>(null);

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const filled = useMemo(
    () => game.board.flat().filter(Boolean).length,
    [game.board],
  );

  const setCell = useCallback((row: number, col: number, value: number) => {
    setGame((prev) => {
      if (prev.fixed[row][col] || prev.won) return prev;
      const board = cloneBoard(prev.board);
      board[row][col] = value;
      const won = isComplete(board);
      return { ...prev, board, won };
    });
  }, []);

  const selectCell = useCallback((row: number, col: number) => {
    setGame((prev) => ({ ...prev, selected: { row, col } }));
  }, []);

  const handleTheme = (id: string) => {
    const next = applyThemeToDocument(id);
    setThemeId(next);
    document.body.classList.remove("theme-flash");
    void document.body.offsetWidth;
    document.body.classList.add("theme-flash");
  };

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem(DIFFICULTY_KEY, d);
  };

  const handleNewGame = () => {
    setNewGameSpin(true);
    setGame(createGame(difficulty));
    window.setTimeout(() => setNewGameSpin(false), 450);
  };

  const handlePad = (num: number) => {
    if (!game.selected) return;
    setCell(game.selected.row, game.selected.col, num);
    setPressedPad(num);
    window.setTimeout(() => setPressedPad(null), 280);
  };

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (!game.selected) return;
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
        selectCell(nr, nc);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [game.selected, setCell, selectCell]);

  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = game.board[r][c];
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          className={cellClassName(
            r,
            c,
            game.board,
            game.fixed,
            game.selected,
            game.won,
          )}
          role="gridcell"
          aria-label={`Row ${r + 1} column ${c + 1}${val ? `, ${val}` : ", empty"}`}
          onClick={() => selectCell(r, c)}
        >
          {val || ""}
        </button>,
      );
    }
  }

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
            <div
              className="chip-row"
              id="theme-picker"
              role="radiogroup"
              aria-label="Theme"
            >
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${t.id === themeId ? "chip--active" : ""}`}
                  role="radio"
                  aria-checked={t.id === themeId}
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
              role="radiogroup"
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${d === difficulty ? "chip--active" : ""}`}
                  role="radio"
                  aria-checked={d === difficulty}
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
            onClick={handleNewGame}
          >
            New puzzle
          </button>
        </section>

        <p
          className={`status ${game.won ? "status--win" : ""}`}
          id="status"
          role="status"
        >
          {game.won
            ? "Solved — nice work."
            : `${filled} of 81 filled · tap a cell, then a number`}
        </p>

        <div className={`board-wrap ${game.won ? "is-won" : ""}`}>
          <div className="board" id="board" role="grid" aria-label="Sudoku board">
            {cells}
          </div>
        </div>

        <div className="pad" role="group" aria-label="Number pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              className={`pad__btn ${pressedPad === n ? "is-pressed" : ""}`}
              onClick={() => handlePad(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className={`pad__btn pad__btn--clear ${pressedPad === 0 ? "is-pressed" : ""}`}
            onClick={() => handlePad(0)}
          >
            Clear
          </button>
        </div>
      </main>
    </>
  );
}
