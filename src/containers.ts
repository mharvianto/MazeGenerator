/** A frontier container. The order pop() returns items in is what tells BFS, DFS and Prim's apart. */
export interface Container<T> {
	push(item: T): void;
	pop(): T | undefined;
	/** Items in storage order (cheap, for drawing in a single color). */
	items(): readonly T[];
	/** Items in the order pop() would return them. */
	ordered(): T[];
}

/** FIFO, for BFS. */
export class Queue<T> implements Container<T> {
	private readonly data: T[] = [];

	push(item: T): void {
		this.data.push(item);
	}

	pop(): T | undefined {
		return this.data.shift();
	}

	items(): readonly T[] {
		return this.data;
	}

	ordered(): T[] {
		return this.data.slice();
	}
}

/** LIFO, for DFS. */
export class Stack<T> implements Container<T> {
	private readonly data: T[] = [];

	push(item: T): void {
		this.data.push(item);
	}

	pop(): T | undefined {
		return this.data.pop();
	}

	items(): readonly T[] {
		return this.data;
	}

	ordered(): T[] {
		return this.data.slice().reverse();
	}
}

/** Binary min-heap: pops the item for which `less` holds against all others. */
export class PriorityQueue<T> implements Container<T> {
	private readonly data: T[] = [];

	constructor(private readonly less: (a: T, b: T) => boolean) {}

	push(item: T): void {
		const { data, less } = this;
		let n = data.push(item) - 1;
		while (n > 0) {
			const parent = Math.floor((n - 1) / 2);
			if (!less(data[n], data[parent])) break;
			this.swap(n, parent);
			n = parent;
		}
	}

	pop(): T | undefined {
		const { data, less } = this;
		const top = data[0];
		const last = data.pop();
		if (!data.length || last === undefined) return top;
		data[0] = last;
		let n = 0;
		for (;;) {
			const l = n * 2 + 1;
			const r = l + 1;
			if (l >= data.length) break;
			const child = r < data.length && less(data[r], data[l]) ? r : l;
			if (!less(data[child], data[n])) break;
			this.swap(n, child);
			n = child;
		}
		return top;
	}

	items(): readonly T[] {
		return this.data;
	}

	ordered(): T[] {
		return this.data.slice().sort((a, b) => (this.less(a, b) ? -1 : this.less(b, a) ? 1 : 0));
	}

	private swap(a: number, b: number): void {
		[this.data[a], this.data[b]] = [this.data[b], this.data[a]];
	}
}
