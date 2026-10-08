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

/** Draws grid squares and paths on the canvas, `size` pixels per square. */
export class Renderer {
	size = 20;
	private readonly ctx: CanvasRenderingContext2D;

	constructor(private readonly canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
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
		this.ctx.fillRect(size * p.x + offset, size * p.y + offset, w, w);
	}

	/** Stroke a line through the centers of `points`. */
	line(points: readonly Point[], color: string, extraWidth = 0): void {
		const { ctx, size } = this;
		const center = Math.floor(size / 2);
		ctx.lineWidth = Math.ceil(size / 5) + extraWidth;
		ctx.strokeStyle = color;
		ctx.beginPath();
		for (const p of points) ctx.lineTo(p.x * size + center, p.y * size + center);
		ctx.stroke();
	}
}
