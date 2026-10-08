# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on `0.0.0.0:5173`
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/`
- `npx tsc --noEmit` — type-check (not part of the build; Vite strips types without checking)

There is no test suite or linter. To check UI changes in a real browser, use `playwright` (a devDependency) as a library from a scratch script against `npm run dev`. Chromium lives outside the repo, so after a container rebuild run `npx playwright install --with-deps chromium` again. `test.cpp` is a standalone C++ prototype of the Dijkstra/maze logic, not wired into anything.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy-pages.yml`, which runs `npm ci && npm run build` on Node 24 and publishes `dist/` to GitHub Pages at https://mharvianto.github.io/MazeGenerator/. `vite.config.ts` sets `base: './'` so asset paths work under the repo subpath.

## Architecture

A single-page canvas app: `index.html` holds the UI controls (size, algorithm, speed, reset, pause), and all logic is in one IIFE in `src/maze.ts`. `index.html` loads it as `/src/maze.js`; Vite resolves this to the `.ts` file.

**Grid model.** `map[x][y]` is a 2D grid where 1 means open. Cells sit at odd coordinates, and the even coordinates between them are walls or passages. Moves step by 2, and `fx/fy` on a node is the wall cell between it and its parent, which gets carved open.

**Generation is one algorithm with interchangeable frontiers.** `addMaze` pushes randomly weighted neighbors into `pq`, and `start()` picks the container from the dropdown: `Queue` (BFS), `Stack` (DFS) or `PriorityQueue` on random weights (Prim's). All three share the `QueueInterface` shape. Kruskal's (`kruskal` flag) is the exception: `initKruskal` fills a `PriorityQueue` with every wall at random weights, and `renderView` calls `joinKruskal` (union-find via `parent`/`find`) instead of `addMaze`. In that mode `drawMaze` doesn't draw the frontier in red. All weights come from `rand()`. With the Random checkbox off, it returns an increasing counter (`seq`) instead, so the order is deterministic. The start position stays random either way. Each container also implements `ordered()`, which returns its items in pop order (a sorted copy for `PriorityQueue`). With the Color priority checkbox on, `drawMaze` colors the frontier by that rank via `rankColor`. The checkbox calls `obj.redraw()` so it applies without a reset.

**Three-phase state machine driven by `run(step)`**, tracked in `obj.st`. `run` wraps `setInterval`, and `updateSpeed` maps the slider to `delay` plus `stepsPerTick`, so fast speeds run several steps per tick:
0. `renderView`: pop the frontier and carve until it is empty
1. `floodFillStep`: walk the maze and, at dead ends (exactly one open neighbor), maybe knock out one extra wall to create a loop (drawn orange via `cycle`). The Bridge slider sets the percentage via `chance()`. Among the closed walls, `fill` prefers another dead end whose loop is at least `MIN_LOOP` squares, and otherwise the longest loop. `pathLengths` measures loops by BFS. This phase is skipped at 0%.
2. Interactive: `dijkstra` computes `distance[][]` from the player's position (blue). Hovering draws the shortest path via `pathMove`, which descends the distance gradient. Clicking animates the player along it with `moveNode`.

Each phase stops its own interval, increments `st` and starts the next one. Inside a tick, `run` stops looping as soon as `interval` changes. `obj.stop()` resets it to 0, and the next phase's `run` replaces it. The speed slider handler restarts the step function indexed by `st`, so a new phase must be added there as well. Pause is a global flag that every step function checks. Window resize triggers a full reset.

Rendering is immediate-mode: `drawMaze` clears and redraws the whole grid every tick.
