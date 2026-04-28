/**
 * PlayerDataRepository — versioned persistent profile facade for Phase 83.
 *
 * Keeps cross-run player truth keyed by immutable `projectId`, while save slots
 * stay a separate authority owned by the save managers.
 */
import { GALGAME_RESET_SCOPES } from '../shared/galgameContract.js';

export const PLAYER_PROFILE_VERSION = 1;

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePages(pages) {
  if (!Array.isArray(pages)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();
  for (const entry of pages) {
    if (typeof entry !== 'string' || !entry) {
      continue;
    }
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    normalized.push(entry);
  }
  return normalized;
}

function normalizeUnlockBucket(bucket) {
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) {
    return {};
  }

  return cloneJsonValue(bucket);
}

export function createDefaultPlayerProfile(projectId) {
  return {
    version: PLAYER_PROFILE_VERSION,
    projectId,
    readHistory: {
      pages: [],
    },
    unlocks: {
      endings: {},
      cg: {},
    },
  };
}

export function normalizePlayerProfile(projectId, profile = {}) {
  const normalized = createDefaultPlayerProfile(projectId);
  const source = profile && typeof profile === 'object' && !Array.isArray(profile)
    ? cloneJsonValue(profile)
    : {};

  normalized.version = PLAYER_PROFILE_VERSION;
  normalized.projectId = projectId;
  normalized.readHistory.pages = normalizePages(source.readHistory?.pages);
  normalized.unlocks.endings = normalizeUnlockBucket(source.unlocks?.endings);
  normalized.unlocks.cg = normalizeUnlockBucket(source.unlocks?.cg);
  return normalized;
}

function defaultStorage() {
  return {
    async loadProfile() {
      return null;
    },
    async saveProfile() {
      return { success: true };
    },
    async reset() {
      return { success: true };
    },
    async rebuild() {
      return { success: true };
    },
  };
}

export class PlayerDataRepository {
  constructor(projectId, storage = defaultStorage()) {
    this.projectId = projectId;
    this._storage = storage;
    this._profile = createDefaultPlayerProfile(projectId);
    this._loaded = false;
  }

  async load(force = false) {
    if (this._loaded && !force) {
      return this.getProfile();
    }

    const stored = await this._storage.loadProfile(this.projectId);
    const normalized = normalizePlayerProfile(this.projectId, stored);
    this._profile = normalized;
    this._loaded = true;

    if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
      await this._storage.saveProfile(this.projectId, normalized);
    }

    return this.getProfile();
  }

  getProfile() {
    return cloneJsonValue(this._profile);
  }

  isPageRead(sceneId, pageIndex) {
    return this._profile.readHistory.pages.includes(`${sceneId}:${pageIndex}`);
  }

  async markRead(sceneId, pageIndex) {
    await this.load();
    const key = `${sceneId}:${pageIndex}`;
    if (this._profile.readHistory.pages.includes(key)) {
      return this.getProfile();
    }

    this._profile.readHistory.pages.push(key);
    await this._storage.saveProfile(this.projectId, this._profile);
    return this.getProfile();
  }

  async clearReadHistory() {
    await this.load();
    this._profile.readHistory.pages = [];
    await this._storage.saveProfile(this.projectId, this._profile);
    return this.getProfile();
  }

  async reset(scope) {
    if (scope === GALGAME_RESET_SCOPES.CONTRACT) {
      return this.rebuild();
    }

    await this.load();
    await this._storage.reset(scope, this.projectId);

    if (scope === GALGAME_RESET_SCOPES.PROFILE || scope === GALGAME_RESET_SCOPES.ALL) {
      this._profile = createDefaultPlayerProfile(this.projectId);
      await this._storage.saveProfile(this.projectId, this._profile);
    }

    return {
      success: true,
      profile: this.getProfile(),
    };
  }

  async rebuild() {
    await this._storage.rebuild(this.projectId);
    return this.load(true);
  }
}
