/**
 * ThemeManager — applies theme token overrides as CSS custom properties.
 *
 * Reads ui.theme from script.json and merges sparse user overrides
 * with DEFAULT_TOKENS, then injects --gm-* properties onto the
 * game container element.
 *
 * @module ThemeManager
 */
import { DEFAULT_TOKENS } from './tokens.js';
import { resolvePath } from './assetPath.js';

/**
 * Apply theme token overrides onto a container element.
 * Merges sparse user tokens with DEFAULT_TOKENS so all 41 CSS custom
 * properties are always set (no partial state).
 *
 * @param {HTMLElement} container - The game container element (#game-container)
 * @param {object|null|undefined} themeData - The ui.theme object from script.json
 */
export function applyTheme(container, themeData) {
  const merged = { ...DEFAULT_TOKENS, ...(themeData?.tokens ?? {}) };
  for (const [key, value] of Object.entries(merged)) {
    container.style.setProperty(`--gm-${key}`, value);
  }
}

/**
 * Reset all theme tokens to their DEFAULT_TOKENS values (v0.5 appearance).
 *
 * @param {HTMLElement} container - The game container element (#game-container)
 */
export function resetTheme(container) {
  for (const [key, value] of Object.entries(DEFAULT_TOKENS)) {
    container.style.setProperty(`--gm-${key}`, value);
  }
}

// ─── Nine-Slice System ──────────────────────────────────

/** CSS selectors for each nineSlice config key (D-05) */
const NINE_SLICE_SELECTORS = {
  dialogueBox:   '#dialogue-box',
  menuPanel:     '.game-menu-panel',
  saveSlot:      '.save-slot',
  choiceButton:  '.choice-button',
  titleButton:   '.title-button',
  settingsPanel: '#settings-screen',
};

/** Button keys that support 3-state (normal/hover/active) per D-06, D-07 */
const BUTTON_KEYS = new Set(['choiceButton', 'titleButton']);

/** Elements that currently lack position (static) — need position:relative for ::before (D-01) */
const NEEDS_POSITION = new Set(['menuPanel', 'choiceButton', 'titleButton']);

/** Elements that have backdrop-filter — disable when 9-slice active (performance P7) */
const HAS_BACKDROP = new Set(['dialogueBox', 'choiceButton', 'settingsPanel']);

/** Button-family selectors frozen for Phase 73 rollout. */
export const BUTTON_FAMILY_SELECTOR_REGISTRY = Object.freeze({
  gameMenuButton: Object.freeze(['.game-menu-button']),
  qab: Object.freeze(['.qab-btn']),
  closeButton: Object.freeze([
    '.save-load-close',
    '.backlog-close',
    '.settings-close',
    '.settings-structured-close',
    '.settings-structured-footer-close',
    '.settings-custom-close',
  ]),
  pageTabPager: Object.freeze(['.page-tab', '.page-dot']),
  settingsTab: Object.freeze(['.settings-tab-btn', '.gm-tab']),
});

const BUTTON_FAMILY_STATE_SELECTORS = Object.freeze({
  normal: selectors => selectors,
  hover: selectors => selectors.map(selector => `${selector}:hover`),
  pressed: selectors => selectors.map(selector => `${selector}:active`),
  selected: selectors => selectors.map(selector => `${selector}.active`),
});

/**
 * Build CSS text for all configured nineSlice entries.
 * Generates ::before pseudo-element rules with border-image for each
 * non-null config entry. Button keys additionally get :hover::before
 * and :active::before rules for 3-state images (D-06).
 *
 * @param {object|null|undefined} nineSlice — the ui.theme.nineSlice object
 * @returns {string} Complete CSS text for injection
 */
function buildNineSliceCSS(nineSlice) {
  if (!nineSlice) return '';
  const rules = [];

  for (const [key, selector] of Object.entries(NINE_SLICE_SELECTORS)) {
    const config = nineSlice[key];
    if (!config?.src) continue;
    const resolvedSrc = resolvePath(config.src);

    // Parent setup: overflow:hidden clips ::before to border-radius (D-01),
    // isolation:isolate creates stacking context for z-index:-1 (Pitfall 1)
    const parentProps = [key === 'dialogueBox' ? 'overflow: visible' : 'overflow: hidden', 'isolation: isolate'];
    if (NEEDS_POSITION.has(key)) parentProps.push('position: relative');
    if (HAS_BACKDROP.has(key)) {
      parentProps.push('backdrop-filter: none');
      parentProps.push('-webkit-backdrop-filter: none');
    }
    rules.push(`${selector} { ${parentProps.join('; ')}; }`);

    // ::before — normal state (D-01, D-03, D-04)
    const slice = (config.slice || [0, 0, 0, 0]).join(' ') + ' fill';
    const width = (config.width || config.slice || [0, 0, 0, 0])
      .map(v => v + 'px').join(' ');
    const outset = (config.outset || [0, 0, 0, 0])
      .map(v => v + 'px').join(' ');
    const repeat = config.repeat || 'stretch';

    rules.push(
      `${selector}::before {\n` +
      `  content: '';\n` +
      `  position: absolute;\n` +
      `  inset: 0;\n` +
      `  z-index: -1;\n` +
      `  border-image: url("${resolvedSrc}") ${slice} / ${width} / ${outset} ${repeat};\n` +
      `  pointer-events: none;\n` +
      `}`
    );

    // Button 3-state rules (D-06) — CSS pseudo-classes only, no JS listeners
    if (BUTTON_KEYS.has(key) && config.states) {
      if (config.states.hover?.src) {
        const resolvedHoverSrc = resolvePath(config.states.hover.src);
        rules.push(
          `${selector}:hover::before {\n` +
          `  border-image-source: url("${resolvedHoverSrc}");\n` +
          `}`
        );
      }
      if (config.states.active?.src) {
        const resolvedActiveSrc = resolvePath(config.states.active.src);
        rules.push(
          `${selector}:active::before {\n` +
          `  border-image-source: url("${resolvedActiveSrc}");\n` +
          `}`
        );
      }
    }
  }

  return rules.join('\n');
}

/** Map state key to the pseudo-element suffix used in CSS selectors. */
const BUTTON_FAMILY_PSEUDO_MAP = Object.freeze({
  normal: '::before',
  hover: ':hover::before',
  pressed: ':active::before',
  selected: '.active::before',
});

function buildButtonFamilyCSS(buttonFamilies) {
  if (!buttonFamilies) {
    return '';
  }

  const rules = [];

  // Collect all selectors that need base position/isolation
  const baseSelectors = [];

  for (const [familyKey, selectors] of Object.entries(BUTTON_FAMILY_SELECTOR_REGISTRY)) {
    const family = buttonFamilies[familyKey];
    if (!family || typeof family !== 'object') {
      continue;
    }

    baseSelectors.push(...selectors);

    for (const [stateKey, pseudoSuffix] of Object.entries(BUTTON_FAMILY_PSEUDO_MAP)) {
      const src = family[stateKey];
      if (!src) {
        continue;
      }

      const resolvedSrc = resolvePath(src);
      const stateSelectors = selectors.map(s => `${s}${pseudoSuffix}`);
      rules.push(
        `${stateSelectors.join(', ')} {\n` +
        `  background-image: url("${resolvedSrc}");\n` +
        `  background-repeat: no-repeat;\n` +
        `  background-position: center;\n` +
        `  background-size: 100% 100%;\n` +
        `}`
      );
    }
  }

  // Emit shared base rule: position:relative + isolation for stacking context
  if (baseSelectors.length > 0) {
    rules.unshift(
      `${baseSelectors.join(', ')} {\n` +
      `  position: relative;\n` +
      `  isolation: isolate;\n` +
      `}`
    );
  }

  return rules.join('\n');
}

/**
 * Apply 9-slice background images by injecting CSS into a dedicated style tag.
 * Creates `<style id="galgame-nine-slice">` on first call, overwrites textContent
 * on subsequent calls (D-02). Called from main.js after applyTheme.
 *
 * @param {object|null|undefined} themeData — the ui.theme object from script.json
 */
export function applyNineSlice(themeData) {
  let styleEl = document.getElementById('galgame-nine-slice');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'galgame-nine-slice';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildNineSliceCSS(themeData?.nineSlice);
}

/**
 * Apply button-family background imagery by injecting CSS into a dedicated style tag.
 *
 * @param {object|null|undefined} themeData — the ui.theme object from script.json
 */
export function applyButtonFamilies(themeData) {
  let styleEl = document.getElementById('galgame-button-families');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'galgame-button-families';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildButtonFamilyCSS(themeData?.buttonFamilies);
}

/**
 * Remove all 9-slice CSS rules by clearing the style tag content.
 * Does not remove the tag itself (reusable on next applyNineSlice call).
 */
export function resetNineSlice() {
  const styleEl = document.getElementById('galgame-nine-slice');
  if (styleEl) styleEl.textContent = '';
}

/**
 * Remove all button-family CSS rules by clearing the style tag content.
 */
export function resetButtonFamilies() {
  const styleEl = document.getElementById('galgame-button-families');
  if (styleEl) styleEl.textContent = '';
}
