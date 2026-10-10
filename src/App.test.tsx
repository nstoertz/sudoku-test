// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const cells = () =>
  Array.from(container.querySelectorAll<HTMLButtonElement>(".board .cell"));
const cellAt = (row: number, col: number) => cells()[row * 9 + col];

async function waitForBoard() {
  for (let i = 0; i < 100; i++) {
    if (cells().length === 81 && !cells()[0].disabled) return;
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
  throw new Error("board never became ready");
}

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("cell selection highlight", () => {
  beforeEach(async () => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<App />));
    await waitForBoard();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("moves DOM focus with keyboard selection after a mouse click", () => {
    const clicked = cellAt(4, 4);
    act(() => {
      clicked.focus();
      clicked.click();
    });
    expect(document.activeElement).toBe(clicked);

    press("ArrowRight");
    press("ArrowRight");
    press("ArrowDown");

    const target = cellAt(5, 6);
    expect(container.querySelectorAll(".cell--selected")).toHaveLength(1);
    expect(target.classList.contains("cell--selected")).toBe(true);
    expect(document.activeElement).toBe(target);
    expect(clicked.classList.contains("cell--selected")).toBe(false);
  });

  it("suppresses hover styling during keyboard navigation until the pointer moves", () => {
    const board = container.querySelector(".board")!;
    act(() => cellAt(0, 0).click());

    press("ArrowDown");
    expect(board.classList.contains("board--keyboard")).toBe(true);

    act(() => {
      board.dispatchEvent(new Event("pointermove", { bubbles: true }));
    });
    expect(board.classList.contains("board--keyboard")).toBe(false);
  });

  it("does not steal focus when focus is outside the board", () => {
    act(() => cellAt(0, 0).click());
    const newPuzzle = container.querySelector<HTMLButtonElement>(".btn--accent")!;
    act(() => newPuzzle.focus());

    press("ArrowRight");

    expect(cellAt(0, 1).classList.contains("cell--selected")).toBe(true);
    expect(document.activeElement).toBe(newPuzzle);
  });
});
