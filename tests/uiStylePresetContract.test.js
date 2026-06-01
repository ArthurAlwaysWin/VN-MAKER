import { describe, expect, it } from 'vitest';

import {
  BUILTIN_UI_STYLE_PRESETS,
  UI_STYLE_PRESET_CATEGORIES,
  applyUiStylePresetToScript,
  buildUiStylePresetPatch,
  getUiStylePresetChangedPaths,
  isKnownUiStylePreset,
  listUiStylePresets,
  normalizeUiStylePresetScope,
} from '../src/shared/uiStylePresetContract.js';

function baseScript() {
  return {
    projectId: 'gm_ui_style_preset_contract',
    characters: {},
    scenes: {
      start: {
        pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Style.' }] }],
      },
    },
    ui: {
      theme: { tokens: { primary: '#111111' } },
      motion: { intensity: 'off', title: 'none', dialogue: 'none', choices: 'none', menus: 'none' },
    },
  };
}

describe('UI style preset contract', () => {
  it('lists the milestone preset categories as transparent built-in recipes', () => {
    expect(BUILTIN_UI_STYLE_PRESETS.map((preset) => preset.id)).toEqual(UI_STYLE_PRESET_CATEGORIES);
    const listed = listUiStylePresets();
    expect(listed).toHaveLength(6);
    expect(listed[0]).toEqual(expect.objectContaining({
      id: 'classic-adv',
      category: 'classic-adv',
      scopes: ['all', 'dialogue', 'choices', 'screens'],
    }));
    expect(listed[0].recipe).toBeUndefined();
  });

  it('normalizes unknown scopes without accepting unknown preset ids', () => {
    expect(normalizeUiStylePresetScope('dialogue')).toBe('dialogue');
    expect(normalizeUiStylePresetScope('bad-scope')).toBe('all');
    expect(isKnownUiStylePreset('suspense-noir')).toBe(true);
    expect(isKnownUiStylePreset('custom-css')).toBe(false);
    expect(() => buildUiStylePresetPatch('custom-css')).toThrow(/Unsupported UI style preset/);
  });

  it('builds scope-specific patches and changed paths', () => {
    const dialogue = buildUiStylePresetPatch('soft-romance', { scope: 'dialogue' });
    expect(dialogue.changedPaths).toEqual(['ui.theme', 'ui.dialogueBox', 'ui.motion']);
    expect(dialogue.patch.dialogueBox).toBeTypeOf('object');
    expect(dialogue.patch.widgetStyles).toBeUndefined();
    expect(dialogue.patch.motion).toEqual({ dialogue: 'soft-pop' });

    expect(getUiStylePresetChangedPaths('screens')).toEqual([
      'ui.theme',
      'ui.widgetStyles',
      'ui.gameMenu',
      'ui.saveLoadScreen',
      'ui.backlogScreen',
      'ui.settingsScreen',
      'ui.motion',
    ]);
  });

  it('applies a preset by writing only existing editable UI sections', () => {
    const result = applyUiStylePresetToScript(baseScript(), {
      presetId: 'suspense-noir',
      scope: 'all',
      merge: true,
    });

    expect(result.changedPaths).toEqual([
      'ui.theme',
      'ui.dialogueBox',
      'ui.widgetStyles',
      'ui.gameMenu',
      'ui.saveLoadScreen',
      'ui.backlogScreen',
      'ui.settingsScreen',
      'ui.motion',
    ]);
    expect(result.script.ui.stylePreset).toBeUndefined();
    expect(result.script.ui.theme.tokens.primary).toBe('rgba(182, 74, 85, 0.88)');
    expect(result.script.ui.dialogueBox.nameplateStyle).toBe('inline-label');
    expect(result.script.ui.widgetStyles.button).toBeTypeOf('object');
    expect(result.script.ui.settingsScreen.header.subtitle).toContain('悬疑黑色');
    expect(result.script.ui.motion).toMatchObject({
      intensity: 'dramatic',
      choices: 'suspense-delay',
    });
  });

  it('can apply a thin choice-only slice without replacing screen config', () => {
    const result = applyUiStylePresetToScript({
      ...baseScript(),
      ui: {
        settingsScreen: { header: { title: { text: 'Keep me' } } },
      },
    }, {
      presetId: 'sci-fi-hud',
      scope: 'choices',
    });

    expect(result.script.ui.settingsScreen.header.title.text).toBe('Keep me');
    expect(result.script.ui.widgetStyles.button.hoverBackground).toBe('rgba(36, 128, 144, 0.72)');
    expect(result.script.ui.motion.choices).toBe('card-pop');
  });
});
