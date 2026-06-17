/**
 * FontLoader — Load custom fonts via FontFace API.
 * Shared between editor and engine renderer processes.
 * Each BrowserWindow has its own document.fonts — fonts must be loaded independently per window.
 * @module fontLoader
 */
import { cssUrl } from './cssEscape.js';

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Load all project fonts and register them in document.fonts.
 * @param {Array<{ family: string, file: string }>} fonts - Font metadata from script.assets.fonts
 * @param {string} baseUrl - Base URL prefix ('asset://' for Electron, '/game/' for fallback)
 * @returns {Promise<{ loaded: string[], failed: Array<{ family: string, file: string, error: string }> }>}
 */
export async function loadAllFonts(fonts, baseUrl = 'asset://') {
  const results = await Promise.allSettled(fonts.map(async (fontMeta) => {
    const url = `${baseUrl}${fontMeta.file}`;
    const face = new FontFace(fontMeta.family, cssUrl(url));
    await face.load();
    document.fonts.add(face);
    return fontMeta.family;
  }));

  return results.reduce((summary, result, index) => {
    const fontMeta = fonts[index];
    if (result.status === 'fulfilled') {
      summary.loaded.push(result.value);
      return summary;
    }

    const err = result.reason;
    console.error(`[FontLoader] Failed to load ${fontMeta.file}:`, err);
    summary.failed.push({ family: fontMeta.family, file: fontMeta.file, error: err.message });
    return summary;
  }, { loaded: [], failed: [] });
}

/**
 * Load a single font and register it in document.fonts.
 * @param {{ family: string, file: string }} fontMeta - Font metadata
 * @param {string} baseUrl - Base URL prefix ('asset://' for Electron, '/game/' for fallback)
 * @returns {Promise<boolean>} true if loaded successfully, false otherwise
 */
export async function loadSingleFont(fontMeta, baseUrl = 'asset://') {
  try {
    const url = `${baseUrl}${fontMeta.file}`;
    const face = new FontFace(fontMeta.family, cssUrl(url));
    await face.load();
    document.fonts.add(face);
    return true;
  } catch (err) {
    console.error(`[FontLoader] Failed to load ${fontMeta.file}:`, err);
    return false;
  }
}
