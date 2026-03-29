/**
 * Asset Store — Pinia store for cached asset file lists and IPC wrappers.
 * Manages file lists for all asset categories (backgrounds, characters, audio, fonts, ui)
 * and handles font metadata synchronization with script data.
 * @module stores/assets
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loadAllFonts, loadSingleFont } from '../../engine/fontLoader.js';

export const useAssetStore = defineStore('assets', () => {
  // ─── State ──────────────────────────────────────────────────────────
  const files = ref({
    backgrounds: [],
    characters: [],
    audio: [],
    fonts: [],
    ui: [],
  });
  const fontMeta = ref([]);
  const isLoading = ref(false);

  // ─── Computed ───────────────────────────────────────────────────────
  const fontFamilies = computed(() =>
    fontMeta.value.map(f => ({ label: f.name, value: f.family }))
  );

  // ─── Methods ────────────────────────────────────────────────────────

  /**
   * Load file list for a single asset category.
   * @param {string} category - One of: backgrounds, characters, audio, fonts, ui
   */
  async function loadCategory(category) {
    if (!window.ipcRenderer) return;
    const result = await window.ipcRenderer.invoke(
      'list-assets',
      JSON.parse(JSON.stringify({ category }))
    );
    if (result.success) {
      files.value[category] = result.files;
    }
  }

  /**
   * Load file lists for all 5 asset categories in parallel.
   */
  async function loadAll() {
    isLoading.value = true;
    await Promise.all(
      ['backgrounds', 'characters', 'audio', 'fonts', 'ui'].map(c => loadCategory(c))
    );
    isLoading.value = false;
  }

  /**
   * Import assets into a category via IPC (path-based for efficiency).
   * @param {string} category - Target category
   * @param {string[]} filePaths - Native file paths to import
   * @returns {Promise<{ success: boolean, imported: Array, errors: Array }>}
   */
  async function importAssets(category, filePaths) {
    const result = await window.ipcRenderer.invoke('import-assets', {
      category,
      paths: JSON.parse(JSON.stringify(filePaths)),
    });
    if (result.success) {
      await loadCategory(category);
    }
    return result;
  }

  /**
   * Delete an asset file from a category.
   * @param {string} category - Target category
   * @param {string} filename - Filename to delete
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function deleteAsset(category, filename) {
    const result = await window.ipcRenderer.invoke(
      'delete-asset',
      JSON.parse(JSON.stringify({ category, filename }))
    );
    if (result.success) {
      await loadCategory(category);
    }
    return result;
  }

  /**
   * Rename an asset file within a category.
   * @param {string} category - Target category
   * @param {string} oldName - Current filename
   * @param {string} newName - New filename
   * @returns {Promise<{ success: boolean, newName?: string, error?: string }>}
   */
  async function renameAsset(category, oldName, newName) {
    const result = await window.ipcRenderer.invoke(
      'rename-asset',
      JSON.parse(JSON.stringify({ category, oldName, newName }))
    );
    if (result.success) {
      await loadCategory(category);
    }
    return result;
  }

  /**
   * Open a native file dialog to select an asset.
   * @param {string[]} types - Asset type filters (e.g. ['backgrounds'])
   * @returns {Promise<string|null>} Relative path or null if cancelled
   */
  async function selectAsset(types) {
    const result = await window.ipcRenderer.invoke(
      'select-asset',
      JSON.parse(JSON.stringify({ types }))
    );
    return result;
  }

  /**
   * Sync font metadata from script data for quick access.
   * @param {object} scriptData - The full script.json data object
   */
  function syncFontMeta(scriptData) {
    fontMeta.value = scriptData?.assets?.fonts || [];
  }

  /**
   * Load all project fonts into the current window via FontFace API.
   * @param {object} scriptData - The full script.json data object
   * @returns {Promise<{ loaded: string[], failed: Array<{ family: string, file: string, error: string }> }>}
   */
  async function loadProjectFonts(scriptData) {
    syncFontMeta(scriptData);
    if (fontMeta.value.length === 0) {
      return { loaded: [], failed: [] };
    }
    const result = await loadAllFonts(fontMeta.value, 'asset://');
    return result;
  }

  /**
   * Import font files, create metadata, update script store, and hot-load.
   * @param {string} category - Should be 'fonts'
   * @param {string[]} filePaths - Native file paths to import
   * @param {object} scriptStore - The script Pinia store instance
   * @returns {Promise<{ success: boolean, imported: Array, errors: Array }>}
   */
  async function importFont(category, filePaths, scriptStore) {
    const result = await importAssets(category, filePaths);
    if (result.success && result.imported.length > 0) {
      for (let i = 0; i < result.imported.length; i++) {
        const file = result.imported[i];
        const nameWithoutExt = file.saved.replace(/\.[^.]+$/, '');
        const meta = {
          id: `font-${Date.now()}-${i}`,
          name: nameWithoutExt,
          file: `fonts/${file.saved}`,
          family: `UserFont-${nameWithoutExt}`,
        };
        scriptStore.data.assets ??= {};
        scriptStore.data.assets.fonts ??= [];
        scriptStore.data.assets.fonts.push(meta);
        scriptStore.pushState();
        syncFontMeta(scriptStore.data);
        await loadSingleFont(meta, 'asset://');
      }
    }
    return result;
  }

  // ─── Return ─────────────────────────────────────────────────────────
  return {
    files, fontMeta, isLoading, fontFamilies,
    loadCategory, loadAll, importAssets, deleteAsset, renameAsset, selectAsset,
    syncFontMeta, loadProjectFonts, importFont,
  };
});
