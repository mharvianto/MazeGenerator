import { analyze, expect, farCell, generate, pathPixels, playerSquare, readMaze, squareCenter, test } from './helpers';

test.use({ viewport: { width: 1000, height: 640 } });

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await generate(page);
});

test('hovering shows the path and clicking walks there', async ({ page }) => {
	const player = await playerSquare(page);
	const target = farCell(await readMaze(page), player);
	const point = await squareCenter(page, target.x, target.y);
	await page.mouse.move(point.x, point.y);
	expect(await pathPixels(page)).toBeGreaterThan(0);
	await page.mouse.down();
	await page.mouse.up();
	await expect.poll(() => playerSquare(page)).toEqual(target);
});

test('the path only runs through open squares', async ({ page }) => {
	const lines = await readMaze(page);
	const target = farCell(lines, await playerSquare(page), 10);
	const point = await squareCenter(page, target.x, target.y);
	await page.mouse.move(point.x, point.y);
	// Every pixel of the path line must sit on an open square, i.e. it follows passages.
	const squares = await page.evaluate(() => {
		const canvas = document.querySelector('canvas')!;
		const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
		const size = Math.round(parseInt((document.querySelector('#sizetxt') as HTMLInputElement).value) * devicePixelRatio);
		const ox = Math.floor((canvas.width - Math.floor(canvas.width / size) * size) / 2);
		const oy = Math.floor((canvas.height - Math.floor(canvas.height / size) * size) / 2);
		const found = new Set<string>();
		for (let i = 0; i < data.length; i += 4) {
			if (data[i] !== 0xff || data[i + 1] !== 0x6b || data[i + 2] !== 0x81) continue;
			const p = i / 4;
			found.add(`${Math.floor(((p % canvas.width) - ox) / size)},${Math.floor((Math.floor(p / canvas.width) - oy) / size)}`);
		}
		return [...found].map((k) => k.split(',').map(Number));
	});
	expect(squares.length).toBeGreaterThan(10);
	for (const [x, y] of squares) expect(lines[y][x], `path square ${x},${y}`).not.toBe('#');
});

test('the path stays while the cursor crosses a wall and clears when it leaves', async ({ page }) => {
	const lines = await readMaze(page);
	const player = await playerSquare(page);
	// An open cell, away from the player, with a closed wall to its right.
	const cell = (() => {
		for (let y = 1; y < lines.length - 1; y += 2)
			for (let x = 1; x < lines[0].length - 3; x += 2)
				if (lines[y][x] !== '#' && lines[y][x + 1] === '#' && Math.abs(x - player.x) + Math.abs(y - player.y) > 4) return { x, y };
		throw new Error('no cell next to a wall');
	})();
	const onCell = await squareCenter(page, cell.x, cell.y);
	const onWall = await squareCenter(page, cell.x + 1, cell.y);
	await page.mouse.move(onCell.x, onCell.y);
	const pixels = await pathPixels(page);
	expect(pixels).toBeGreaterThan(0);
	await page.mouse.move(onWall.x, onWall.y);
	expect(await pathPixels(page)).toBe(pixels);
	// Clicking the wall walks to the target that is still shown.
	await page.mouse.down();
	await page.mouse.up();
	await expect.poll(() => playerSquare(page)).toEqual(cell);
	await page.mouse.move(onWall.x, 2); // up into the navbar
	expect(await pathPixels(page)).toBe(0);
});

test('arrow keys move the player one cell unless a wall is in the way', async ({ page }) => {
	await page.mouse.move(5, 5); // keep the cursor off the maze so no path is drawn
	for (const [key, dx, dy] of [
		['ArrowRight', 1, 0],
		['ArrowDown', 0, 1],
		['ArrowLeft', -1, 0],
		['ArrowUp', 0, -1],
		['d', 1, 0],
		['s', 0, 1]
	] as const) {
		const lines = await readMaze(page);
		const from = await playerSquare(page);
		const open = lines[from.y + dy][from.x + dx] !== '#';
		await page.keyboard.press(key);
		const to = await playerSquare(page);
		expect(to, key).toEqual(open ? { x: from.x + 2 * dx, y: from.y + 2 * dy } : from);
	}
});

test('arrow keys are left to a focused slider', async ({ page }) => {
	const before = await playerSquare(page);
	await page.focus('#speedtxt');
	await page.keyboard.press('ArrowLeft');
	await expect(page.locator('#speedtxt')).toHaveValue('99');
	expect(await playerSquare(page)).toEqual(before);
});

test('pause freezes generation and play resumes it', async ({ page }) => {
	await generate(page, { speed: 40 }, 1, false);
	await page.waitForTimeout(300);
	await page.click('#pausebtn');
	await expect(page.locator('#pausebtn')).toHaveValue('Play');
	const snapshot = () => page.evaluate(() => document.querySelector('canvas')!.toDataURL());
	const frozen = await snapshot();
	await page.waitForTimeout(400);
	expect(await snapshot()).toBe(frozen);
	await page.click('#pausebtn');
	await expect.poll(snapshot).not.toBe(frozen);
});

test('Color priority redraws immediately, even while paused', async ({ page }) => {
	await generate(page, { speed: 40 }, 1, false);
	await page.waitForTimeout(300);
	await page.click('#pausebtn');
	const plain = await page.evaluate(() => document.querySelector('canvas')!.toDataURL());
	await page.check('#ordertxt');
	expect(await page.evaluate(() => document.querySelector('canvas')!.toDataURL())).not.toBe(plain);
});

test('walking does not change the maze', async ({ page }) => {
	const lines = await readMaze(page);
	const stats = analyze(lines);
	const target = farCell(lines, await playerSquare(page));
	const point = await squareCenter(page, target.x, target.y);
	await page.mouse.click(point.x, point.y);
	await expect.poll(() => playerSquare(page)).toEqual(target);
	await page.mouse.move(5, 5);
	await page.mouse.move(5, 300);
	expect(analyze(await readMaze(page))).toEqual(stats);
});
