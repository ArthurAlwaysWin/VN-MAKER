import { normalizeUiMotion } from './uiMotionContract.js';

export const UI_STYLE_PRESET_CATEGORIES = Object.freeze([
  'classic-adv',
  'glass-school',
  'dark-cinema',
  'suspense-noir',
  'sci-fi-hud',
  'soft-romance',
]);

export const UI_STYLE_PRESET_SCOPES = Object.freeze(['all', 'dialogue', 'choices', 'screens']);

const SCREEN_KEYS = Object.freeze(['settingsScreen', 'gameMenu', 'saveLoadScreen', 'backlogScreen']);

export const UI_STYLE_PRESET_IMPACT_SECTIONS = Object.freeze([
  Object.freeze({ key: 'theme', path: 'ui.theme', label: '主题令牌', area: 'theme' }),
  Object.freeze({ key: 'dialogueBox', path: 'ui.dialogueBox', label: '对话框', area: 'dialogue' }),
  Object.freeze({ key: 'widgetStyles', path: 'ui.widgetStyles', label: '选项与控件', area: 'widgets' }),
  Object.freeze({ key: 'gameMenu', path: 'ui.gameMenu', label: '游戏菜单', area: 'screens' }),
  Object.freeze({ key: 'saveLoadScreen', path: 'ui.saveLoadScreen', label: '存读档界面', area: 'screens' }),
  Object.freeze({ key: 'backlogScreen', path: 'ui.backlogScreen', label: '回想界面', area: 'screens' }),
  Object.freeze({ key: 'settingsScreen', path: 'ui.settingsScreen', label: '设置界面', area: 'screens' }),
  Object.freeze({ key: 'motion', path: 'ui.motion', label: '界面动效', area: 'motion' }),
]);

const IMPACT_SECTION_KEYS_BY_SCOPE = Object.freeze({
  dialogue: Object.freeze(['theme', 'dialogueBox', 'motion']),
  choices: Object.freeze(['theme', 'widgetStyles', 'motion']),
  screens: Object.freeze(['theme', 'widgetStyles', 'gameMenu', 'saveLoadScreen', 'backlogScreen', 'settingsScreen', 'motion']),
  all: Object.freeze(['theme', 'dialogueBox', 'widgetStyles', 'gameMenu', 'saveLoadScreen', 'backlogScreen', 'settingsScreen', 'motion']),
});

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergePlainObjects(base, patch) {
  const result = cloneJsonValue(base ?? {});
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergePlainObjects(result[key], value);
    } else {
      result[key] = cloneJsonValue(value);
    }
  }
  return result;
}

function hasExistingConfigValue(value) {
  if (value === undefined) {
    return false;
  }
  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }
  return true;
}

function getPatchKeys(value) {
  return isPlainObject(value) ? Object.keys(value) : [];
}

function createPreset({
  id,
  label,
  category,
  description,
  accent,
  preview,
  recipe,
}) {
  return Object.freeze({
    id,
    label,
    category,
    description,
    accent,
    preview: Object.freeze({ ...(preview ?? {}) }),
    scopes: UI_STYLE_PRESET_SCOPES,
    recipe: Object.freeze(cloneJsonValue(recipe)),
  });
}

export const BUILTIN_UI_STYLE_PRESETS = Object.freeze([
  createPreset({
    id: 'classic-adv',
    label: '经典 ADV',
    category: 'classic-adv',
    description: '深色半透明对话框、稳定按钮和传统系统页层级。',
    accent: '#B9C4DA',
    preview: { background: '#161A22', accent: '#B9C4DA', text: 'ADV' },
    recipe: {
      theme: {
        colorRecipe: { primary: '#7D8AA6', accent: '#B9C4DA', mode: 'dark' },
        tokens: {
          primary: 'rgba(133, 147, 173, 0.94)',
          accent: 'rgba(185, 196, 218, 0.26)',
          text: 'rgba(239, 243, 249, 0.94)',
          'text-heading': 'rgba(250, 252, 255, 0.96)',
          'text-secondary': 'rgba(188, 198, 217, 0.78)',
          'dialogue-bg': 'linear-gradient(to top, rgba(12, 15, 20, 0.94), rgba(15, 19, 25, 0.78))',
          'panel-bg': 'rgba(17, 22, 30, 0.92)',
          'menu-bg': 'rgba(12, 15, 20, 0.74)',
          'card-bg': 'rgba(33, 40, 53, 0.74)',
          'btn-bg': 'rgba(92, 105, 128, 0.64)',
          'btn-hover-bg': 'rgba(124, 142, 171, 0.82)',
          'btn-border': 'rgba(185, 196, 218, 0.24)',
          shadow: 'rgba(4, 7, 11, 0.38)',
          blur: '8px',
          radius: '6px',
          'radius-lg': '8px',
        },
      },
      dialogueBox: {
        layout: 'lower-third',
        nameplateStyle: 'floating',
        background: 'rgba(12, 15, 20, 0.92)',
        border: '1px solid rgba(185, 196, 218, 0.20)',
        shadow: '0 16px 40px rgba(4, 7, 11, 0.34)',
      },
      widgetStyles: {
        tab: { activeColor: 'rgba(133, 147, 173, 0.94)', inactiveColor: 'rgba(185, 196, 218, 0.16)' },
        panel: { background: 'rgba(17, 22, 30, 0.90)', borderRadius: 8, border: '1px solid rgba(185, 196, 218, 0.20)' },
        button: { background: 'rgba(92, 105, 128, 0.64)', hoverBackground: 'rgba(124, 142, 171, 0.82)', borderRadius: 8 },
      },
      gameMenu: { background: 'rgba(12, 15, 20, 0.78)', borderRadius: 10, backdropBlur: 12 },
      saveLoadScreen: { background: 'rgba(17, 22, 30, 0.86)', slot: { border: '1px solid rgba(185, 196, 218, 0.18)' } },
      backlogScreen: { background: 'rgba(17, 22, 30, 0.86)', entry: { borderBottom: '1px solid rgba(185, 196, 218, 0.18)' } },
      settingsScreen: { header: { subtitle: '经典 ADV · 稳定系统界面' }, tabBar: { position: 'left', width: 180 } },
      motion: { intensity: 'standard', title: 'soft-rise', dialogue: 'soft-pop', choices: 'stagger-rise', menus: 'panel-fade' },
    },
  }),
  createPreset({
    id: 'glass-school',
    label: '清透校园',
    category: 'glass-school',
    description: '轻玻璃面板、蓝绿色高光和干净的校园恋爱感。',
    accent: '#84CAFF',
    preview: { background: '#0E2233', accent: '#84CAFF', text: '校园' },
    recipe: {
      theme: {
        colorRecipe: { primary: '#5CB0F7', accent: '#79D9B4', mode: 'dark' },
        tokens: {
          primary: 'rgba(92, 176, 247, 0.92)',
          accent: 'rgba(121, 217, 180, 0.24)',
          text: 'rgba(236, 246, 255, 0.95)',
          'text-heading': 'rgba(246, 251, 255, 0.98)',
          'dialogue-bg': 'linear-gradient(to top, rgba(15, 28, 42, 0.84), rgba(19, 42, 66, 0.56))',
          'panel-bg': 'rgba(14, 26, 38, 0.70)',
          'menu-bg': 'rgba(11, 24, 36, 0.62)',
          'card-bg': 'rgba(24, 48, 72, 0.42)',
          'btn-bg': 'rgba(39, 94, 148, 0.42)',
          'btn-hover-bg': 'rgba(74, 143, 217, 0.62)',
          'btn-border': 'rgba(132, 202, 255, 0.28)',
          shadow: 'rgba(4, 12, 22, 0.28)',
          blur: '14px',
          radius: '8px',
          'radius-lg': '10px',
        },
      },
      dialogueBox: { layout: 'lower-third', nameplateStyle: 'floating', background: 'rgba(15, 28, 42, 0.80)', border: '1px solid rgba(132, 202, 255, 0.22)' },
      widgetStyles: {
        tab: { activeColor: 'rgba(92, 176, 247, 0.86)', inactiveColor: 'rgba(132, 202, 255, 0.16)' },
        panel: { background: 'rgba(14, 26, 38, 0.62)', borderRadius: 10, backdropBlur: 16 },
        button: { background: 'rgba(39, 94, 148, 0.46)', hoverBackground: 'rgba(74, 143, 217, 0.70)', borderRadius: 10 },
      },
      gameMenu: { background: 'rgba(11, 24, 36, 0.62)', borderRadius: 12, backdropBlur: 18 },
      saveLoadScreen: { background: 'rgba(14, 26, 38, 0.56)', slot: { border: '1px solid rgba(92, 176, 247, 0.22)' } },
      backlogScreen: { background: 'rgba(14, 26, 38, 0.56)', entry: { borderBottom: '1px solid rgba(132, 202, 255, 0.18)' } },
      settingsScreen: { header: { subtitle: '清透校园 · 轻玻璃系统' }, tabBar: { position: 'left', width: 196 } },
      motion: { intensity: 'standard', title: 'soft-rise', dialogue: 'glass-fade', choices: 'card-pop', menus: 'panel-slide' },
    },
  }),
  createPreset({
    id: 'dark-cinema',
    label: '暗色电影',
    category: 'dark-cinema',
    description: '低饱和黑场、窄高光和慢速菜单进入。',
    accent: '#D8C06A',
    preview: { background: '#090A0D', accent: '#D8C06A', text: 'CIN' },
    recipe: {
      theme: {
        colorRecipe: { primary: '#D8C06A', accent: '#6F7682', mode: 'dark' },
        tokens: {
          primary: 'rgba(216, 192, 106, 0.90)',
          accent: 'rgba(111, 118, 130, 0.20)',
          text: 'rgba(240, 236, 226, 0.94)',
          'text-heading': 'rgba(255, 249, 230, 0.96)',
          'dialogue-bg': 'linear-gradient(to top, rgba(6, 7, 9, 0.96), rgba(12, 13, 16, 0.78))',
          'panel-bg': 'rgba(9, 10, 13, 0.92)',
          'menu-bg': 'rgba(0, 0, 0, 0.76)',
          'card-bg': 'rgba(24, 25, 29, 0.70)',
          'btn-bg': 'rgba(40, 40, 42, 0.68)',
          'btn-hover-bg': 'rgba(82, 75, 48, 0.72)',
          'btn-border': 'rgba(216, 192, 106, 0.22)',
          shadow: 'rgba(0, 0, 0, 0.42)',
          blur: '6px',
          radius: '3px',
          'radius-lg': '4px',
        },
      },
      dialogueBox: { layout: 'lower-third', nameplateStyle: 'inline', background: 'rgba(6, 7, 9, 0.94)', border: '1px solid rgba(216, 192, 106, 0.18)' },
      widgetStyles: {
        tab: { activeColor: 'rgba(216, 192, 106, 0.78)', inactiveColor: 'rgba(255, 255, 255, 0.08)' },
        panel: { background: 'rgba(9, 10, 13, 0.90)', borderRadius: 4, border: '1px solid rgba(216, 192, 106, 0.16)' },
        button: { background: 'rgba(40, 40, 42, 0.68)', hoverBackground: 'rgba(82, 75, 48, 0.72)', borderRadius: 4 },
      },
      gameMenu: { background: 'rgba(0, 0, 0, 0.78)', borderRadius: 4, backdropBlur: 8 },
      saveLoadScreen: { background: 'rgba(9, 10, 13, 0.90)', slot: { border: '1px solid rgba(216, 192, 106, 0.14)' } },
      backlogScreen: { background: 'rgba(9, 10, 13, 0.90)', entry: { borderBottom: '1px solid rgba(216, 192, 106, 0.14)' } },
      settingsScreen: { header: { subtitle: '暗色电影 · 低调黑场系统' }, tabBar: { position: 'left', width: 176 } },
      motion: { intensity: 'dramatic', title: 'cinematic-slow', dialogue: 'slide-up', choices: 'suspense-delay', menus: 'panel-fade' },
    },
  }),
  createPreset({
    id: 'suspense-noir',
    label: '悬疑黑色',
    category: 'suspense-noir',
    description: '冷灰黑、警示红细节和更克制的选择分支。',
    accent: '#B64A55',
    preview: { background: '#101114', accent: '#B64A55', text: 'NOIR' },
    recipe: {
      theme: {
        colorRecipe: { primary: '#B64A55', accent: '#9AA0A8', mode: 'dark' },
        tokens: {
          primary: 'rgba(182, 74, 85, 0.88)',
          accent: 'rgba(154, 160, 168, 0.18)',
          text: 'rgba(234, 235, 236, 0.92)',
          'text-heading': 'rgba(248, 248, 246, 0.95)',
          'dialogue-bg': 'linear-gradient(to top, rgba(10, 11, 13, 0.96), rgba(18, 19, 22, 0.80))',
          'panel-bg': 'rgba(15, 16, 19, 0.92)',
          'menu-bg': 'rgba(7, 8, 10, 0.76)',
          'card-bg': 'rgba(31, 32, 36, 0.66)',
          'btn-bg': 'rgba(48, 42, 45, 0.64)',
          'btn-hover-bg': 'rgba(94, 48, 54, 0.70)',
          'btn-border': 'rgba(182, 74, 85, 0.24)',
          shadow: 'rgba(0, 0, 0, 0.44)',
          blur: '7px',
          radius: '2px',
          'radius-lg': '4px',
        },
      },
      dialogueBox: { layout: 'lower-third', nameplateStyle: 'inline', background: 'rgba(10, 11, 13, 0.94)', border: '1px solid rgba(182, 74, 85, 0.20)' },
      widgetStyles: {
        tab: { activeColor: 'rgba(182, 74, 85, 0.82)', inactiveColor: 'rgba(154, 160, 168, 0.10)' },
        panel: { background: 'rgba(15, 16, 19, 0.92)', borderRadius: 4, border: '1px solid rgba(182, 74, 85, 0.18)' },
        button: { background: 'rgba(48, 42, 45, 0.64)', hoverBackground: 'rgba(94, 48, 54, 0.70)', borderRadius: 4 },
      },
      gameMenu: { background: 'rgba(7, 8, 10, 0.78)', borderRadius: 4, backdropBlur: 10 },
      saveLoadScreen: { background: 'rgba(15, 16, 19, 0.92)', slot: { border: '1px solid rgba(182, 74, 85, 0.16)' } },
      backlogScreen: { background: 'rgba(15, 16, 19, 0.92)', entry: { borderBottom: '1px solid rgba(182, 74, 85, 0.14)' } },
      settingsScreen: { header: { subtitle: '悬疑黑色 · 冷灰红线索系统' }, tabBar: { position: 'left', width: 180 } },
      motion: { intensity: 'dramatic', title: 'cinematic-slow', dialogue: 'glass-fade', choices: 'suspense-delay', menus: 'sidebar-sweep' },
    },
  }),
  createPreset({
    id: 'sci-fi-hud',
    label: '科幻 HUD',
    category: 'sci-fi-hud',
    description: '蓝绿发光线框、紧凑控制面板和扫描感系统页。',
    accent: '#38F0D0',
    preview: { background: '#07151C', accent: '#38F0D0', text: 'HUD' },
    recipe: {
      theme: {
        colorRecipe: { primary: '#38F0D0', accent: '#5B8CFF', mode: 'dark' },
        tokens: {
          primary: 'rgba(56, 240, 208, 0.88)',
          accent: 'rgba(91, 140, 255, 0.20)',
          text: 'rgba(226, 252, 248, 0.94)',
          'text-heading': 'rgba(240, 255, 252, 0.98)',
          'dialogue-bg': 'linear-gradient(to top, rgba(4, 18, 24, 0.94), rgba(7, 36, 46, 0.74))',
          'panel-bg': 'rgba(5, 22, 30, 0.88)',
          'menu-bg': 'rgba(2, 12, 18, 0.72)',
          'card-bg': 'rgba(12, 45, 58, 0.56)',
          'btn-bg': 'rgba(20, 82, 96, 0.54)',
          'btn-hover-bg': 'rgba(36, 128, 144, 0.72)',
          'btn-border': 'rgba(56, 240, 208, 0.28)',
          shadow: 'rgba(0, 255, 220, 0.16)',
          blur: '10px',
          radius: '2px',
          'radius-lg': '4px',
        },
      },
      dialogueBox: { layout: 'lower-third', nameplateStyle: 'banner', background: 'rgba(4, 18, 24, 0.90)', border: '1px solid rgba(56, 240, 208, 0.24)' },
      widgetStyles: {
        tab: { activeColor: 'rgba(56, 240, 208, 0.82)', inactiveColor: 'rgba(91, 140, 255, 0.12)' },
        panel: { background: 'rgba(5, 22, 30, 0.86)', borderRadius: 4, border: '1px solid rgba(56, 240, 208, 0.20)' },
        button: { background: 'rgba(20, 82, 96, 0.54)', hoverBackground: 'rgba(36, 128, 144, 0.72)', borderRadius: 4 },
      },
      gameMenu: { background: 'rgba(2, 12, 18, 0.74)', borderRadius: 4, backdropBlur: 12 },
      saveLoadScreen: { background: 'rgba(5, 22, 30, 0.88)', slot: { border: '1px solid rgba(56, 240, 208, 0.22)' } },
      backlogScreen: { background: 'rgba(5, 22, 30, 0.88)', entry: { borderBottom: '1px solid rgba(56, 240, 208, 0.18)' } },
      settingsScreen: { header: { subtitle: '科幻 HUD · 线框控制界面' }, tabBar: { position: 'left', width: 172 } },
      motion: { intensity: 'standard', title: 'glow-pulse', dialogue: 'slide-up', choices: 'card-pop', menus: 'sidebar-sweep' },
    },
  }),
  createPreset({
    id: 'soft-romance',
    label: '柔和恋爱',
    category: 'soft-romance',
    description: '柔粉、浅纸面和更温柔的对话与选择节奏。',
    accent: '#E9A9BE',
    preview: { background: '#2A1F27', accent: '#E9A9BE', text: '恋爱' },
    recipe: {
      theme: {
        colorRecipe: { primary: '#E9A9BE', accent: '#8EC7B4', mode: 'dark' },
        tokens: {
          primary: 'rgba(233, 169, 190, 0.90)',
          accent: 'rgba(142, 199, 180, 0.18)',
          text: 'rgba(255, 241, 246, 0.94)',
          'text-heading': 'rgba(255, 247, 250, 0.98)',
          'dialogue-bg': 'linear-gradient(to top, rgba(39, 28, 36, 0.92), rgba(58, 39, 50, 0.72))',
          'panel-bg': 'rgba(42, 31, 39, 0.88)',
          'menu-bg': 'rgba(38, 27, 35, 0.70)',
          'card-bg': 'rgba(82, 54, 68, 0.50)',
          'btn-bg': 'rgba(116, 72, 90, 0.52)',
          'btn-hover-bg': 'rgba(164, 96, 122, 0.68)',
          'btn-border': 'rgba(233, 169, 190, 0.24)',
          shadow: 'rgba(70, 32, 48, 0.28)',
          blur: '12px',
          radius: '8px',
          'radius-lg': '10px',
        },
      },
      dialogueBox: { layout: 'lower-third', nameplateStyle: 'floating', background: 'rgba(39, 28, 36, 0.88)', border: '1px solid rgba(233, 169, 190, 0.22)' },
      widgetStyles: {
        tab: { activeColor: 'rgba(233, 169, 190, 0.86)', inactiveColor: 'rgba(142, 199, 180, 0.12)' },
        panel: { background: 'rgba(42, 31, 39, 0.82)', borderRadius: 10, backdropBlur: 14 },
        button: { background: 'rgba(116, 72, 90, 0.52)', hoverBackground: 'rgba(164, 96, 122, 0.68)', borderRadius: 10 },
      },
      gameMenu: { background: 'rgba(38, 27, 35, 0.70)', borderRadius: 10, backdropBlur: 14 },
      saveLoadScreen: { background: 'rgba(42, 31, 39, 0.86)', slot: { border: '1px solid rgba(233, 169, 190, 0.18)' } },
      backlogScreen: { background: 'rgba(42, 31, 39, 0.86)', entry: { borderBottom: '1px solid rgba(233, 169, 190, 0.16)' } },
      settingsScreen: { header: { subtitle: '柔和恋爱 · 温柔系统界面' }, tabBar: { position: 'left', width: 184 } },
      motion: { intensity: 'subtle', title: 'soft-rise', dialogue: 'soft-pop', choices: 'stagger-rise', menus: 'panel-slide' },
    },
  }),
]);

export function isKnownUiStylePreset(presetId) {
  return BUILTIN_UI_STYLE_PRESETS.some((preset) => preset.id === presetId);
}

export function normalizeUiStylePresetScope(scope = 'all') {
  return UI_STYLE_PRESET_SCOPES.includes(scope) ? scope : 'all';
}

export function getUiStylePreset(presetId) {
  return BUILTIN_UI_STYLE_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function listUiStylePresets() {
  return BUILTIN_UI_STYLE_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    category: preset.category,
    description: preset.description,
    accent: preset.accent,
    preview: cloneJsonValue(preset.preview),
    scopes: [...preset.scopes],
  }));
}

export function getUiStylePresetImpactSections(scope = 'all') {
  const normalizedScope = normalizeUiStylePresetScope(scope);
  const keys = IMPACT_SECTION_KEYS_BY_SCOPE[normalizedScope] ?? IMPACT_SECTION_KEYS_BY_SCOPE.all;
  return keys.map((key) => {
    const section = UI_STYLE_PRESET_IMPACT_SECTIONS.find((item) => item.key === key);
    return { ...section };
  });
}

export function getUiStylePresetChangedPaths(scope = 'all') {
  return getUiStylePresetImpactSections(scope).map((section) => section.path);
}

export function buildUiStylePresetPatch(presetId, { scope = 'all' } = {}) {
  const preset = getUiStylePreset(presetId);
  if (!preset) {
    throw new Error(`Unsupported UI style preset: ${presetId}`);
  }

  const normalizedScope = normalizeUiStylePresetScope(scope);
  const recipe = preset.recipe;
  const patch = {};

  if (normalizedScope === 'all' || normalizedScope === 'dialogue' || normalizedScope === 'choices' || normalizedScope === 'screens') {
    patch.theme = cloneJsonValue(recipe.theme);
  }
  if (normalizedScope === 'all' || normalizedScope === 'dialogue') {
    patch.dialogueBox = cloneJsonValue(recipe.dialogueBox);
  }
  if (normalizedScope === 'all' || normalizedScope === 'choices' || normalizedScope === 'screens') {
    patch.widgetStyles = cloneJsonValue(recipe.widgetStyles);
  }
  if (normalizedScope === 'all' || normalizedScope === 'screens') {
    for (const key of SCREEN_KEYS) {
      patch[key] = cloneJsonValue(recipe[key]);
    }
  }

  const motionPatch = {};
  if (normalizedScope === 'all') {
    Object.assign(motionPatch, recipe.motion);
  } else if (normalizedScope === 'dialogue') {
    motionPatch.dialogue = recipe.motion.dialogue;
  } else if (normalizedScope === 'choices') {
    motionPatch.choices = recipe.motion.choices;
  } else if (normalizedScope === 'screens') {
    motionPatch.menus = recipe.motion.menus;
  }
  if (Object.keys(motionPatch).length) {
    patch.motion = motionPatch;
  }

  return {
    presetId: preset.id,
    label: preset.label,
    scope: normalizedScope,
    patch,
    changedPaths: getUiStylePresetChangedPaths(normalizedScope),
  };
}

function setUiSection(ui, key, value, merge) {
  if (value === undefined) {
    return;
  }
  ui[key] = merge ? mergePlainObjects(ui[key] ?? {}, value) : cloneJsonValue(value);
}

export function applyUiStylePresetToScript(script, { presetId, scope = 'all', merge = true } = {}) {
  const nextScript = cloneJsonValue(script ?? {});
  nextScript.ui ??= {};

  const built = buildUiStylePresetPatch(presetId, { scope });
  const { patch } = built;

  setUiSection(nextScript.ui, 'theme', patch.theme, merge);
  setUiSection(nextScript.ui, 'dialogueBox', patch.dialogueBox, merge);
  setUiSection(nextScript.ui, 'widgetStyles', patch.widgetStyles, merge);
  for (const key of SCREEN_KEYS) {
    setUiSection(nextScript.ui, key, patch[key], merge);
  }
  if (patch.motion) {
    nextScript.ui.motion = normalizeUiMotion({
      ...(merge ? nextScript.ui.motion ?? {} : {}),
      ...cloneJsonValue(patch.motion),
    });
  }

  return {
    ...built,
    impactSummary: buildUiStylePresetImpactSummary(script, {
      presetId: built.presetId,
      scope: built.scope,
      merge,
    }),
    script: nextScript,
  };
}

export function buildUiStylePresetImpactSummary(script, { presetId, scope = 'all', merge = true } = {}) {
  const built = buildUiStylePresetPatch(presetId, { scope });
  const ui = script?.ui ?? {};
  const sections = getUiStylePresetImpactSections(built.scope).map((section) => {
    const patchValue = built.patch[section.key];
    const configExists = hasExistingConfigValue(ui[section.key]);
    return {
      ...section,
      action: merge ? 'merge' : 'replace',
      configExists,
      willOverwrite: configExists,
      patchKeys: getPatchKeys(patchValue),
    };
  });

  return {
    presetId: built.presetId,
    label: built.label,
    scope: built.scope,
    merge: Boolean(merge),
    changedPaths: [...built.changedPaths],
    confirmationRequired: sections.some((section) => section.willOverwrite),
    sections,
  };
}
