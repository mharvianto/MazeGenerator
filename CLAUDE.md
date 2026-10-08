# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on `0.0.0.0:5173`
- `npm run build`: type-check (`tsc --noEmit`), then production build to `dist/`
- `npm run preview` — serve the built `dist/`
- `npx tsc --noEmit`: type-check only (Vite itself strips types without checking)

There is no test suite or linter. To check UI changes in a real browser, use `playwright` (a devDependency) as a library from a scratch script against `npm run dev`. Chromium lives outside the repo, so after a container rebuild run `npx playwright install --with-deps chromium` again.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy-pages.yml`, which runs `npm ci && npm run build` on Node 24 and publishes `dist/` to GitHub Pages at https://mharvianto.github.io/MazeGenerator/. `vite.config.ts` sets `base: './'` so asset paths work under the repo subpath.

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

Generation order must stay exactly as is: every `Math.random`/`Weights` call, in order, determines the maze. A refactor can be checked by seeding `Math.random` in Playwright and pixel-comparing the final canvas against the old build. Seed and click Reset in one `page.evaluate`, because the maze running from page load keeps consuming random numbers.
