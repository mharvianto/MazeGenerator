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
			pop: () => data.shift()
		};
	}

	function Stack<T = any>(): QueueInterface<T> {
		const data: T[] = [];
		return {
			get: (a?: number) => (a !== undefined ? data[a] : data),
			empty: () => !data.length,
			push: (a: T) => data.push(a),
			pop: () => data.pop()
		};
	}

	const $ = (selector: string): HTMLElement | null => document.querySelector(selector);
	const c = $('canvas') as HTMLCanvasElement;
	const ctx = c.getContext('2d')!;
	let pause = false;
	let interval: number;
	let speed: number;
	const si = $('#sizetxt') as HTMLInputElement;
	const al = $('#algotxt') as HTMLSelectElement;
	const sp = $('#speedtxt') as HTMLInputElement;
	const rb = $('#resetbtn') as HTMLButtonElement;
	const pb = $('#pausebtn') as HTMLButtonElement;

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
			stop: () => obj
		};
		let visited: number[][];
		let qq: Node[];
		let cycle: Node[] = [];
		let distance: number[][];
		let oldPos: Node | undefined;
		let moves: Node[];
		let currMouse: Node | undefined;
		const opt: PriorityQueueOptions = { compare: (a: WeightedNode, b: WeightedNode) => a.w < b.w };
		const rand = (): number => Math.floor(Math.random() * 10);
		const isBorder = (n: Node): boolean => n.x > 0 && n.y > 0 && n.x < width - 1 && n.y < height - 1;

		const draw = function (node: Node, options?: DrawOptions): void {
			options = options || {};
			options.width = options.width || size;
			ctx.fillStyle = options.color || 'white';
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

		const drawMaze = function (node?: Node): void {
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			const pqData = pq.get() as WeightedNode[];
			pqData.forEach(({ x, y, fx, fy }) => {
				draw({ x: x, y: y } as Node, { color: 'red' });
				if (fx !== undefined && fy !== undefined) {
					draw({ x: fx, y: fy } as Node, { color: 'red' });
				}
			});
			for (let i = width - 1; i >= 0; i--) {
				for (let j = height - 1; j >= 0; j--) {
					if (map[i][j]) draw({ x: i, y: j } as Node, { color: 'white' });
				}
			}
			cycle && cycle.forEach(({ fx, fy }) => {
				if (fx !== undefined && fy !== undefined) {
					draw({ x: fx, y: fy } as Node, { color: 'orange' });
				}
			});
			node && draw(node, { color: 'blue', width: size - Math.floor(size / 5) });
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
			interval = window.setInterval(obj.floodFillStep, speed);
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
			ctx.strokeStyle = opt.color || 'red';
			ctx.beginPath();
			while ((a = b.pop())) ctx.lineTo(a.x * size + c, a.y * size + c);
			ctx.stroke();
		};

		const mouseClick = function (e: MouseEvent): void {
			const pos = mousePosition(e);
			if (isBorder(pos) && !(pos.x === x && pos.y === y) && map[pos.x][pos.y]) {
				if (obj.st === 2) clearInterval(interval);
				moves = pathMove(pos);
				interval = window.setInterval(obj.moveNode, speed);
			}
		};

		const mouseMove = function (e: MouseEvent): void {
			const pos = mousePosition(e);
			if (!oldPos || !(oldPos.x === pos.x && oldPos.y === pos.y)) {
				drawMaze({ x, y } as Node);
				if (isBorder(pos) && !(pos.x === x && pos.y === y) && map[pos.x][pos.y]) {
					drawPath(pos);
					draw(pos, { color: 'red', width: size - Math.floor(size / 5) });
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
				drawPath(currMouse!, { path: a, color: 'green', width: Math.ceil(size / 5) + 2 });
				if (currMouse && !(currMouse.x === x && currMouse.y === y)) {
					drawPath(currMouse);
					draw(currMouse, { color: 'red', width: size - Math.floor(size / 5) });
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
			if (pq && (node = pq.pop())) {
				addMaze(node);
				drawMaze(node);
			} else {
				obj.stop();
				obj.st++;
				floodFill();
			}
		};

		obj.start = function (): MazeObject {
			c.width = window.innerWidth;
			c.height = window.innerHeight - 40;
			size = parseInt(si.value);
			width = Math.floor(c.width / size);
			height = Math.floor(c.height / size);
			speed = parseInt(sp.value) || 1;
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
			addMaze({ x: x, y: y } as Node);
			interval = window.setInterval(obj.renderView, speed);
			return obj;
		};

		obj.stop = (): MazeObject => {
			clearInterval(interval);
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

	sp.addEventListener('change', function () {
		speed = parseInt(sp.value);
		mazeInstance.stop();
		switch (mazeInstance.st) {
			case 0:
				interval = window.setInterval(mazeInstance.renderView, speed);
				break;
			case 1:
				interval = window.setInterval(mazeInstance.floodFillStep, speed);
				break;
			case 2:
				interval = window.setInterval(mazeInstance.moveNode, speed);
				break;
		}
	});
})();