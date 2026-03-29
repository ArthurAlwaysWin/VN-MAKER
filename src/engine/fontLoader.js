/**
 * FontLoader — Load custom fonts via FontFace API.
 * Shared between editor and engine renderer processes.
 * Each BrowserWindow has its own document.fonts — fonts must be loaded independently per window.
 * @module fontLoader
 */

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Load all project fonts and register them in document.fonts.
 * @param {Array<{ family: string, file: string }>} fonts - Font metadata from script.assets.fonts
 * @param {string} baseUrl - Base URL prefix ('asset://' for Electron, '/game/' for fallback)
 * @returns {Promise<{ loaded: string[], failed: Array<{ family: string, file: string, error: string }> }>}
 */
export async function loadAllFonts(fonts, baseUrl = 'asset://') {
  const loaded = [];
  const failed = [];
  for (const fontMeta of fonts) {
    try {
      const url = `${baseUrl}${fontMeta.file}`;
      const face = new FontFace(fontMeta.family, `url('${url}')`);
      await face.load();
      document.fonts.add(face);
      loaded.push(fontMeta.family);
    } catch (err) {
      console.error(`[FontLoader] Failed to load ${fontMeta.file}:`, err);
      failed.push({ family: fontMeta.family, file: fontMeta.file, error: err.message });
    }
  }
  return { loaded, failed };
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
    const face = new FontFace(fontMeta.family, `url('${url}')`);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch (err) {
    console.error(`[FontLoader] Failed to load ${fontMeta.file}:`, err);
    return false;
  }
}
