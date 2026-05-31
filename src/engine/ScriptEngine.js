/**
 * ScriptEngine — Page-based game script interpreter
 *
 * Loads JSON game scripts with page-based format and plays them
 * sequentially. Each page is a self-contained visual state (background,
 * characters, BGM) with a dialogues[] array that advances on player click.
 *
 * Page types:
 *   'normal'    — Visual state + dialogues (player clicks to advance)
 *   'choice'    — Visual state + prompt/options (player selects an option)
 *   'condition' — Variable check → jump to target scene (auto, no visual)
 *
 * Events emitted:
 *   'dialogue'        — { speaker, speakerName, speakerColor, text }
 *   'show_character'  — { id, expression, position, transition, duration, image }
 *   'hide_character'  — { id, transition, duration }
 *   'set_expression'  — { id, expression, image }
 *   'set_background'  — { image, transition, duration }
 *   'play_bgm'        — { file, volume, fadeIn }
 *   'stop_bgm'        — { fadeOut }
 *   'play_se'         — { file }
 *   'choice'          — { prompt, options }
 *   'set_particles'   — { config, sceneId, pageIndex }
 *   'stop_particles'  — { sceneId, pageIndex }
 *   'end'             — {}
 *   'scene_enter'     — { sceneId, sceneName }
 *   'page_enter'      — { sceneId, pageIndex, page }
 */

import { EventEmitter } from './EventEmitter.js';
import {
  CONDITION_OPERATORS,
  evaluateConditionPage,
  normalizeConditionPage,
} from '../shared/branchingContract.js';
import {
  getCharacterAnimationValue,
  getPageCameraContract,
  getPageTransitionContract,
  getRuntimeTransitionType,
} from '../shared/cinematicContract.js';
import { applyEffects } from '../shared/effectDsl.js';
import { resolveEffectivePageParticles } from '../shared/particleContract.js';
import {
  mergeRuntimeVariables,
  normalizeVariableRegistry,
  seedRuntimeVariablesFromRegistry,
} from '../shared/variableRegistry.js';

export class ScriptEngine extends EventEmitter {
  constructor() {
    super();

    /** @type {Object|null} Full script data */
    this.script = null;

    /** @type {string|null} Current scene ID */
    this.currentScene = null;

    /** @type {number} Current page index within the scene's pages[] */
    this.pageIndex = 0;

    /** @type {number} Current dialogue index within the page's dialogues[] */
    this.dialogueIndex = 0;

    /** @type {Map<string, *>} Game variables (flags, affection, etc.) */
    this.variables = new Map();

    /** @type {boolean} Whether the engine is waiting for player input */
    this.waiting = false;

    /** @type {boolean} Whether the game has ended */
    this.ended = false;

    /** @type {Array<{speaker: string|null, speakerName: string|null, text: string}>} */
    this.history = [];

    // ─── Render state tracking (for diffing page transitions) ───
    /** @type {Set<string>} Character IDs visible on previous page */
    this._prevPageCharIds = new Set();
    /** @type {string|null} Currently playing BGM file path */
    this._currentBgmFile = null;
    /** @type {string|null} Currently displayed background path */
    this._currentBg = null;
    /** @type {Map<string, string>} Character ID → current expression name */
    this._expressionState = new Map();

    /** @type {boolean} Preview mode — hides game menus when running inside editor iframe */
    this._previewMode = false;

    /** @type {import('./PlayerDataRepository.js').PlayerDataRepository|null} */
    this._playerDataRepository = null;
  }

  // ─── Loading ──────────────────────────────────────────────

  /**
   * Load a game script from a URL
   * @param {string} url
   */
  async load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load script: ${res.status}`);
    this.script = await res.json();
    console.log(`[ScriptEngine] Loaded: "${this.script.meta?.title || 'Untitled'}" v${this.script.meta?.version || '?'}`);
  }

  // ─── Playback control ────────────────────────────────────

  /**
   * Start the game from a given scene.
   * Falls back to the first scene if the requested ID doesn't exist.
   * @param {string} [sceneId='start']
   */
  startGame(sceneId = 'start') {
    const scenes = this.script?.scenes;
    if (!scenes || typeof scenes !== 'object') {
      console.error('[ScriptEngine] Cannot start game without loaded scenes');
      this.ended = true;
      return false;
    }

    this.variables = seedRuntimeVariablesFromRegistry(this.script?.systems?.variables);
    this.history = [];
    this.ended = false;
    this._resetRenderState();

    // Resolve start scene: explicit ID → 'start' → first scene in object
    let resolvedId = sceneId;
    if (!scenes[resolvedId]) {
      const firstId = Object.keys(scenes)[0];
      if (firstId) {
        console.warn(`[ScriptEngine] Scene "${resolvedId}" not found, falling back to first scene: "${firstId}"`);
        resolvedId = firstId;
      }
    }
    this._enterScene(resolvedId);
    return true;
  }

  /**
   * Advance to next dialogue or next page. Called on player click/tap.
   * No-op if engine is not waiting for a click.
   */
  next() {
    if (this.ended) return;
    if (!this.waiting) return;
    this.waiting = false;

    const page = this._currentPage();
    if (!page || page.type !== 'normal') return;

    // More dialogues in this page? → advance dialogue
    if (this.dialogueIndex < page.dialogues.length - 1) {
      this.dialogueIndex++;
      this._playCurrentDialogue();
    } else {
      // All dialogues done → advance to next page
      this._advancePage();
    }
  }

  /**
   * Handle a choice selection
   * @param {number} optionIndex
   */
  selectChoice(optionIndex) {
    if (this.ended) return;
    const page = this._currentPage();
    if (!page || page.type !== 'choice') return;

    const option = page.options[optionIndex];
    if (!option) return;

    void this._applyOptionEffects(option);

    this.waiting = false;

    // Jump to target scene
    if (option.target) {
      this._enterScene(option.target);
    } else {
      this._advancePage();
    }
  }

  setPlayerDataRepository(repository) {
    this._playerDataRepository = repository ?? null;
  }

  // ─── Save / Restore state ────────────────────────────────

  /**
   * Get a serializable snapshot of the current game state
   */
  getState() {
    return {
      currentScene: this.currentScene,
      pageIndex: this.pageIndex,
      dialogueIndex: this.dialogueIndex,
      variables: Object.fromEntries(this.variables),
      history: [...this.history],
      expressionState: Object.fromEntries(this._expressionState),
    };
  }

  /**
   * Restore from a saved state snapshot
   * @param {Object} state
   */
  restoreState(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state) || typeof state.currentScene !== 'string') {
      return false;
    }

    this.currentScene = state.currentScene;
    this.pageIndex = state.pageIndex ?? 0;
    this.dialogueIndex = state.dialogueIndex ?? 0;
    this.variables = mergeRuntimeVariables(this.script?.systems?.variables, state.variables || {});
    this.history = state.history || [];
    this._expressionState = new Map(Object.entries(state.expressionState || {}));
    this.ended = false;
    this.waiting = false;
    return true;
  }

  /**
   * Clear render tracking state. Call before renderCurrentPage()
   * after restoreState() so the first render doesn't diff against
   * stale previous-page data.
   */
  resetRenderState() {
    this._resetRenderState();
  }

  /**
   * Render the current page's visual state and start its dialogue/choice.
   * Public method for use by main.js after restoreState + resetRenderState.
   */
  renderCurrentPage() {
    const page = this._currentPage();
    if (!page) return;

    if (page.type === 'normal') {
      this._renderPage(page);
      this._playCurrentDialogue();
    } else if (page.type === 'choice') {
      this._renderPage(page);
      this._execChoice(page);
    }
    // condition pages have no visual — should not be a restore target
  }

  // ─── Internal ─────────────────────────────────────────────

  /**
   * @private
   */
  _resetRenderState() {
    this._prevPageCharIds = new Set();
    this._currentBgmFile = null;
    this._currentBg = null;
    this._expressionState.clear();
  }

  /**
   * Enter a scene and start from page 0
   * @param {string} sceneId
   * @private
   */
  _enterScene(sceneId) {
    const scene = this.script.scenes[sceneId];
    if (!scene) {
      console.error(`[ScriptEngine] Scene not found: ${sceneId}`);
      return;
    }
    this.currentScene = sceneId;
    this.pageIndex = 0;
    this.dialogueIndex = 0;
    this._expressionState.clear();
    this.emit('scene_enter', { sceneId, sceneName: scene.name });
    this._processCurrentPage();
  }

  /**
   * @returns {Object|null} Current page object
   * @private
   */
  _currentPage() {
    const scene = this.script?.scenes?.[this.currentScene];
    if (!scene || !scene.pages) return null;
    return scene.pages[this.pageIndex] || null;
  }

  /**
   * Process the current page based on its type
   * @private
   */
  _processCurrentPage() {
    const page = this._currentPage();
    if (!page) {
      // No more pages in this scene
      const scene = this.script?.scenes?.[this.currentScene];
      if (scene?.next) {
        this._enterScene(scene.next);
      } else {
        this._execEnd();
      }
      return;
    }

    switch (page.type) {
      case 'normal':
        void this._applyPageEffects(page);
        this._renderPage(page);
        this.dialogueIndex = 0;
        this._playCurrentDialogue();
        break;
      case 'choice':
        this._renderPage(page);
        this._execChoice(page);
        break;
      case 'condition':
        this._execCondition(page);
        break;
      default:
        console.warn(`[ScriptEngine] Unknown page type: ${page.type}`);
        this._advancePage();
    }
  }

  /**
   * Render a page's visual state: background, characters, BGM, SE.
   * Uses diffing against previous page to avoid unnecessary transitions.
   * @param {Object} page
   * @private
   */
  _renderPage(page) {
    this.emit('page_enter', {
      sceneId: this.currentScene,
      pageIndex: this.pageIndex,
      page,
      camera: getPageCameraContract(page.camera),
    });

    const transitionContract = getPageTransitionContract(page.transition)
      ?? getPageTransitionContract({ type: 'fade', duration: 800 });
    const transition = getRuntimeTransitionType(transitionContract.type);
    const duration = transitionContract.duration;

    const particles = resolveEffectivePageParticles(this.script, this.currentScene, this.pageIndex);
    if (particles) {
      this.emit('set_particles', {
        config: particles,
        sceneId: this.currentScene,
        pageIndex: this.pageIndex,
      });
    } else {
      this.emit('stop_particles', {
        sceneId: this.currentScene,
        pageIndex: this.pageIndex,
      });
    }

    // ─── Background (only emit if changed) ───
    if (page.background && page.background !== this._currentBg) {
      this.emit('set_background', {
        image: page.background,
        transition,
        duration,
      });
      this._currentBg = page.background;
    }

    // ─── Characters (diff enter/exit) ───
    const currentCharIds = new Set((page.characters || []).map(c => c.id));

    // Hide characters no longer on this page
    for (const id of this._prevPageCharIds) {
      if (!currentCharIds.has(id)) {
        this.emit('hide_character', {
          id,
          transition: 'fade',
          duration: 400,
        });
      }
    }

    // Show/update characters on this page
    for (const char of (page.characters || [])) {
      const charDef = this.script.characters[char.id];
      const wasVisible = this._prevPageCharIds.has(char.id);

      // Expression resolution chain (D-02):
      // explicit page data → inherited from previous page → first expression → ''
      const expressions = charDef?.expressions || {};
      const resolvedExpr = char.expression
        || this._expressionState.get(char.id)
        || Object.keys(expressions)[0]
        || '';

      // D-07: Validate resolved expression actually exists
      const validExpr = expressions[resolvedExpr]
        ? resolvedExpr
        : (Object.keys(expressions)[0] || '');

      this._expressionState.set(char.id, validExpr);

      this.emit('show_character', {
        id: char.id,
        expression: validExpr,
        animation: getCharacterAnimationValue(char.animation),
        position: char.position || 'center',
        x: char.x,
        y: char.y,
        scale: char.scale ?? 1,
        transition: wasVisible ? 'none' : 'fade',
        duration: wasVisible ? 0 : 500,
        image: expressions[validExpr] || '',
      });
    }

    this._prevPageCharIds = currentCharIds;

    // ─── BGM (only change if file differs) ───
    if (page.bgm && page.bgm.file) {
      if (this._currentBgmFile !== page.bgm.file) {
        this.emit('play_bgm', {
          file: page.bgm.file,
          volume: page.bgm.volume ?? 0.5,
          fadeIn: 0,
        });
        this._currentBgmFile = page.bgm.file;
      }
    } else if (this._currentBgmFile) {
      // Page has no BGM → stop current
      this.emit('stop_bgm', { fadeOut: 500 });
      this._currentBgmFile = null;
    }

    // ─── Sound Effect (play every time page renders) ───
    if (page.se && page.se.file) {
      this.emit('play_se', { file: page.se.file });
    }
  }

  /**
   * Play the dialogue at the current dialogueIndex
   * @private
   */
  _playCurrentDialogue() {
    const page = this._currentPage();
    if (!page || page.type !== 'normal') return;

    if (!page.dialogues || this.dialogueIndex >= page.dialogues.length) {
      // No dialogues or empty → advance to next page
      this._advancePage();
      return;
    }

    const dlg = page.dialogues[this.dialogueIndex];
    const char = dlg.speaker ? this.script.characters[dlg.speaker] : null;

    // Handle mid-dialogue expression change for the speaking character
    if (dlg.expression && dlg.speaker) {
      const charDef = this.script.characters[dlg.speaker];
      const expressions = charDef?.expressions || {};
      // D-07: Validate expression exists
      const validExpr = expressions[dlg.expression]
        ? dlg.expression
        : (Object.keys(expressions)[0] || '');
      this._expressionState.set(dlg.speaker, validExpr);
      this.emit('set_expression', {
        id: dlg.speaker,
        expression: validExpr,
        image: expressions[validExpr] || '',
      });
    }

    // Emit dialogue event
    const data = {
      speaker: dlg.speaker,
      speakerName: char?.name || null,
      speakerColor: char?.color || null,
      text: dlg.text,
      voice: dlg.voice || null,
    };

    this.history.push({
      speaker: dlg.speaker,
      speakerName: data.speakerName,
      text: dlg.text,
      voice: dlg.voice || null,
    });

    // Cap in-memory history to prevent unbounded growth during long sessions (HIST-01)
    if (this.history.length > 200) {
      this.history = this.history.slice(-200);
    }

    this.waiting = true;
    this.emit('dialogue', data);
  }

  /**
   * Advance to the next page in the current scene
   * @private
   */
  _advancePage() {
    this.pageIndex++;
    this.dialogueIndex = 0;
    this._processCurrentPage();
  }

  // ─── Page type executors ──────────────────────────────────

  /**
   * @private
   */
  _execChoice(page) {
    this.waiting = true;
    this.emit('choice', {
      prompt: page.prompt,
      options: Array.isArray(page.options) ? page.options : [],
    });
  }

  /**
   * @private
   */
  _execCondition(page) {
    const registry = normalizeVariableRegistry(this.script?.systems?.variables);
    const operators = Array.isArray(page?.conditions) && page.conditions.length > 0
      ? page.conditions.map((condition) => condition?.operator)
      : [page?.operator];
    const unknownOperator = operators.find((operator) => !CONDITION_OPERATORS.includes(operator));
    const normalizedPage = normalizeConditionPage(page, { registry });

    if (unknownOperator) {
      console.warn(`[ScriptEngine] Unknown operator: ${unknownOperator}`);
      this.emit('error', { type: 'unknown_operator', operator: unknownOperator, page });
    }

    const result = !unknownOperator && evaluateConditionPage(normalizedPage, {
      variables: this.variables,
      registry,
    });
    const target = result ? normalizedPage.trueTarget : normalizedPage.falseTarget;
    if (target) {
      this._enterScene(target);
    } else {
      this._advancePage();
    }
  }

  /**
   * @private
   */
  _execEnd() {
    this.ended = true;
    this.emit('end', {});
  }

  async _applyOptionEffects(option) {
    try {
      await applyEffects(option, {
        variables: this.variables,
        playerDataRepository: this._playerDataRepository,
      });
    } catch (error) {
      console.error('[ScriptEngine] Failed to apply choice effects:', error);
    }
  }

  async _applyPageEffects(page) {
    try {
      const endingEffects = (Array.isArray(page?.effects) ? page.effects : [])
        .filter((effect) => effect?.type === 'unlock:ending');
      await applyEffects(endingEffects, {
        variables: this.variables,
        playerDataRepository: this._playerDataRepository,
      });
    } catch (error) {
      console.error('[ScriptEngine] Failed to apply page-enter effects:', error);
    }
  }
}
