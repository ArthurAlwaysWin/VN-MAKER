import { adaptLegacyUiOverlay, adaptLegacyUiScreen } from '../shared/uiLegacyAdapters.js';
import { GalleryScreen } from './GalleryScreen.js';
import { TextInputScreen } from './TextInputScreen.js';
import { SharedConfirmationOverlay } from './sharedConfirmationOverlay.js';
import { VideoPlayer, resolveRuntimeVideoRequest } from './VideoPlayer.js';

const root = document.getElementById('phase10-root');
const mode = new URLSearchParams(location.search).get('mode') ?? 'gallery';
window.__phase10Evidence = { mode, inputOutcome: null, videoOutcome: null };

if (mode === 'gallery') {
  const canonical = adaptLegacyUiScreen({ meta: { resolution: { width: 1280, height: 720 } }, systems: { gallery: { cg: {} }, endings: {} } }, 'gallery').document;
  const gallery = new GalleryScreen(root);
  gallery.setLayout(null, { canonicalDocument: canonical });
  gallery.show({
    locked: { title: 'Locked Memory', description: 'Hidden', images: ['backgrounds/locked.png'], order: 1 },
    moonrise: { title: 'Moonrise', description: 'Two remembered skies.', thumbnail: 'backgrounds/moon-thumb.png', images: ['backgrounds/moon-1.png', 'backgrounds/moon-2.png'], order: 2 },
  }, { moonrise: { count: 1 } }, { endings: { good: { title: 'Good End', description: 'A remembered ending.', thumbnail: 'ui/endings/good.png', endingVideo: { videoId: 'ed_good', play: 'manual' } } }, endingUnlocks: { good: { count: 1 } } });
  window.__phase10Evidence.gallery = gallery;
}

if (mode === 'input') {
  const input = new TextInputScreen(root);
  input.setDocument(adaptLegacyUiOverlay({}, 'textInput').document);
  input.onSubmit = value => { window.__phase10Evidence.inputOutcome = { type: 'submitted', value }; return true; };
  input.onCancel = () => { window.__phase10Evidence.inputOutcome = { type: 'cancelled' }; };
  input.show({ prompt: 'Name the archive', placeholder: 'Archive name', required: true, submitText: 'Confirm' });
  window.__phase10Evidence.input = input;
}

if (mode === 'confirmation') {
  const confirmation = new SharedConfirmationOverlay(root);
  confirmation.setDocument(adaptLegacyUiOverlay({}, 'confirmation').document);
  confirmation.show({
    title: 'Return to title?',
    body: 'Unsaved progress will be lost.',
    confirmText: 'Return',
    cancelText: 'Stay',
    onConfirm: () => { window.__phase10Evidence.confirmationOutcome = 'confirmed'; },
    onCancel: () => { window.__phase10Evidence.confirmationOutcome = 'cancelled'; },
  });
  window.__phase10Evidence.confirmation = confirmation;
}

if (mode === 'video') {
  const player = new VideoPlayer(root);
  player.setControlsDocument(adaptLegacyUiOverlay({}, 'videoControls').document);
  const policy = new URLSearchParams(location.search).get('policy') ?? 'allowed';
  const allowed = resolveRuntimeVideoRequest({ file: 'videos/evidence.webm', controls: policy === 'allowed', skippable: policy === 'allowed', loop: false, volume: 0.6, audioMode: 'duck', fit: 'contain' });
  player._active = { request: allowed, finish: type => { window.__phase10Evidence.videoOutcome = type; player._teardownActive(); } };
  player._renderRequest(allowed);
  player.skipButton.onclick = allowed.skippable ? () => player._active?.finish('skipped') : null;
  window.__phase10Evidence.player = player;
}
