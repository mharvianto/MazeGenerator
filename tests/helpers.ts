import { expect, Page, test as base } from '@playwright/test';

/** `test` that also fails on any uncaught error in the page. */
export const test = base.extend({
	page: async ({ page }, use) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await use(page);
		expect(errors, 'uncaught page errors').toEqual([]);
	}
});

export { expect };

export const ALGORITHMS = { bfs: '0', dfs: '1', prim: '2', kruskal: '3' } as const;

export interface Settings {
	algorithm?: (typeof ALGORITHMS)[keyof typeof ALGORITHMS];
	random?: boolean;
	bridge?: number;
	size?: number;
	speed?: number;
}

/**
 * Apply settings, seed Math.random and press Reset, all in one synchronous call.
 * The maze from page load keeps consuming random numbers, so seeding in a separate
 * call would race it. Controls are set directly because on narrow screens they
 * sit in a closed panel.
 */
export async function generate(page: Page, settings: Settings = {}, seed = 1, wait = true): Promise<void> {
	await page.evaluate(
		({ s, seed }) => {
			const $ = (id: string) => document.querySelector(id) as HTMLInputElement;
			if (s.size !== undefined) $('#sizetxt').value = String(s.size);
			if (s.algorithm !== undefined) $('#algotxt').value = s.algorithm;
			if (s.random !== undefined) $('#randomtxt').checked = s.random;
			if (s.bridge !== undefined) $('#bridgetxt').value = String(s.bridge);
			$('#speedtxt').value = String(s.speed ?? 100);
			$('#speedtxt').dispatchEvent(new Event('input'));
			// mulberry32
			let state = seed >>> 0;
			Math.random = () => {
				state = (state + 0x6d2b79f5) >>> 0;
				let t = state;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
			$('#resetbtn').click();
		},
		{ s: settings, seed }
	);
	if (wait) await waitForIdle(page);
}

/** Wait until the canvas stops changing (generation and bridges are done). */
export async function waitForIdle(page: Page): Promise<void> {
	let previous = '';
	for (let same = 0; same < 3; ) {
		await page.waitForTimeout(150);
		const current = await page.evaluate(() => document.querySelector('canvas')!.toDataURL());
		same = current === previous ? same + 1 : 0;
		previous = current;
	}
}

/**
 * Read the maze back from the canvas as text, one string per row: '#' wall,
 * ' ' open, '+' bridge, '@' player. Reads the center pixel of every square, so
 * call it while no path is drawn over the maze.
 */
export function readMaze(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const canvas = document.querySelector('canvas')!;
		const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
		const size = Math.round(parseInt((document.querySelector('#sizetxt') as HTMLInputElement).value) * devicePixelRatio);
		const cols = Math.floor(canvas.width / size);
		const rows = Math.floor(canvas.height / size);
		const ox = Math.floor((canvas.width - cols * size) / 2);
		const oy = Math.floor((canvas.height - rows * size) / 2);
		const lines: string[] = [];
		for (let y = 0; y < rows; y++) {
			let line = '';
			for (let x = 0; x < cols; x++) {
				const i = ((oy + y * size + (size >> 1)) * canvas.width + ox + x * size + (size >> 1)) * 4;
				const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
				if (a === 0) line += '#';
				else if (r === 0x6c && g === 0x8c && b === 0xff) line += '@';
				else if (r === 0xff && g === 0xb8 && b === 0x6b) line += '+';
				else line += ' ';
			}
			lines.push(line);
		}
		return lines;
	});
}

export interface MazeStats {
	cells: number;
	openCells: number;
	/** Open wall squares, i.e. passages between two cells. */
	passages: number;
	bridges: number;
	deadEnds: number;
	connected: boolean;
}

/** Graph facts about a maze read by `readMaze`. Cells sit at odd coordinates. */
export function analyze(lines: string[]): MazeStats {
	const rows = lines.length;
	const cols = lines[0].length;
	const isOpen = (x: number, y: number) => y >= 0 && y < rows && x >= 0 && x < cols && lines[y][x] !== '#';
	const neighbors = (x: number, y: number): [number, number][] => [
		[x + 1, y],
		[x - 1, y],
		[x, y + 1],
		[x, y - 1]
	];
	const stats: MazeStats = { cells: 0, openCells: 0, passages: 0, bridges: 0, deadEnds: 0, connected: false };
	let openSquares = 0;
	let start: [number, number] | undefined;
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const cell = x % 2 === 1 && y % 2 === 1 && x <= cols - 2 && y <= rows - 2;
			if (cell) stats.cells++;
			if (!isOpen(x, y)) continue;
			openSquares++;
			start ??= [x, y];
			if (lines[y][x] === '+') stats.bridges++;
			if (cell) {
				stats.openCells++;
				if (neighbors(x, y).filter(([nx, ny]) => isOpen(nx, ny)).length === 1) stats.deadEnds++;
			} else if ((x + y) % 2 === 1) stats.passages++;
		}
	}
	// Flood fill from one open square must reach all of them.
	const seen = new Set<string>();
	const queue = start ? [start] : [];
	while (queue.length) {
		const [x, y] = queue.pop()!;
		if (seen.has(`${x},${y}`)) continue;
		seen.add(`${x},${y}`);
		for (const [nx, ny] of neighbors(x, y)) if (isOpen(nx, ny)) queue.push([nx, ny]);
	}
	stats.connected = seen.size === openSquares;
	return stats;
}

/** The grid square the player marker is in. Works even with a path drawn on top. */
export function playerSquare(page: Page): Promise<{ x: number; y: number }> {
	return page.evaluate(() => {
		const canvas = document.querySelector('canvas')!;
		const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
		const size = Math.round(parseInt((document.querySelector('#sizetxt') as HTMLInputElement).value) * devicePixelRatio);
		const ox = Math.floor((canvas.width - Math.floor(canvas.width / size) * size) / 2);
		const oy = Math.floor((canvas.height - Math.floor(canvas.height / size) * size) / 2);
		for (let i = 0; i < data.length; i += 4) {
			if (data[i] === 0x6c && data[i + 1] === 0x8c && data[i + 2] === 0xff) {
				const p = i / 4;
				return { x: Math.floor(((p % canvas.width) - ox) / size), y: Math.floor((Math.floor(p / canvas.width) - oy) / size) };
			}
		}
		throw new Error('player marker not found');
	});
}

/** Viewport coordinates of the center of grid square (x, y). */
export function squareCenter(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
	return page.evaluate(
		({ x, y }) => {
			const canvas = document.querySelector('canvas')!;
			const rect = canvas.getBoundingClientRect();
			const scale = canvas.width / rect.width;
			const size = Math.round(parseInt((document.querySelector('#sizetxt') as HTMLInputElement).value) * devicePixelRatio);
			const ox = Math.floor((canvas.width - Math.floor(canvas.width / size) * size) / 2);
			const oy = Math.floor((canvas.height - Math.floor(canvas.height / size) * size) / 2);
			return { x: rect.left + (ox + x * size + size / 2) / scale, y: rect.top + (oy + y * size + size / 2) / scale };
		},
		{ x, y }
	);
}

/** Number of canvas pixels in the hover-path color. */
export function pathPixels(page: Page): Promise<number> {
	return page.evaluate(() => {
		const canvas = document.querySelector('canvas')!;
		const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
		let n = 0;
		for (let i = 0; i < data.length; i += 4) if (data[i] === 0xff && data[i + 1] === 0x6b && data[i + 2] === 0x81) n++;
		return n;
	});
}

/** An open cell at least `distance` cells (Manhattan) away from `from`. */
export function farCell(lines: string[], from: { x: number; y: number }, distance = 6): { x: number; y: number } {
	for (let y = lines.length - 2; y > 0; y -= 1) {
		for (let x = lines[0].length - 2; x > 0; x -= 1) {
			if (x % 2 === 1 && y % 2 === 1 && lines[y][x] !== '#' && Math.abs(x - from.x) + Math.abs(y - from.y) >= distance * 2)
				return { x, y };
		}
	}
	throw new Error('no far cell');
}
