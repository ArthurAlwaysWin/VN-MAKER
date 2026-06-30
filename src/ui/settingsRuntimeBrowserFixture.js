import '../style.css';
import { ConfigManager } from '../engine/ConfigManager.js';
import { adaptLegacyUiScreen } from '../shared/uiLegacyAdapters.js';
import { SettingsScreen } from './SettingsScreen.js';

const root = document.getElementById('fixture-root');
const status = document.getElementById('fixture-status');
const config = new ConfigManager('phase8-settings-browser-fixture');
const screen = new SettingsScreen(root, config);

function fitRoot() {
  const scale = Math.min(window.innerWidth / 1280, Math.max(0.1, (window.innerHeight - 56) / 720));
  root.style.transform = `scale(${scale})`;
  root.style.left = `${Math.max(0, (window.innerWidth - 1280 * scale) / 2)}px`;
}
window.addEventListener('resize', fitRoot);
fitRoot();

function legacy(mode) {
  return {
    header: { title: { text: 'System Settings', color: '#ffffff', fontSize: 30 }, height: 80 },
    tabBar: mode === 'single-page'
      ? { enabled: false }
      : { enabled: true, tabs: [
        { id: 'audio', label: 'Audio', settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'] },
        { id: 'display', label: 'Display', settingKeys: ['dialogue-opacity', 'window-mode'] },
        { id: 'gameplay', label: 'Gameplay', settingKeys: ['text-speed', 'auto-speed', 'skip-mode'] },
      ] },
    contentArea: { x: 80, y: 150, width: 1120, height: 480, columns: 1 },
    footer: { buttons: [
      { id: 'reset', text: 'Reset', action: 'reset' },
      { id: 'title', text: 'Title', action: 'title' },
    ] },
  };
}

function show(mode = 'tabbed') {
  const layout = legacy(mode);
  const canonical = adaptLegacyUiScreen({ meta: { resolution: { width: 1280, height: 720 } }, ui: { settingsScreen: layout } }, 'settings').document;
  const windowMode = canonical.nodes.find(node => node.content?.settingId === 'window-mode');
  Object.assign(windowMode.content, { presentation: 'toggle', trueValue: 'fullscreen', falseValue: 'windowed', label: 'Fullscreen' });
  screen.setLayout(layout, { canonicalDocument: canonical });
  screen.show();
  status.textContent = `${mode} · ${canonical.nodes.filter(node => node.type === 'settings-control').length} registered controls`;
}

screen.onChange = values => { status.textContent = `changed · ${JSON.stringify(values)}`; };
screen.onTitle = () => { status.textContent = 'title routed'; };
document.querySelector('[data-fixture-action="tabbed"]').addEventListener('click', () => show('tabbed'));
document.querySelector('[data-fixture-action="single"]').addEventListener('click', () => show('single-page'));
document.querySelector('[data-fixture-action="reopen"]').addEventListener('click', () => show(screen._canonicalDocument?.behavior?.mode ?? 'tabbed'));

show('tabbed');
window.__phase8Fixture = { screen, config, show, status };
