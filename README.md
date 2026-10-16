# Sudoku

Playable single-page Sudoku in the browser (Vite + React + TypeScript), with a config-driven theme picker.

The Python checker/solver (`sudoku.py`) is separate and unused by the web app.

## Requirements

Node.js **20.19+** or **22.12+** (Vite 8).

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Build / test

```bash
npm run build
npm run preview   # optional: serve the production build
npm test          # sudoku generator / validator unit tests
```

## Themes

Themes live in [`src/themes.ts`](src/themes.ts) as one exported `themes` array. Adding a theme is mostly appending an object with `id`, `name`, `fonts`, and CSS `vars` (colors + atmosphere).

Included themes: **Rainbows**, **Unicorns**, **Basketball**, **Chess**, **Taiwan**.

## Sounds

Entry feedback uses Web Audio (no sound files): a soft chime for a valid place, a low buzz for a conflict, and a short arpeggio on win. Toggle **Sound** in the controls (persisted in `localStorage`).
