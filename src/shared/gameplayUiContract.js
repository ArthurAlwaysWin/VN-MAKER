export const GAMEPLAY_SEMANTIC_WIDGETS = Object.freeze([
  'story-viewport',
  'dialogue-box',
  'nameplate',
  'choice-list',
  'quick-action-bar',
  'skip-status',
]);

export const GAMEPLAY_BINDINGS = Object.freeze({
  'story-viewport': 'story.viewport',
  'dialogue-box': 'dialogue.current',
  nameplate: 'dialogue.current',
  'choice-list': 'choice.options',
  'quick-action-bar': 'runtime.quickActions',
  'skip-status': 'runtime.skipStatus',
});

export const GAMEPLAY_QUICK_ACTIONS = Object.freeze([
  'auto', 'skip', 'backlog', 'save', 'load', 'quicksave', 'quickload', 'settings',
]);

const issue = (severity, code, message, path = [], details = {}) => ({
  severity, code, message, path, pathString: path.join('.'), ...details,
});

/**
 * Gameplay UI owns presentation only. Story staging and runtime progression
 * remain in the page contract and ScriptEngine.
 */
export function validateCanonicalGameplayDocument(document, { path = ['ui', 'screens', 'gameplay'] } = {}) {
  if (document?.id !== 'gameplay' || !Array.isArray(document?.nodes)) return [];
  const diagnostics = [];
  const byType = new Map();
  for (const [index, node] of document.nodes.entries()) {
    if (!GAMEPLAY_SEMANTIC_WIDGETS.includes(node?.type)) continue;
    const entries = byType.get(node.type) ?? [];
    entries.push({ node, index });
    byType.set(node.type, entries);
    const expectedBinding = GAMEPLAY_BINDINGS[node.type];
    if (node.binding?.source !== expectedBinding) {
      diagnostics.push(issue('error', 'gameplay-binding-invalid', `${node.type} must bind to ${expectedBinding}.`, [...path, 'nodes', index, 'binding', 'source'], { expectedBinding }));
    }
  }
  for (const type of GAMEPLAY_SEMANTIC_WIDGETS) {
    const entries = byType.get(type) ?? [];
    if (entries.length !== 1) diagnostics.push(issue('error', 'gameplay-semantic-cardinality-invalid', `Canonical Gameplay UI requires exactly one protected ${type} widget.`, [...path, 'nodes'], { type, count: entries.length }));
  }
  const root = document.nodes.find(node => node.id === document.rootId);
  const viewport = byType.get('story-viewport')?.[0]?.node;
  if (root?.type !== 'panel') diagnostics.push(issue('error', 'gameplay-root-invalid', 'Canonical Gameplay UI root must be a panel.', [...path, 'rootId']));
  if (viewport && viewport.parentId !== document.rootId) diagnostics.push(issue('error', 'gameplay-story-viewport-parent-invalid', 'The protected story viewport must remain a direct child of the Gameplay UI root.', [...path, 'nodes', byType.get('story-viewport')[0].index, 'parentId']));
  for (const [index, node] of document.nodes.entries()) {
    if (node?.asset && !['image', 'ui'].includes(node.asset.kind)) diagnostics.push(issue('error', 'gameplay-asset-kind-invalid', 'Gameplay UI documents may reference presentation images only.', [...path, 'nodes', index, 'asset', 'kind']));
    const source = node?.binding?.source;
    if (source && !Object.values(GAMEPLAY_BINDINGS).includes(source)) diagnostics.push(issue('error', 'gameplay-binding-story-boundary', 'Gameplay UI cannot bind to story page, camera, character, particle, video, or effect state.', [...path, 'nodes', index, 'binding', 'source']));
  }
  return diagnostics;
}

export function getGameplayLayoutDiagnostics({ dialogue = null, choices = [] } = {}) {
  const diagnostics = [];
  const text = String(dialogue?.text ?? '');
  if (text.length > 220) diagnostics.push(issue('warning', 'gameplay-dialogue-overflow-risk', 'Long dialogue text may overflow the configured dialogue box.', ['fixtures', 'dialogue', 'text'], { length: text.length }));
  const list = Array.isArray(choices) ? choices : [];
  if (list.length > 6 || list.some(option => String(option?.text ?? '').length > 80)) diagnostics.push(issue('warning', 'gameplay-choice-overflow-risk', 'Choice count or label length may overflow the configured choice list.', ['fixtures', 'choices'], { count: list.length }));
  return diagnostics;
}
