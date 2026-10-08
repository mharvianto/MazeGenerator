export interface Point {
	x: number;
	y: number;
}

/** A cell plus the wall square (fx, fy) between it and the cell it is reached from. */
export interface Edge extends Point {
	fx: number;
	fy: number;
}

/** The four squares next to `p`: right, left, down, up. */
export const adjacent = ({ x, y }: Point): Point[] => [
	{ x: x + 1, y },
	{ x: x - 1, y },
	{ x, y: y + 1 },
	{ x, y: y - 1 }
];

export const samePoint = (a?: Point, b?: Point): boolean => !!a && !!b && a.x === b.x && a.y === b.y;

/**
 * The maze grid. Cells sit at odd coordinates and the squares between them are
 * walls. Building a maze means opening cells and the walls that connect them.
 */
export class Grid {
	private readonly squares: Uint8Array;

	constructor(
		readonly width: number,
		readonly height: number
	) {
		this.squares = new Uint8Array(width * height);
	}

	index(x: number, y: number): number {
		return x * this.height + y;
	}

	isOpen(x: number, y: number): boolean {
		return x >= 0 && y >= 0 && x < this.width && y < this.height && this.squares[this.index(x, y)] === 1;
	}

	open(x: number, y: number): void {
		this.squares[this.index(x, y)] = 1;
	}

	forEachOpen(fn: (p: Point) => void): void {
		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				if (this.squares[this.index(x, y)]) fn({ x, y });
			}
		}
	}

	/** Inside the outer border, where cells and passages can be. */
	isInterior({ x, y }: Point): boolean {
		return x > 0 && y > 0 && x < this.width - 1 && y < this.height - 1;
	}

	/** A cell with exactly one open wall. */
	isDeadEnd(p: Point): boolean {
		return adjacent(p).filter((n) => this.isOpen(n.x, n.y)).length === 1;
	}

	/** Cells two squares away (left, up, right, down) with the wall in between. */
	cellNeighbors({ x, y }: Point): Edge[] {
		const n: Edge[] = [];
		if (x - 2 > 0) n.push({ x: x - 2, y, fx: x - 1, fy: y });
		if (y - 2 > 0) n.push({ x, y: y - 2, fx: x, fy: y - 1 });
		if (x + 2 < this.width - 1) n.push({ x: x + 2, y, fx: x + 1, fy: y });
		if (y + 2 < this.height - 1) n.push({ x, y: y + 2, fx: x, fy: y + 1 });
		return n;
	}

	randomCell(): Point {
		return {
			x: Math.floor(Math.random() * ((this.width - 2) / 2)) * 2 + 1,
			y: Math.floor(Math.random() * ((this.height - 2) / 2)) * 2 + 1
		};
	}
}
