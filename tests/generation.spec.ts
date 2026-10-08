import { ALGORITHMS, analyze, expect, generate, readMaze, test } from './helpers';

// Narrow enough for the phone layout, whose navbar height doesn't depend on fonts,
// so the grid size (and the snapshots) are the same everywhere.
test.use({ viewport: { width: 600, height: 420 } });

test.beforeEach(async ({ page }) => {
	await page.goto('/');
});

for (const [name, algorithm] of Object.entries(ALGORITHMS)) {
	test(`${name} builds a perfect maze`, async ({ page }) => {
		await generate(page, { algorithm, bridge: 0 });
		const stats = analyze(await readMaze(page));
		expect(stats.openCells).toBe(stats.cells);
		// A spanning tree over n cells has exactly n - 1 passages and is connected.
		expect(stats.passages).toBe(stats.cells - 1);
		expect(stats.connected).toBe(true);
		expect(stats.bridges).toBe(0);
	});

	test(`${name} builds a perfect maze with Random off`, async ({ page }) => {
		await generate(page, { algorithm, bridge: 0, random: false });
		const stats = analyze(await readMaze(page));
		expect(stats.passages).toBe(stats.cells - 1);
		expect(stats.connected).toBe(true);
	});

	// Guards the exact generation order: refactors must not change which maze a seed
	// produces. Update with `npx playwright test --update-snapshots` when a change is
	// meant to alter mazes.
	test(`${name} output is stable for a seed`, async ({ page }) => {
		await generate(page, { algorithm, bridge: 50 }, 7);
		expect((await readMaze(page)).join('\n') + '\n').toMatchSnapshot(`${name}.txt`);
	});
}

test('the same seed gives the same maze', async ({ page }) => {
	await generate(page, { algorithm: ALGORITHMS.prim }, 42);
	const first = await readMaze(page);
	await generate(page, { algorithm: ALGORITHMS.prim }, 42);
	expect(await readMaze(page)).toEqual(first);
});

test('bridges at 100% remove every dead end', async ({ page }) => {
	await generate(page, { algorithm: ALGORITHMS.dfs, bridge: 100 });
	const stats = analyze(await readMaze(page));
	expect(stats.deadEnds).toBe(0);
	expect(stats.connected).toBe(true);
	expect(stats.bridges).toBeGreaterThan(0);
	// Every bridge is one passage beyond the spanning tree.
	expect(stats.passages).toBe(stats.cells - 1 + stats.bridges);
});

test('bridges at 50% leave some dead ends', async ({ page }) => {
	await generate(page, { algorithm: ALGORITHMS.prim, bridge: 0 });
	const before = analyze(await readMaze(page)).deadEnds;
	await generate(page, { algorithm: ALGORITHMS.prim, bridge: 50 });
	const stats = analyze(await readMaze(page));
	expect(stats.deadEnds).toBeGreaterThan(0);
	expect(stats.deadEnds).toBeLessThan(before);
});

test('Size is clamped to 5-40', async ({ page }) => {
	for (const [typed, clamped] of [
		['', '20'],
		['0', '20'],
		['2', '5'],
		['99', '40']
	]) {
		await page.evaluate((v) => ((document.querySelector('#sizetxt') as HTMLInputElement).value = v), typed);
		await page.evaluate(() => (document.querySelector('#resetbtn') as HTMLInputElement).click());
		await expect(page.locator('#sizetxt')).toHaveValue(clamped);
	}
});
