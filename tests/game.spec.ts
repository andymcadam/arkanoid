import path from 'path';
import { test, expect } from '@playwright/test';

// Helper to get file:// URL for arkanoid.htm in a cross-platform way
// Use the local web server URL. Playwright's webServer (configured in playwright.config.ts)
// will start a static server at http://localhost:8000 before running tests.
function fileUrlFor(relativePath: string) {
  return `http://localhost:8000/${relativePath}`;
}

test.describe('Arkanoid UI', () => {
  test('page opens and has title', async ({ page }) => {
    const url = fileUrlFor('arkanoid.htm');
    await page.goto(url);
    await expect(page).toHaveTitle(/Arkanoid/i);
  });

  test('clicking Play Game starts the game', async ({ page }) => {
    const url = fileUrlFor('arkanoid.htm');
    await page.goto(url);

    // Play button should be visible in the main menu
    const playBtn = page.getByRole('button', { name: /Play Game/i });
    await expect(playBtn).toBeVisible();

    // Click it to start the game
    await playBtn.click();

    // The main menu should be hidden and gameContainer visible
    await expect(page.locator('#mainMenu')).toBeHidden();
    await expect(page.locator('#gameContainer')).toBeVisible();

    // The canvas should be present
    await expect(page.locator('#gameCanvas')).toBeVisible();

    // Ensure the game's global state indicates the game is running (gameOver === false)
    // Note: `gameOver` is declared with `let` at top-level in the script and may not be
    // a property of `window`; access it by identifier using typeof checks.
    await page.waitForFunction(() => (typeof (globalThis as any).gameOver !== 'undefined' ? (globalThis as any).gameOver === false : false), { timeout: 2000 });
    const gameOver = await page.evaluate(() => {
      return (typeof (globalThis as any).gameOver !== 'undefined') ? (globalThis as any).gameOver : undefined;
    });
    expect(gameOver).toBe(false);
  });
});
