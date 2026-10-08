import { Container, PriorityQueue, Queue, Stack } from './containers';
import { Edge, Grid, Point } from './grid';
import { Weights } from './weights';

type WeightedEdge = Edge & { w: number };

const byWeight = (a: WeightedEdge, b: WeightedEdge): boolean => a.w < b.w;

export interface Generator {
	/** Carve the next passage. Returns the cell it reached, or undefined once the maze is done. */
	step(): Point | undefined;
	/** Pending frontier entries (cell plus wall), in pop order if `ordered`. */
	frontier(ordered: boolean): readonly Edge[];
}

/**
 * BFS, DFS and Prim's: open a cell, push its unopened neighbors with random weights,
 * then pop the next one. Only the container differs.
 */
class FrontierGenerator implements Generator {
	private readonly queued: Uint8Array;

	constructor(
		private readonly grid: Grid,
		private readonly weights: Weights,
		private readonly container: Container<WeightedEdge>,
		start: Point
	) {
		this.queued = new Uint8Array(grid.width * grid.height);
		this.carve({ ...start, fx: start.x, fy: start.y });
	}

	step(): Point | undefined {
		const edge = this.container.pop();
		if (edge) this.carve(edge);
		return edge;
	}

	frontier(ordered: boolean): readonly Edge[] {
		return ordered ? this.container.ordered() : this.container.items();
	}

	private carve(edge: Edge): void {
		const { grid, weights } = this;
		if (grid.isOpen(edge.x, edge.y)) return;
		grid.open(edge.x, edge.y);
		grid.open(edge.fx, edge.fy);
		// Shuffle the neighbors by weight, then push them heaviest first.
		const moves = grid
			.cellNeighbors(edge)
			.map((n) => ({ ...n, w: weights.next() }))
			.sort((a, b) => a.w - b.w);
		for (let i = moves.length - 1; i >= 0; i--) {
			const move = moves[i];
			const k = grid.index(move.x, move.y);
			if (this.queued[k] || grid.isOpen(move.x, move.y)) continue;
			this.queued[k] = 1;
			this.container.push({ ...move, w: weights.next() });
		}
	}
}

/**
 * Kruskal's: every wall between two cells gets a random weight, and walls are taken
 * lightest first. Union-find rejects walls whose two cells are already connected.
 */
class KruskalGenerator implements Generator {
	private readonly walls = new PriorityQueue<WeightedEdge>(byWeight);
	private readonly parent: Int32Array;

	constructor(
		private readonly grid: Grid,
		weights: Weights
	) {
		const { width, height } = grid;
		this.parent = Int32Array.from({ length: width * height }, (_, i) => i);
		for (let x = 1; x < width - 1; x += 2) {
			for (let y = 1; y < height - 1; y += 2) {
				if (x + 2 < width - 1) this.walls.push({ x: x + 2, y, fx: x + 1, fy: y, w: weights.next() });
				if (y + 2 < height - 1) this.walls.push({ x, y: y + 2, fx: x, fy: y + 1, w: weights.next() });
			}
		}
	}

	step(): Point | undefined {
		// Skip rejected walls within one step so the animation never stalls.
		let wall: WeightedEdge | undefined;
		while ((wall = this.walls.pop()) && !this.join(wall));
		return wall;
	}

	// The frontier is every remaining wall, which would just cover the screen.
	frontier(): readonly Edge[] {
		return [];
	}

	private find(i: number): number {
		const { parent } = this;
		while (parent[i] !== i) i = parent[i] = parent[parent[i]];
		return i;
	}

	private join(wall: Edge): boolean {
		const { grid } = this;
		const ox = 2 * wall.fx - wall.x;
		const oy = 2 * wall.fy - wall.y;
		const a = this.find(grid.index(wall.x, wall.y));
		const b = this.find(grid.index(ox, oy));
		if (a === b) return false;
		this.parent[a] = b;
		grid.open(wall.x, wall.y);
		grid.open(wall.fx, wall.fy);
		grid.open(ox, oy);
		return true;
	}
}

/** `algorithm` is the value of the Algorithm dropdown. */
export function createGenerator(algorithm: string, grid: Grid, weights: Weights, start: Point): Generator {
	switch (algorithm) {
		case '0':
			return new FrontierGenerator(grid, weights, new Queue(), start);
		case '1':
			return new FrontierGenerator(grid, weights, new Stack(), start);
		case '3':
			return new KruskalGenerator(grid, weights);
		default:
			return new FrontierGenerator(grid, weights, new PriorityQueue(byWeight), start);
	}
}
