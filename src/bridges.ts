import { Grid, Point } from './grid';
import { bfs } from './pathfinding';
import { Weights } from './weights';

// A bridge closing a loop shorter than this (in grid squares) would just make a
// small 2x2 room, so dead-end-to-dead-end bridges must be at least this long.
const MIN_LOOP = 12;

/**
 * Walks every cell once and, at `percent`% of dead ends, knocks out one more wall
 * to create a loop.
 */
export class Bridges {
	/** Wall squares knocked out so far. */
	readonly walls: Point[] = [];
	private readonly stack: Point[];
	private readonly queued: Uint8Array;

	constructor(
		private readonly grid: Grid,
		private readonly weights: Weights,
		private readonly percent: number,
		start: Point
	) {
		this.queued = new Uint8Array(grid.width * grid.height);
		this.queued[grid.index(start.x, start.y)] = 1;
		this.stack = [start];
	}

	/** Visit the next cell. Returns it, or undefined once every cell is visited. */
	step(): Point | undefined {
		const { grid } = this;
		const cell = this.stack.pop();
		if (!cell) return undefined;
		for (const n of grid.cellNeighbors(cell)) {
			const k = grid.index(n.x, n.y);
			if (this.queued[k]) continue;
			this.queued[k] = 1;
			this.stack.push(n);
		}
		if (grid.isDeadEnd(cell) && this.weights.chance(this.percent)) this.bridge(cell);
		return cell;
	}

	// Prefer joining another dead end (removes two at once), but only if the loop is
	// long enough; otherwise take the wall that closes the longest loop.
	private bridge(cell: Point): void {
		const { grid } = this;
		const options = grid
			.cellNeighbors(cell)
			.filter((n) => !grid.isOpen(n.fx, n.fy))
			.map((n) => ({ ...n, w: this.weights.next(), d: 0 }));
		if (!options.length) return;
		// The path length to the other side is the length of the loop the bridge would close.
		const dist = bfs(grid, cell, options);
		for (const o of options) {
			const d = dist[grid.index(o.x, o.y)];
			o.d = d < 0 ? Infinity : d;
		}
		const ends = options.filter((o) => grid.isDeadEnd(o) && o.d >= MIN_LOOP);
		const pick = (ends.length ? ends : options).reduce((best, o) =>
			o.d > best.d || (o.d === best.d && o.w < best.w) ? o : best
		);
		grid.open(pick.fx, pick.fy);
		this.walls.push({ x: pick.fx, y: pick.fy });
	}
}
