/**
 * Runs a step function on a timer. The speed slider (1..100) maps exponentially to
 * 2..2000 steps per second. Timers can't fire much faster than ~60/s reliably, so
 * higher rates run several steps per tick, then `render` draws once per tick.
 */
export class Ticker {
	paused = false;
	private id = 0;
	private step?: () => void;
	private delay = 1000 / 60;
	private stepsPerTick = 1;

	constructor(private readonly render: () => void) {}

	setSpeed(slider: number): void {
		const rate = 2 * Math.pow(1000, (slider - 1) / 99);
		this.delay = rate <= 60 ? 1000 / rate : 1000 / 60;
		this.stepsPerTick = rate <= 60 ? 1 : Math.round(rate / 60);
		if (this.id && this.step) this.start(this.step);
	}

	start(step: () => void): void {
		this.stop();
		this.step = step;
		// A step may stop this timer or start another one; stop looping once it does.
		const id = (this.id = window.setInterval(() => {
			if (this.paused) return;
			for (let i = 0; i < this.stepsPerTick && this.id === id; i++) step();
			this.render();
		}, this.delay));
	}

	stop(): void {
		clearInterval(this.id);
		this.id = 0;
	}
}
