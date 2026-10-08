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
const menuButton = $<HTMLButtonElement>('#menubtn');
const backdrop = $('#backdrop');

/**
 * Generate: carve the maze one step at a time.
 * Bridge: walk every cell and knock out extra walls at dead ends (skipped at 0%).
 * Play: hover shows the shortest path from the player; click walks it.
 */
type Phase = 'generate' | 'bridge' | 'play';

class App {
	private readonly renderer = new Renderer(canvas);
	private readonly ticker = new Ticker(() => this.redraw());
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
	private lastPointer?: Point;
	/** Squares left to walk, in order. */
	private route: Point[] = [];

	constructor() {
		canvas.addEventListener('pointermove', this.onPointerMove);
		canvas.addEventListener('pointerdown', this.onPointerDown);
		canvas.addEventListener('pointerup', this.onPointerUp);
		canvas.addEventListener('pointerleave', this.onPointerLeave);
	}

	reset(): void {
		this.ticker.stop();
		// The field's min/max only limit the spinner, not typing, so clamp here.
		const cellSize = Math.min(40, Math.max(5, parseInt(sizeInput.value) || 20));
		sizeInput.value = String(cellSize);
		const { width, height } = this.renderer.resize(
			window.innerWidth,
			window.innerHeight - navbar.offsetHeight,
			cellSize
		);
		this.grid = new Grid(width, height);
		this.ticker.setSpeed(parseInt(speedInput.value));
		this.ticker.paused = false;
		pauseButton.value = 'Pause';
		this.player = this.grid.randomCell();
		this.weights = new Weights(randomInput.checked);
		this.bridgePercent = parseInt(bridgeInput.value);
		this.generator = createGenerator(algorithmSelect.value, this.grid, this.weights, this.player);
		this.bridges = undefined;
		this.highlight = undefined;
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
		if (cell) {
			this.highlight = cell;
			return;
		}
		this.ticker.stop();
		if (this.bridgePercent > 0) {
			this.phase = 'bridge';
			this.bridges = new Bridges(this.grid, this.weights, this.bridgePercent, this.player);
			this.ticker.start(this.bridgeStep);
		} else this.enterPlay();
	};

	private bridgeStep = (): void => {
		const cell = this.bridges!.step();
		if (cell) {
			this.highlight = cell;
			return;
		}
		this.ticker.stop();
		this.enterPlay();
	};

	private moveStep = (): void => {
		const next = this.route.shift();
		if (!next) return this.ticker.stop();
		this.player = next;
		this.dist = bfs(this.grid, this.player);
	};

	private enterPlay(): void {
		this.phase = 'play';
		this.dist = bfs(this.grid, this.player);
	}

	private drawMaze(highlight?: Point): void {
		const { renderer } = this;
		const ordered = orderInput.checked;
		const frontier = this.generator.frontier(ordered);
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

	private isTarget(p: Point): boolean {
		return this.grid.isInterior(p) && this.grid.isOpen(p.x, p.y) && !samePoint(p, this.player);
	}

	private aim(e: PointerEvent): void {
		const pos = this.renderer.squareAt(e);
		if (samePoint(pos, this.lastPointer)) return;
		this.lastPointer = pos;
		// Over a wall, keep the last target so the path doesn't blink while the pointer crosses walls.
		if (this.isTarget(pos)) this.hover = pos;
		else if (samePoint(pos, this.player)) this.hover = undefined;
		else return;
		this.drawPlay();
	}

	private walk(target?: Point): void {
		if (!target || samePoint(target, this.player)) return;
		this.route = routeTo(this.grid, this.dist, target);
		this.ticker.start(this.moveStep);
	}

	// A mouse previews on hover and walks on click. Touch has no hover: dragging a
	// finger previews, and lifting it walks, so a plain tap walks straight there.
	private onPointerMove = (e: PointerEvent): void => {
		if (this.phase === 'play') this.aim(e);
	};

	private onPointerDown = (e: PointerEvent): void => {
		if (this.phase !== 'play' || !e.isPrimary || e.button !== 0) return;
		if (e.pointerType !== 'mouse') return this.aim(e);
		// Clicking a wall walks to the target that is still shown.
		const pos = this.renderer.squareAt(e);
		this.walk(this.isTarget(pos) ? pos : this.hover);
	};

	private onPointerUp = (e: PointerEvent): void => {
		if (this.phase === 'play' && e.isPrimary && e.pointerType !== 'mouse') this.walk(this.hover);
	};

	private onPointerLeave = (): void => {
		this.lastPointer = undefined;
		if (this.phase !== 'play' || !this.hover) return;
		this.hover = undefined;
		this.drawPlay();
	};
}

const app = new App();
app.reset();

const setMenu = (open: boolean): void => {
	navbar.classList.toggle('open', open);
	menuButton.setAttribute('aria-expanded', String(open));
};
menuButton.addEventListener('click', () => setMenu(!navbar.classList.contains('open')));
backdrop.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

resetButton.addEventListener('click', () => {
	setMenu(false);
	app.reset();
});

// Phones resize the viewport when the URL bar or keyboard slides in and out. Only
// rebuild the maze when the width changes (rotation, window resize) or the height
// changes a lot without the Size field being edited.
let viewport = { width: window.innerWidth, height: window.innerHeight };
let resizeTimer = 0;
window.addEventListener('resize', () => {
	clearTimeout(resizeTimer);
	resizeTimer = window.setTimeout(() => {
		const { innerWidth: width, innerHeight: height } = window;
		const typing = document.activeElement === sizeInput;
		if (width === viewport.width && (Math.abs(height - viewport.height) < 150 || typing)) return;
		viewport = { width, height };
		app.reset();
	}, 150);
});
pauseButton.addEventListener('click', () => app.togglePause());
speedInput.addEventListener('input', () => app.setSpeed(parseInt(speedInput.value)));
orderInput.addEventListener('change', () => app.redraw());
bridgeInput.addEventListener('input', () => {
	bridgeValue.textContent = bridgeInput.value + '%';
});
