/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChoiceMenu } from '../src/ui/ChoiceMenu.js';
import { DialogueBox } from '../src/ui/DialogueBox.js';
import { GameMenu } from '../src/ui/GameMenu.js';
import { QuickActionBar } from '../src/ui/QuickActionBar.js';
import { TextInputScreen } from '../src/ui/TextInputScreen.js';
import { TitleScreen } from '../src/ui/TitleScreen.js';
import {
  GAMEPLAY_UI_FIXTURES,
  GAME_MENU_FIXTURES,
  OVERLAY_FIXTURES,
  SCREENSHOT_TARGETS,
  TITLE_FIXTURES,
} from './fixtures/unifiedScreenDesignerLegacyFixtures.js';

describe('Unified Screen Designer Phase 1 DOM baseline', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="game"></div>';
    vi.stubGlobal('requestAnimationFrame', (callback) => callback());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('locks the project-resolution and alternate-aspect screenshot targets', () => {
    expect(SCREENSHOT_TARGETS).toEqual([
      { id: 'project', width: 1280, height: 720 },
      { id: 'wide', width: 1440, height: 900 },
    ]);
  });

  it('renders default and customized title states with working built-in actions', () => {
    const screen = new TitleScreen(document.getElementById('game'), 'Story');
    const onStart = vi.fn();
    const onGallery = vi.fn();
    screen.onStart = onStart;
    screen.onGallery = onGallery;

    screen.show(TITLE_FIXTURES.default.hasSave, TITLE_FIXTURES.default.hasGallery);
    expect(screen.el.querySelector('#title-start')).not.toBeNull();
    expect(screen.el.querySelector('#title-continue')).toBeNull();

    screen.setLayout(TITLE_FIXTURES.customized.layout);
    screen.show(TITLE_FIXTURES.customized.hasSave, TITLE_FIXTURES.customized.hasGallery);
    const buttons = [...screen.el.querySelectorAll('.title-custom-button')];
    expect(buttons.map((button) => button.textContent)).toEqual(['Begin', 'Memories']);
    buttons[0].click();
    buttons[1].click();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onGallery).toHaveBeenCalledTimes(1);
  });

  it('renders dialogue, choices, and quick actions as distinct gameplay UI owners', () => {
    const host = document.getElementById('game');
    const dialogue = new DialogueBox(host);
    dialogue.renderPreviewLine(GAMEPLAY_UI_FIXTURES.dialogue);
    expect(dialogue.nameEl.textContent).toBe('Alice');
    expect(dialogue.textEl.textContent).toBe('The archive remembers us.');
    expect(dialogue.isComplete()).toBe(true);

    const choices = new ChoiceMenu(host);
    choices.show(GAMEPLAY_UI_FIXTURES.choice);
    expect(choices.el.querySelector('.choice-prompt').textContent).toBe('Which path?');
    expect([...choices.el.querySelectorAll('.choice-button')].map((button) => button.textContent))
      .toEqual(['Follow the light', 'Stay behind']);

    const quickActions = new QuickActionBar(dialogue.el);
    quickActions.setAutoActive(GAMEPLAY_UI_FIXTURES.quickAction.auto);
    quickActions.setSkipActive(GAMEPLAY_UI_FIXTURES.quickAction.skip);
    quickActions.setQuickLoadEnabled(GAMEPLAY_UI_FIXTURES.quickAction.quickLoadEnabled);
    expect(quickActions.el.querySelector('[data-action="auto"]').classList.contains('active')).toBe(true);
    expect(quickActions.el.querySelector('[data-action="quickload"]').classList.contains('disabled')).toBe(false);
  });

  it('keeps game-menu actions delegated after customized rendering and closes locally', () => {
    const menu = new GameMenu(document.getElementById('game'));
    const onSave = vi.fn();
    menu.onSave = onSave;
    menu.setLayout(GAME_MENU_FIXTURES.layout);
    menu.show();

    menu.el.querySelector('[data-action="save"]').click();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(menu.el.classList.contains('hidden')).toBe(true);

    menu.show();
    menu.el.querySelector('[data-action="close"]').click();
    expect(menu.el.classList.contains('hidden')).toBe(true);
  });

  it('focuses required text input, rejects empty Enter, and submits trimmed-capable text by keyboard', () => {
    const input = new TextInputScreen(document.getElementById('game'));
    const onSubmit = vi.fn();
    input.onSubmit = onSubmit;
    input.show(OVERLAY_FIXTURES.textInput);

    expect(document.activeElement).toBe(input.inputEl);
    expect(input.submitEl.disabled).toBe(true);
    input.inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input.inputEl);

    input.inputEl.value = 'Luna';
    input.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    input.inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSubmit).toHaveBeenCalledWith('Luna');
    expect(input.el.classList.contains('hidden')).toBe(true);
  });
});
