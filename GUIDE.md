# MazeGenerator Guide

MazeGenerator builds mazes in the browser as an animation. You can watch, step by step, how each algorithm builds a maze, and then use the mouse to find the shortest path through it.

Try it online: **https://mharvianto.github.io/MazeGenerator/**

---

## How to use it

### Navbar controls

| Control | What it does |
| --- | --- |
| **Size** | Size of one cell in pixels (5–40). A larger value means bigger cells and **fewer** cells on screen. |
| **Algorithm** | The maze generation algorithm: BFS, DFS, Prim's or Kruskal's. See the explanations [below](#maze-generation-algorithms). |
| **Random** | When on, the generation order is random. When off, the order is fixed and the pattern is regular. |
| **Bridge** | When on, some dead ends are knocked through so the maze has loops (orange cells). When off, the maze is "perfect": there is exactly one path between any two points. |
| **Color order** | Colors open passages by when they were carved: teal first, through green, to yellow last. Shows each algorithm's priority order. Takes effect immediately, without Reset. |
| **Speed** | Animation speed. Slide right to go faster (about 2 to 2000 steps per second). Takes effect while you slide. |
| **Reset** | Generates a new maze with the current settings. |
| **Pause / Play** | Pauses or resumes the animation. |

> **Important:** changes to **Size, Algorithm, Random** and **Bridge** only take effect after you press **Reset**. Resizing the browser window also generates a new maze automatically.

### Workflow

1. **Maze generation.** The maze is built step by step from a random starting point.
2. **Bridge creation** (when Bridge is on). The program walks the whole maze and knocks out one wall at each dead end.
3. **Interactive mode.** Once the maze is done:
   - **Hover** over a cell. The shortest path from the player (blue square) to that cell is drawn as a red line.
   - **Click** the cell. The player moves along that path, and the remaining route is shown in green.

### Colors

| Color | Meaning |
| --- | --- |
| White | Open passage (with **Color order** on: teal → yellow, by carving order) |
| Pink (square) | *Frontier*: cells waiting to be processed (not shown for Kruskal's) |
| Blue | The cell being processed, or the player's position in interactive mode |
| Orange | *Bridge*: an extra wall knocked out to create a loop |
| Red (line) | Shortest path to the mouse position |
| Green (line) | Remaining route while the player is moving |

---

## How the maze is represented

The screen is divided into a grid. Walkable cells sit at **odd** coordinates, and the squares between them are **walls**. Building a maze means choosing which walls to knock out to connect neighboring cells.

```
# # # # # # #        # = wall
# o   o # o #        o = cell (odd coordinates)
#   #   #   #          (space) = wall that has been knocked out
# o # o   o #
# # # # # # #
```

All four algorithms produce a **spanning tree**: every cell is connected, and there are no loops. Loops only appear when **Bridge** is on.

---

## Maze generation algorithms

The first three algorithms (BFS, DFS and Prim's) all work the same way:

1. Open the starting cell, then add its unopened neighbors to the **frontier**.
2. Take one cell from the frontier, open it along with the wall connecting it to the cell it came from, then add its unopened neighbors to the frontier.
3. Repeat until the frontier is empty.

The only difference between the three is **which cell is taken from the frontier**, which depends on the data structure used.

### Breadth-first search (BFS)

- **Frontier:** a *queue* (FIFO). The cell that has waited longest is taken first.
- **Result:** the maze grows evenly in every direction from the starting point, like a wave. Paths tend to be short, with many branches near the start.

### Depth-first search (DFS)

- **Frontier:** a *stack* (LIFO). The most recently added cell is taken first.
- **Result:** the maze runs far in one direction before turning back, creating **long corridors** with few branches. These mazes usually feel the hardest.

### Prim's

- **Frontier:** a *priority queue*. Each frontier cell gets a random weight, and the one with the smallest weight is taken first.
- **Result:** the maze grows outward from the start in random directions, with many short branches and dead ends. This is a randomized version of Prim's *minimum spanning tree* algorithm.

### Kruskal's

Kruskal's doesn't grow the maze from a single point.

1. Every wall between two cells gets a random weight, and all of them go into a priority queue.
2. Walls are taken one at a time, smallest weight first. If the two cells on either side are **not yet connected**, the wall is knocked out. If they already are, the wall is skipped so no loop forms.
3. The "connected or not" check uses a **union-find** (*disjoint set*) data structure, which keeps it fast.

- **Result:** many small maze fragments appear all over the screen at once, then gradually merge into one. The texture is similar to Prim's: lots of short branches.

> **Tip:** turn on **Color order** to compare algorithms. BFS shows even rings around the start, DFS shows one long gradient along its corridor, Prim's shows blotches spreading from the start, and Kruskal's mixes colors everywhere.

### Summary

| Algorithm | Data structure | How it grows | Maze character |
| --- | --- | --- | --- |
| BFS | Queue | Evenly from the start | Short paths, many branches near the start |
| DFS | Stack | Runs far, then backtracks | Long corridors, few branches |
| Prim's | Priority queue (random weights) | From the start in random directions | Many short branches and dead ends |
| Kruskal's | Priority queue + union-find | Everywhere at once | Similar to Prim's |

### When Random is off

All random weights are replaced with a sequence number, so neighbors and walls are always processed in the same order:

- **BFS:** spreads from the start in a regular pattern.
- **DFS:** becomes a long winding corridor that always tries the same direction first.
- **Prim's:** produces **exactly the same maze as BFS**, because without random weights Prim's always takes the cell that has waited longest.
- **Kruskal's:** walls are processed in order from top-left to bottom-right, producing a comb-like pattern.

The starting position **stays random**, so the maze can still differ on each Reset.

---

## Bridge: creating loops

When **Bridge** is on, the program walks every cell once the maze is finished. At each **dead end**, meaning a cell with only one way out, it knocks out one other wall at random into a neighboring cell. These knocked-out walls are marked **orange**.

The result is no longer a tree: there is more than one path between two points, and there are far fewer dead ends.

---

## Shortest path finding

In interactive mode, the program computes the **distance from the player to every cell** using **Dijkstra's algorithm**. Since every step has the same weight (1), the result is the same as BFS.

When you hover over a cell, the path is traced from the target cell by always stepping to a neighbor with a smaller distance, until it reaches the player. This path is guaranteed to be the shortest, including when there are bridges. Each time the player moves, the distances are recomputed from the new position.

---

## Running locally

Requires Node.js (CI uses version 24).

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build
```

Every push to the `master` branch is deployed to GitHub Pages automatically. See [README.md](README.md) for the one-time setup.
