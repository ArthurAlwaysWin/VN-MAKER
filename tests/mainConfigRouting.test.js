/**
 * Config routing API surface tests for main.js (Phase 45-02)
 *
 * Verifies that all UI classes have the expected setLayout / setWidgetStyles /
 * setNameplateStyle methods, that those methods are null-safe, and that
 * main.js source contains the expected config routing call patterns in both
 * init() and initPreview().
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Mocks ──────────────────────────────────────────────

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: (p) => `resolved://${p}`,
}));

import { SaveLoadScreen } from '../src/ui/SaveLoadScreen.js';
import { BacklogScreen } from '../src/ui/BacklogScreen.js';
import { GameMenu } from '../src/ui/GameMenu.js';
import { SettingsScreen } from '../src/ui/SettingsScreen.js';
import { DialogueBox } from '../src/ui/DialogueBox.js';

// ─── Helpers ──────────────────────────────────────────────

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function stubSaveManager() {
  return {
    getAllSlots: vi.fn().mockResolvedValue([]),
    saveToSlot: vi.fn(),
    deleteSlot: vi.fn(),
  };
}

function sourceSection(src, startNeedle, endNeedle) {
  const start = src.indexOf(startNeedle);
  const end = endNeedle ? src.indexOf(endNeedle, start) : src.length;
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

// ─── API Surface: setLayout ──────────────────────────────

describe('Config routing — API surface exists', () => {
  it('SaveLoadScreen has setLayout method', () => {
    const screen = new SaveLoadScreen(makeContainer(), stubSaveManager());
    expect(typeof screen.setLayout).toBe('function');
  });

  it('BacklogScreen has setLayout method', () => {
    const screen = new BacklogScreen(makeContainer());
    expect(typeof screen.setLayout).toBe('function');
  });

  it('GameMenu has setLayout method', () => {
    const menu = new GameMenu(makeContainer());
    expect(typeof menu.setLayout).toBe('function');
  });

  it('SettingsScreen has setWidgetStyles method', () => {
    const screen = new SettingsScreen(makeContainer());
    expect(typeof screen.setWidgetStyles).toBe('function');
  });

  it('DialogueBox has setNameplateStyle method', () => {
    const box = new DialogueBox(makeContainer());
    expect(typeof box.setNameplateStyle).toBe('function');
  });
});

// ─── Null safety: setLayout(null / undefined) ───────────

describe('Config routing — null safety', () => {
  it('SaveLoadScreen.setLayout(null) does not throw', () => {
    const screen = new SaveLoadScreen(makeContainer(), stubSaveManager());
    expect(() => screen.setLayout(null)).not.toThrow();
  });

  it('SaveLoadScreen.setLayout(undefined) does not throw', () => {
    const screen = new SaveLoadScreen(makeContainer(), stubSaveManager());
    expect(() => screen.setLayout(undefined)).not.toThrow();
  });

  it('BacklogScreen.setLayout(null) does not throw', () => {
    const screen = new BacklogScreen(makeContainer());
    expect(() => screen.setLayout(null)).not.toThrow();
  });

  it('BacklogScreen.setLayout(undefined) does not throw', () => {
    const screen = new BacklogScreen(makeContainer());
    expect(() => screen.setLayout(undefined)).not.toThrow();
  });

  it('GameMenu.setLayout(null) does not throw', () => {
    const menu = new GameMenu(makeContainer());
    expect(() => menu.setLayout(null)).not.toThrow();
  });

  it('GameMenu.setLayout(undefined) does not throw', () => {
    const menu = new GameMenu(makeContainer());
    expect(() => menu.setLayout(undefined)).not.toThrow();
  });

  it('SettingsScreen.setWidgetStyles(null) does not throw', () => {
    const screen = new SettingsScreen(makeContainer());
    expect(() => screen.setWidgetStyles(null)).not.toThrow();
  });

  it('SettingsScreen.setWidgetStyles(undefined) does not throw', () => {
    const screen = new SettingsScreen(makeContainer());
    expect(() => screen.setWidgetStyles(undefined)).not.toThrow();
  });

  it('DialogueBox.setNameplateStyle(null) does not throw', () => {
    const box = new DialogueBox(makeContainer());
    expect(() => box.setNameplateStyle(null)).not.toThrow();
  });

  it('DialogueBox.setNameplateStyle(undefined) does not throw', () => {
    const box = new DialogueBox(makeContainer());
    expect(() => box.setNameplateStyle(undefined)).not.toThrow();
  });
});

// ─── Source pattern verification (grep-based) ────────────

describe('Config routing — main.js source patterns', () => {
  let src;

  beforeEach(() => {
    src = readFileSync(resolve(__dirname, '../src/main.js'), 'utf-8');
  });

  // ── init() patterns ──

  it('init() calls canonical-aware Save/Load layout routing', () => {
    expect(sourceSection(src, 'async function init', 'function initPreview')).toContain('applySaveLoadLayout()');
  });

  it('init() calls canonical-aware Backlog layout routing', () => {
    expect(sourceSection(src, 'async function init', 'function initPreview')).toContain('applyBacklogLayout()');
  });

  it('init() calls canonical-aware Game Menu layout routing', () => {
    const initSection = sourceSection(src, 'async function init', 'function initPreview');
    expect(initSection).toContain('applyGameMenuLayout()');
  });

  it('init() calls settingsScreen.setWidgetStyles(engine.script.ui.widgetStyles)', () => {
    expect(src).toContain('settingsScreen.setWidgetStyles(engine.script.ui.widgetStyles)');
  });

  it('init() calls dialogueBox.setNameplateStyle(engine.script.ui.dialogueBox.nameplateStyle)', () => {
    expect(src).toContain('dialogueBox.setNameplateStyle(engine.script.ui.dialogueBox.nameplateStyle)');
  });

  // ── initPreview() patterns ──

  it('initPreview() has canonical-aware title layout routing for preview', () => {
    const previewSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    expect(previewSection).toContain('applyTitleScreenLayout()');
  });

  it('initPreview() resolves canonical or legacy Settings for preview', () => {
    const previewSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    expect(previewSection).toContain('applySettingsLayout()');
  });

  it('initPreview() has settingsScreen.setWidgetStyles for preview', () => {
    const previewSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    expect(previewSection).toContain('settingsScreen.setWidgetStyles(engine.script.ui?.widgetStyles)');
  });

  it('initPreview() has canonical-aware Save/Load routing for preview', () => {
    const previewSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    expect(previewSection).toContain('applySaveLoadLayout()');
  });

  it('initPreview() has canonical-aware Backlog routing for preview', () => {
    const previewSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    expect(previewSection).toContain('applyBacklogLayout()');
  });

  it('initPreview() has canonical-aware Game Menu layout routing for preview', () => {
    const previewSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    expect(previewSection).toContain('applyGameMenuLayout()');
  });

  it('initPreview() has dialogueBox.setNameplateStyle for preview', () => {
    const previewSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    expect(previewSection).toContain('dialogueBox.setNameplateStyle(engine.script.ui.dialogueBox.nameplateStyle)');
  });

  it('routes dialogue box snapshots through applyGlobalStyle even when reset to missing config', () => {
    const snapshotSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    const initSection = sourceSection(src, 'async function init', 'function initPreview');
    const dialoguePreviewSection = sourceSection(src, "case 'show-dialogue-preview':", "case 'show-choice-preview':");

    for (const section of [snapshotSection, initSection, dialoguePreviewSection]) {
      expect(section).toContain('dialogueBox.applyGlobalStyle(engine.script.ui?.dialogueBox)');
    }
  });

  it('routes choice badges through preview snapshots, runtime init, and live theme updates', () => {
    const snapshotSection = sourceSection(src, 'function applyPreviewScriptSnapshot', 'function establishPreviewPageBaseline');
    const initSection = sourceSection(src, 'async function init', 'function initPreview');
    const liveUpdateSection = sourceSection(src, "case 'update-theme':", "case 'update-ui-motion':");

    for (const section of [snapshotSection, initSection, liveUpdateSection]) {
      expect(section).toMatch(/applyChoiceBadge\(/);
      expect(section).toMatch(/choiceMenu\.setChoiceBadgeConfig\(/);
    }
  });

  // ── Guard patterns ──

  it('all setLayout calls are guarded with optional chaining', () => {
    expect(src).toContain("getResolvedStatefulScreen('saveLoad', 'saveLoadScreen')");
    expect(src).toContain("getResolvedStatefulScreen('backlog', 'backlogScreen')");
    expect(src).toContain('engine.script?.ui?.gameMenu');
    expect(src).toContain('engine.script.ui?.widgetStyles');
    expect(src).toContain('engine.script.ui?.dialogueBox?.nameplateStyle');
  });

  // ── No duplication ──

  it('init() does not duplicate title layout routing', () => {
    // Extract only the init() function body
    const initStart = src.indexOf('async function init');
    const initEnd = src.indexOf('function initPreview()');
    const initBody = src.slice(initStart, initEnd);
    const matches = initBody.match(/applyTitleScreenLayout/g) || [];
    expect(matches.length).toBe(1);
  });

  it('init() does not duplicate Settings layout application', () => {
    const initStart = src.indexOf('async function init');
    const initEnd = src.indexOf('function initPreview()');
    const initBody = src.slice(initStart, initEnd);
    const matches = initBody.match(/applySettingsLayout\(\)/g) || [];
    expect(matches.length).toBe(1);
  });
});
