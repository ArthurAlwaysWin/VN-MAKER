import { mapLegacyUiAction } from './uiActionContract.js';
import { absoluteLegacyLayout, normalizeUiLayout } from './uiLayoutContract.js';
import { UI_OVERLAY_IDS, UI_SCREEN_IDS, UI_SCREEN_SCHEMA_VERSION, normalizeUiDocument } from './uiDocumentContract.js';
import { normalizeSettingsAssignments } from './settingsScreenContract.js';

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const issue = (severity, code, message, path = [], details = {}) => ({ severity, code, message, path, pathString: path.join('.'), ...details });
const cleanId = value => String(value ?? 'node').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+/, '') || 'node';
const resolutionOf = script => ({ width: script?.meta?.resolution?.width ?? script?.resolution?.width ?? 1280, height: script?.meta?.resolution?.height ?? script?.resolution?.height ?? 720 });

const LEGACY_PATHS = Object.freeze({
  title: ['titleScreen'], gameplay: ['dialogueBox'], gameMenu: ['gameMenu'], settings: ['settingsScreen'], saveLoad: ['saveLoadScreen'], backlog: ['backlogScreen'], gallery: [],
});

const HANDLED_LEGACY_KEYS = Object.freeze({
  title: new Set(['background', 'bgm', 'openingVideo', 'elements']), gameplay: new Set([
    'x', 'y', 'width', 'height', 'background', 'backgroundColor', 'backgroundImage', 'opacity', 'borderRadius', 'padding', 'gap',
    'fontSize', 'fontFamily', 'textColor', 'nameplateFontSize', 'nameplateFontFamily', 'nameplateColor', 'nameplateStyle',
    'nameplateBackgroundImage', 'decorations', 'nameplate',
  ]),
  gameMenu: new Set(['position', 'width', 'background', 'backgroundImage', 'opacity', 'borderRadius', 'backdropBlur', 'buttonGap', 'gap', 'buttons', 'chrome']),
  settings: new Set(['background', 'backgroundImage', 'header', 'tabBar', 'contentArea', 'footer', 'elements', 'chrome']),
  saveLoad: new Set(['background', 'backgroundImage', 'backdropBlur', 'header', 'slotGrid', 'slot', 'pagination', 'chrome']),
  backlog: new Set(['background', 'backgroundImage', 'header', 'entry', 'chrome']), gallery: new Set(),
});

function reportUnsupportedLegacyFields(screenId, legacy, diagnostics) {
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return;
  const base = ['ui', ...(LEGACY_PATHS[screenId] ?? [])];
  for (const key of Object.keys(legacy).sort()) {
    if (!HANDLED_LEGACY_KEYS[screenId].has(key)) diagnostics.push(issue('warning', 'ui-legacy-field-unsupported', `Legacy field "${key}" is preserved in source but is not representable in the Phase 2 canonical composition adapter.`, [...base, key]));
  }
  if (screenId === 'title') for (const [index, element] of (legacy.elements ?? []).entries()) {
    for (const key of Object.keys(element ?? {}).sort()) if (!['id', 'type', 'content', 'text', 'action', 'src', 'x', 'y', 'anchor', 'width', 'height', 'fontSize', 'fontFamily', 'color', 'backgroundColor', 'borderRadius', 'border', 'hoverColor', 'letterSpacing', 'textShadow', 'opacity'].includes(key)) diagnostics.push(issue('warning', 'ui-legacy-field-unsupported', `Legacy title element field "${key}" is not representable.`, [...base, 'elements', index, key]));
  }
}

function root(screenId, kind, resolution) {
  return { id: `${screenId}.root`, type: 'panel', parentId: null, order: 0, layout: normalizeUiLayout(), parts: [], content: { role: `${kind}-root` } };
}

const SEMANTIC = Object.freeze({ gameplay: ['dialogue-box', ['text']], gameMenu: ['stack', []], settings: ['settings-group', ['controls']], saveLoad: ['save-slot-grid', ['slots', 'pagination']], backlog: ['backlog-list', ['entries']], gallery: ['gallery-grid', ['items']] });

function typedLegacyStyle(value, path, diagnostics) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/);
    if (match) return Number(match[1]);
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;
  }
  diagnostics.push(issue('warning', 'ui-legacy-value-loss', 'Legacy CSS-like value cannot be represented as a typed canonical value.', path, { value }));
  return undefined;
}

function addLegacyVisuals(node, legacy, path, diagnostics) {
  const background = legacy?.background;
  if (typeof background === 'string' && background.trim()) {
    if (/^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(background.trim())) node.style = { ...(node.style ?? {}), backgroundColor: background.trim() };
    else node.asset = { kind: 'image', path: background.trim() };
  }
  if (typeof legacy?.backgroundImage === 'string' && legacy.backgroundImage.trim()) node.asset = { kind: 'image', path: legacy.backgroundImage.trim() };
  const style = {};
  for (const [legacyKey, canonicalKey] of [['opacity', 'opacity'], ['borderRadius', 'borderRadius'], ['gap', 'gap']]) {
    if (legacy?.[legacyKey] !== undefined) {
      const value = typedLegacyStyle(legacy[legacyKey], [...path, legacyKey], diagnostics);
      if (value !== undefined) style[canonicalKey] = value;
    }
  }
  if (Object.keys(style).length) node.style = { ...(node.style ?? {}), ...style };
}

function parseSimpleBorder(value, path, diagnostics) {
  if (typeof value !== 'string' || !value.trim()) return {};
  const match = value.trim().match(/^(\d+(?:\.\d+)?)px\s+solid\s+(.+)$/i);
  if (!match) {
    diagnostics.push(issue('warning', 'ui-legacy-value-loss', 'Legacy border string cannot be represented as typed borderWidth/borderColor.', path, { value }));
    return {};
  }
  return { borderWidth: Number(match[1]), borderColor: match[2].trim() };
}

function titleNodes(legacy, resolution, diagnostics) {
  const nodes = [root('title', 'screen', resolution)];
  addLegacyVisuals(nodes[0], legacy, ['ui', 'titleScreen'], diagnostics);
  for (const [index, element] of (Array.isArray(legacy?.elements) ? legacy.elements : []).entries()) {
    const type = ['text', 'image', 'button'].includes(element?.type) ? element.type : null;
    if (!type) { diagnostics.push(issue('warning', 'ui-legacy-field-unsupported', 'Unsupported title element type was not mapped.', ['ui', 'titleScreen', 'elements', index, 'type'], { value: element?.type })); continue; }
    const id = `title.${cleanId(element.id ?? `${type}-${index + 1}`)}`;
    const node = { id, type, parentId: 'title.root', order: index, layout: absoluteLegacyLayout(element, resolution), parts: [] };
    if (type === 'text' || type === 'button') node.content = { text: String(element.content ?? element.text ?? '') };
    const style = {};
    if (Number.isFinite(element.fontSize)) style.fontSize = element.fontSize;
    if (typeof element.fontFamily === 'string') style.fontFamily = element.fontFamily;
    if (typeof element.color === 'string') style.color = element.color;
    if (typeof element.backgroundColor === 'string') style.backgroundColor = element.backgroundColor;
    if (Number.isFinite(element.opacity)) style.opacity = element.opacity;
    if (Number.isFinite(element.borderRadius)) style.borderRadius = element.borderRadius;
    if (Number.isFinite(element.letterSpacing)) style.letterSpacing = element.letterSpacing;
    if (typeof element.textShadow === 'string' && element.textShadow.trim()) style.textShadow = element.textShadow;
    if (type === 'image') style.objectFit = 'contain';
    Object.assign(style, parseSimpleBorder(element.border, ['ui', 'titleScreen', 'elements', index, 'border'], diagnostics));
    if (Object.keys(style).length) node.style = style;
    if (type === 'image' && typeof element.src === 'string') node.asset = { kind: 'image', path: element.src };
    if (type === 'button') {
      const mapped = mapLegacyUiAction('title', element.action);
      if (mapped.action) node.action = mapped.action;
      if (typeof element.hoverColor === 'string') node.states = { hover: { backgroundColor: element.hoverColor } };
      diagnostics.push(...mapped.diagnostics.map(d => ({ ...d, path: ['ui', 'titleScreen', 'elements', index, 'action'], pathString: `ui.titleScreen.elements.${index}.action` })));
    }
    nodes.push(node);
  }
  return nodes;
}

function gameplayNodes(script, resolution, diagnostics) {
  const legacy = script?.ui?.dialogueBox ?? {};
  const nodes = [root('gameplay', 'screen', resolution)];
  const dialogueLayout = absoluteLegacyLayout({
    x: legacy.x ?? 40,
    y: legacy.y ?? Math.max(0, resolution.height - (legacy.height ?? 190) - 28),
    width: legacy.width ?? Math.max(320, resolution.width - 80),
    height: legacy.height ?? 190,
  }, resolution);
  const storyViewport = {
    id: 'gameplay.storyViewport', type: 'story-viewport', parentId: 'gameplay.root', order: 0,
    layout: normalizeUiLayout(), parts: ['viewport'], binding: { source: 'story.viewport' },
    content: { label: 'Story viewport (Page Editor owned)', accessibleName: 'Protected story viewport' },
    semanticInfo: { protectedParts: ['viewport'], owner: 'PageEditor' },
  };
  const dialogue = {
    id: 'gameplay.dialogue', type: 'dialogue-box', parentId: 'gameplay.root', order: 1,
    layout: dialogueLayout, parts: ['text'], binding: { source: 'dialogue.current' },
    content: { label: 'Dialogue', presentation: 'runtime-owned', legacyDecorationCount: Array.isArray(legacy.decorations) ? legacy.decorations.length : 0 },
    semanticInfo: { protectedParts: ['text'], owner: 'DialogueBox' },
  };
  addLegacyVisuals(dialogue, legacy, ['ui', 'dialogueBox'], diagnostics);
  const dialogueStyle = { ...(dialogue.style ?? {}) };
  if (Number.isFinite(legacy.fontSize)) dialogueStyle.fontSize = legacy.fontSize;
  if (typeof legacy.fontFamily === 'string' && legacy.fontFamily.trim()) dialogueStyle.fontFamily = legacy.fontFamily;
  if (typeof legacy.textColor === 'string' && legacy.textColor.trim()) dialogueStyle.color = legacy.textColor;
  if (Object.keys(dialogueStyle).length) dialogue.style = dialogueStyle;
  nodes.push(storyViewport, dialogue);

  const nameplate = {
    id: 'gameplay.nameplate', type: 'nameplate', parentId: 'gameplay.dialogue', order: 0,
    layout: absoluteLegacyLayout({ x: 16, y: -34, width: 320, height: 44 }, resolution),
    parts: ['label'], binding: { source: 'dialogue.current' },
    content: { label: 'Speaker', presentation: legacy.nameplateStyle ?? 'inline' },
    semanticInfo: { protectedParts: ['label'], owner: 'DialogueBox' },
  };
  const nameplateStyle = {};
  if (Number.isFinite(legacy.nameplateFontSize)) nameplateStyle.fontSize = legacy.nameplateFontSize;
  if (typeof legacy.nameplateFontFamily === 'string' && legacy.nameplateFontFamily.trim()) nameplateStyle.fontFamily = legacy.nameplateFontFamily;
  if (typeof legacy.nameplateColor === 'string' && legacy.nameplateColor.trim()) nameplateStyle.color = legacy.nameplateColor;
  if (Object.keys(nameplateStyle).length) nameplate.style = nameplateStyle;
  if (typeof legacy.nameplateBackgroundImage === 'string' && legacy.nameplateBackgroundImage.trim()) nameplate.asset = { kind: 'image', path: legacy.nameplateBackgroundImage.trim() };
  nodes.push(nameplate);

  for (const [index, decoration] of (Array.isArray(legacy.decorations) ? legacy.decorations : []).entries()) {
    if (typeof decoration?.src !== 'string' || !decoration.src.trim()) {
      diagnostics.push(issue('warning', 'ui-legacy-field-unsupported', 'Dialogue decoration without a safe image source was preserved only in the legacy fallback.', ['ui', 'dialogueBox', 'decorations', index]));
      continue;
    }
    nodes.push({
      id: `gameplay.dialogue.decoration${index + 1}`, type: 'image', parentId: 'gameplay.dialogue', order: index + 10,
      layout: absoluteLegacyLayout(decoration, resolution), parts: [], asset: { kind: 'image', path: decoration.src.trim() },
      content: { alt: '' }, style: { objectFit: 'contain', ...(Number.isFinite(Number(decoration.opacity)) ? { opacity: Math.max(0, Math.min(1, Number(decoration.opacity))) } : {}) },
    });
  }

  nodes.push({
    id: 'gameplay.choices', type: 'choice-list', parentId: 'gameplay.root', order: 2,
    layout: absoluteLegacyLayout({ x: resolution.width * 0.2, y: resolution.height * 0.2, width: resolution.width * 0.6, height: resolution.height * 0.5 }, resolution),
    parts: ['options'], binding: { source: 'choice.options' },
    content: { label: 'Choices', badges: clone(script?.ui?.theme?.choiceBadge ?? {}), widgetStyle: clone(script?.ui?.widgetStyles?.button ?? {}) },
    semanticInfo: { protectedParts: ['options'], owner: 'ChoiceMenu' },
  });
  nodes.push({
    id: 'gameplay.quickActions', type: 'quick-action-bar', parentId: 'gameplay.root', order: 3,
    layout: absoluteLegacyLayout({ x: Math.max(16, resolution.width - 470), y: Math.max(16, resolution.height - 58), width: 450, height: 42 }, resolution),
    parts: ['actions'], binding: { source: 'runtime.quickActions' },
    content: { label: 'Quick actions', actions: ['auto', 'skip', 'backlog', 'save', 'load', 'quicksave', 'quickload', 'settings'], iconFamily: 'qab' },
    semanticInfo: { protectedParts: ['actions'], owner: 'QuickActionBar' },
  });
  nodes.push({
    id: 'gameplay.skipStatus', type: 'skip-status', parentId: 'gameplay.root', order: 4,
    layout: absoluteLegacyLayout({ x: resolution.width - 180, y: 20, width: 150, height: 38 }, resolution),
    parts: ['status'], binding: { source: 'runtime.skipStatus' }, content: { text: '▶▶ SKIP', accessibleName: 'Skip status' },
    semanticInfo: { protectedParts: ['status'], owner: 'ScriptEngine runtime state' },
  });
  return nodes;
}

function genericNodes(screenId, legacy, resolution, diagnostics) {
  const nodes = [root(screenId, 'screen', resolution)];
  const [type, parts] = SEMANTIC[screenId];
  const semantic = { id: `${screenId}.content`, type, parentId: `${screenId}.root`, order: 0, layout: normalizeUiLayout(), parts };
  const bindings = { gameplay: 'dialogue.current', settings: 'settings.controls', saveLoad: 'save.slots', backlog: 'backlog.entries', gallery: 'gallery.items' };
  if (bindings[screenId]) semantic.binding = { source: bindings[screenId] };
  if (['gameplay', 'settings', 'saveLoad'].includes(screenId)) {
    const box = screenId === 'settings' ? legacy?.contentArea : screenId === 'saveLoad' ? legacy?.slotGrid : legacy;
    if (box) semantic.layout = absoluteLegacyLayout(box, resolution);
  }
  addLegacyVisuals(nodes[0], legacy, ['ui', ...(LEGACY_PATHS[screenId] ?? [])], diagnostics);
  if (screenId !== 'settings') nodes.push(semantic);
  if (screenId === 'gameplay' && legacy?.nameplate?.enabled !== false) {
    nodes.push({ id: 'gameplay.nameplate', type: 'nameplate', parentId: 'gameplay.content', order: 0, layout: absoluteLegacyLayout(legacy?.nameplate ?? {}, resolution), parts: ['label'], binding: { source: 'dialogue.current' } });
  }
  if (screenId === 'gameMenu') {
    semantic.id = 'gameMenu.panel';
    semantic.content = { accessibleName: 'Game menu navigation' };
    if (Number.isFinite(legacy?.width)) semantic.layout = absoluteLegacyLayout({ x: legacy.position === 'right' ? resolution.width - legacy.width : legacy.position === 'center' ? (resolution.width - legacy.width) / 2 : 0, y: 0, width: legacy.width, height: resolution.height }, resolution);
    const buttonGap = Number.isFinite(legacy?.buttonGap ?? legacy?.gap) ? legacy.buttonGap ?? legacy.gap : 10;
    if (Number.isFinite(legacy?.buttonGap ?? legacy?.gap)) semantic.style = { gap: buttonGap };
    const panelImage = legacy?.chrome?.backgroundImage || legacy?.backgroundImage;
    if (typeof panelImage === 'string' && panelImage.trim()) semantic.asset = { kind: 'image', path: panelImage.trim() };
    const actions = ['save', 'load', 'backlog', 'settings', 'title', 'close'];
    actions.forEach((action, index) => {
      const mapped = mapLegacyUiAction('gameMenu', action);
      diagnostics.push(...mapped.diagnostics.map(d => ({ ...d, path: ['ui', 'gameMenu', 'buttons', action], pathString: `ui.gameMenu.buttons.${action}` })));
      const button = { id: `gameMenu.${action}`, type: 'button', parentId: 'gameMenu.panel', order: index, layout: normalizeUiLayout({ anchor: { minX: 0.5, maxX: 0.5, minY: 0, maxY: 0 }, pivot: { x: 0.5, y: 0 }, offset: { x: 0, y: 20 + index * (48 + buttonGap) }, size: { width: Number.isFinite(legacy?.width) ? Math.max(120, legacy.width - 40) : 220, height: 48 } }), parts: [], content: { text: legacy?.buttons?.[action]?.text ?? action, accessibleName: legacy?.buttons?.[action]?.text ?? action }, action: mapped.action };
      if (Number.isFinite(legacy?.borderRadius)) button.style = { borderRadius: legacy.borderRadius };
      nodes.push(button);
      if (typeof legacy?.buttons?.[action]?.icon === 'string' && legacy.buttons[action].icon.includes('/')) {
        nodes.push({ id: `gameMenu.${action}.icon`, type: 'image', parentId: `gameMenu.${action}`, order: 0, layout: normalizeUiLayout({ anchor: { minX: 0, maxX: 0, minY: 0.5, maxY: 0.5 }, pivot: { x: 0, y: 0.5 }, offset: { x: 12, y: 0 }, size: { width: 24, height: 24 } }), parts: [], asset: { kind: 'image', path: legacy.buttons[action].icon }, content: { alt: '' }, style: { objectFit: 'contain' } });
      }
    });
    for (const [index, decoration] of (legacy?.chrome?.decorations ?? []).entries()) {
      if (typeof decoration?.src !== 'string' || !decoration.src.trim()) continue;
      nodes.push({ id: `gameMenu.decoration${index + 1}`, type: 'image', parentId: 'gameMenu.root', order: index + 10, layout: absoluteLegacyLayout(decoration, resolution), parts: [], asset: { kind: 'image', path: decoration.src }, content: { alt: '' }, style: { objectFit: 'contain', ...(Number.isFinite(decoration.opacity) ? { opacity: decoration.opacity } : {}) } });
    }
  }
  if (screenId === 'settings') {
    const customElements = Array.isArray(legacy?.elements) ? legacy.elements : [];
    const customSettingIds = customElements.filter(element => element?.type === 'setting').map(element => element.settingType);
    const customMode = customElements.length > 0;
    const assignment = normalizeSettingsAssignments(
      customMode ? [{ id: 'custom', label: '设置', settingKeys: customSettingIds }] : legacy?.tabBar?.tabs,
      { tabsEnabled: customMode ? false : legacy?.tabBar?.enabled !== false },
    );
    diagnostics.push(...assignment.diagnostics);
    nodes.push({
      id: 'settings.header', type: 'text', parentId: 'settings.root', order: 0,
      layout: absoluteLegacyLayout({ x: 0, y: 0, width: resolution.width, height: legacy?.header?.height ?? 90 }, resolution),
      parts: [], content: { text: legacy?.header?.title?.text ?? legacy?.header?.title ?? '系统设定', accessibleName: 'Settings title' },
      ...(legacy?.header?.backgroundImage ? { asset: { kind: 'image', path: legacy.header.backgroundImage } } : {}),
    });
    for (const [index, decoration] of (legacy?.header?.decorations ?? []).entries()) {
      if (typeof decoration?.src !== 'string' || !decoration.src.trim()) continue;
      nodes.push({ id: `settings.header.decoration${index + 1}`, type: 'image', parentId: 'settings.root', order: index + 20, layout: absoluteLegacyLayout(decoration, resolution), parts: [], asset: { kind: 'image', path: decoration.src }, content: { alt: '' }, style: { objectFit: 'contain' } });
    }
    nodes.push({
      id: 'settings.tabs', type: 'tab-bar', parentId: 'settings.root', order: 1,
      layout: absoluteLegacyLayout(legacy?.tabBar?.position === 'left'
        ? { x: 16, y: legacy?.header?.height ?? 90, width: legacy?.tabBar?.width ?? 180, height: resolution.height - (legacy?.header?.height ?? 90) - 70 }
        : { x: 40, y: legacy?.header?.height ?? 90, width: resolution.width - 80, height: legacy?.tabBar?.height ?? 56 }, resolution),
      parts: ['tabs'], binding: { source: 'settings.controls' },
      content: { mode: assignment.mode, position: legacy?.tabBar?.position === 'left' ? 'left' : 'top', tabs: assignment.tabs.map(tab => ({ id: tab.id, label: tab.label, ...(tab.icon ? { icon: tab.icon } : {}), groupId: `settings.group.${cleanId(tab.id)}` })) },
    });
    nodes.push({ id: 'settings.headerClose', type: 'button', parentId: 'settings.root', order: 19, layout: absoluteLegacyLayout({ x: resolution.width - 72, y: 20, width: 48, height: 48 }, resolution), parts: [], content: { text: '×', accessibleName: 'Close settings' }, action: { type: 'close-screen' } });
    for (const [tabIndex, tab] of assignment.tabs.entries()) {
      const groupId = `settings.group.${cleanId(tab.id)}`;
      nodes.push({
        id: groupId, type: 'settings-group', parentId: 'settings.root', order: tabIndex + 2,
        layout: absoluteLegacyLayout(legacy?.contentArea ?? {}, resolution), parts: ['controls'],
        content: { tabId: tab.id, label: tab.label, columns: legacy?.contentArea?.columns === 2 ? 2 : 1, itemStyle: clone(legacy?.contentArea?.itemStyle ?? {}) },
        binding: { source: 'settings.controls' },
      });
      for (const [settingIndex, settingId] of tab.settingIds.entries()) {
        const custom = customElements.find(element => element?.type === 'setting' && element.settingType === settingId);
        nodes.push({
          id: `settings.control.${cleanId(settingId)}`, type: 'settings-control', parentId: groupId, order: settingIndex,
          layout: custom ? absoluteLegacyLayout(custom, resolution) : normalizeUiLayout(), parts: ['control'],
          content: { settingId, ...(custom?.label ? { label: custom.label } : {}) },
          binding: { source: 'settings.controls' },
          ...(custom?.style?.labelColor ? { style: { color: custom.style.labelColor } } : {}),
        });
      }
    }
    for (const [index, element] of customElements.entries()) {
      if (!['label', 'image', 'button'].includes(element?.type)) continue;
      const id = `settings.custom.${cleanId(element.id ?? `${element.type}-${index + 1}`)}`;
      const base = { id, parentId: 'settings.root', order: index + 40, layout: absoluteLegacyLayout(element, resolution), parts: [] };
      if (element.type === 'label') nodes.push({ ...base, type: 'text', content: { text: element.text ?? '' }, ...(element.style?.color ? { style: { color: element.style.color } } : {}) });
      if (element.type === 'image' && element.src) nodes.push({ ...base, type: 'image', asset: { kind: 'image', path: element.src }, content: { alt: '' }, style: { objectFit: 'contain' } });
      if (element.type === 'button') {
        const mapped = mapLegacyUiAction('settings', element.action);
        diagnostics.push(...mapped.diagnostics.map(d => ({ ...d, path: ['ui', 'settingsScreen', 'elements', index, 'action'], pathString: `ui.settingsScreen.elements.${index}.action` })));
        nodes.push({ ...base, type: 'button', content: { text: element.label ?? '返回', accessibleName: element.label ?? element.action ?? 'Settings action' }, ...(mapped.action ? { action: mapped.action } : {}) });
      }
    }
    for (const [index, button] of (legacy?.footer?.buttons ?? []).entries()) {
      const mapped = mapLegacyUiAction('settings', button?.action);
      diagnostics.push(...mapped.diagnostics.map(d => ({ ...d, path: ['ui', 'settingsScreen', 'footer', 'buttons', index, 'action'], pathString: `ui.settingsScreen.footer.buttons.${index}.action` })));
      nodes.push({
        id: `settings.${cleanId(button?.id ?? `footer-${index}`)}`, type: 'button', parentId: 'settings.root', order: index + 30,
        layout: absoluteLegacyLayout({ x: button?.x ?? resolution.width - 160 * ((legacy.footer.buttons.length - index)), y: button?.y ?? resolution.height - 58, width: button?.width ?? 140, height: button?.height ?? 42 }, resolution),
        parts: [], content: { text: button?.text ?? '', accessibleName: button?.text ?? button?.action ?? 'Settings action' }, ...(mapped.action ? { action: mapped.action } : {}),
      });
    }
    for (const [index, decoration] of (legacy?.chrome?.decorations ?? []).entries()) {
      if (typeof decoration?.src !== 'string' || !decoration.src.trim()) continue;
      nodes.push({ id: `settings.decoration${index + 1}`, type: 'image', parentId: 'settings.root', order: index + 60, layout: absoluteLegacyLayout(decoration, resolution), parts: [], asset: { kind: 'image', path: decoration.src }, content: { alt: '' }, style: { objectFit: 'contain', ...(Number.isFinite(decoration.opacity) ? { opacity: decoration.opacity } : {}) } });
    }
  }
  if (screenId === 'saveLoad') {
    semantic.content = { modes: ['save', 'load'], mode: 'save', columns: legacy?.slotGrid?.columns, rows: legacy?.slotGrid?.rows, emptyText: legacy?.slot?.emptyText, slotStyle: clone(legacy?.slot ?? {}), paginationStyle: clone(legacy?.pagination ?? {}) };
    if (Number.isFinite(legacy?.slotGrid?.gap)) semantic.style = { gap: legacy.slotGrid.gap };
    if (typeof legacy?.slot?.backgroundImage === 'string' && legacy.slot.backgroundImage.trim()) semantic.asset = { kind: 'image', path: legacy.slot.backgroundImage.trim() };
    nodes.push({ id: 'saveLoad.header', type: 'text', parentId: 'saveLoad.root', order: 0, layout: absoluteLegacyLayout({ x: 0, y: 0, width: resolution.width, height: legacy?.header?.height ?? 80 }, resolution), parts: [], content: { text: legacy?.header?.saveTitle ?? '存 档' }, ...(legacy?.header?.backgroundImage ? { asset: { kind: 'image', path: legacy.header.backgroundImage } } : {}) });
    nodes.push({ id: 'saveLoad.close', type: 'button', parentId: 'saveLoad.root', order: 1, layout: absoluteLegacyLayout({ x: resolution.width - 140, y: 20, width: 120, height: 44 }, resolution), parts: [], content: { text: '返回', accessibleName: 'Close save/load' }, action: { type: 'close-screen' } });
    semantic.order = 2;
    for (const [index, decoration] of (legacy?.chrome?.decorations ?? []).entries()) {
      if (typeof decoration?.src !== 'string' || !decoration.src.trim()) continue;
      nodes.push({ id: `saveLoad.decoration${index + 1}`, type: 'image', parentId: 'saveLoad.root', order: index + 10, layout: absoluteLegacyLayout(decoration, resolution), parts: [], asset: { kind: 'image', path: decoration.src }, content: { alt: '' }, style: { objectFit: 'contain', ...(Number.isFinite(decoration.opacity) ? { opacity: decoration.opacity } : {}) } });
    }
  }
  if (screenId === 'backlog') {
    semantic.content = { title: legacy?.header?.title ?? 'Backlog', voiceReplay: true, emptyText: legacy?.entry?.emptyText ?? '暂无历史记录' };
    const entryStyle = {};
    if (Number.isFinite(legacy?.entry?.textFontSize)) entryStyle.fontSize = legacy.entry.textFontSize;
    if (Object.keys(entryStyle).length) semantic.style = entryStyle;
    semantic.layout = normalizeUiLayout({ anchor: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, pivot: { x: 0, y: 0 }, offset: { x: 0, y: 80 } });
    semantic.content.entryStyle = clone(legacy?.entry ?? {});
    nodes.push({ id: 'backlog.header', type: 'text', parentId: 'backlog.root', order: 0, layout: normalizeUiLayout({ anchor: { minX: 0, minY: 0, maxX: 1, maxY: 0 }, pivot: { x: 0, y: 0 }, size: { width: 'auto', height: legacy?.header?.height ?? 80 } }), parts: [], content: { text: legacy?.header?.title ?? '回 想' }, ...(legacy?.header?.backgroundImage ? { asset: { kind: 'image', path: legacy.header.backgroundImage } } : {}) });
    nodes.push({ id: 'backlog.close', type: 'button', parentId: 'backlog.root', order: 1, layout: normalizeUiLayout({ anchor: { minX: 1, minY: 0, maxX: 1, maxY: 0 }, pivot: { x: 1, y: 0 }, offset: { x: -20, y: 20 }, size: { width: 120, height: 44 } }), parts: [], content: { text: '返回', accessibleName: 'Close backlog' }, action: { type: 'close-screen' } });
    semantic.order = 2;
    for (const [index, decoration] of (legacy?.chrome?.decorations ?? []).entries()) {
      if (typeof decoration?.src !== 'string' || !decoration.src.trim()) continue;
      nodes.push({ id: `backlog.decoration${index + 1}`, type: 'image', parentId: 'backlog.root', order: index + 10, layout: absoluteLegacyLayout(decoration, resolution), parts: [], asset: { kind: 'image', path: decoration.src }, content: { alt: '' }, style: { objectFit: 'contain', ...(Number.isFinite(decoration.opacity) ? { opacity: decoration.opacity } : {}) } });
    }
  }
  if (screenId === 'gallery') {
    semantic.id = 'gallery.grid';
    semantic.layout = normalizeUiLayout({ anchor: { minX: 0.38, minY: 0.14, maxX: 1, maxY: 1 }, pivot: { x: 0, y: 0 }, offset: { x: 0, y: 0 } });
    semantic.parts = ['items'];
    semantic.content = { emptyText: '尚未配置 CG 图库。', lockedLabel: 'LOCKED', columns: 3 };
    semantic.semanticInfo = { protectedParts: ['items'], owner: 'systems.gallery.cg + systems.endings' };
    nodes.push({ id: 'gallery.header', type: 'text', parentId: 'gallery.root', order: 0, layout: normalizeUiLayout({ anchor: { minX: 0, minY: 0, maxX: 1, maxY: 0 }, pivot: { x: 0, y: 0 }, size: { width: 'auto', height: 72 } }), parts: [], content: { text: 'CG GALLERY', accessibleName: 'Gallery title' } });
    nodes.push({ id: 'gallery.close', type: 'button', parentId: 'gallery.root', order: 1, layout: normalizeUiLayout({ anchor: { minX: 1, minY: 0, maxX: 1, maxY: 0 }, pivot: { x: 1, y: 0 }, offset: { x: -20, y: 16 }, size: { width: 120, height: 44 } }), parts: [], content: { text: '返回', accessibleName: 'Close gallery' }, action: { type: 'close-screen' } });
    semantic.order = 3;
    nodes.push({
      id: 'gallery.focus', type: 'focus-viewer', parentId: 'gallery.root', order: 2,
      layout: normalizeUiLayout({ anchor: { minX: 0, minY: 0.14, maxX: 0.38, maxY: 1 }, pivot: { x: 0, y: 0 }, offset: { x: 0, y: 0 } }),
      parts: ['media', 'title', 'description', 'navigation', 'close'],
      content: { emptyText: '选择已解锁的 CG 查看大图', previousLabel: '上一张', nextLabel: '下一张', closeLabel: '关闭大图', replayLabel: '播放 ED' },
      semanticInfo: { protectedParts: ['media', 'title', 'description', 'navigation', 'close'], owner: 'GalleryScreen' },
    });
  }
  return nodes;
}

export function adaptLegacyUiScreen(script, screenId) {
  if (!UI_SCREEN_IDS.includes(screenId)) return { document: null, diagnostics: [issue('error', 'ui-screen-id-unknown', `Unknown screen id "${screenId}".`, ['ui', 'screens', screenId])] };
  const canonical = script?.ui?.screens?.[screenId];
  if (canonical) return { document: normalizeUiDocument(canonical), diagnostics: [], authority: script?.ui?.screenAuthorities?.[screenId] ?? 'canonical-active' };
  const diagnostics = [];
  const path = LEGACY_PATHS[screenId];
  const legacy = path.length ? script?.ui?.[path[0]] ?? {} : {};
  const resolution = resolutionOf(script);
  reportUnsupportedLegacyFields(screenId, legacy, diagnostics);
  const nodes = screenId === 'title'
    ? titleNodes(legacy, resolution, diagnostics)
    : screenId === 'gameplay'
      ? gameplayNodes(script, resolution, diagnostics)
      : genericNodes(screenId, legacy, resolution, diagnostics);
  if (screenId === 'gallery' && !script?.systems?.gallery && !script?.systems?.endings) diagnostics.push(issue('warning', 'ui-legacy-source-empty', 'Gallery has no legacy layout; canonical preview uses registered gallery/ending data only.', ['systems', 'gallery']));
  return {
    authority: 'legacy-only', diagnostics,
    document: normalizeUiDocument({
      schemaVersion: UI_SCREEN_SCHEMA_VERSION,
      id: screenId,
      kind: 'screen',
      authority: 'canonical-active',
      rootId: `${screenId}.root`,
      viewport: resolution,
      nodes,
      ...(screenId === 'title'
        ? { behavior: { ...(legacy?.bgm ? { bgm: legacy.bgm } : {}), ...(legacy?.openingVideo ? { openingVideo: clone(legacy.openingVideo) } : {}) } }
        : {}),
      ...(screenId === 'saveLoad' ? { variants: {
        save: { overrides: { 'saveLoad.header': { content: { text: legacy?.header?.saveTitle ?? '存 档' }, style: legacy?.header?.saveTitleColor ? { color: legacy.header.saveTitleColor } : {} }, 'saveLoad.content': { content: { mode: 'save' } } } },
        load: { overrides: { 'saveLoad.header': { content: { text: legacy?.header?.loadTitle ?? '读 档' }, style: legacy?.header?.loadTitleColor ? { color: legacy.header.loadTitleColor } : {} }, 'saveLoad.content': { content: { mode: 'load' } } } },
      } } : {}),
      ...(screenId === 'settings' ? { behavior: { mode: (nodes.find(node => node.id === 'settings.tabs')?.content?.mode ?? 'tabbed') } } : {}),
    }),
  };
}

export function adaptLegacyUiOverlay(script, overlayId) {
  if (!UI_OVERLAY_IDS.includes(overlayId)) return { document: null, diagnostics: [issue('error', 'ui-overlay-id-unknown', `Unknown overlay id "${overlayId}".`, ['ui', 'overlays', overlayId])] };
  const canonical = script?.ui?.overlays?.[overlayId];
  if (canonical) return { authority: 'canonical-active', document: normalizeUiDocument(canonical), diagnostics: [] };
  const specs = {
    textInput: ['text-input', ['prompt', 'input', 'confirm', 'cancel', 'validation']], confirmation: ['confirmation', ['title', 'body', 'confirm', 'cancel']], videoControls: ['video-controls', ['progress', 'playPause', 'skip', 'volume']],
  };
  const [type, parts] = specs[overlayId];
  const resolution = resolutionOf(script);
  const content = overlayId === 'textInput'
    ? { accessibleName: 'Text input dialog', confirmLabel: '确定', cancelLabel: '取消', validationRequired: '请输入内容' }
    : overlayId === 'videoControls'
      ? { accessibleName: 'Video controls', playLabel: '播放', pauseLabel: '暂停', skipLabel: '跳过', volumeLabel: '音量' }
      : { accessibleName: 'Confirmation dialog', label: 'Confirmation dialog', confirmLabel: '确定', cancelLabel: '取消' };
  return { authority: 'legacy-only', diagnostics: [issue('warning', 'ui-legacy-overlay-synthetic', `${overlayId} has no reusable legacy document; inspect output is a deterministic compatibility envelope.`, ['ui', 'overlays', overlayId])], document: normalizeUiDocument({ schemaVersion: UI_SCREEN_SCHEMA_VERSION, id: overlayId, kind: 'overlay', authority: 'canonical-active', rootId: `${overlayId}.root`, viewport: resolution, nodes: [root(overlayId, 'overlay', resolution), { id: `${overlayId}.content`, type, parentId: `${overlayId}.root`, order: 0, layout: normalizeUiLayout({ anchor: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, size: { width: overlayId === 'videoControls' ? 720 : 520, height: overlayId === 'videoControls' ? 88 : 280 } }), parts, content, semanticInfo: { protectedParts: parts, owner: overlayId === 'textInput' ? 'ScriptEngine variable input flow' : overlayId === 'videoControls' ? 'VideoPlayer' : 'SharedConfirmationOverlay' } }] }) };
}

export function collectCanonicalUiAssetReferences(document) {
  const references = (document?.nodes ?? []).flatMap((node, index) => node?.asset ? [{ path: node.asset.path ?? node.asset.id, kind: node.asset.kind, documentPath: ['nodes', index, 'asset'] }] : []);
  if (document?.id === 'title' && document?.behavior?.bgm) references.push({ path: document.behavior.bgm, kind: 'audio', documentPath: ['behavior', 'bgm'] });
  if (document?.id === 'title' && document?.behavior?.openingVideo) references.push({ path: document.behavior.openingVideo.file ?? document.behavior.openingVideo.videoId, kind: 'video', documentPath: ['behavior', 'openingVideo'] });
  return references;
}

export function projectCanonicalThemeScreens(script) {
  const screens = {};
  const diagnostics = [];
  for (const screenId of UI_SCREEN_IDS) {
    if ((script?.ui?.screenAuthorities?.[screenId] ?? (script?.ui?.screens?.[screenId] ? 'canonical-active' : 'legacy-only')) !== 'canonical-active') continue;
    const document = script?.ui?.screens?.[screenId];
    if (!document) continue;
    if (document.components || document.tracks) diagnostics.push(issue('warning', 'ui-theme-projection-unsupported', 'Advanced components and animation tracks are excluded from the Phase 2 theme projection.', ['ui', 'screens', screenId]));
    screens[screenId] = {
      schemaVersion: UI_SCREEN_SCHEMA_VERSION, id: screenId, rootId: document.rootId, viewport: clone(document.viewport),
      nodes: (document.nodes ?? []).map(node => ({
        id: node.id, type: node.type, parentId: node.parentId ?? null, order: node.order, layout: clone(node.layout),
        ...(node.styleRef ? { styleRef: node.styleRef } : {}), ...(node.style ? { style: clone(node.style) } : {}),
        ...(node.states ? { states: clone(node.states) } : {}), ...(node.asset ? { asset: clone(node.asset) } : {}),
      })),
    };
  }
  for (const overlayId of UI_OVERLAY_IDS) {
    const document = script?.ui?.overlays?.[overlayId];
    if (!document) continue;
    screens[overlayId] = {
      schemaVersion: UI_SCREEN_SCHEMA_VERSION, id: overlayId, rootId: document.rootId, viewport: clone(document.viewport), kind: 'overlay',
      nodes: (document.nodes ?? []).map(node => ({
        id: node.id, type: node.type, parentId: node.parentId ?? null, order: node.order, layout: clone(node.layout),
        ...(node.styleRef ? { styleRef: node.styleRef } : {}), ...(node.style ? { style: clone(node.style) } : {}),
        ...(node.states ? { states: clone(node.states) } : {}), ...(node.asset ? { asset: clone(node.asset) } : {}),
      })),
    };
  }
  return { format: 'gmtheme-canonical-screen-projection', version: 1, screens, diagnostics };
}
