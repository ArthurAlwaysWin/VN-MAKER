/**
 * useVoiceMatch — Batch voice matching composable.
 * Scans audio files against {characterId}_{sceneIndex}_{pageIndex}_{dialogueIndex} naming convention.
 * Used by SceneTree for per-scene and global batch matching.
 */
import { useScriptStore } from '../stores/script.js';
import { useAssetStore } from '../stores/assets.js';

export function useVoiceMatch() {
  const script = useScriptStore();
  const assets = useAssetStore();

  /**
   * Build a list of matches between audio files and dialogue entries.
   * @param {string} scope — a sceneId string for single-scene, or 'all' for global
   * @returns {{ matches: Array<Object>, alreadyBound: number, newBindings: number }}
   */
  function buildMatches(scope) {
    const audioFiles = assets.files.audio || [];
    const scenes = script.data?.scenes || {};
    const sceneEntries = Object.entries(scenes);
    const matches = [];

    // Build lookup: filename without extension → full filename
    const fileLookup = new Map();
    for (const f of audioFiles) {
      const nameWithoutExt = f.replace(/\.[^.]+$/, '');
      fileLookup.set(nameWithoutExt, f);
    }

    sceneEntries.forEach(([sceneId, scene], sceneIdx) => {
      if (scope !== 'all' && scope !== sceneId) return;
      (scene.pages || []).forEach((page, pageIdx) => {
        if (page.type !== 'normal') return; // only dialogue pages participate
        (page.dialogues || []).forEach((dlg, dlgIdx) => {
          const charId = dlg.speaker || '_narrator';
          const key = `${charId}_${sceneIdx}_${pageIdx}_${dlgIdx}`;
          const matchedFile = fileLookup.get(key);
          if (matchedFile) {
            matches.push({
              sceneId,
              sceneIdx,
              sceneName: scene.name,
              pageIdx,
              dlgIdx,
              speaker: dlg.speaker,
              text: dlg.text,
              file: matchedFile,
              path: `audio/${matchedFile}`,
              alreadyBound: dlg.voice === `audio/${matchedFile}`,
              hasExistingVoice: !!dlg.voice,
            });
          }
        });
      });
    });

    return {
      matches,
      alreadyBound: matches.filter(m => m.alreadyBound).length,
      newBindings: matches.filter(m => !m.alreadyBound).length,
    };
  }

  /**
   * Apply matched voice bindings to dialogue entries.
   * @param {Array<Object>} matches — from buildMatches().matches
   * @param {boolean} overwrite — if true, overwrite existing non-matching voice bindings
   * @returns {number} count of applied bindings
   */
  function applyMatches(matches, overwrite = false) {
    const scenes = script.data?.scenes;
    if (!scenes) return 0;
    const sceneEntries = Object.entries(scenes);
    let applied = 0;

    for (const m of matches) {
      const scene = sceneEntries[m.sceneIdx]?.[1];
      const dlg = scene?.pages?.[m.pageIdx]?.dialogues?.[m.dlgIdx];
      if (!dlg) continue;
      if (m.alreadyBound) continue; // already the same file
      if (dlg.voice && !overwrite) continue; // has different voice, skip unless overwrite
      dlg.voice = m.path;
      applied++;
    }

    if (applied > 0) script.pushState();
    return applied;
  }

  return { buildMatches, applyMatches };
}
