/**
 * @vitest-environment jsdom
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProjectSession } from '../src/authoring/projectSession.js';
import { scanAssets } from '../src/engine/scanAssets.js';
import { adaptLegacyUiScreen } from '../src/shared/uiLegacyAdapters.js';
import { TitleScreen } from '../src/ui/TitleScreen.js';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'tools', 'vn-author', 'index.js');
const tempDirs = [];

function legacyTitleScript() {
  return {
    projectId: 'gm_title_vertical_slice',
    meta: { title: 'Moonlit Letter', resolution: { width: 1280, height: 720 } },
    assets: { videos: { op: { file: 'videos/op.mp4', poster: 'videos/op.jpg' } } },
    characters: {},
    scenes: {},
    ui: {
      titleScreen: {
        background: 'backgrounds/title.png',
        bgm: 'audio/title.ogg',
        openingVideo: { videoId: 'op', play: 'before-title' },
        elements: [
          {
            id: 'logo',
            type: 'text',
            content: 'Moonlit Letter',
            x: 640,
            y: 160,
            anchor: 'center',
            fontSize: 48,
            fontFamily: 'serif',
            color: '#ffffff',
            letterSpacing: 3,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          },
          {
            id: 'start',
            type: 'button',
            text: 'Start',
            action: 'start',
            x: 540,
            y: 420,
            width: 200,
            height: 54,
            backgroundColor: 'rgba(0,0,0,0.6)',
            hoverColor: '#333333',
            border: '1px solid #ffffff',
            borderRadius: 6,
          },
          {
            id: 'crest',
            type: 'image',
            src: 'backgrounds/crest.png',
            x: 80,
            y: 70,
            width: 180,
            height: 160,
          },
        ],
      },
    },
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('Phase 5 title vertical slice', () => {
  it('maps legacy title visuals, actions, behavior, and assets into canonical title nodes', () => {
    const result = adaptLegacyUiScreen(legacyTitleScript(), 'title');
    expect(result.authority).toBe('legacy-only');
    expect(result.document.behavior).toEqual({
      bgm: 'audio/title.ogg',
      openingVideo: { videoId: 'op', play: 'before-title' },
    });

    const logo = result.document.nodes.find(node => node.id === 'title.logo');
    expect(logo.content.text).toBe('Moonlit Letter');
    expect(logo.style).toMatchObject({
      fontFamily: 'serif',
      letterSpacing: 3,
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    });

    const start = result.document.nodes.find(node => node.id === 'title.start');
    expect(start.action).toEqual({ type: 'start-game' });
    expect(start.states.hover.backgroundColor).toBe('#333333');
    expect(start.style).toMatchObject({ borderWidth: 1, borderColor: '#ffffff', borderRadius: 6 });
    expect(result.document.nodes.find(node => node.id === 'title.crest').asset).toEqual({
      kind: 'image',
      path: 'backgrounds/crest.png',
    });
  });

  it('renders canonical title runtime through SharedUiRenderer and routes title actions', async () => {
    globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const screen = new TitleScreen(host, 'Fallback');
    const canonical = adaptLegacyUiScreen(legacyTitleScript(), 'title').document;
    const onStart = vi.fn();
    screen.onStart = onStart;
    screen.setLayout(null, { canonicalDocument: canonical });

    screen.show(true, true);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(host.querySelector('[data-gm-ui-renderer="shared"]')).toBeTruthy();
    expect(host.querySelector('[data-gm-ui-node-id="title.logo"]').textContent).toBe('Moonlit Letter');
    host.querySelector('[data-gm-ui-node-id="title.start"]').click();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('migrates and edits canonical title documents through validated project-session operations', () => {
    const session = createProjectSession({ script: legacyTitleScript() });
    const migrated = session.migrateTitleScreen();
    expect(migrated.changedPaths).toEqual(['ui.screenSchemaVersion', 'ui.screenAuthorities.title', 'ui.screens.title']);

    session.updateTitleNode({ nodeId: 'title.logo', path: 'content.text', value: 'New Title' });
    const duplicated = session.duplicateTitleNode({ nodeId: 'title.start', id: 'title.start.copy' });
    session.moveTitleNode({ nodeId: 'title.start.copy', order: 0 });
    session.removeTitleNode({ nodeId: 'title.start.copy' });

    const script = session.toJSON();
    expect(duplicated.nodeId).toBe('title.start.copy');
    expect(script.ui.screenAuthorities.title).toBe('canonical-active');
    expect(script.ui.screens.title.nodes.find(node => node.id === 'title.logo').content.text).toBe('New Title');
    expect(session.validate().ok).toBe(true);
  });

  it('routes canonical title assets through export scanning and readiness inputs', () => {
    const canonical = adaptLegacyUiScreen(legacyTitleScript(), 'title').document;
    const assets = scanAssets({
      ...legacyTitleScript(),
      ui: {
        screenSchemaVersion: 2,
        screenAuthorities: { title: 'canonical-active' },
        screens: { title: canonical },
      },
    });
    expect(assets.backgrounds).toEqual(['backgrounds/crest.png', 'backgrounds/title.png']);
    expect(assets.audio).toEqual(['audio/title.ogg']);
    expect(assets.videos).toEqual(['videos/op.jpg', 'videos/op.mp4']);
  });

  it('runs title migration and canonical edits through apply-plan validate-only, dry-run, checkpoint, and rollback', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-title-vslice-'));
    tempDirs.push(dir);
    const scriptPath = path.join(dir, 'script.json');
    const planPath = path.join(dir, 'title-plan.json');
    const validateOut = path.join(dir, 'validate.json');
    const writeOut = path.join(dir, 'write.json');
    await fs.writeFile(scriptPath, JSON.stringify(legacyTitleScript(), null, 2), 'utf8');
    await fs.writeFile(planPath, JSON.stringify({
      version: 1,
      operations: [
        { command: 'migrate-title-screen' },
        { command: 'update-title-node', params: { id: 'title.logo', path: 'content.text', value: 'Checkpoint Title' } },
      ],
    }), 'utf8');

    const validate = JSON.parse((await execFileAsync(process.execPath, [
      cliPath, 'apply-plan', planPath, '--script', scriptPath, '--validate-only', '--result-out', validateOut, '--json',
    ])).stdout);
    expect(validate.transaction).toMatchObject({ status: 'validated', wrote: false });
    await expect(fs.readFile(validateOut, 'utf8')).resolves.toContain('migrate-title-screen');

    const dryRun = JSON.parse((await execFileAsync(process.execPath, [
      cliPath, 'apply-plan', planPath, '--script', scriptPath, '--dry-run', '--json',
    ])).stdout);
    expect(dryRun.transaction).toMatchObject({ status: 'planned', wrote: false });
    expect(JSON.parse(await fs.readFile(scriptPath, 'utf8')).ui.screenAuthorities).toBeUndefined();

    const written = JSON.parse((await execFileAsync(process.execPath, [
      cliPath, 'apply-plan', planPath, '--script', scriptPath, '--force', '--checkpoint', '--result-out', writeOut, '--json',
    ])).stdout);
    expect(written.transaction.status).toBe('written');
    expect(written.transaction.checkpointPath).toMatch(/\.checkpoints/);
    expect(JSON.parse(await fs.readFile(scriptPath, 'utf8')).ui.screens.title.nodes.find(node => node.id === 'title.logo').content.text).toBe('Checkpoint Title');

    await execFileAsync(process.execPath, [
      cliPath, 'restore-checkpoint', written.transaction.checkpointPath, '--script', scriptPath, '--force', '--json',
    ]);
    expect(JSON.parse(await fs.readFile(scriptPath, 'utf8')).ui.screenAuthorities).toBeUndefined();
  });
});
