// Optional browser check: provide Playwright via NODE_PATH and an installed Chrome via CHROME_PATH.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

(async () => {
  const { sessions } = await import('../helpers/course.js');
  const { emptyProgress, storageKey } = await import('../../src/progress.js');
  const base = process.env.TEST_URL || 'http://127.0.0.1:4173/guitar-path/';
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(base);
      await page.locator('.course-session').first().waitFor();
      const saved = sessions.map((session, index) => {
        const progress = emptyProgress(session);
        if (index === 0) for (const id of Object.keys(progress.exercises)) progress.exercises[id] = 'practiced';
        if (index === 2) progress.exercises[session.exercises[0].id] = 'comfortable';
        progress.note = `Registro histórico ${index + 1}\n🎸`;
        progress.actualDuration = 25;
        return [storageKey(session.id), JSON.stringify(progress, null, 4)];
      });
      await page.evaluate((entries) => { for (const [key, value] of entries) localStorage.setItem(key, value); }, saved);
      await page.reload();
      await page.locator('.course-session').first().waitFor();
      assert.equal(await page.locator('.course-block').count(), 1);
      assert.equal(await page.locator('.course-week').count(), 3);
      for (const week of await page.locator('.course-week').all()) assert.equal(await week.locator('.course-session').count(), 2);
      assert.match(await page.locator('.course-session').nth(2).innerText(), /En curso/);
      assert.match(await page.locator('.hero-actions a').getAttribute('href'), new RegExp(`${sessions[2].id}#${sessions[2].exercises[1].id}$`));
      const summary = page.locator('.course-block > summary');
      await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.course-block').getAttribute('open'), null);
      await page.keyboard.press('Enter');
      for (const summary of await page.locator('.course-week > summary').all()) {
        await summary.click(); assert.equal(await summary.locator('..').getAttribute('open'), null);
        await summary.click();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/course-${width}.png`, fullPage: true });
      assert.deepEqual(await page.evaluate((entries) => entries.map(([key]) => [key, localStorage.getItem(key)]), saved), saved);
      await page.locator('.course-session').nth(1).click();
      await page.locator('#session-title').waitFor();
      await page.locator('.session-pagination').first().getByRole('link', { name: /Siguiente/ }).click();
      await page.locator('#session-title').waitFor();
      assert.match(await page.locator('.week-label').innerText(), /Semana 2 · Tríadas en el mástil/);
      assert.equal(await page.locator('.session-sidebar nav').isVisible(), true);
      assert.equal(await page.locator('#session-note').inputValue(), 'Registro histórico 3\n🎸');
      assert.equal(await page.locator('#actual-duration').inputValue(), '25');
      assert.equal(await page.locator(`[data-exercise="${sessions[2].exercises[0].id}"][value="comfortable"]`).isChecked(), true);
      await page.locator('#session-note').fill('Nota actualizada\nF♯');
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#export-progress').click();
      const download = await downloadPromise;
      const data = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
      assert.deepEqual(data.sessions.map(({ week }) => week.number), [1, 1, 2, 2, 3, 3]);
      assert.equal(data.sessions[2].progress.note, 'Nota actualizada\nF♯');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('.site-header .index-link').click();
      await page.locator('.course-session').first().waitFor();
      assert.match(await page.locator('.hero-actions a').getAttribute('href'), new RegExp(sessions[2].id));
      await page.goBack(); await page.locator('#session-title').waitFor();
      assert.equal(await page.locator('#session-note').inputValue(), 'Nota actualizada\nF♯');
      await page.goForward(); await page.locator('.course-session').first().waitFor();
      for (const session of sessions) {
        await page.goto(`${base}?session=${session.id}`);
        await page.locator('#session-title').waitFor();
        assert.equal(await page.locator('#session-title').innerText(), session.title);
        assert.match(await page.locator('.week-label').innerText(), new RegExp(`Semana ${session.week.number}`));
      }
      assert.equal(await page.locator('.session-pagination').first().getByRole('link', { name: /Siguiente/ }).count(), 0);
      await page.goto(`${base}?session=missing`);
      await page.locator('.course-session').first().waitFor();
      assert.match(await page.locator('[role="status"]').innerText(), /no está disponible/);
      await page.evaluate((key) => localStorage.setItem(key, '{broken'), storageKey(sessions[0].id));
      await page.reload(); await page.locator('.course-session').first().waitFor();
      assert.match(await page.locator('.course-session').first().innerText(), /Progreso no disponible/);
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), storageKey(sessions[0].id)), '{broken');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: grouping, disclosures, historical progress, contextual links, direct URLs, history, resume, export, corrupt data and no overflow`);
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
