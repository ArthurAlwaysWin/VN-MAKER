import { createApp } from 'vue';
import UnifiedScreenDesignerShell from '../components/screen-designer/UnifiedScreenDesignerShell.vue';
import { adaptLegacyUiScreen } from '../../shared/uiLegacyAdapters.js';

const params = new URLSearchParams(window.location.search);
const useTitle = params.get('screen') === 'title';
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
  : {});

app.mount('#app');
