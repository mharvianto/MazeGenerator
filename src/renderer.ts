import { Point } from './grid';

// Canvas palette, matched to the CSS theme in index.html.
export const COLORS = {
	path: '#e6e9f2',
	frontier: '#ff6b81',
	loop: '#ffb86b',
	player: '#6c8cff',
	route: '#4ade80'
};

/** Gradient over the frontier's pop order: yellow is popped next, magenta last. */
export function rankColor(rank: number, count: number): string {
	const t = count > 1 ? rank / (count - 1) : 0;
	return `hsl(${55 - 105 * t}, 100%, ${70 - 15 * t}%)`;
}

/** Draws grid squares and paths on the canvas, `size` device pixels per square. */
export class Renderer {
	size = 20;
	private readonly ctx: CanvasRenderingContext2D;
	/** Offset that centers the grid in the canvas. */
	private ox = 0;
	private oy = 0;

	constructor(private readonly canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

	/**
	 * Fill `cssWidth` x `cssHeight` at the screen's pixel density, so the maze stays
	 * crisp on high-DPI phones. Returns the grid size in squares.
	 */
	resize(cssWidth: number, cssHeight: number, cellSize: number): { width: number; height: number } {
		const { canvas } = this;
		const dpr = window.devicePixelRatio || 1;
		canvas.style.width = `${cssWidth}px`;
		canvas.style.height = `${cssHeight}px`;
		canvas.width = Math.round(cssWidth * dpr);
		canvas.height = Math.round(cssHeight * dpr);
		// Whole device pixels per square, so neighboring squares never leave seams.
		this.size = Math.max(1, Math.round(cellSize * dpr));
		const width = Math.floor(canvas.width / this.size);
		const height = Math.floor(canvas.height / this.size);
		this.ox = Math.floor((canvas.width - width * this.size) / 2);
		this.oy = Math.floor((canvas.height - height * this.size) / 2);
		return { width, height };
	}

	/** The grid square under a pointer event. */
	squareAt(e: MouseEvent): Point {
		const rect = this.canvas.getBoundingClientRect();
		const scale = this.canvas.width / rect.width;
		return {
			x: Math.floor(((e.clientX - rect.left) * scale - this.ox) / this.size),
			y: Math.floor(((e.clientY - rect.top) * scale - this.oy) / this.size)
		};
	}

	clear(): void {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	/** Fill one grid square; `marker` draws it slightly smaller (player, hover target). */
	square(p: Point, color: string, marker = false): void {
		const { size } = this;
		const w = marker ? size - Math.floor(size / 5) : size;
		const offset = (size - w) / 2;
		this.ctx.fillStyle = color;
		this.ctx.fillRect(this.ox + size * p.x + offset, this.oy + size * p.y + offset, w, w);
	}

	/** Stroke a line through the centers of `points`. */
	line(points: readonly Point[], color: string, extraWidth = 0): void {
		const { ctx, size } = this;
		const center = Math.floor(size / 2);
		ctx.lineWidth = Math.ceil(size / 5) + extraWidth;
		ctx.strokeStyle = color;
		ctx.beginPath();
		for (const p of points) ctx.lineTo(this.ox + p.x * size + center, this.oy + p.y * size + center);
		ctx.stroke();
	}
}
