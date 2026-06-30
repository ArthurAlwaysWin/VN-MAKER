import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const outputDir = path.resolve(process.argv[3] || '.tmp/phase11-browser-fallback');
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push({ url: page.url(), text: message.text() });
});
page.on('pageerror', error => consoleErrors.push({ url: page.url(), text: error.message }));

async function capture(name) {
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
}

async function canonicalState() {
  return page.evaluate(() => {
    const documents = [...document.querySelectorAll('[data-gm-ui-document-id]')];
    const boxes = [...document.querySelectorAll('[data-gm-ui-node-id]')].map(element => {
      const rect = element.getBoundingClientRect();
      return {
        id: element.getAttribute('data-gm-ui-node-id'),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    });
    return {
      documentIds: documents.map(element => element.getAttribute('data-gm-ui-document-id')),
      nodeCount: boxes.length,
      hierarchyCount: document.querySelectorAll('[data-node-id]').length,
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map(element => element.getAttribute('aria-label')),
      invalidBoxes: boxes.filter(box => box.width < 0 || box.height < 0),
      outOfViewport: boxes.filter(box => box.x < -1 || box.y < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1),
    };
  });
}

const editor = [];
for (const screenId of ['title', 'gameplay', 'gameMenu', 'settings', 'saveLoad', 'backlog', 'gallery', 'textInput', 'confirmation', 'videoControls']) {
  await page.goto(`${baseUrl}/unified-screen-designer-fixture.html?screen=${screenId}`, { waitUntil: 'networkidle' });
  const state = await canonicalState();
  editor.push({ screenId, ...state });
  await capture(`editor-${screenId}-desktop`);
}

const runtimeTargets = [
  ['titleSharedRenderer', '/ui-renderer-fixture.html'],
  ['gameplay', '/gameplay-runtime-fixture.html'],
  ['gameMenu', '/game-menu-runtime-fixture.html'],
  ['settings', '/settings-runtime-fixture.html'],
  ['saveLoad', '/stateful-screens-runtime-fixture.html'],
  ['gallery', '/phase10-runtime-fixture.html?mode=gallery'],
  ['textInput', '/phase10-runtime-fixture.html?mode=input'],
  ['confirmation', '/phase10-runtime-fixture.html?mode=confirmation'],
  ['videoControls', '/phase10-runtime-fixture.html?mode=video&policy=allowed'],
];
const runtime = [];
for (const [name, url] of runtimeTargets) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: 'networkidle' });
  runtime.push({ name, ...(await canonicalState()) });
  await capture(`runtime-${name}-desktop`);
}

await page.goto(`${baseUrl}/stateful-screens-runtime-fixture.html`, { waitUntil: 'networkidle' });
await page.locator('[data-fixture-action="backlog-populated"]').click();
runtime.push({ name: 'backlog', ...(await canonicalState()) });
await capture('runtime-backlog-desktop');

await page.setViewportSize({ width: 390, height: 844 });
const responsive = [];
for (const [name, url] of [
  ['gallery-mobile', '/phase10-runtime-fixture.html?mode=gallery'],
  ['confirmation-mobile', '/phase10-runtime-fixture.html?mode=confirmation'],
  ['editor-gallery-mobile', '/unified-screen-designer-fixture.html?screen=gallery'],
]) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: 'networkidle' });
  responsive.push({ name, ...(await canonicalState()) });
  await capture(name);
}

await page.setViewportSize({ width: 1280, height: 720 });
await page.goto(`${baseUrl}/ui-renderer-fixture.html`, { waitUntil: 'networkidle' });
const gamepad = await page.evaluate(() => {
  const runtime = window.__GM_UI_RENDERER_FIXTURE__.runtime;
  const pad = indexes => ({ axes: [0, 0], buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: indexes.includes(index) })) });
  runtime.renderer.gamepad.update(pad([13]));
  runtime.renderer.gamepad.update(pad([]));
  const afterMove = document.activeElement?.closest('[data-gm-ui-node-id]')?.getAttribute('data-gm-ui-node-id') ?? null;
  runtime.renderer.gamepad.update(pad([0]));
  runtime.renderer.gamepad.update(pad([]));
  return { afterMove, status: document.getElementById('fixture-status').textContent };
});

await page.emulateMedia({ reducedMotion: 'reduce' });
const reducedMotion = await page.evaluate(() => ({
  matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
  rootAnimationDuration: getComputedStyle(document.documentElement).animationDuration,
}));

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  ok: consoleErrors.length === 0
    && editor.every(item => item.documentIds.includes(item.screenId) && item.nodeCount > 0 && item.hierarchyCount > 0 && item.invalidBoxes.length === 0)
    && runtime.every(item => item.nodeCount > 0 && item.invalidBoxes.length === 0)
    && responsive.every(item => item.invalidBoxes.length === 0)
    && gamepad.afterMove
    && reducedMotion.matches,
  editor,
  runtime,
  responsive,
  gamepad,
  reducedMotion,
  consoleErrors,
};
await writeFile(path.join(outputDir, 'browser-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
