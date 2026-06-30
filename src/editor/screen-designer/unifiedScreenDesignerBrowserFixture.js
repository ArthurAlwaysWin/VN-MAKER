import { createApp } from 'vue';
import UnifiedScreenDesignerShell from '../components/screen-designer/UnifiedScreenDesignerShell.vue';
import { adaptLegacyUiOverlay, adaptLegacyUiScreen } from '../../shared/uiLegacyAdapters.js';

const params = new URLSearchParams(window.location.search);
const screen = params.get('screen');
const useTitle = screen === 'title';
const useGameMenu = screen === 'gameMenu';
const useSaveLoad = screen === 'saveLoad';
const useBacklog = screen === 'backlog';
const useSettings = screen === 'settings';
const useGameplay = screen === 'gameplay';
const useGallery = screen === 'gallery';
const useTextInput = screen === 'textInput';
const useConfirmation = screen === 'confirmation';
const useVideoControls = screen === 'videoControls';
const titleScript = {
  meta: { title: 'Browser Evidence Title', resolution: { width: 1280, height: 720 } },
  ui: {
    titleScreen: {
      background: 'backgrounds/title.png',
      bgm: 'audio/title.ogg',
      openingVideo: { videoId: 'op', play: 'manual' },
      elements: [
        { id: 'logo', type: 'text', content: 'Browser Evidence Title', x: 640, y: 150, anchor: 'center', fontSize: 42, color: '#ffffff' },
        { id: 'start', type: 'button', text: 'Start Evidence', action: 'start', x: 540, y: 390, width: 220, height: 54, backgroundColor: 'rgba(0,0,0,0.65)', hoverColor: '#333333' },
        { id: 'op', type: 'button', text: 'Replay OP', action: 'play-opening-video', x: 540, y: 458, width: 220, height: 54 },
      ],
    },
  },
};
const gameMenuScript = {
  meta: { title: 'Browser Evidence Game Menu', resolution: { width: 1280, height: 720 } },
  ui: {
    gameMenu: {
      position: 'center',
      width: 300,
      background: 'rgba(0,0,0,0.72)',
      borderRadius: 8,
      buttonGap: 12,
      buttons: {
        save: { text: 'Save Evidence', icon: null },
        load: { text: 'Load Evidence', icon: null },
        backlog: { text: 'Backlog Evidence', icon: null },
        settings: { text: 'Settings Evidence', icon: null },
        title: { text: 'Title Evidence', icon: null },
        close: { text: 'Close Evidence', icon: null },
      },
    },
  },
};
const statefulScript = {
  meta: { title: 'Browser Evidence Stateful Screens', resolution: { width: 1280, height: 720 } },
  ui: {
    saveLoadScreen: { header: { saveTitle: 'Save Evidence', loadTitle: 'Load Evidence' }, slotGrid: { x: 60, y: 100, width: 1160, height: 500, columns: 3, rows: 3, gap: 12 }, slot: { emptyText: 'Empty Evidence' } },
    backlogScreen: { header: { title: 'Backlog Evidence' }, entry: { textFontSize: 18 } },
  },
};
const settingsScript = {
  meta: { title: 'Browser Evidence Settings', resolution: { width: 1280, height: 720 } },
  ui: {
    settingsScreen: {
      header: { title: { text: 'Settings Evidence' }, height: 80 },
      tabBar: { enabled: true, tabs: [
        { id: 'audio', label: 'Audio', settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'] },
        { id: 'display', label: 'Display', settingKeys: ['dialogue-opacity', 'window-mode'] },
        { id: 'gameplay', label: 'Gameplay', settingKeys: ['text-speed', 'auto-speed', 'skip-mode'] },
      ] },
      contentArea: { x: 80, y: 150, width: 1120, height: 480 },
    },
  },
};
const gameplayScript = {
  meta: { title: 'Browser Evidence Gameplay UI', resolution: { width: 1280, height: 720 } },
  ui: {
    dialogueBox: {
      fontSize: 24,
      textColor: '#ffffff',
      nameplateStyle: 'floating',
      nameplateBackgroundImage: 'ui/dialogue/nameplate.png',
      decorations: [{ src: 'ui/dialogue/flower.png', x: 12, y: 12, width: 72, height: 72 }],
    },
    widgetStyles: { button: { fontSize: 18, borderRadius: 12 } },
    theme: { choiceBadge: { a: 'ui/badges/a.png' }, icons: { qab: { auto: 'ui/icons/auto.png' } } },
  },
};
const phase10Script = { meta: { title: 'Phase 10 Evidence', resolution: { width: 1280, height: 720 } }, systems: { gallery: { cg: {} }, endings: {} }, ui: {} };

window.__usdEvidence = { changes: [], actions: [] };
const evidenceEl = document.createElement('pre');
evidenceEl.dataset.test = 'usd-evidence';
evidenceEl.style.position = 'fixed';
evidenceEl.style.right = '8px';
evidenceEl.style.bottom = '8px';
evidenceEl.style.maxWidth = '320px';
evidenceEl.style.maxHeight = '120px';
evidenceEl.style.overflow = 'auto';
evidenceEl.style.fontSize = '11px';
evidenceEl.style.color = '#c9d8ff';
evidenceEl.style.background = 'rgba(0,0,0,0.72)';
evidenceEl.style.padding = '6px';
evidenceEl.textContent = JSON.stringify(window.__usdEvidence);
document.body.appendChild(evidenceEl);

function recordEvidence(kind, event) {
  window.__usdEvidence[kind].push(event);
  evidenceEl.textContent = JSON.stringify({
    changes: window.__usdEvidence.changes.map(change => change.operation),
    actions: window.__usdEvidence.actions.map(action => action.type),
  });
}

const app = createApp(UnifiedScreenDesignerShell, useTitle
  ? {
    initialDocument: adaptLegacyUiScreen(titleScript, 'title').document,
    productionTitle: true,
    onDocumentChange: event => recordEvidence('changes', event),
    onAction: event => recordEvidence('actions', event),
  }
  : useGameMenu
    ? {
      initialDocument: adaptLegacyUiScreen(gameMenuScript, 'gameMenu').document,
      productionScreenId: 'gameMenu',
      productionScreenLabel: 'Game Menu',
      onDocumentChange: event => recordEvidence('changes', event),
      onAction: event => recordEvidence('actions', event),
    }
    : useSaveLoad || useBacklog
      ? {
        initialDocument: adaptLegacyUiScreen(statefulScript, useSaveLoad ? 'saveLoad' : 'backlog').document,
        productionScreenId: useSaveLoad ? 'saveLoad' : 'backlog',
        productionScreenLabel: useSaveLoad ? 'Save / Load' : 'Backlog',
        onDocumentChange: event => recordEvidence('changes', event),
        onAction: event => recordEvidence('actions', event),
      }
      : useSettings
        ? {
          initialDocument: adaptLegacyUiScreen(settingsScript, 'settings').document,
          productionScreenId: 'settings',
          productionScreenLabel: 'Settings',
          onDocumentChange: event => recordEvidence('changes', event),
          onAction: event => recordEvidence('actions', event),
        }
        : useGameplay
          ? {
            initialDocument: adaptLegacyUiScreen(gameplayScript, 'gameplay').document,
            productionScreenId: 'gameplay',
            productionScreenLabel: 'Gameplay UI',
            onDocumentChange: event => recordEvidence('changes', event),
            onAction: event => recordEvidence('actions', event),
          }
          : useGallery
            ? {
              initialDocument: adaptLegacyUiScreen(phase10Script, 'gallery').document,
              productionScreenId: 'gallery', productionScreenLabel: 'Gallery',
              onDocumentChange: event => recordEvidence('changes', event), onAction: event => recordEvidence('actions', event),
            }
            : useTextInput || useConfirmation || useVideoControls
              ? {
                initialDocument: adaptLegacyUiOverlay(phase10Script, useTextInput ? 'textInput' : useConfirmation ? 'confirmation' : 'videoControls').document,
                productionScreenId: useTextInput ? 'textInput' : useConfirmation ? 'confirmation' : 'videoControls',
                productionScreenLabel: useTextInput ? 'Text Input Overlay' : useConfirmation ? 'Confirmation Overlay' : 'Video Controls Overlay',
                onDocumentChange: event => recordEvidence('changes', event), onAction: event => recordEvidence('actions', event),
              }
  : {});

app.mount('#app');
