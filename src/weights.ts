/**
 * Source of randomness for generation and bridges. With Random off, weights are an
 * increasing counter, so neighbors and walls are always taken in the same order.
 */
export class Weights {
	private seq = 0;
	private acc = 0;

	constructor(readonly random: boolean) {}

	next(): number {
		return this.random ? Math.random() : this.seq++;
	}

	/** True for `percent`% of calls: by dice when random, otherwise spread evenly by an accumulator. */
	chance(percent: number): boolean {
		if (this.random) return Math.random() * 100 < percent;
		this.acc += percent;
		if (this.acc < 100) return false;
		this.acc -= 100;
		return true;
	}
}
