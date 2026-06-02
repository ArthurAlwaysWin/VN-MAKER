import { describe, expect, it } from 'vitest';

import {
  BUILTIN_UI_STYLE_PRESETS,
  UI_STYLE_PRESET_CATEGORIES,
  buildUiStylePresetImpactSummary,
  applyUiStylePresetToScript,
  buildUiStylePresetPatch,
  getUiStylePresetChangedPaths,
  getUiStylePresetImpactSections,
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
    expect(dialogue.patch.titleScreen).toBeUndefined();
    expect(dialogue.patch.widgetStyles).toBeUndefined();
    expect(dialogue.patch.motion).toEqual({ dialogue: 'soft-pop' });

    expect(getUiStylePresetChangedPaths('screens')).toEqual([
      'ui.theme',
      'ui.titleScreen',
      'ui.widgetStyles',
      'ui.gameMenu',
      'ui.saveLoadScreen',
      'ui.backlogScreen',
      'ui.settingsScreen',
      'ui.motion',
    ]);
    expect(getUiStylePresetImpactSections('choices').map((section) => section.label)).toEqual([
      '主题令牌',
      '选项与控件',
      '界面动效',
    ]);
    expect(buildUiStylePresetPatch('dark-cinema', { scope: 'screens' }).patch.titleScreen.elements).toHaveLength(6);
  });

  it('summarizes preset impact before applying normal UI sections', () => {
    const summary = buildUiStylePresetImpactSummary(baseScript(), {
      presetId: 'suspense-noir',
      scope: 'dialogue',
      merge: true,
    });

    expect(summary).toMatchObject({
      presetId: 'suspense-noir',
      scope: 'dialogue',
      merge: true,
      changedPaths: ['ui.theme', 'ui.dialogueBox', 'ui.motion'],
      confirmationRequired: true,
    });
    expect(summary.sections).toEqual([
      expect.objectContaining({ key: 'theme', path: 'ui.theme', label: '主题令牌', action: 'merge', configExists: true, willOverwrite: true }),
      expect.objectContaining({ key: 'dialogueBox', path: 'ui.dialogueBox', label: '对话框', action: 'merge', configExists: false, willOverwrite: false }),
      expect.objectContaining({ key: 'motion', path: 'ui.motion', label: '界面动效', action: 'merge', configExists: true, willOverwrite: true }),
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
      'ui.titleScreen',
      'ui.dialogueBox',
      'ui.widgetStyles',
      'ui.gameMenu',
      'ui.saveLoadScreen',
      'ui.backlogScreen',
      'ui.settingsScreen',
      'ui.motion',
    ]);
    expect(result.impactSummary.sections.map((section) => section.path)).toEqual(result.changedPaths);
    expect(result.script.ui.stylePreset).toBeUndefined();
    expect(result.script.ui.theme.tokens.primary).toBe('rgba(182, 74, 85, 0.88)');
    expect(result.script.ui.titleScreen.elements.map((element) => element.type)).toEqual([
      'text',
      'text',
      'button',
      'button',
      'button',
      'button',
    ]);
    expect(result.script.ui.titleScreen.elements.some((element) => element.type === 'image')).toBe(false);
    expect(result.script.ui.titleScreen.particles).toBeUndefined();
    expect(result.script.ui.dialogueBox.nameplateStyle).toBe('inline');
    expect(result.script.ui.widgetStyles.button).toBeTypeOf('object');
    expect(result.script.ui.saveLoadScreen.background).toBe('rgba(15, 16, 19, 0.92)');
    expect(result.script.ui.saveLoadScreen.chrome?.backgroundColor).toBeUndefined();
    expect(result.script.ui.backlogScreen.background).toBe('rgba(15, 16, 19, 0.92)');
    expect(result.script.ui.settingsScreen.header.subtitle).toContain('悬疑黑色');
    expect(result.script.ui.motion).toMatchObject({
      intensity: 'dramatic',
      choices: 'suspense-delay',
    });
  });

  it('keeps title screen recipes asset-free and repeatable', () => {
    for (const preset of BUILTIN_UI_STYLE_PRESETS) {
      const titleScreen = preset.recipe.titleScreen;
      expect(titleScreen.background).toBeUndefined();
      expect(titleScreen.bgm).toBeUndefined();
      expect(titleScreen.particles).toBeUndefined();
      expect(titleScreen.elements).toHaveLength(6);
      expect(titleScreen.elements.filter((element) => element.type === 'button').map((button) => button.action)).toEqual([
        'start',
        'continue',
        'gallery',
        'settings',
      ]);
      expect(titleScreen.elements.some((element) => element.src)).toBe(false);
    }

    const once = applyUiStylePresetToScript(baseScript(), {
      presetId: 'classic-adv',
      scope: 'all',
    });
    const twice = applyUiStylePresetToScript(once.script, {
      presetId: 'classic-adv',
      scope: 'all',
    });

    expect(twice.script.ui.stylePreset).toBeUndefined();
    expect(twice.script.ui.titleScreen.elements).toHaveLength(6);
    expect(twice.script.ui.titleScreen.particles).toBeUndefined();
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
