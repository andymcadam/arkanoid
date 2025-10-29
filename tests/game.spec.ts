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

    // Instead of relying on a top-level JS binding (which may not be accessible from
    // the test runner), assert the game actually started by checking the canvas
    // has been painted (not uniformly black). This is a practical runtime signal
    // that the draw loop is running.
    await page.waitForFunction(() => {
      const c = document.getElementById('gameCanvas');
      if (!(c instanceof HTMLCanvasElement)) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      try {
        const img = ctx.getImageData(0, 0, Math.min(50, c.width), Math.min(50, c.height)).data;
        for (let i = 0; i < img.length; i += 4) {
          // check for any non-black pixel in the sampled area
          if (img[i] !== 0 || img[i + 1] !== 0 || img[i + 2] !== 0) return true;
        }
      } catch (e) {
        return false;
      }
      return false;
    }, { timeout: 5000 });
  });
});
