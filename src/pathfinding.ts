import { adjacent, Grid, Point } from './grid';

/**
 * Breadth-first distance (in squares) from `from` through open squares, -1 where
 * unreachable. With `targets`, it stops as soon as all of them are reached.
 */
export function bfs(grid: Grid, from: Point, targets: readonly Point[] = []): Int32Array {
	const dist = new Int32Array(grid.width * grid.height).fill(-1);
	const pending = new Set(targets.map((t) => grid.index(t.x, t.y)));
	const stopEarly = pending.size > 0;
	const queue = [from];
	dist[grid.index(from.x, from.y)] = 0;
	for (let head = 0; head < queue.length && !(stopEarly && !pending.size); head++) {
		const p = queue[head];
		const d = dist[grid.index(p.x, p.y)];
		for (const n of adjacent(p)) {
			if (!grid.isOpen(n.x, n.y)) continue;
			const k = grid.index(n.x, n.y);
			if (dist[k] >= 0) continue;
			dist[k] = d + 1;
			queue.push(n);
			pending.delete(k);
		}
	}
	return dist;
}

/**
 * Shortest route from the origin of `dist` to `target`, in walking order and
 * excluding the origin. Walks back from the target down the distance gradient.
 */
export function routeTo(grid: Grid, dist: Int32Array, target: Point): Point[] {
	const route: Point[] = [];
	let p: Point | undefined = target;
	for (let d = dist[grid.index(target.x, target.y)]; p && d > 0; d--) {
		route.push(p);
		p = adjacent(p).find((n) => grid.isOpen(n.x, n.y) && dist[grid.index(n.x, n.y)] === d - 1);
	}
	return route.reverse();
}
