/**
 * Galgame author-data contract helpers
 *
 * Seeds the Phase 83 author-owned script shape so Electron, the editor, and
 * later persistence layers all normalize against the same inspectable JSON
 * contract.
 */

export const GALGAME_CONTRACT_VERSION = 1;
export const GALGAME_RESET_SCOPES = Object.freeze({
  CONTRACT: 'contract',
  PROFILE: 'profile',
  SAVES: 'saves',
  ALL: 'all',
});

function cloneJsonValue(value) {
  if (value == null) {
    return {};
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeProjectId(projectId) {
  if (typeof projectId === 'string' && projectId.trim()) {
    return projectId;
  }

  return generateGalgameProjectId();
}

function normalizeSystems(systems) {
  const normalizedSystems = systems && typeof systems === 'object' && !Array.isArray(systems)
    ? systems
    : {};

  normalizedSystems.variables ??= {};
  normalizedSystems.endings ??= {};
  normalizedSystems.gallery ??= {};
  normalizedSystems.gallery.cg ??= {};
  return normalizedSystems;
}

export function generateGalgameProjectId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (typeof randomUuid === 'string' && randomUuid) {
    return `gm_${randomUuid.replace(/-/g, '').toLowerCase()}`;
  }

  return `gm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function hasCurrentGalgameContractVersion(scriptData = {}) {
  return scriptData?.contractVersion === GALGAME_CONTRACT_VERSION;
}

export function isGalgameResetScope(scope) {
  return Object.values(GALGAME_RESET_SCOPES).includes(scope);
}

export function ensureGalgameContract(scriptData = {}) {
  const normalizedScript = cloneJsonValue(scriptData);

  normalizedScript.projectId = normalizeProjectId(normalizedScript.projectId);
  normalizedScript.contractVersion = GALGAME_CONTRACT_VERSION;
  normalizedScript.characters ??= {};
  normalizedScript.scenes ??= {};
  normalizedScript.systems = normalizeSystems(normalizedScript.systems);

  return normalizedScript;
}

export function createDefaultGalgameScript(scriptData = {}) {
  return ensureGalgameContract({
    characters: {},
    scenes: {},
    ...cloneJsonValue(scriptData),
  });
}
