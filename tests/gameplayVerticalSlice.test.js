/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DialogueBox } from '../src/ui/DialogueBox.js';
import { ChoiceMenu } from '../src/ui/ChoiceMenu.js';
import { QuickActionBar } from '../src/ui/QuickActionBar.js';
import { GameplayUi } from '../src/ui/GameplayUi.js';
import { adaptLegacyUiScreen, projectCanonicalThemeScreens } from '../src/shared/uiLegacyAdapters.js';
import { validateUiDocument } from '../src/shared/uiDocumentContract.js';
import { getGameplayLayoutDiagnostics } from '../src/shared/gameplayUiContract.js';
import { getSyntheticNodeOperations } from '../src/editor/screen-designer/unifiedEditorShellModel.js';
import { createProjectSession } from '../src/authoring/projectSession.js';
import { scanAssets } from '../src/engine/scanAssets.js';
import { useScriptStore } from '../src/editor/stores/script.js';

const baseScript = () => ({
  projectId: 'gameplay_phase9_fixture',
  meta: { resolution: { width: 1280, height: 720 } },
  characters: {},
  scenes: { start: { pages: [{ type: 'normal', background: 'backgrounds/stage.png', dialogues: [{ text: 'Story owned' }], characters: [], camera: { x: 0 }, particles: { enabled: true } }] } },
  ui: {
    dialogueBox: {
      fontSize: 24,
      textColor: '#ffffff',
      nameplateStyle: 'floating',
      nameplateBackgroundImage: 'ui/dialogue/nameplate.png',
      decorations: [{ src: 'ui/dialogue/flower.png', x: 8, y: 8, width: 64, height: 64 }],
    },
    widgetStyles: { button: { fontSize: 18, borderRadius: 10 } },
    theme: { choiceBadge: { a: 'ui/badges/a.png' }, icons: { qab: { auto: 'ui/icons/auto.png' } } },
  },
});

beforeEach(() => {
  document.body.innerHTML = '';
  globalThis.requestAnimationFrame = callback => callback();
  setActivePinia(createPinia());
});

describe('Phase 9 canonical Gameplay UI vertical slice', () => {
  it('maps legacy presentation into a complete protected Gameplay document without story staging', () => {
    const adapted = adaptLegacyUiScreen(baseScript(), 'gameplay');
    const types = adapted.document.nodes.map(node => node.type);
    expect(types).toEqual(expect.arrayContaining(['story-viewport', 'dialogue-box', 'nameplate', 'choice-list', 'quick-action-bar', 'skip-status']));
    expect(validateUiDocument(adapted.document, { screenId: 'gameplay' }).filter(item => item.severity === 'error')).toEqual([]);
    expect(JSON.stringify(adapted.document)).not.toContain('backgrounds/stage.png');
    expect(JSON.stringify(adapted.document)).not.toContain('characters');
    expect(adapted.document.nodes.find(node => node.type === 'nameplate').asset.path).toBe('ui/dialogue/nameplate.png');
    expect(adapted.document.nodes.some(node => node.asset?.path === 'ui/dialogue/flower.png')).toBe(true);
  });

  it('rejects missing protected widgets, story bindings, and non-presentation assets', () => {
    const document = adaptLegacyUiScreen(baseScript(), 'gameplay').document;
    document.nodes = document.nodes.filter(node => node.type !== 'story-viewport');
    document.nodes.find(node => node.type === 'choice-list').binding.source = 'save.slots';
    document.nodes.find(node => node.type === 'dialogue-box').asset = { kind: 'video', path: 'videos/story.mp4' };
    const codes = validateUiDocument(document, { screenId: 'gameplay' }).map(item => item.code);
    expect(codes).toContain('gameplay-semantic-cardinality-invalid');
    expect(codes).toContain('gameplay-binding-invalid');
    expect(codes).toContain('gameplay-binding-story-boundary');
    expect(codes).toContain('gameplay-asset-kind-invalid');
  });

  it('uses SharedUiRenderer while preserving DialogueBox, ChoiceMenu, and QuickActionBar behavior ownership and click isolation', () => {
    const gameContainer = document.body.appendChild(document.createElement('div'));
    const dialogueLayer = gameContainer.appendChild(document.createElement('div'));
    const uiOverlay = gameContainer.appendChild(document.createElement('div'));
    const dialogueBox = new DialogueBox(dialogueLayer);
    const choiceMenu = new ChoiceMenu(uiOverlay);
    const quickBar = new QuickActionBar(dialogueBox.el);
    const skipIndicator = gameContainer.appendChild(document.createElement('div'));
    skipIndicator.className = 'hidden';
    const gameplay = new GameplayUi({ gameContainer, dialogueLayer, uiOverlay, dialogueBox, choiceMenu, quickBar, skipIndicator });
    gameplay.setDocument(adaptLegacyUiScreen(baseScript(), 'gameplay').document);

    expect(gameContainer.querySelector('[data-gm-ui-renderer="shared"]')).not.toBeNull();
    expect(gameContainer.querySelector('[data-gm-ui-node-type="story-viewport"]').dataset.gmStoryViewportOwner).toBe('page-editor');

    const advance = vi.fn();
    const auto = vi.fn();
    const select = vi.fn();
    dialogueBox.onAdvance = advance;
    quickBar.onAuto = auto;
    choiceMenu.onSelect = select;
    dialogueBox.show({ speakerName: 'Sakura', text: 'Hello' });
    dialogueBox.el.click();
    expect(dialogueBox.isComplete()).toBe(true);
    dialogueBox.el.click();
    expect(advance).toHaveBeenCalledTimes(1);

    quickBar.el.querySelector('[data-action="auto"]').click();
    expect(auto).toHaveBeenCalledTimes(1);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(quickBar.el.querySelector('[data-action="quickload"]').classList.contains('disabled')).toBe(true);

    choiceMenu.show({ prompt: 'Choose', options: [{ text: 'A' }, { text: 'B' }] });
    choiceMenu.el.querySelectorAll('.choice-button')[1].click();
    expect(select).toHaveBeenCalledWith(1);
    expect(advance).toHaveBeenCalledTimes(1);

    dialogueBox.show({ speakerName: '', text: 'Narration' });
    expect(dialogueBox.namePlateEl.classList.contains('visible')).toBe(false);
    gameplay.updateRuntimeState({ dialogue: { text: 'x'.repeat(240) }, choices: [{ text: 'y'.repeat(90) }] });
    expect(gameplay.host.diagnostics.map(item => item.code)).toEqual(expect.arrayContaining(['gameplay-dialogue-overflow-risk', 'gameplay-choice-overflow-risk']));
  });

  it('keeps every gameplay semantic invariant protected in shell operations', () => {
    const document = adaptLegacyUiScreen(baseScript(), 'gameplay').document;
    for (const type of ['story-viewport', 'dialogue-box', 'nameplate', 'choice-list', 'quick-action-bar', 'skip-status']) {
      const node = document.nodes.find(item => item.type === type);
      const operations = getSyntheticNodeOperations(document, node.id);
      expect(operations.find(item => item.id === 'delete').enabled).toBe(false);
      expect(operations.find(item => item.id === 'duplicate').enabled).toBe(false);
      expect(operations.find(item => item.id === 'wrap').enabled).toBe(false);
    }
  });

  it('updates only ui.screens.gameplay from the Page Editor UI path and leaves story pages byte-identical', () => {
    const store = useScriptStore();
    const script = baseScript();
    store.loadFromData(script);
    const before = JSON.stringify(store.data.scenes);
    const document = adaptLegacyUiScreen(store.data, 'gameplay').document;
    document.nodes.find(node => node.type === 'dialogue-box').style = { color: '#ffeeff' };
    store.updateCanonicalGameplayScreen(document);
    expect(JSON.stringify(store.data.scenes)).toBe(before);
    expect(store.data.ui.screenAuthorities.gameplay).toBe('canonical-active');
    expect(store.data.ui.screens.gameplay.nodes.find(node => node.type === 'dialogue-box').style.color).toBe('#ffeeff');
  });

  it('provides validated migrate/set/update authoring operations and preserves exact changed paths', () => {
    const session = createProjectSession({ script: baseScript() });
    const migrated = session.migrateGameplayUi();
    expect(migrated.changedPaths).toEqual(['ui.screenSchemaVersion', 'ui.screenAuthorities.gameplay', 'ui.screens.gameplay']);
    expect(session.toJSON().ui.screenAuthorities.gameplay).toBe('canonical-active');
    const updated = session.updateGameplayNode({ nodeId: 'gameplay.dialogue', path: 'content.label', value: 'Dialogue Chrome' });
    expect(updated.changedPaths).toEqual(['ui.screens.gameplay.nodes.gameplay.dialogue']);
    expect(session.toJSON().ui.screens.gameplay.nodes.find(node => node.id === 'gameplay.dialogue').content.label).toBe('Dialogue Chrome');
  });

  it('projects Gameplay UI into gmtheme and routes canonical/legacy assets through scan/export inputs', () => {
    const script = baseScript();
    const document = adaptLegacyUiScreen(script, 'gameplay').document;
    script.ui.screenSchemaVersion = 2;
    script.ui.screens = { gameplay: document };
    script.ui.screenAuthorities = { gameplay: 'canonical-active' };
    expect(projectCanonicalThemeScreens(script).screens.gameplay.nodes.some(node => node.type === 'story-viewport')).toBe(true);
    const assets = scanAssets(script);
    expect(assets.backgrounds).toEqual(expect.arrayContaining(['ui/dialogue/nameplate.png', 'ui/dialogue/flower.png']));
    expect(assets.ui).toEqual(expect.arrayContaining(['ui/dialogue/nameplate.png', 'ui/dialogue/flower.png', 'ui/badges/a.png']));
  });

  it('emits deterministic layout warnings only for risky long fixtures', () => {
    expect(getGameplayLayoutDiagnostics({ dialogue: { text: 'Short' }, choices: [{ text: 'A' }] })).toEqual([]);
    expect(getGameplayLayoutDiagnostics({ dialogue: { text: 'x'.repeat(221) }, choices: Array.from({ length: 7 }, (_, index) => ({ text: `${index}` })) }).map(item => item.code)).toEqual(['gameplay-dialogue-overflow-risk', 'gameplay-choice-overflow-risk']);
  });
});
