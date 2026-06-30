import '../style.css';
import { adaptLegacyUiScreen } from '../shared/uiLegacyAdapters.js';
import { SaveLoadScreen } from './SaveLoadScreen.js';
import { BacklogScreen } from './BacklogScreen.js';

const root = document.getElementById('fixture-root');
const script = {
  meta: { resolution: { width: 1280, height: 720 } },
  ui: {
    saveLoadScreen: { header: { saveTitle: 'Save Game', loadTitle: 'Load Game' }, slotGrid: { columns: 3, rows: 3, gap: 12 }, slot: { emptyText: 'Empty slot' }, pagination: { style: 'dots' } },
    backlogScreen: { header: { title: 'Backlog' }, entry: { textFontSize: 18 } },
  },
};
const slots = new Map(Array.from({ length: 12 }, (_, index) => [index + 1, { slot: index + 1, previewText: `Chapter ${index + 1} — fixture dialogue`, date: `2026-06-${String(index + 1).padStart(2, '0')}` }]));
const saveManager = { async getAllSlots() { await Promise.resolve(); return [...slots.values()]; } };
const audio = { async playVoice() {}, stopVoice() {} };
const saveLoad = new SaveLoadScreen(root, saveManager);
const backlog = new BacklogScreen(root, audio);
saveLoad.setLayout(null, { canonicalDocument: adaptLegacyUiScreen(script, 'saveLoad').document });
backlog.setLayout(null, { canonicalDocument: adaptLegacyUiScreen(script, 'backlog').document });
saveLoad.onDelete = async slot => slots.delete(slot);
saveLoad.onSave = async slot => slots.set(slot, { slot, previewText: 'New save', date: 'now' });

const populatedHistory = [
  { speaker: 'alice', speakerName: 'Alice', text: 'The shared renderer keeps this history semantic and editable.', voice: 'voice/alice.ogg' },
  { speaker: 'bob', speakerName: 'Bob', text: 'Runtime history still belongs to the engine.', voice: null },
  { speaker: null, speakerName: null, text: 'The night grows quiet.', voice: null },
];
const characters = { alice: { color: '#8db6ff' }, bob: { color: '#f3a6d8' } };

function showSaveLoad(mode) {
  backlog.hide();
  saveLoad.show(mode, 'gameplay');
}
function showBacklog(history) {
  saveLoad.hide(true);
  backlog.show(history, characters);
}
document.querySelector('[data-fixture-action="save"]').addEventListener('click', () => showSaveLoad('save'));
document.querySelector('[data-fixture-action="load"]').addEventListener('click', () => showSaveLoad('load'));
document.querySelector('[data-fixture-action="backlog-empty"]').addEventListener('click', () => showBacklog([]));
document.querySelector('[data-fixture-action="backlog-populated"]').addEventListener('click', () => showBacklog(populatedHistory));

showSaveLoad('save');
window.__phase7Fixture = { saveLoad, backlog, slots, showSaveLoad, showBacklog, populatedHistory };
