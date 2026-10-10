import "./style.css";
import { themes, getTheme } from "./themes.js";
import {
  generatePuzzle,
  conflictsAt,
  isComplete,
  cloneBoard,
  SIZE,
} from "./sudoku.js";

const THEME_KEY = "sudoku-theme";
const DIFFICULTY_KEY = "sudoku-difficulty";

const app = document.querySelector("#app");

let state = {
  themeId: localStorage.getItem(THEME_KEY) || themes[0].id,
  difficulty: localStorage.getItem(DIFFICULTY_KEY) || "medium",
  puzzle: null,
  solution: null,
  board: null,
  fixed: null,
  selected: null,
  won: false,
};

function applyTheme(themeId) {
  const theme = getTheme(themeId);
  state.themeId = theme.id;
  localStorage.setItem(THEME_KEY, theme.id);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.style.setProperty("--font-display", theme.fonts.display);
  root.style.setProperty("--font-body", theme.fonts.body);
  root.style.setProperty("--font-board", theme.fonts.board);
}

function newGame() {
  const { puzzle, solution } = generatePuzzle(state.difficulty);
  state.puzzle = puzzle;
  state.solution = solution;
  state.board = cloneBoard(puzzle);
  state.fixed = puzzle.map((row) => row.map((v) => v !== 0));
  state.selected = null;
  state.won = false;
  render();
}

function setCell(row, col, value) {
  if (state.fixed[row][col] || state.won) return;
  state.board[row][col] = value;
  if (isComplete(state.board)) {
    state.won = true;
  }
  renderBoard();
  updateStatus();
}

function selectCell(row, col) {
  state.selected = { row, col };
  renderBoard();
}

function clearSelectionValue() {
  if (!state.selected) return;
  const { row, col } = state.selected;
  setCell(row, col, 0);
}

function render() {
  const theme = getTheme(state.themeId);
  app.innerHTML = `
    <div class="atmosphere" aria-hidden="true">
      <div class="atmosphere__orb atmosphere__orb--a"></div>
      <div class="atmosphere__orb atmosphere__orb--b"></div>
      <div class="atmosphere__orb atmosphere__orb--c"></div>
    </div>
    <main class="shell">
      <header class="brand">
        <p class="brand__eyebrow">Playable puzzle</p>
        <h1 class="brand__title">Sudoku</h1>
        <p class="brand__tag">${theme.name} edition</p>
      </header>

      <section class="controls" aria-label="Game controls">
        <label class="field">
          <span>Theme</span>
          <select id="theme-select">
            ${themes
              .map(
                (t) =>
                  `<option value="${t.id}" ${t.id === state.themeId ? "selected" : ""}>${t.name}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="field">
          <span>Difficulty</span>
          <select id="difficulty-select">
            ${["easy", "medium", "hard"]
              .map(
                (d) =>
                  `<option value="${d}" ${d === state.difficulty ? "selected" : ""}>${d[0].toUpperCase()}${d.slice(1)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <button type="button" class="btn btn--accent" id="new-game">New puzzle</button>
      </section>

      <p class="status" id="status" role="status"></p>

      <div class="board-wrap">
        <div class="board" id="board" role="grid" aria-label="Sudoku board"></div>
      </div>

      <div class="pad" role="group" aria-label="Number pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
          .map((n) => `<button type="button" class="pad__btn" data-num="${n}">${n}</button>`)
          .join("")}
        <button type="button" class="pad__btn pad__btn--clear" data-num="0">Clear</button>
      </div>
    </main>
  `;

  bindChrome();
  renderBoard();
  updateStatus();
}

function bindChrome() {
  document.querySelector("#theme-select").addEventListener("change", (e) => {
    applyTheme(e.target.value);
    document.querySelector(".brand__tag").textContent =
      `${getTheme(state.themeId).name} edition`;
    document.body.classList.remove("theme-flash");
    void document.body.offsetWidth;
    document.body.classList.add("theme-flash");
  });

  document.querySelector("#difficulty-select").addEventListener("change", (e) => {
    state.difficulty = e.target.value;
    localStorage.setItem(DIFFICULTY_KEY, state.difficulty);
  });

  document.querySelector("#new-game").addEventListener("click", () => {
    document.querySelector("#new-game").classList.add("is-spinning");
    newGame();
  });

  document.querySelector(".pad").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-num]");
    if (!btn || !state.selected) return;
    const num = Number(btn.dataset.num);
    const { row, col } = state.selected;
    setCell(row, col, num);
    btn.classList.remove("is-pressed");
    void btn.offsetWidth;
    btn.classList.add("is-pressed");
  });
}

function renderBoard() {
  const boardEl = document.querySelector("#board");
  if (!boardEl || !state.board) return;

  const selectedVal =
    state.selected != null
      ? state.board[state.selected.row][state.selected.col]
      : 0;

  let html = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = state.board[r][c];
      const classes = ["cell"];
      if (state.fixed[r][c]) classes.push("cell--fixed");
      if (val && !state.fixed[r][c]) classes.push("cell--user");
      if (state.selected?.row === r && state.selected?.col === c) {
        classes.push("cell--selected");
      } else if (state.selected) {
        const sr = state.selected.row;
        const sc = state.selected.col;
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
      if (val && conflictsAt(state.board, r, c)) classes.push("cell--conflict");
      if ((c + 1) % 3 === 0 && c < 8) classes.push("cell--box-r");
      if ((r + 1) % 3 === 0 && r < 8) classes.push("cell--box-b");
      if (state.won) classes.push("cell--won");

      html += `<button type="button" class="${classes.join(" ")}" role="gridcell" data-r="${r}" data-c="${c}" aria-label="Row ${r + 1} column ${c + 1}${val ? `, ${val}` : ", empty"}">${val || ""}</button>`;
    }
  }
  boardEl.innerHTML = html;

  boardEl.querySelectorAll(".cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      selectCell(Number(cell.dataset.r), Number(cell.dataset.c));
    });
  });
}

function updateStatus() {
  const status = document.querySelector("#status");
  if (!status) return;
  if (state.won) {
    status.textContent = "Solved — nice work.";
    status.classList.add("status--win");
    document.querySelector(".board-wrap")?.classList.add("is-won");
  } else {
    const filled = state.board.flat().filter(Boolean).length;
    status.textContent = `${filled} of 81 filled · tap a cell, then a number`;
    status.classList.remove("status--win");
    document.querySelector(".board-wrap")?.classList.remove("is-won");
  }
}

function onKeydown(e) {
  if (!state.selected) return;
  const { row, col } = state.selected;

  if (e.key >= "1" && e.key <= "9") {
    setCell(row, col, Number(e.key));
    return;
  }
  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    clearSelectionValue();
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
}

applyTheme(state.themeId);
window.addEventListener("keydown", onKeydown);
newGame();
