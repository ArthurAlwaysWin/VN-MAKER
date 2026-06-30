import { adaptLegacyUiScreen } from '../shared/uiLegacyAdapters.js';
import { GameMenu } from './GameMenu.js';

const script = {
  meta: { resolution: { width: 1280, height: 720 } },
  ui: {
    gameMenu: {
      position: 'center',
      width: 320,
      background: 'rgba(0,0,0,0.68)',
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

window.__gameMenuEvidence = { actions: [], confirmations: [] };
const evidenceEl = document.createElement('pre');
evidenceEl.dataset.test = 'game-menu-runtime-evidence';
document.body.appendChild(evidenceEl);

function record(kind, value) {
  window.__gameMenuEvidence[kind].push(value);
  evidenceEl.textContent = JSON.stringify(window.__gameMenuEvidence, null, 2);
}

const menu = new GameMenu(document.getElementById('ui-overlay'));
menu.onSave = () => record('actions', 'save');
menu.onLoad = () => record('actions', 'load');
menu.onBacklog = () => record('actions', 'backlog');
menu.onSettings = () => record('actions', 'settings');
menu.onTitle = () => record('actions', 'title');
menu.setLayout(null, { canonicalDocument: adaptLegacyUiScreen(script, 'gameMenu').document });
menu.show();

window.__gameMenuMenu = menu;
record('confirmations', 'ready');
