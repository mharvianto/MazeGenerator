import { expect, farCell, generate, pathPixels, playerSquare, readMaze, squareCenter, test } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
	await page.goto('/');
});

test('fits the screen without horizontal scrolling', async ({ page }) => {
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	const canvas = await page.locator('canvas').boundingBox();
	expect(canvas!.width).toBe(390);
	// Drawn at device resolution.
	expect(await page.evaluate(() => document.querySelector('canvas')!.width)).toBe(1170);
});

test('settings open in a panel and close from the backdrop or Reset', async ({ page }) => {
	const controls = page.locator('#controls');
	await expect(controls).toBeHidden();
	await page.tap('#menubtn');
	await expect(controls).toBeVisible();
	await expect(page.locator('#menubtn')).toHaveAttribute('aria-expanded', 'true');
	await page.tap('#backdrop', { position: { x: 200, y: 700 } });
	await expect(controls).toBeHidden();
	await page.tap('#menubtn');
	await page.tap('#resetbtn');
	await expect(controls).toBeHidden();
});

test('tapping a cell walks there', async ({ page }) => {
	await generate(page);
	const target = farCell(await readMaze(page), await playerSquare(page));
	const point = await squareCenter(page, target.x, target.y);
	await page.touchscreen.tap(point.x, point.y);
	await expect.poll(() => playerSquare(page)).toEqual(target);
});

test('dragging previews the path and lifting walks it', async ({ page, context }) => {
	await generate(page);
	const from = await playerSquare(page);
	const target = farCell(await readMaze(page), from);
	const a = await squareCenter(page, from.x, from.y);
	const b = await squareCenter(page, target.x, target.y);
	const cdp = await context.newCDPSession(page);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
	for (let i = 1; i <= 8; i++) {
		const p = { x: a.x + ((b.x - a.x) * i) / 8, y: a.y + ((b.y - a.y) * i) / 8 };
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] });
	}
	expect(await pathPixels(page)).toBeGreaterThan(0);
	expect(await playerSquare(page)).toEqual(from);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect.poll(() => playerSquare(page)).toEqual(target);
});

test('a URL-bar sized height change keeps the maze, rotation rebuilds it', async ({ page }) => {
	await generate(page);
	const maze = await readMaze(page);
	await page.setViewportSize({ width: 390, height: 780 });
	await page.waitForTimeout(400);
	expect(await readMaze(page)).toEqual(maze);
	await page.setViewportSize({ width: 844, height: 390 });
	await expect.poll(() => page.evaluate(() => document.querySelector('canvas')!.style.width)).toBe('844px');
});
