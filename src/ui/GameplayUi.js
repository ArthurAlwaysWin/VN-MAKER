import { createUiRuntimeHost } from './renderer/createUiRendererHost.js';
import { applyUiNodeLayout } from './renderer/SharedUiRenderer.js';
import { applyUiNodeStyle, resolveUiNodeStyle } from './renderer/uiStyleResolver.js';
import { resolvePath } from '../engine/assetPath.js';
import { getGameplayLayoutDiagnostics } from '../shared/gameplayUiContract.js';

/**
 * Canonical Gameplay UI is a presentation host. Existing runtime components
 * remain the behavior owners and ScriptEngine remains the story owner.
 */
export class GameplayUi {
  constructor({ gameContainer, dialogueLayer, uiOverlay, dialogueBox, choiceMenu, quickBar, skipIndicator }) {
    Object.assign(this, { gameContainer, dialogueLayer, uiOverlay, dialogueBox, choiceMenu, quickBar, skipIndicator });
    this.document = null;
    this.host = null;
    this.root = null;
    this.runtimeState = { dialogue: null, choices: [], quickActions: {}, skipStatus: { active: false, readOnly: false } };
  }

  setDocument(document) {
    this.document = document || null;
    if (!this.document) return this.unmount();
    this.mount();
  }

  updateRuntimeState(patch = {}) {
    this.runtimeState = { ...this.runtimeState, ...patch };
    if (!this.host || !this.document) return;
    this.host.updateData(this.#dataSources());
    for (const diagnostic of getGameplayLayoutDiagnostics({ dialogue: this.runtimeState.dialogue, choices: this.runtimeState.choices })) this.host.reportDiagnostic(diagnostic);
  }

  mount() {
    this.unmount();
    this.root = this.gameContainer.ownerDocument.createElement('div');
    this.root.id = 'gameplay-ui-canonical';
    Object.assign(this.root.style, { position: 'absolute', inset: '0', zIndex: '30', pointerEvents: 'none' });
    this.gameContainer.appendChild(this.root);
    this.dialogueBox.setCanonicalLayoutActive(true);
    this.choiceMenu.setCanonicalLayoutActive(true);
    const proxy = (type, update) => ({
      mount: ({ element }) => { element.dataset.gmUiSemanticWidget = type; element.style.pointerEvents = 'none'; },
      update,
      unmount() {},
    });
    this.host = createUiRuntimeHost({
      container: this.root,
      resolveAssetUrl: path => resolvePath(path),
      dataSources: this.#dataSources(),
      semanticWidgets: {
        'story-viewport': proxy('story-viewport', ({ element }) => { element.dataset.gmStoryViewportOwner = 'page-editor'; }),
        'dialogue-box': proxy('dialogue-box', ({ element }) => {
          element.style.pointerEvents = 'auto';
          if (this.dialogueBox.el.parentElement !== element) element.appendChild(this.dialogueBox.el);
        }),
        nameplate: proxy('nameplate', ({ element, node, host }) => {
          element.hidden = true;
          applyUiNodeLayout(this.dialogueBox.namePlateEl, node.layout, false);
          applyUiNodeStyle(this.dialogueBox.namePlateEl, resolveUiNodeStyle(node, host.styles));
          if (node.asset?.path) this.dialogueBox._setNameplateArt(node.asset.path);
        }),
        'choice-list': proxy('choice-list', ({ element }) => {
          element.style.pointerEvents = 'auto';
          if (this.choiceMenu.el.parentElement !== element) element.appendChild(this.choiceMenu.el);
        }),
        'quick-action-bar': proxy('quick-action-bar', ({ element }) => {
          element.style.pointerEvents = 'auto';
          if (this.quickBar.el.parentElement !== element) element.appendChild(this.quickBar.el);
        }),
        'skip-status': proxy('skip-status', ({ element, node }) => {
          element.style.pointerEvents = 'none';
          if (this.skipIndicator.parentElement !== element) element.appendChild(this.skipIndicator);
          this.skipIndicator.textContent = node.content?.text ?? '▶▶ SKIP';
        }),
      },
    });
    this.host.mount(this.document);
  }

  #dataSources() {
    return {
      'story.viewport': { owner: 'PageEditor' },
      'dialogue.current': this.runtimeState.dialogue,
      'choice.options': this.runtimeState.choices,
      'runtime.quickActions': this.runtimeState.quickActions,
      'runtime.skipStatus': this.runtimeState.skipStatus,
    };
  }

  unmount() {
    this.host?.unmount();
    this.host = null;
    this.dialogueBox.setCanonicalLayoutActive(false);
    this.choiceMenu.setCanonicalLayoutActive(false);
    if (this.dialogueBox.el.parentElement !== this.dialogueLayer) this.dialogueLayer.appendChild(this.dialogueBox.el);
    if (this.quickBar.el.parentElement !== this.dialogueBox.el) this.dialogueBox.el.appendChild(this.quickBar.el);
    if (this.choiceMenu.el.parentElement !== this.uiOverlay) this.uiOverlay.appendChild(this.choiceMenu.el);
    if (this.skipIndicator.parentElement !== this.gameContainer) this.gameContainer.appendChild(this.skipIndicator);
    this.root?.remove();
    this.root = null;
  }
}
