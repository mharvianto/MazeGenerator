/*!
 * Maze Generator
 * Author: Harvianto
 */
import { Bridges } from './bridges';
import { createGenerator, Generator } from './generators';
import { Grid, Point, samePoint } from './grid';
import { bfs, routeTo } from './pathfinding';
import { COLORS, rankColor, Renderer } from './renderer';
import { Ticker } from './ticker';
import { Weights } from './weights';

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T;

const canvas = $<HTMLCanvasElement>('canvas');
const navbar = $('#navbar');
const sizeInput = $<HTMLInputElement>('#sizetxt');
const algorithmSelect = $<HTMLSelectElement>('#algotxt');
const randomInput = $<HTMLInputElement>('#randomtxt');
const bridgeInput = $<HTMLInputElement>('#bridgetxt');
const bridgeValue = $('#bridgeval');
const orderInput = $<HTMLInputElement>('#ordertxt');
const speedInput = $<HTMLInputElement>('#speedtxt');
const resetButton = $<HTMLInputElement>('#resetbtn');
const pauseButton = $<HTMLInputElement>('#pausebtn');

/**
 * Generate: carve the maze one step at a time.
 * Bridge: walk every cell and knock out extra walls at dead ends (skipped at 0%).
 * Play: hover shows the shortest path from the player; click walks it.
 */
type Phase = 'generate' | 'bridge' | 'play';

class App {
	private readonly renderer = new Renderer(canvas);
	private readonly ticker = new Ticker();
	private phase: Phase = 'generate';
	private grid!: Grid;
	private weights!: Weights;
	private generator!: Generator;
	private bridges?: Bridges;
	private bridgePercent = 0;
	private player!: Point;
	/** The square being processed, drawn as a marker during Generate and Bridge. */
	private highlight?: Point;
	/** Distances from the player, recomputed whenever the player moves. */
	private dist!: Int32Array;
	private hover?: Point;
	private lastMouse?: Point;
	/** Squares left to walk, in order. */
	private route: Point[] = [];

	constructor() {
		canvas.addEventListener('mousemove', this.onMouseMove);
		canvas.addEventListener('mousedown', this.onMouseDown);
		canvas.addEventListener('mouseleave', this.onMouseLeave);
	}

	reset(): void {
		this.ticker.stop();
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight - navbar.offsetHeight;
		const size = parseInt(sizeInput.value);
		this.renderer.size = size;
		this.grid = new Grid(Math.floor(canvas.width / size), Math.floor(canvas.height / size));
		this.ticker.setSpeed(parseInt(speedInput.value));
		this.ticker.paused = false;
		pauseButton.value = 'Pause';
		this.player = this.grid.randomCell();
		this.weights = new Weights(randomInput.checked);
		this.bridgePercent = parseInt(bridgeInput.value);
		this.generator = createGenerator(algorithmSelect.value, this.grid, this.weights, this.player);
		this.bridges = undefined;
		this.hover = undefined;
		this.route = [];
		this.phase = 'generate';
		this.ticker.start(this.generateStep);
	}

	togglePause(): void {
		this.ticker.paused = !this.ticker.paused;
		pauseButton.value = this.ticker.paused ? 'Play' : 'Pause';
	}

	setSpeed(slider: number): void {
		this.ticker.setSpeed(slider);
	}

	redraw(): void {
		if (this.phase === 'play') this.drawPlay();
		else this.drawMaze(this.highlight);
	}

	private generateStep = (): void => {
		const cell = this.generator.step();
		if (cell) return this.drawMaze(cell);
		this.ticker.stop();
		if (this.bridgePercent > 0) {
			this.phase = 'bridge';
			this.bridges = new Bridges(this.grid, this.weights, this.bridgePercent, this.player);
			this.ticker.start(this.bridgeStep);
		} else this.enterPlay();
	};

	private bridgeStep = (): void => {
		const cell = this.bridges!.step();
		if (cell) return this.drawMaze(cell);
		this.ticker.stop();
		this.enterPlay();
	};

	private moveStep = (): void => {
		const next = this.route.shift();
		if (!next) return this.ticker.stop();
		this.player = next;
		this.dist = bfs(this.grid, this.player);
		this.drawPlay();
	};

	private enterPlay(): void {
		this.phase = 'play';
		this.dist = bfs(this.grid, this.player);
		this.drawPlay();
	}

	private drawMaze(highlight?: Point): void {
		const { renderer } = this;
		const ordered = orderInput.checked;
		const frontier = this.generator.frontier(ordered);
		this.highlight = highlight;
		renderer.clear();
		frontier.forEach((edge, i) => {
			const color = ordered ? rankColor(i, frontier.length) : COLORS.frontier;
			renderer.square(edge, color);
			renderer.square({ x: edge.fx, y: edge.fy }, color);
		});
		this.grid.forEachOpen((p) => renderer.square(p, COLORS.path));
		this.bridges?.walls.forEach((w) => renderer.square(w, COLORS.loop));
		if (highlight) renderer.square(highlight, COLORS.player, true);
	}

	private drawPlay(): void {
		const { renderer, player, hover } = this;
		this.drawMaze(player);
		if (this.route.length) renderer.line([player, ...this.route], COLORS.route, 2);
		if (hover && !samePoint(hover, player)) {
			renderer.line([player, ...routeTo(this.grid, this.dist, hover)], COLORS.frontier);
			renderer.square(hover, COLORS.frontier, true);
		}
	}

	private mousePosition(e: MouseEvent): Point {
		const rect = canvas.getBoundingClientRect();
		const { size } = this.renderer;
		return { x: Math.floor((e.clientX - rect.left) / size), y: Math.floor((e.clientY - rect.top) / size) };
	}

	private isTarget(p: Point): boolean {
		return this.grid.isInterior(p) && this.grid.isOpen(p.x, p.y) && !samePoint(p, this.player);
	}

	private onMouseMove = (e: MouseEvent): void => {
		if (this.phase !== 'play') return;
		const pos = this.mousePosition(e);
		if (samePoint(pos, this.lastMouse)) return;
		this.lastMouse = pos;
		// Over a wall, keep the last target so the path doesn't blink while the cursor crosses walls.
		if (this.isTarget(pos)) this.hover = pos;
		else if (samePoint(pos, this.player)) this.hover = undefined;
		else return;
		this.drawPlay();
	};

	private onMouseLeave = (): void => {
		this.lastMouse = undefined;
		if (this.phase !== 'play' || !this.hover) return;
		this.hover = undefined;
		this.drawPlay();
	};

	private onMouseDown = (e: MouseEvent): void => {
		if (this.phase !== 'play') return;
		// Clicking a wall walks to the target that is still shown.
		const pos = this.mousePosition(e);
		const target = this.isTarget(pos) ? pos : this.hover;
		if (!target || samePoint(target, this.player)) return;
		this.route = routeTo(this.grid, this.dist, target);
		this.ticker.start(this.moveStep);
	};
}

const app = new App();
app.reset();

resetButton.addEventListener('click', () => app.reset());
window.addEventListener('resize', () => app.reset());
pauseButton.addEventListener('click', () => app.togglePause());
speedInput.addEventListener('input', () => app.setSpeed(parseInt(speedInput.value)));
orderInput.addEventListener('change', () => app.redraw());
bridgeInput.addEventListener('input', () => {
	bridgeValue.textContent = bridgeInput.value + '%';
});
