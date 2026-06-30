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
import { adaptLegacyUiScreen, projectCanonicalThemeScreens } from '../src/shared/uiLegacyAdapters.js';
import { validateUiDocument } from '../src/shared/uiDocumentContract.js';
import { GameMenu } from '../src/ui/GameMenu.js';
import { createSharedConfirmationDocument, SharedConfirmationOverlay } from '../src/ui/sharedConfirmationOverlay.js';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'tools', 'vn-author', 'index.js');
const tempDirs = [];

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn(pathValue => `resolved:${pathValue}`),
}));

function legacyGameMenuScript() {
  return {
    projectId: 'gm_game_menu_vertical_slice',
    meta: { title: 'Menu Slice', resolution: { width: 1280, height: 720 } },
    characters: {},
    scenes: {},
    ui: {
      gameMenu: {
        position: 'right',
        width: 300,
        background: 'rgba(0,0,0,0.72)',
        backgroundImage: 'backgrounds/menu-panel.png',
        borderRadius: 10,
        buttonGap: 14,
        buttons: {
          save: { text: 'Save', icon: 'ui/menu/save.png' },
          load: { text: 'Load', icon: 'ui/menu/load.png' },
          backlog: { text: 'Backlog', icon: null },
          settings: { text: 'Settings', icon: null },
          title: { text: 'Title', icon: 'ui/menu/title.png' },
          close: { text: 'Close', icon: null },
        },
        chrome: {
          backgroundImage: 'backgrounds/menu-chrome.png',
          decorations: [{ src: 'ui/menu/deco.png', x: 12, y: 20, width: 90, height: 40 }],
        },
      },
    },
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('Phase 6 game menu canonical slice', () => {
  it('maps legacy game-menu layout, actions, icons, and chrome assets into a valid canonical document', () => {
    const result = adaptLegacyUiScreen(legacyGameMenuScript(), 'gameMenu');
    expect(result.authority).toBe('legacy-only');
    expect(validateUiDocument(result.document, { screenId: 'gameMenu' })).toEqual([]);

    const panel = result.document.nodes.find(node => node.id === 'gameMenu.panel');
    expect(panel.type).toBe('stack');
    expect(panel.asset).toEqual({ kind: 'image', path: 'backgrounds/menu-chrome.png' });
    expect(panel.style.gap).toBe(14);

    expect(result.document.nodes.find(node => node.id === 'gameMenu.save').action).toEqual({
      type: 'open-screen',
      params: { screenId: 'saveLoad', mode: 'save', source: 'gameMenu' },
    });
    expect(result.document.nodes.find(node => node.id === 'gameMenu.title').action).toEqual({
      type: 'open-screen',
      params: { screenId: 'title', source: 'gameMenu' },
    });
    expect(result.document.nodes.find(node => node.id === 'gameMenu.save.icon').asset.path).toBe('ui/menu/save.png');
    expect(result.document.nodes.find(node => node.id === 'gameMenu.decoration1').asset.path).toBe('ui/menu/deco.png');
  });

  it('renders canonical game menu through SharedUiRenderer, routes actions, and confirms title return exactly once', async () => {
    globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const menu = new GameMenu(host);
    const canonical = adaptLegacyUiScreen(legacyGameMenuScript(), 'gameMenu').document;
    const onSave = vi.fn();
    const onTitle = vi.fn();
    menu.onSave = onSave;
    menu.onTitle = onTitle;
    menu.setLayout(null, { canonicalDocument: canonical });

    expect(host.querySelector('[data-gm-ui-renderer="shared"]')).toBeTruthy();
    host.querySelector('[data-gm-ui-node-id="gameMenu.save"]').click();
    expect(onSave).toHaveBeenCalledTimes(1);

    menu.show();
    host.querySelector('[data-gm-ui-node-id="gameMenu.title"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(host.querySelector('[data-gm-ui-document-id="confirmation"]')).toBeTruthy();
    host.querySelector('[data-gm-ui-node-id="confirmation.cancel"]').click();
    expect(onTitle).not.toHaveBeenCalled();

    host.querySelector('[data-gm-ui-node-id="gameMenu.title"]').click();
    host.querySelector('[data-gm-ui-node-id="confirmation.confirm"]').click();
    expect(onTitle).toHaveBeenCalledTimes(1);
  });

  it('migrates and edits canonical game menu documents through project-session operations', () => {
    const session = createProjectSession({ script: legacyGameMenuScript() });
    const migrated = session.migrateGameMenuScreen();
    expect(migrated.changedPaths).toEqual(['ui.screenSchemaVersion', 'ui.screenAuthorities.gameMenu', 'ui.screens.gameMenu']);

    session.updateGameMenuNode({ nodeId: 'gameMenu.save', path: 'content.text', value: 'Quick Save' });
    const duplicated = session.duplicateGameMenuNode({ nodeId: 'gameMenu.save', id: 'gameMenu.save.copy' });
    session.moveGameMenuNode({ nodeId: 'gameMenu.save.copy', order: 0 });
    session.removeGameMenuNode({ nodeId: 'gameMenu.save.copy' });

    const script = session.toJSON();
    expect(duplicated.nodeId).toBe('gameMenu.save.copy');
    expect(script.ui.screenAuthorities.gameMenu).toBe('canonical-active');
    expect(script.ui.screens.gameMenu.nodes.find(node => node.id === 'gameMenu.save').content.text).toBe('Quick Save');
    expect(session.validate().ok).toBe(true);
  });

  it('routes canonical game-menu assets through export scanning and theme projection', () => {
    const canonical = adaptLegacyUiScreen(legacyGameMenuScript(), 'gameMenu').document;
    const script = {
      ...legacyGameMenuScript(),
      ui: {
        screenSchemaVersion: 2,
        screenAuthorities: { gameMenu: 'canonical-active' },
        screens: { gameMenu: canonical },
      },
    };
    const assets = scanAssets(script);
    expect(assets.backgrounds).toContain('backgrounds/menu-chrome.png');
    expect(assets.backgrounds).toContain('ui/menu/deco.png');
    expect(assets.backgrounds).toContain('ui/menu/save.png');

    const projection = projectCanonicalThemeScreens(script);
    expect(projection.screens.gameMenu.nodes.find(node => node.id === 'gameMenu.title')).not.toHaveProperty('action');
    expect(projection.screens.gameMenu.nodes.find(node => node.id === 'gameMenu.save.icon').asset.path).toBe('ui/menu/save.png');
  });

  it('runs game-menu migration and canonical edits through apply-plan validate-only, dry-run, checkpoint, and rollback', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-menu-vslice-'));
    tempDirs.push(dir);
    const scriptPath = path.join(dir, 'script.json');
    const planPath = path.join(dir, 'game-menu-plan.json');
    const validateOut = path.join(dir, 'validate.json');
    const writeOut = path.join(dir, 'write.json');
    await fs.writeFile(scriptPath, JSON.stringify(legacyGameMenuScript(), null, 2), 'utf8');
    await fs.writeFile(planPath, JSON.stringify({
      version: 1,
      operations: [
        { command: 'migrate-game-menu-screen' },
        { command: 'update-game-menu-node', params: { id: 'gameMenu.save', path: 'content.text', value: 'Checkpoint Save' } },
      ],
    }), 'utf8');

    const validate = JSON.parse((await execFileAsync(process.execPath, [
      cliPath, 'apply-plan', planPath, '--script', scriptPath, '--validate-only', '--result-out', validateOut, '--json',
    ])).stdout);
    expect(validate.transaction).toMatchObject({ status: 'validated', wrote: false });
    await expect(fs.readFile(validateOut, 'utf8')).resolves.toContain('migrate-game-menu-screen');

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
    expect(JSON.parse(await fs.readFile(scriptPath, 'utf8')).ui.screens.gameMenu.nodes.find(node => node.id === 'gameMenu.save').content.text).toBe('Checkpoint Save');

    await execFileAsync(process.execPath, [
      cliPath, 'restore-checkpoint', written.transaction.checkpointPath, '--script', scriptPath, '--force', '--json',
    ]);
    expect(JSON.parse(await fs.readFile(scriptPath, 'utf8')).ui.screenAuthorities).toBeUndefined();
  });
});

describe('Phase 6 shared confirmation overlay', () => {
  it('traps a reusable confirmation document and invokes exactly one Phase 6 callback', () => {
    document.body.innerHTML = '<button id="before">Before</button><div id="host"></div>';
    document.getElementById('before').focus();
    const overlay = new SharedConfirmationOverlay(document.getElementById('host'));
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    overlay.show({
      title: 'Return?',
      body: 'Leave gameplay?',
      confirmAction: { type: 'open-screen', params: { screenId: 'title', source: 'gameMenu' } },
      cancelAction: { type: 'close-screen', params: { destination: 'gameMenu' } },
      onConfirm,
      onCancel,
    });

    expect(document.activeElement.closest('[data-gm-ui-node-id]')?.dataset.gmUiNodeId).toBe('confirmation.confirm');
    document.querySelector('[data-gm-ui-node-id="confirmation.cancel"]').click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.getElementById('before')).toBe(document.activeElement);
  });

  it('projects canonical presentation while retaining runtime-owned prompt and actions', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const overlay = new SharedConfirmationOverlay(document.getElementById('host'));
    const canonical = createSharedConfirmationDocument();
    canonical.nodes.find(node => node.id === 'confirmation.dialog').style.backgroundColor = '#123456';
    overlay.setDocument(canonical);
    overlay.show({
      title: 'Delete save?',
      body: 'This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Keep',
    });

    const dialog = document.querySelector('[data-gm-ui-node-id="confirmation.dialog"]');
    expect(dialog.style.backgroundColor).toBe('rgb(18, 52, 86)');
    expect(document.querySelector('[data-gm-ui-node-id="confirmation.title"]').textContent).toBe('Delete save?');
    expect(document.querySelector('[data-gm-ui-node-id="confirmation.confirm"]').textContent).toBe('Delete');
  });
});
