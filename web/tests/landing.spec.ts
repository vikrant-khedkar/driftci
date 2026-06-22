import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    args: ['--font-render-hinting=none'],
  },
});

test.describe('Landing Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
    await page.waitForTimeout(100);
  });

  test('full page screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('landing-full.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: 10000,
    });
  });

  test('hero section', async ({ page }) => {
    const hero = page.locator('section.hero');
    await expect(hero).toHaveScreenshot('hero-section.png', {
      animations: 'disabled',
      timeout: 10000,
    });
  });

  test('navbar', async ({ page }) => {
    const nav = page.locator('nav.top');
    await expect(nav).toHaveScreenshot('navbar.png', {
      timeout: 10000,
    });
  });

  test('why section', async ({ page }) => {
    const section = page.locator('#why');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot('why-section.png', {
      animations: 'disabled',
      timeout: 10000,
    });
  });

  test('detects section', async ({ page }) => {
    const section = page.locator('#detects');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot('detects-section.png', {
      animations: 'disabled',
      timeout: 10000,
    });
  });

  test('install section', async ({ page }) => {
    const section = page.locator('#install');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot('install-section.png', {
      animations: 'disabled',
      timeout: 10000,
    });
  });

  test('faq section', async ({ page }) => {
    const section = page.locator('#faq');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot('faq-section.png', {
      animations: 'disabled',
      timeout: 10000,
    });
  });

  test('footer', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toHaveScreenshot('footer.png', {
      timeout: 10000,
    });
  });
});

test.describe('Landing Page Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
    await page.waitForTimeout(100);
  });

  test('provider tab switch', async ({ page }) => {
    const tabs = page.locator('.providers button.chip');
    const secondTab = tabs.nth(1);
    if (await secondTab.isVisible()) {
      await secondTab.click();
      await page.waitForTimeout(300);
      const diffCard = page.locator('.diff-card');
      await expect(diffCard).toHaveScreenshot('diff-card-switched.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    }
  });

  test('install tab switch', async ({ page }) => {
    const section = page.locator('#install');
    await section.scrollIntoViewIfNeeded();
    const tabs = section.locator('.tabs button.tab');
    const secondTab = tabs.nth(1);
    if (await secondTab.isVisible()) {
      await secondTab.click();
      await page.waitForTimeout(300);
      const terminal = section.locator('.terminal');
      await expect(terminal).toHaveScreenshot('terminal-tab2.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    }
  });

  test('faq accordion expanded', async ({ page }) => {
    const section = page.locator('#faq');
    await section.scrollIntoViewIfNeeded();
    const secondQ = section.locator('details.q').nth(1);
    if (await secondQ.isVisible()) {
      await secondQ.click();
      await page.waitForTimeout(300);
      await expect(secondQ).toHaveScreenshot('faq-item-expanded.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    }
  });
});
