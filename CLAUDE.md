# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Vite dev server on `0.0.0.0:5173`
- `npm run build`: type-check (`tsc --noEmit`, which also covers `tests/`), then production build to `dist/`
- `npm run preview`: serve the built `dist/`
- `npm test`: Playwright suite in Chromium. It starts its own Vite server on port 5174.
- `npx playwright test tests/generation.spec.ts` runs one file, and `npx playwright test -g "dfs builds"` runs tests matching a title.
- `npx playwright test --update-snapshots`: rewrite the maze snapshots, only when a change is meant to alter which maze a seed produces.

There is no linter. Chromium lives outside the repo, so after a container rebuild run `npx playwright install --with-deps chromium` again.

## Tests

`tests/helpers.ts` drives the app purely through the DOM and canvas pixels, with no test hooks in the app:

- `generate()` sets the controls, seeds `Math.random` and clicks Reset in one `page.evaluate`. A separate seed call would race the maze running from page load.
- `readMaze()` turns the canvas into ASCII (`#` wall, `+` bridge, `@` player). It reads square centers, so call it while no hover path is drawn.
- `analyze()` checks graph facts: spanning tree (`passages === cells - 1`, connected) and dead ends.

`generation.spec.ts` runs at a 600px-wide viewport, so the phone navbar has a font-independent height and the grid size, and with it the text snapshots in `tests/__snapshots__/`, is the same on every machine. Those snapshots pin the exact generation order, so a refactor that changes any `Math.random`/`Weights` call order fails them.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy-pages.yml`, which runs `npm ci`, `npm test` and `npm run build` on Node 24 and publishes `dist/` to GitHub Pages at https://mharvianto.github.io/MazeGenerator/. A failing test blocks the deploy, and the HTML report is uploaded as an artifact. Pull requests run `.github/workflows/test.yml`. `vite.config.ts` sets `base: './'` so asset paths work under the repo subpath.

## Architecture

A single-page canvas app. `index.html` holds the UI controls, and `index.html` loads `/src/maze.js`, which Vite resolves to `src/maze.ts`, the entry point. The `src/` modules:

- `grid.ts`: `Grid` with flat `Uint8Array` squares, plus `Point`/`Edge` types. Cells sit at odd coordinates, and the squares between them are walls. An `Edge` is a cell plus the wall `(fx, fy)` that connects it to the cell it was reached from.
- `containers.ts`: `Queue`, `Stack` and `PriorityQueue` behind one `Container` interface. `ordered()` returns items in pop order, which Color priority uses.
- `generators.ts`: `createGenerator()` maps the Algorithm dropdown value to a `Generator`. BFS, DFS and Prim's are one `FrontierGenerator` with different containers. DFS passes `revisit`, so a cell can be queued once per neighbor and the newest entry wins. BFS and Prim's queue each cell once, and for BFS the result is the same either way. `KruskalGenerator` uses union-find and draws no frontier.
- `weights.ts`: `Weights` provides all generation and bridge randomness (`next()`, `chance()`). With Random off it yields a counter instead, so the order is deterministic. Only the start cell (`Grid.randomCell`) always uses `Math.random`.
- `bridges.ts`: the Bridge phase. It walks every cell and, at a percentage of dead ends, opens one more wall. It prefers joining another dead end if the loop is at least `MIN_LOOP` squares, and otherwise the longest loop.
- `pathfinding.ts`: `bfs()` computes distances (optionally stopping once given targets are reached), and `routeTo()` walks back down the distance gradient.
- `renderer.ts`: canvas drawing (`square`, `line`), the `COLORS` palette and `rankColor`. `resize()` sizes the canvas in device pixels (`size` is device px per square) and centers the grid. Convert pointer positions with `squareAt()`, never by dividing CSS pixels by `size`.
- `ticker.ts`: `Ticker` runs one step function on `setInterval`. It maps the speed slider to a delay plus steps per tick, restarts itself on speed changes, and skips steps while paused.
- `maze.ts`: `App` wires the DOM and runs the phases `generate`, then `bridge` (skipped at 0%), then `play`. Each step function stops the ticker and starts the next phase when its source runs dry. Arrow keys/WASD call `App.step()`, which moves the player one cell (skipped while a form control has focus). Input uses pointer events: a mouse previews on hover and walks on click, while touch previews on drag and walks on lift. On narrow screens (≤760px) the navbar `.controls` become a drop-down panel. Resize only resets the maze on width changes or large height changes, so mobile URL bars and keyboards don't wipe it. Step functions only update state. `Ticker` calls `App.redraw()` once per tick, after all of that tick's steps, and `drawMaze`/`drawPlay` redraw the whole scene.

Generation order must stay exactly as is: every `Math.random`/`Weights` call, in order, determines the maze. The generation snapshots enforce this.
