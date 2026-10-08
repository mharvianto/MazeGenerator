/*!
 * Maze Generator
 * Author: Harvianto
 */
interface Node {
	x: number;
	y: number;
	fx?: number;
	fy?: number;
}

interface WeightedNode extends Node {
	w: number;
}

interface PriorityQueueOptions {
	compare?: (a: any, b: any) => boolean;
}

interface QueueInterface<T> {
	get: (index?: number) => T | T[];
	empty: () => boolean;
	push: (...items: T[]) => number | void;
	pop: () => T | undefined;
	ordered: () => T[];
}

(function () {
	function PriorityQueue<T = any>(options?: PriorityQueueOptions): QueueInterface<T> {
		options = options || {};
		const data: T[] = [];
		const p = (n: number): number => Math.floor((n - 1) / 2);
		const l = (n: number): number => n * 2 + 1;
		const r = (n: number): number => (n + 1) * 2;
		const swap = function (a: number, b: number): void {
			const c = data[a];
			data[a] = data[b];
			data[b] = c;
		};
		const compare = options.compare || ((a: any, b: any) => a < b);

		return {
			get: (a?: number) => (a !== undefined ? data[a] : data),
			push: function (...items: T[]): number {
				items.forEach((a) => {
					let n = data.push(a) - 1;
					while (n > 0 && compare(data[n], data[p(n)])) {
						swap(n, p(n));
						n = p(n);
					}
				});
				return data.length;
			},
			empty: () => !data.length,
			ordered: () => data.slice().sort((a, b) => (compare(a, b) ? -1 : compare(b, a) ? 1 : 0)),
			pop: function (): T | undefined {
				if (!this.empty()) {
					let a = 0;
					const b = data[a];
					const c = data.length;
					if (c === 1) {
						data.pop();
					} else {
						data[a] = data.pop()!;
						while (
							(data[l(a)] && compare(data[l(a)], data[a])) ||
							(data[r(a)] && compare(data[r(a)], data[a]))
						) {
							if (data[r(a)] && compare(data[r(a)], data[l(a)])) {
								swap(a, r(a));
								a = r(a);
							} else {
								swap(a, l(a));
								a = l(a);
							}
						}
					}
					return b;
				}
			}
		};
	}

	function Queue<T = any>(): QueueInterface<T> {
		const data: T[] = [];
		return {
			get: (a?: number) => (a !== undefined ? data[a] : data),
			empty: () => !data.length,
			push: (a: T) => data.push(a),
			pop: () => data.shift(),
			ordered: () => data.slice()
		};
	}

	function Stack<T = any>(): QueueInterface<T> {
		const data: T[] = [];
		return {
			get: (a?: number) => (a !== undefined ? data[a] : data),
			empty: () => !data.length,
			push: (a: T) => data.push(a),
			pop: () => data.pop(),
			ordered: () => data.slice().reverse()
		};
	}

	// Canvas palette, matched to the CSS theme in index.html.
	const COLORS = {
		path: '#e6e9f2',
		frontier: '#ff6b81',
		loop: '#ffb86b',
		player: '#6c8cff',
		route: '#4ade80'
	};

	const $ = (selector: string): HTMLElement | null => document.querySelector(selector);
	const c = $('canvas') as HTMLCanvasElement;
	const ctx = c.getContext('2d')!;
	let pause = false;
	let interval = 0;
	let delay: number;
	let stepsPerTick: number;
	const si = $('#sizetxt') as HTMLInputElement;
	const al = $('#algotxt') as HTMLSelectElement;
	const sp = $('#speedtxt') as HTMLInputElement;
	const rb = $('#resetbtn') as HTMLButtonElement;
	const pb = $('#pausebtn') as HTMLButtonElement;
	const rd = $('#randomtxt') as HTMLInputElement;
	const br = $('#bridgetxt') as HTMLInputElement;
	const co = $('#ordertxt') as HTMLInputElement;

	// Slider 1..100 maps exponentially to 2..2000 steps per second. Timers can't
	// fire much faster than ~60/s reliably, so higher rates run several steps per tick.
	const updateSpeed = function (): void {
		const rate = 2 * Math.pow(1000, (parseInt(sp.value) - 1) / 99);
		delay = rate <= 60 ? 1000 / rate : 1000 / 60;
		stepsPerTick = rate <= 60 ? 1 : Math.round(rate / 60);
	};

	// A step may stop this timer or start the next phase's; stop looping once it does.
	const run = function (step: () => void): void {
		clearInterval(interval);
		const id = (interval = window.setInterval(() => {
			for (let i = 0; i < stepsPerTick && interval === id; i++) step();
		}, delay));
	};

	interface DrawOptions {
		color?: string;
		width?: number;
	}

	interface PathOptions {
		path?: Node[];
		color?: string;
		width?: number;
	}

	interface MazeObject {
		st: number;
		moveNode: () => void;
		floodFillStep: () => void;
		renderView: () => void;
		start: () => MazeObject;
		stop: () => MazeObject;
		redraw: () => void;
	}

	const Maze = function (): MazeObject {
		let size: number;
		let width: number;
		let height: number;
		let pq: QueueInterface<WeightedNode>;
		let x: number;
		let y: number;
		let map: number[][];
		const obj: MazeObject = {
			st: 0,
			moveNode: () => { },
			floodFillStep: () => { },
			renderView: () => { },
			start: () => obj,
			stop: () => obj,
			redraw: () => { }
		};
		let visited: number[][];
		let qq: Node[];
		let cycle: Node[] = [];
		let distance: number[][];
		let oldPos: Node | undefined;
		let moves: Node[];
		let currMouse: Node | undefined;
		let kruskal: boolean;
		let random: boolean;
		let bridge: boolean;
		let seq: number;
		let parent: number[];
		const opt: PriorityQueueOptions = { compare: (a: WeightedNode, b: WeightedNode) => a.w < b.w };
		// With Random off, weights are an increasing counter, so neighbors and walls
		// are always taken in the same fixed order.
		const rand = (): number => (random ? Math.random() : seq++);
		const isBorder = (n: Node): boolean => n.x > 0 && n.y > 0 && n.x < width - 1 && n.y < height - 1;

		const draw = function (node: Node, options?: DrawOptions): void {
			options = options || {};
			options.width = options.width || size;
			ctx.fillStyle = options.color || COLORS.path;
			ctx.fillRect(
				size * node.x + (size - options.width) / 2,
				size * node.y + (size - options.width) / 2,
				options.width,
				options.width
			);
		};

		const addMaze = function (node: Node): void {
			const n = { x: node.x, y: node.y, fx: node.fx || node.x, fy: node.fy || node.y } as Node;
			if (!map[n.x][n.y]) {
				map[n.x][n.y] = map[n.fx!][n.fy!] = 1;
				const moves: WeightedNode[] = [];
				let temp: WeightedNode | undefined;
				if (n.x - 2 > 0) moves.push({ w: rand(), x: n.x - 2, y: n.y, fx: n.x - 1, fy: n.y } as WeightedNode);
				if (n.y - 2 > 0) moves.push({ w: rand(), x: n.x, y: n.y - 2, fx: n.x, fy: n.y - 1 } as WeightedNode);
				if (n.x + 2 < width - 1) moves.push({ w: rand(), x: n.x + 2, y: n.y, fx: n.x + 1, fy: n.y } as WeightedNode);
				if (n.y + 2 < height - 1) moves.push({ w: rand(), x: n.x, y: n.y + 2, fx: n.x, fy: n.y + 1 } as WeightedNode);
				moves.sort((a, b) => a && b ? a.w - b.w : 0);
				while ((temp = moves.pop())) {
					const pqData = pq.get() as WeightedNode[];
					if (
						pqData.filter(({ x, y }) => x === temp!.x && y === temp!.y).length < 1 &&
						!map[temp.x][temp.y]
					)
						pq.push({ w: rand(), x: temp.x, y: temp.y, fx: temp.fx, fy: temp.fy } as WeightedNode);
				}
			}
		};

		const find = function (i: number): number {
			while (parent[i] !== i) i = parent[i] = parent[parent[i]];
			return i;
		};

		// Kruskal's: every wall between two cells is an edge with a random weight;
		// pq holds all of them, and union-find rejects walls that would form a loop.
		const initKruskal = function (): void {
			parent = [];
			for (let i = 1; i < width - 1; i += 2) {
				for (let j = 1; j < height - 1; j += 2) {
					parent[i * height + j] = i * height + j;
					if (i + 2 < width - 1) pq.push({ w: rand(), x: i + 2, y: j, fx: i + 1, fy: j } as WeightedNode);
					if (j + 2 < height - 1) pq.push({ w: rand(), x: i, y: j + 2, fx: i, fy: j + 1 } as WeightedNode);
				}
			}
		};

		const joinKruskal = function (node: Node): boolean {
			const ox = 2 * node.fx! - node.x;
			const oy = 2 * node.fy! - node.y;
			const a = find(node.x * height + node.y);
			const b = find(ox * height + oy);
			if (a === b) return false;
			parent[a] = b;
			map[node.x][node.y] = map[ox][oy] = map[node.fx!][node.fy!] = 1;
			return true;
		};

		// Gradient over the frontier's pop order: yellow is popped next, magenta last.
		const rankColor = function (rank: number, count: number): string {
			const t = count > 1 ? rank / (count - 1) : 0;
			return `hsl(${55 - 105 * t}, 100%, ${70 - 15 * t}%)`;
		};

		const drawMaze = function (node?: Node): void {
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			const pqData = kruskal ? [] : co.checked ? pq.ordered() : (pq.get() as WeightedNode[]);
			pqData.forEach(({ x, y, fx, fy }, i) => {
				const color = co.checked ? rankColor(i, pqData.length) : COLORS.frontier;
				draw({ x: x, y: y } as Node, { color });
				if (fx !== undefined && fy !== undefined) {
					draw({ x: fx, y: fy } as Node, { color });
				}
			});
			for (let i = width - 1; i >= 0; i--) {
				for (let j = height - 1; j >= 0; j--) {
					if (map[i][j]) draw({ x: i, y: j } as Node, { color: COLORS.path });
				}
			}
			cycle && cycle.forEach(({ fx, fy }) => {
				if (fx !== undefined && fy !== undefined) {
					draw({ x: fx, y: fy } as Node, { color: COLORS.loop });
				}
			});
			node && draw(node, { color: COLORS.player, width: size - Math.floor(size / 5) });
		};

		const memset = function (n: number, m: number, v?: number): number[][] {
			const arr: number[][] = [];
			for (let i = n - 1; i >= 0; i--) {
				arr[i] = [];
				for (let j = m - 1; j >= 0; j--) {
					arr[i][j] = v || 0;
				}
			}
			return arr;
		};

		const fill = function (node: Node): void {
			const t = { x: node.x, y: node.y } as Node;
			if (map[t.x][t.y] && !visited[t.x][t.y]) {
				visited[t.x][t.y] = 1;
				const temp: Node[] = [];
				let n: Node | undefined;
				if (t.x - 2 > 0) temp.push({ x: t.x - 2, y: t.y } as Node);
				if (t.y - 2 > 0) temp.push({ x: t.x, y: t.y - 2 } as Node);
				if (t.x + 2 < width - 1) temp.push({ x: t.x + 2, y: t.y } as Node);
				if (t.y + 2 < height - 1) temp.push({ x: t.x, y: t.y + 2 } as Node);
				while ((n = temp.shift())) {
					if (qq.filter(({ x, y }) => x === n!.x && y === n!.y).length < 1) qq.push(n);
				}
				if (
					map[t.x - 1][t.y] + map[t.x][t.y - 1] + map[t.x + 1][t.y] + map[t.x][t.y + 1] ===
					1
				) {
					const movesHole: WeightedNode[] = [];
					let hole: WeightedNode | undefined;
					movesHole.push({ w: rand(), x: t.x - 2, y: t.y, fx: t.x - 1, fy: t.y } as WeightedNode);
					movesHole.push({ w: rand(), x: t.x + 2, y: t.y, fx: t.x + 1, fy: t.y } as WeightedNode);
					movesHole.push({ w: rand(), x: t.x, y: t.y - 2, fx: t.x, fy: t.y - 1 } as WeightedNode);
					movesHole.push({ w: rand(), x: t.x, y: t.y + 2, fx: t.x, fy: t.y + 1 } as WeightedNode);
					movesHole.sort((a, b) => a && b ? a.w - b.w : 0);
					while ((hole = movesHole.shift())) {
						if (
							hole.x > 0 &&
							hole.y > 0 &&
							hole.x < width - 1 &&
							hole.y < height - 1 &&
							!map[hole.fx!][hole.fy!]
						) {
							map[hole.fx!][hole.fy!] = 1;
							cycle.push({ x: t.x, y: t.y, fx: hole.fx, fy: hole.fy } as WeightedNode);
							break;
						}
					}
				}
			}
		};

		const mousePosition = function (event: MouseEvent): Node {
			const rect = c.getBoundingClientRect();
			return {
				x: Math.floor((event.clientX - rect.left) / size),
				y: Math.floor((event.clientY - rect.top) / size)
			} as Node;
		};

		const floodFill = function (): void {
			visited = memset(width, height);
			qq = [];
			qq.push({ x, y } as Node);
			run(obj.floodFillStep);
		};

		const dijkstra = function (node: Node): void {
			visited = memset(width, height);
			distance = memset(width, height, width * height + 5);
			const qd = PriorityQueue<WeightedNode>(opt);
			let temp: WeightedNode | undefined;
			qd.push({ x: node.x, y: node.y, w: 0 } as WeightedNode);
			while ((temp = qd.pop())) {
				if (isBorder(temp) && map[temp.x][temp.y] && !visited[temp.x][temp.y]) {
					visited[temp.x][temp.y] = 1;
					distance[temp.x][temp.y] = Math.min(distance[temp.x][temp.y], temp.w);
					qd.push({ x: temp.x + 1, y: temp.y, w: temp.w + 1 } as WeightedNode);
					qd.push({ x: temp.x - 1, y: temp.y, w: temp.w + 1 } as WeightedNode);
					qd.push({ x: temp.x, y: temp.y + 1, w: temp.w + 1 } as WeightedNode);
					qd.push({ x: temp.x, y: temp.y - 1, w: temp.w + 1 } as WeightedNode);
				}
			}
		};

		const pathMove = function (node: Node): Node[] {
			const a = PriorityQueue<WeightedNode>(opt);
			let t: WeightedNode | undefined;
			const b: Node[] = [];
			const visitedPath = memset(width, height);
			a.push({ x: node.x, y: node.y, w: distance[node.x][node.y] } as WeightedNode);
			while ((t = a.pop())) {
				if (!visitedPath[t.x][t.y]) {
					visitedPath[t.x][t.y] = 1;
					a.push({ x: t.x + 1, y: t.y, w: distance[t.x + 1][t.y] } as WeightedNode);
					a.push({ x: t.x - 1, y: t.y, w: distance[t.x - 1][t.y] } as WeightedNode);
					a.push({ x: t.x, y: t.y + 1, w: distance[t.x][t.y + 1] } as WeightedNode);
					a.push({ x: t.x, y: t.y - 1, w: distance[t.x][t.y - 1] } as WeightedNode);
					b.push({ x: t.x, y: t.y } as WeightedNode);
					if (!t.w) break;
				}
			}
			return b;
		};

		const drawPath = function (node: Node, opt?: PathOptions): void {
			opt = opt || {};
			const c = Math.floor(size / 2);
			const b = opt.path || pathMove(node);
			let a: Node | undefined;
			ctx.lineWidth = opt.width || Math.ceil(size / 5);
			ctx.strokeStyle = opt.color || COLORS.frontier;
			ctx.beginPath();
			while ((a = b.pop())) ctx.lineTo(a.x * size + c, a.y * size + c);
			ctx.stroke();
		};

		const mouseClick = function (e: MouseEvent): void {
			const pos = mousePosition(e);
			if (isBorder(pos) && !(pos.x === x && pos.y === y) && map[pos.x][pos.y]) {
				moves = pathMove(pos);
				run(obj.moveNode);
			}
		};

		const mouseMove = function (e: MouseEvent): void {
			const pos = mousePosition(e);
			if (!oldPos || !(oldPos.x === pos.x && oldPos.y === pos.y)) {
				drawMaze({ x, y } as Node);
				if (isBorder(pos) && !(pos.x === x && pos.y === y) && map[pos.x][pos.y]) {
					drawPath(pos);
					draw(pos, { color: COLORS.frontier, width: size - Math.floor(size / 5) });
					currMouse = pos;
				} else currMouse = undefined;
				oldPos = pos;
			}
		};

		const mouseListener = function (): void {
			dijkstra({ x, y } as Node);
			drawMaze({ x, y } as Node);
			c.addEventListener('mousemove', mouseMove, false);
			c.addEventListener('mousedown', mouseClick, false);
		};

		obj.moveNode = function (): void {
			let t: Node | undefined;
			if (pause) return;
			if (moves && (t = moves.pop())) {
				x = t.x;
				y = t.y;
				dijkstra({ x, y } as Node);
				drawMaze({ x, y } as Node);
				const a = moves.slice();
				a.push({ x, y } as Node);
				drawPath(currMouse!, { path: a, color: COLORS.route, width: Math.ceil(size / 5) + 2 });
				if (currMouse && !(currMouse.x === x && currMouse.y === y)) {
					drawPath(currMouse);
					draw(currMouse, { color: COLORS.frontier, width: size - Math.floor(size / 5) });
				}
			} else obj.stop();
		};

		obj.floodFillStep = function (): void {
			let step: Node | undefined;
			if (pause) return;
			if (qq && (step = qq.pop())) {
				fill(step);
				drawMaze(step);
			} else {
				obj.stop();
				obj.st++;
				mouseListener();
			}
		};

		obj.renderView = function (): void {
			let node: WeightedNode | undefined;
			if (pause) return;
			if (kruskal) while ((node = pq.pop()) && !joinKruskal(node));
			else if ((node = pq.pop())) addMaze(node);
			if (node) {
				drawMaze(node);
			} else {
				obj.stop();
				obj.st++;
				// The flood-fill phase only exists to add bridges; skip it when they're off.
				if (bridge) floodFill();
				else {
					obj.st++;
					mouseListener();
				}
			}
		};

		obj.start = function (): MazeObject {
			c.width = window.innerWidth;
			c.height = window.innerHeight - ($('#navbar') as HTMLElement).offsetHeight;
			size = parseInt(si.value);
			width = Math.floor(c.width / size);
			height = Math.floor(c.height / size);
			updateSpeed();
			pause = false;
			pb.value = 'Pause';
			pq =
				al.value === '0'
					? Queue<WeightedNode>()
					: al.value === '1'
						? Stack<WeightedNode>()
						: PriorityQueue<WeightedNode>(opt);
			x = Math.floor(Math.random() * ((width - 2) / 2)) * 2 + 1;
			y = Math.floor(Math.random() * ((height - 2) / 2)) * 2 + 1;
			map = memset(width, height);
			cycle = [];
			obj.st = 0;
			c.removeEventListener('mousemove', mouseMove);
			c.removeEventListener('mousedown', mouseClick);
			random = rd.checked;
			bridge = br.checked;
			seq = 0;
			kruskal = al.value === '3';
			if (kruskal) initKruskal();
			else addMaze({ x: x, y: y } as Node);
			run(obj.renderView);
			return obj;
		};

		obj.redraw = function (): void {
			drawMaze({ x, y } as Node);
			if (obj.st === 2 && currMouse) {
				drawPath(currMouse);
				draw(currMouse, { color: COLORS.frontier, width: size - Math.floor(size / 5) });
			}
		};

		obj.stop = (): MazeObject => {
			clearInterval(interval);
			interval = 0;
			return obj;
		};

		obj.start();
		return obj;
	};



	// window.maze || (window.maze = Maze());
	const mazeInstance = Maze();

	rb.addEventListener('click', function () {
		mazeInstance.stop().start();
	});

	window.onresize = function () {
		rb.click();
	};

	pb.addEventListener('click', function () {
		pause = !pause;
		pb.value = pb.value === 'Pause' ? 'Play' : 'Pause';
	});

	co.addEventListener('change', function () {
		mazeInstance.redraw();
	});

	sp.addEventListener('input', function () {
		updateSpeed();
		if (!interval) return;
		run([mazeInstance.renderView, mazeInstance.floodFillStep, mazeInstance.moveNode][mazeInstance.st]);
	});
})();