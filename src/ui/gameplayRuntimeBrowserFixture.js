import { DialogueBox } from './DialogueBox.js';
import { ChoiceMenu } from './ChoiceMenu.js';
import { QuickActionBar } from './QuickActionBar.js';
import { GameplayUi } from './GameplayUi.js';
import { adaptLegacyUiScreen } from '../shared/uiLegacyAdapters.js';
import { attachResponsiveGameContainer } from './runtimeViewport.js';

const gameContainer = document.getElementById('game-container');
const dialogueLayer = document.getElementById('dialogue-layer');
const uiOverlay = document.getElementById('ui-overlay');
const controls = document.getElementById('fixture-controls');
const evidenceEl = document.getElementById('fixture-evidence');
const dialogueBox = new DialogueBox(dialogueLayer);
const choiceMenu = new ChoiceMenu(uiOverlay);
const quickBar = new QuickActionBar(dialogueBox.el);
const skipIndicator = document.createElement('div');
attachResponsiveGameContainer(gameContainer);
skipIndicator.id = 'skip-indicator';
skipIndicator.className = 'hidden';
gameContainer.appendChild(skipIndicator);

const fixtureScript = {
  meta: { resolution: { width: 1280, height: 720 } },
  ui: {
    dialogueBox: { fontSize: 24, textColor: '#fff', nameplateStyle: 'floating' },
    widgetStyles: { button: { borderRadius: 10, fontSize: 18 } },
    theme: { choiceBadge: {}, icons: {} },
  },
};
const canonical = adaptLegacyUiScreen(fixtureScript, 'gameplay').document;
const gameplay = new GameplayUi({ gameContainer, dialogueLayer, uiOverlay, dialogueBox, choiceMenu, quickBar, skipIndicator });
gameplay.setDocument(canonical);
dialogueBox.typeSpeed = 1000;

window.__gameplayEvidence = {
  state: 'narration', pageType: 'normal', advances: 0, choices: [], quickActions: [],
  voiceEvents: [], reducedMotion: false, diagnostics: [], storyStageOwner: 'PageEditor',
};

function renderEvidence() {
  window.__gameplayEvidence.diagnostics = gameplay.host?.diagnostics.map(item => item.code) ?? [];
  evidenceEl.textContent = JSON.stringify(window.__gameplayEvidence, null, 2);
}

function showNarration() {
  choiceMenu.hide();
  dialogueBox.show({ speakerName: '', text: 'Narration fixture keeps the nameplate hidden while the story stage remains Page Editor owned.' });
  gameplay.updateRuntimeState({ dialogue: { speakerName: '', text: 'Narration fixture' }, choices: [] });
  window.__gameplayEvidence.state = 'narration';
  window.__gameplayEvidence.pageType = 'normal';
  renderEvidence();
}

function showVoiced(replacement = false) {
  choiceMenu.hide();
  if (replacement) window.__gameplayEvidence.voiceEvents.push('stop:replaced');
  window.__gameplayEvidence.voiceEvents.push(`start:${replacement ? 'voice-b' : 'voice-a'}`);
  dialogueBox.show({ speakerName: 'Sakura', speakerColor: '#ffd1e8', text: replacement ? 'Replacement voice is active.' : 'Voiced dialogue is active.', voice: replacement ? 'voice-b.ogg' : 'voice-a.ogg' });
  gameplay.updateRuntimeState({ dialogue: { speakerName: 'Sakura', text: 'Voiced dialogue', voice: 'voice-a.ogg' }, choices: [] });
  window.__gameplayEvidence.state = replacement ? 'voiced-replacement' : 'voiced';
  renderEvidence();
}

function showLong() {
  const text = 'Long dialogue fixture '.repeat(18);
  dialogueBox.renderPreviewLine({ speakerName: 'Narrator', text });
  gameplay.updateRuntimeState({ dialogue: { speakerName: 'Narrator', text }, choices: [] });
  window.__gameplayEvidence.state = 'long-text';
  renderEvidence();
}

function showChoices() {
  dialogueBox.hide();
  const options = [{ text: 'Stay and inspect the canonical UI' }, { text: 'Leave through the existing transition path' }, { text: 'A deliberately long choice label that remains deterministic and exposes overflow diagnostics '.repeat(2) }];
  choiceMenu.show({ prompt: 'Choose a route', options });
  gameplay.updateRuntimeState({ dialogue: null, choices: options });
  window.__gameplayEvidence.state = 'choices';
  window.__gameplayEvidence.pageType = 'choice';
  renderEvidence();
}

dialogueBox.onAdvance = () => {
  window.__gameplayEvidence.advances += 1;
  window.__gameplayEvidence.voiceEvents.push('cleanup:advance');
  renderEvidence();
};
choiceMenu.onSelect = index => {
  window.__gameplayEvidence.choices.push(index);
  window.__gameplayEvidence.pageType = 'normal';
  document.getElementById('stage-fixture-label').textContent = `CHOICE ${index + 1} EFFECT + TRANSITION`;
  renderEvidence();
};
for (const [name, callback] of Object.entries({
  Auto: () => {}, Skip: () => {}, Backlog: () => {}, Save: () => {}, Load: () => {}, QuickSave: () => {}, QuickLoad: () => {}, Settings: () => {},
})) {
  quickBar[`on${name}`] = () => { window.__gameplayEvidence.quickActions.push(name.toLowerCase()); callback(); renderEvidence(); };
}

function addControl(label, testId, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.test = testId;
  button.addEventListener('click', handler);
  controls.appendChild(button);
}
addControl('Narration', 'fixture-narration', showNarration);
addControl('Voiced', 'fixture-voiced', () => showVoiced(false));
addControl('Replace Voice', 'fixture-replace-voice', () => showVoiced(true));
addControl('Voice Error', 'fixture-voice-error', () => { window.__gameplayEvidence.voiceEvents.push('error:recovered'); renderEvidence(); });
addControl('Long Text', 'fixture-long', showLong);
addControl('Choices', 'fixture-choices', showChoices);
addControl('Auto', 'fixture-auto', () => { quickBar.setAutoActive(!quickBar._autoActive); gameplay.updateRuntimeState({ quickActions: { autoActive: quickBar._autoActive, skipActive: quickBar._skipActive, quickLoadEnabled: false } }); renderEvidence(); });
addControl('Skip', 'fixture-skip', () => { quickBar.setSkipActive(!quickBar._skipActive); skipIndicator.classList.toggle('hidden', !quickBar._skipActive); gameplay.updateRuntimeState({ skipStatus: { active: quickBar._skipActive, readOnly: false } }); renderEvidence(); });
addControl('Input Page', 'fixture-input-page', () => { window.__gameplayEvidence.pageType = 'input'; renderEvidence(); });
addControl('Video Page', 'fixture-video-page', () => { window.__gameplayEvidence.pageType = 'video'; renderEvidence(); });
addControl('Reduced Motion', 'fixture-reduced-motion', () => { window.__gameplayEvidence.reducedMotion = !window.__gameplayEvidence.reducedMotion; gameContainer.classList.toggle('gm-reduced-motion', window.__gameplayEvidence.reducedMotion); renderEvidence(); });

showNarration();
