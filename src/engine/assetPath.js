/**
 * assetPath — Environment detection and asset path resolution.
 * Single source of truth for runtime mode and resource path prefix.
 *
 * Environments:
 *   'electron' — window.ipcRenderer exists (Electron main window)
 *   'preview'  — iframe receiving postMessage {type:'start'} from editor
 *   'web'      — standalone browser (itch.io, static server, etc.)
 *
 * Per D-05: This module is the single source of truth for environment and paths.
 * Per D-06: BASE_PATH is 'asset://' for electron/preview, './assets/' for web.
 * Per D-07: resolvePath() handles hardcoded asset:// references.
 */

// ─── Environment State ───────────────────────────────────

/** @type {'electron'|'preview'|'web'} Current runtime environment */
export let ENV = 'web';

/** @type {string} Base path prefix for asset URLs */
export let BASE_PATH = './assets/';

/** @type {string} Path to script.json */
export let SCRIPT_PATH = './script.json';

/** @type {MessageEvent['data']|null} Captured start message from handshake detection */
export let _capturedStartMsg = null;

// ─── Environment Detection ───────────────────────────────

/**
 * Detect runtime environment and configure paths accordingly.
 *
 * Detection order (per D-03, D-04):
 *   1. window.ipcRenderer exists → 'electron'
 *   2. window.parent !== window + editor handshake → 'preview'
 *   3. Default fallback → 'web'
 *
 * @returns {Promise<'electron'|'preview'|'web'>}
 */
export async function detectEnvironment() {
  // Per D-03: Check ipcRenderer first (Electron main window)
  if (window.ipcRenderer) {
    ENV = 'electron';
    BASE_PATH = 'asset://';
    SCRIPT_PATH = '/game/script.json';
    return 'electron';
  }

  // Per D-04: Check iframe context for editor preview
  if (window.parent !== window) {
    const isEditor = await _waitForEditorHandshake();
    if (isEditor) {
      ENV = 'preview';
      BASE_PATH = 'asset://';
      SCRIPT_PATH = '/game/script.json';
      return 'preview';
    }
  }

  // Default: standalone web mode
  ENV = 'web';
  BASE_PATH = './assets/';
  SCRIPT_PATH = './script.json';
  return 'web';
}

// ─── Path Resolution ─────────────────────────────────────

/**
 * Resolve an asset path using the current BASE_PATH.
 *
 * Handles all path variants found in the codebase:
 *   - Empty/falsy → ''
 *   - http:// / https:// / data: → pass through unchanged
 *   - asset://... → strip prefix, re-apply BASE_PATH
 *   - /game/... → strip prefix, re-apply BASE_PATH
 *   - bare relative → prepend BASE_PATH
 *
 * @param {string} path — raw asset path from script data or UI code
 * @returns {string} resolved path suitable for the current environment
 */
export function resolvePath(path) {
  if (!path) return '';

  // Pass through absolute URLs and data URIs
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  // Strip asset:// prefix and re-apply BASE_PATH
  if (path.startsWith('asset://')) {
    return BASE_PATH + path.slice(8);
  }

  // Strip /game/ prefix and re-apply BASE_PATH
  if (path.startsWith('/game/')) {
    return BASE_PATH + path.slice(6);
  }

  // Bare relative path — prepend BASE_PATH
  return BASE_PATH + path;
}

// ─── Private Helpers ─────────────────────────────────────

/**
 * Wait for editor handshake to determine if we're in preview mode.
 *
 * Sends 'ready' message to parent, then listens for 'start' response.
 * The start message is captured (not consumed) so initPreview() can
 * read it later via _capturedStartMsg.
 *
 * @returns {Promise<boolean>} true if editor responded with 'start'
 * @private
 */
function _waitForEditorHandshake() {
  return new Promise((resolve) => {
    let settled = false;

    const onMessage = (e) => {
      if (e.data?.type === 'start') {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        _capturedStartMsg = e.data;
        resolve(true);
      }
    };

    window.addEventListener('message', onMessage);

    // CRITICAL: Send ready BEFORE starting timeout — per existing
    // ready→start handshake protocol (main.js line 884)
    window.parent.postMessage({ type: 'ready' }, '*');

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      resolve(false);
    }, 200);
  });
}
