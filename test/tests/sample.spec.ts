import { test, expect } from '@playwright/test';

test('sample test - pass', async ({ page }) => {
    await page.goto('https://www.google.com');
    expect(await page.title()).toContain('Google');
});
