import { test, expect } from '@playwright/test';

test('sample test - pass', async ({ page }) => {
    await page.goto('https://www.facebook.com/');
    expect(await page.title()).toContain('Facebook – log in or sign up');
});

test('sample test - failed', async ({ page }) => {
    await page.goto('https://www.twitter.com/');
    expect(await page.title()).toContain('X. It’s what’s happening / X');
});
