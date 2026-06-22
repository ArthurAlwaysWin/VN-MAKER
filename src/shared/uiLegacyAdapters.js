import { mapLegacyUiAction } from './uiActionContract.js';
import { absoluteLegacyLayout, normalizeUiLayout } from './uiLayoutContract.js';
import { UI_OVERLAY_IDS, UI_SCREEN_IDS, UI_SCREEN_SCHEMA_VERSION, normalizeUiDocument } from './uiDocumentContract.js';

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const issue = (severity, code, message, path = [], details = {}) => ({ severity, code, message, path, pathString: path.join('.'), ...details });
const cleanId = value => String(value ?? 'node').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+/, '') || 'node';
const resolutionOf = script => ({ width: script?.meta?.resolution?.width ?? script?.resolution?.width ?? 1280, height: script?.meta?.resolution?.height ?? script?.resolution?.height ?? 720 });

const LEGACY_PATHS = Object.freeze({
  title: ['titleScreen'], gameplay: ['dialogueBox'], gameMenu: ['gameMenu'], settings: ['settingsScreen'], saveLoad: ['saveLoadScreen'], backlog: ['backlogScreen'], gallery: [],
});

const HANDLED_LEGACY_KEYS = Object.freeze({
  title: new Set(['background', 'elements']), gameplay: new Set(['x', 'y', 'width', 'height', 'background', 'backgroundImage', 'opacity', 'borderRadius', 'gap', 'nameplate']),
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
    for (const key of Object.keys(element ?? {}).sort()) if (!['id', 'type', 'text', 'action', 'src', 'x', 'y', 'width', 'height', 'fontSize', 'color', 'opacity'].includes(key)) diagnostics.push(issue('warning', 'ui-legacy-field-unsupported', `Legacy title element field "${key}" is not representable.`, [...base, 'elements', index, key]));
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

function titleNodes(legacy, resolution, diagnostics) {
  const nodes = [root('title', 'screen', resolution)];
  addLegacyVisuals(nodes[0], legacy, ['ui', 'titleScreen'], diagnostics);
  for (const [index, element] of (Array.isArray(legacy?.elements) ? legacy.elements : []).entries()) {
    const type = ['text', 'image', 'button'].includes(element?.type) ? element.type : null;
    if (!type) { diagnostics.push(issue('warning', 'ui-legacy-field-unsupported', 'Unsupported title element type was not mapped.', ['ui', 'titleScreen', 'elements', index, 'type'], { value: element?.type })); continue; }
    const id = `title.${cleanId(element.id ?? `${type}-${index + 1}`)}`;
    const node = { id, type, parentId: 'title.root', order: index, layout: absoluteLegacyLayout(element, resolution), parts: [] };
    if (type === 'text' || type === 'button') node.content = { text: String(element.text ?? '') };
    const style = {};
    if (Number.isFinite(element.fontSize)) style.fontSize = element.fontSize;
    if (typeof element.color === 'string') style.color = element.color;
    if (Number.isFinite(element.opacity)) style.opacity = element.opacity;
    if (Object.keys(style).length) node.style = style;
    if (type === 'image' && typeof element.src === 'string') node.asset = { kind: 'image', path: element.src };
    if (type === 'button') {
      const mapped = mapLegacyUiAction('title', element.action);
      if (mapped.action) node.action = mapped.action;
      diagnostics.push(...mapped.diagnostics.map(d => ({ ...d, path: ['ui', 'titleScreen', 'elements', index, 'action'], pathString: `ui.titleScreen.elements.${index}.action` })));
    }
    nodes.push(node);
  }
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
  nodes.push(semantic);
  if (screenId === 'gameplay' && legacy?.nameplate?.enabled !== false) {
    nodes.push({ id: 'gameplay.nameplate', type: 'nameplate', parentId: 'gameplay.content', order: 0, layout: absoluteLegacyLayout(legacy?.nameplate ?? {}, resolution), parts: ['label'], binding: { source: 'dialogue.current' } });
  }
  if (screenId === 'gameMenu') {
    if (Number.isFinite(legacy?.width)) semantic.layout = absoluteLegacyLayout({ x: legacy.position === 'right' ? resolution.width - legacy.width : 0, y: 0, width: legacy.width, height: resolution.height }, resolution);
    if (Number.isFinite(legacy?.buttonGap)) semantic.style = { gap: legacy.buttonGap };
    const actions = ['save', 'load', 'backlog', 'settings', 'title', 'close'];
    actions.forEach((action, index) => {
      const mapped = mapLegacyUiAction('gameMenu', action);
      const button = { id: `gameMenu.${action}`, type: 'button', parentId: 'gameMenu.content', order: index, layout: normalizeUiLayout(), parts: [], content: { text: legacy?.buttons?.[action]?.text ?? action }, action: mapped.action };
      if (typeof legacy?.buttons?.[action]?.icon === 'string' && legacy.buttons[action].icon.includes('/')) button.asset = { kind: 'image', path: legacy.buttons[action].icon };
      nodes.push(button);
    });
  }
  if (screenId === 'settings') {
    nodes.push({ id: 'settings.header', type: 'text', parentId: 'settings.root', order: 0, layout: absoluteLegacyLayout({ x: 0, y: 0, width: resolution.width, height: legacy?.header?.height ?? 'auto' }, resolution), parts: [], content: { text: legacy?.header?.title?.text ?? legacy?.header?.title ?? 'Settings' } });
    nodes.push({ id: 'settings.tabs', type: 'tab-bar', parentId: 'settings.root', order: 1, layout: normalizeUiLayout(), parts: ['tabs'], binding: { source: 'settings.controls' }, content: { enabled: legacy?.tabBar?.enabled !== false, tabs: (legacy?.tabBar?.tabs ?? []).map(tab => ({ label: tab?.label ?? '', settingKeys: [...(tab?.settingKeys ?? [])] })) } });
    for (const [index, button] of (legacy?.footer?.buttons ?? []).entries()) {
      const mapped = mapLegacyUiAction('settings', button?.action);
      diagnostics.push(...mapped.diagnostics.map(d => ({ ...d, path: ['ui', 'settingsScreen', 'footer', 'buttons', index, 'action'], pathString: `ui.settingsScreen.footer.buttons.${index}.action` })));
      nodes.push({ id: `settings.${cleanId(button?.id ?? `footer-${index}`)}`, type: 'button', parentId: 'settings.root', order: index + 2, layout: normalizeUiLayout(), parts: [], content: { text: button?.text ?? '' }, ...(mapped.action ? { action: mapped.action } : {}) });
    }
  }
  if (screenId === 'saveLoad') {
    semantic.content = { modes: ['save', 'load'], saveTitle: legacy?.header?.saveTitle ?? 'Save', loadTitle: legacy?.header?.loadTitle ?? 'Load', columns: legacy?.slotGrid?.columns, rows: legacy?.slotGrid?.rows, emptyText: legacy?.slot?.emptyText };
    if (Number.isFinite(legacy?.slotGrid?.gap)) semantic.style = { gap: legacy.slotGrid.gap };
  }
  if (screenId === 'backlog') {
    semantic.content = { title: legacy?.header?.title ?? 'Backlog', voiceReplay: true };
    const entryStyle = {};
    if (Number.isFinite(legacy?.entry?.textFontSize)) entryStyle.fontSize = legacy.entry.textFontSize;
    if (Object.keys(entryStyle).length) semantic.style = entryStyle;
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
  const nodes = screenId === 'title' ? titleNodes(legacy, resolution, diagnostics) : genericNodes(screenId, legacy, resolution, diagnostics);
  if (screenId === 'gallery' && !script?.systems?.gallery && !script?.systems?.endings) diagnostics.push(issue('warning', 'ui-legacy-source-empty', 'Gallery has no legacy layout; canonical preview uses registered gallery/ending data only.', ['systems', 'gallery']));
  return {
    authority: 'legacy-only', diagnostics,
    document: normalizeUiDocument({ schemaVersion: UI_SCREEN_SCHEMA_VERSION, id: screenId, kind: 'screen', authority: 'canonical-active', rootId: `${screenId}.root`, viewport: resolution, nodes }),
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
  return { authority: 'legacy-only', diagnostics: [issue('warning', 'ui-legacy-overlay-synthetic', `${overlayId} has no reusable legacy document; inspect output is a deterministic compatibility envelope.`, ['ui', 'overlays', overlayId])], document: normalizeUiDocument({ schemaVersion: UI_SCREEN_SCHEMA_VERSION, id: overlayId, kind: 'overlay', authority: 'canonical-active', rootId: `${overlayId}.root`, viewport: resolution, nodes: [root(overlayId, 'overlay', resolution), { id: `${overlayId}.content`, type, parentId: `${overlayId}.root`, order: 0, layout: normalizeUiLayout(), parts }] }) };
}

export function collectCanonicalUiAssetReferences(document) {
  return (document?.nodes ?? []).flatMap((node, index) => node?.asset ? [{ path: node.asset.path ?? node.asset.id, kind: node.asset.kind, documentPath: ['nodes', index, 'asset'] }] : []);
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
  return { format: 'gmtheme-canonical-screen-projection', version: 1, screens, diagnostics };
}
