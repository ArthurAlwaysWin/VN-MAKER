import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

import { createServer } from 'vite';

export const PREVIEW_RENDERER_UNAVAILABLE = 'preview-renderer-unavailable';
export const PREVIEW_BROWSER_UNAVAILABLE = 'preview-browser-unavailable';
export const PREVIEW_QUALITY_FAILED = 'preview-quality-failed';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createPreviewSuggestedAction(code) {
  if (code === 'preview-width-mismatch' || code === 'preview-height-mismatch') {
    return {
      summary: 'Render again with the project resolution or update the preview width and height.',
      commands: [
        { command: 'render-preview', args: ['--width', '<project-width>', '--height', '<project-height>'] },
      ],
    };
  }

  if (code === 'preview-low-color-variety' || code === 'preview-dominant-color') {
    return {
      summary: 'Verify the target scene/page and add visible background, character, or dialogue content before rerendering.',
      commands: [
        { command: 'lint-layout', args: ['--json'] },
        { command: 'set-page-background', args: ['--scene', '<scene-id>', '--page', '<index>', '--background', '<asset-path>'] },
        { command: 'set-page-characters', args: ['--scene', '<scene-id>', '--page', '<index>', '--preset', 'solo-center', '--character', '<character-id>'] },
      ],
    };
  }

  if (code === 'preview-mostly-transparent') {
    return {
      summary: 'Check transparent assets and stage coverage; add an opaque background or visible character art.',
      commands: [
        { command: 'set-page-background', args: ['--scene', '<scene-id>', '--page', '<index>', '--background', '<asset-path>'] },
      ],
    };
  }

  return {
    summary: 'Inspect the preview target and rerun render-preview after correcting the scene.',
    commands: [],
  };
}

function createPreviewWarning(code, message, details = {}) {
  return {
    severity: 'warning',
    code,
    message,
    suggestedAction: createPreviewSuggestedAction(code),
    ...details,
  };
}

function normalizePreviewTarget({ sceneId, pageIndex, outPath }) {
  return {
    sceneId: sceneId || 'start',
    pageIndex: Number.isInteger(pageIndex) ? pageIndex : 0,
    outPath,
  };
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    const unavailable = new Error('Preview rendering requires the optional "playwright" package.');
    unavailable.code = PREVIEW_RENDERER_UNAVAILABLE;
    unavailable.cause = error;
    throw unavailable;
  }
}

function getAssetContentType(assetPath) {
  const ext = path.extname(assetPath).toLowerCase();
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

function getAssetPathFromUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol === 'asset:') {
    return `${url.hostname}${url.pathname}`.replace(/^\/+/, '');
  }
  if (url.pathname.startsWith('/game/')) {
    return url.pathname.slice('/game/'.length);
  }
  return url.pathname.replace(/^\/+/, '');
}

async function installAssetRoutes(page, repoRoot) {
  const assetRoot = path.join(repoRoot, 'public', 'game');
  const fulfillAsset = async (route) => {
    const requestUrl = route.request().url();
    const assetPath = getAssetPathFromUrl(requestUrl);
    const filePath = path.resolve(assetRoot, assetPath);
    const relativePath = path.relative(assetRoot, filePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      await route.abort();
      return;
    }

    try {
      await route.fulfill({
        status: 200,
        contentType: getAssetContentType(filePath),
        body: await readFile(filePath),
      });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        await route.fulfill({ status: 404, body: 'Not found' });
        return;
      }
      throw error;
    }
  };

  await page.route('asset://**/*', fulfillAsset);
  await page.route('**/game/**/*', fulfillAsset);
}

function createHarnessHtml({ script, sceneId, pageIndex }) {
  const payload = JSON.stringify({
    type: 'start',
    script,
    sceneId,
    pageIndex,
    previewMode: true,
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VN Author Preview Harness</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { border: 0; width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <iframe id="runtime" src="/index.html"></iframe>
  <script>
    const payload = ${payload};
    const iframe = document.getElementById('runtime');
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'ready') {
        event.source.postMessage({ type: 'ack-preview' }, '*');
        setTimeout(() => iframe.contentWindow.postMessage(payload, '*'), 0);
      }
    });
  </script>
</body>
</html>`;
}

async function startViteServer(repoRoot) {
  const server = await createServer({
    root: repoRoot,
    configFile: false,
    server: {
      host: '127.0.0.1',
      port: 0,
      open: false,
      fs: {
        strict: true,
        allow: [repoRoot],
      },
    },
    logLevel: 'error',
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') {
    await server.close();
    throw new Error('Unable to determine Vite preview server address.');
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function waitForPreviewReady(page) {
  await page.waitForSelector('#runtime', { state: 'attached', timeout: 10000 });
  const frameElement = await page.$('#runtime');
  const frame = await frameElement.contentFrame();
  if (!frame) {
    throw new Error('Runtime preview iframe did not load.');
  }

  await frame.waitForSelector('#game-container', { state: 'attached', timeout: 10000 });
  await frame.waitForFunction(() => {
    const dialogue = document.querySelector('#dialogue-box');
    const choice = document.querySelector('#choice-menu');
    const stage = document.querySelector('#stage-layer');
    return Boolean(dialogue || choice || stage?.children.length);
  }, null, { timeout: 10000 });
  await page.waitForTimeout(600);
}

function paethPredictor(left, up, upperLeft) {
  const p = left + up - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upperLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upperLeft;
}

function parsePngPixels(buffer) {
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Preview screenshot is not a PNG file.');
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const dataChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      dataChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported preview PNG format: bit depth ${bitDepth}, color type ${colorType}.`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(dataChunks));
  const pixels = Buffer.alloc(width * height * channels);

  let inputOffset = 0;
  let outputOffset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let row = 0; row < height; row += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const currentRow = Buffer.from(inflated.subarray(inputOffset, inputOffset + stride));
    inputOffset += stride;

    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? currentRow[index - channels] : 0;
      const up = previousRow[index] ?? 0;
      const upperLeft = index >= channels ? previousRow[index - channels] : 0;

      if (filter === 1) {
        currentRow[index] = (currentRow[index] + left) & 0xff;
      } else if (filter === 2) {
        currentRow[index] = (currentRow[index] + up) & 0xff;
      } else if (filter === 3) {
        currentRow[index] = (currentRow[index] + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        currentRow[index] = (currentRow[index] + paethPredictor(left, up, upperLeft)) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`Unsupported preview PNG filter: ${filter}.`);
      }
    }

    currentRow.copy(pixels, outputOffset);
    outputOffset += stride;
    previousRow = currentRow;
  }

  return { width, height, channels, pixels };
}

export function analyzePreviewScreenshot(buffer, {
  expectedWidth = null,
  expectedHeight = null,
  minDistinctColors = 8,
  maxDominantColorRatio = 0.995,
  minNonTransparentRatio = 0.9,
} = {}) {
  const { width, height, channels, pixels } = parsePngPixels(buffer);
  const totalPixels = width * height;
  const colorCounts = new Map();
  let visiblePixels = 0;

  for (let offset = 0; offset < pixels.length; offset += channels) {
    const alpha = channels === 4 ? pixels[offset + 3] : 255;
    if (alpha > 0) visiblePixels += 1;

    const key = `${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]},${alpha}`;
    colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
  }

  const dominantColorPixels = Math.max(...colorCounts.values());
  const dominantColorRatio = totalPixels === 0 ? 1 : dominantColorPixels / totalPixels;
  const nonTransparentRatio = totalPixels === 0 ? 0 : visiblePixels / totalPixels;
  const warnings = [];

  if (expectedWidth != null && width !== expectedWidth) {
    warnings.push(createPreviewWarning(
      'preview-width-mismatch',
      `Screenshot width is ${width}, expected ${expectedWidth}.`,
      { actual: width, expected: expectedWidth },
    ));
  }
  if (expectedHeight != null && height !== expectedHeight) {
    warnings.push(createPreviewWarning(
      'preview-height-mismatch',
      `Screenshot height is ${height}, expected ${expectedHeight}.`,
      { actual: height, expected: expectedHeight },
    ));
  }
  if (colorCounts.size < minDistinctColors) {
    warnings.push(createPreviewWarning(
      'preview-low-color-variety',
      `Screenshot has only ${colorCounts.size} distinct colors.`,
      { distinctColors: colorCounts.size, minimum: minDistinctColors },
    ));
  }
  if (dominantColorRatio > maxDominantColorRatio) {
    warnings.push(createPreviewWarning(
      'preview-dominant-color',
      `Screenshot is ${(dominantColorRatio * 100).toFixed(1)}% one color.`,
      { dominantColorRatio: Number(dominantColorRatio.toFixed(6)), maximum: maxDominantColorRatio },
    ));
  }
  if (nonTransparentRatio < minNonTransparentRatio) {
    warnings.push(createPreviewWarning(
      'preview-mostly-transparent',
      `Screenshot is only ${(nonTransparentRatio * 100).toFixed(1)}% non-transparent.`,
      { nonTransparentRatio: Number(nonTransparentRatio.toFixed(6)), minimum: minNonTransparentRatio },
    ));
  }

  return {
    ok: warnings.length === 0,
    width,
    height,
    totalPixels,
    distinctColors: colorCounts.size,
    dominantColorRatio: Number(dominantColorRatio.toFixed(6)),
    nonTransparentRatio: Number(nonTransparentRatio.toFixed(6)),
    warnings,
    suggestions: warnings.map((warning) => ({
      code: warning.code,
      suggestedAction: warning.suggestedAction,
    })),
  };
}

export async function renderPreviewScreenshot({
  repoRoot,
  script,
  sceneId = 'start',
  pageIndex = 0,
  outPath,
  width = 1280,
  height = 720,
  dryRun = false,
} = {}) {
  const target = normalizePreviewTarget({ sceneId, pageIndex, outPath });
  if (!target.outPath) {
    throw new Error('render-preview requires an output path');
  }

  const harnessHtml = createHarnessHtml({
    script,
    sceneId: target.sceneId,
    pageIndex: target.pageIndex,
  });

  if (dryRun) {
    return {
      dryRun: true,
      sceneId: target.sceneId,
      pageIndex: target.pageIndex,
      outPath: target.outPath,
      width,
      height,
      renderer: 'playwright',
      harnessHtmlLength: harnessHtml.length,
    };
  }

  const { chromium } = await loadPlaywright();
  let vite = null;
  let browser = null;

  try {
    vite = await startViteServer(repoRoot);
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      if (String(error?.message ?? '').includes('Executable doesn\'t exist')) {
        const unavailable = new Error('Preview rendering requires a Playwright browser install.');
        unavailable.code = PREVIEW_BROWSER_UNAVAILABLE;
        unavailable.cause = error;
        throw unavailable;
      }
      throw error;
    }
    const page = await browser.newPage({ viewport: { width, height } });
    await installAssetRoutes(page, repoRoot);
    await page.goto(vite.url, { waitUntil: 'domcontentloaded' });
    await page.setContent(harnessHtml, { waitUntil: 'domcontentloaded' });
    await waitForPreviewReady(page);

    await mkdir(path.dirname(target.outPath), { recursive: true });
    await page.screenshot({
      path: target.outPath,
      fullPage: false,
    });

    const quality = analyzePreviewScreenshot(await readFile(target.outPath), {
      expectedWidth: width,
      expectedHeight: height,
    });

    if (!quality.ok) {
      const error = new Error('Preview screenshot failed quality checks.');
      error.code = PREVIEW_QUALITY_FAILED;
      error.quality = quality;
      throw error;
    }

    return {
      dryRun: false,
      sceneId: target.sceneId,
      pageIndex: target.pageIndex,
      outPath: target.outPath,
      width,
      height,
      renderer: 'playwright',
      url: vite.url,
      quality,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
    if (vite?.server) {
      await vite.server.close();
    }
  }
}

export async function writePreviewRenderPlan(outPath, plan) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
}
