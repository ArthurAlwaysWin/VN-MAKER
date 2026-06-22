export const SCREENSHOT_TARGETS = Object.freeze([
  Object.freeze({ id: 'project', width: 1280, height: 720 }),
  Object.freeze({ id: 'wide', width: 1440, height: 900 }),
]);

export const MINIMAL_LEGACY_UI = Object.freeze({
  titleScreen: null,
  dialogueBox: null,
  widgetStyles: null,
  gameMenu: null,
  settingsScreen: null,
  saveLoadScreen: null,
  backlogScreen: null,
});

export const CUSTOMIZED_LEGACY_UI = Object.freeze({
  titleScreen: {
    background: 'ui/title/background.png',
    elements: [
      { type: 'text', text: 'Moonlit Archive', x: 640, y: 120, fontSize: 56 },
      { type: 'button', text: 'Begin', action: 'start', x: 640, y: 420 },
      { type: 'button', text: 'Memories', action: 'gallery', x: 640, y: 490 },
    ],
  },
  dialogueBox: {
    x: 56,
    y: 500,
    width: 1168,
    height: 180,
    background: 'rgba(10, 18, 35, 0.9)',
    nameplate: { enabled: true, x: 28, y: -34, width: 220, height: 40 },
  },
  widgetStyles: {
    button: { background: '#24324f', color: '#f7f2ff', borderRadius: 10 },
    choice: { background: '#18243d', color: '#ffffff' },
  },
  gameMenu: {
    position: 'right',
    width: 300,
    background: 'rgba(7, 12, 24, 0.88)',
    backgroundImage: 'ui/menu/panel.png',
    borderRadius: 12,
    backdropBlur: 10,
    buttonGap: 10,
    buttons: {
      save: { text: 'Save', icon: 'ui/icons/save.png' },
      load: { text: 'Load', icon: 'ui/icons/load.png' },
      backlog: { text: 'History', icon: null },
      settings: { text: 'Settings', icon: null },
      title: { text: 'Title', icon: null },
      close: { text: 'Return', icon: null },
    },
  },
  settingsScreen: {
    header: { title: { text: 'System' }, height: 72 },
    tabBar: {
      enabled: true,
      tabs: [
        { label: 'Audio', settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'] },
        { label: 'Display', settingKeys: ['window-mode', 'dialogue-opacity'] },
        { label: 'Play', settingKeys: ['text-speed', 'auto-speed', 'skip-mode'] },
      ],
    },
    contentArea: { x: 180, y: 100, width: 920, height: 500 },
    footer: { buttons: [{ id: 'reset', action: 'reset', text: 'Reset' }, { id: 'close', action: 'close', text: 'Close' }] },
  },
  saveLoadScreen: {
    background: 'ui/save/background.png',
    backdropBlur: 8,
    header: { saveTitle: 'Save', loadTitle: 'Load', height: 80 },
    slotGrid: { columns: 4, rows: 2, gap: 16, x: 40, y: 100, width: 1200, height: 500 },
    slot: { emptyText: 'Empty', background: 'rgba(25, 36, 62, 0.9)', borderRadius: 10 },
    pagination: { style: 'dots', activeColor: '#f6d77a', inactiveColor: '#59657a' },
  },
  backlogScreen: {
    background: 'rgba(5, 10, 20, 0.92)',
    backgroundImage: 'ui/backlog/background.png',
    header: { title: 'History', height: 64 },
    entry: {
      speakerColor: '#f6d77a',
      speakerFontSize: 14,
      textFontSize: 16,
      hoverBackground: 'rgba(255,255,255,0.06)',
      padding: [12, 20],
    },
  },
});

export const SETTINGS_FIXTURES = Object.freeze({
  tabbed: CUSTOMIZED_LEGACY_UI.settingsScreen,
  singlePage: Object.freeze({
    ...CUSTOMIZED_LEGACY_UI.settingsScreen,
    tabBar: Object.freeze({ ...CUSTOMIZED_LEGACY_UI.settingsScreen.tabBar, enabled: false }),
  }),
});

export const SAVE_LOAD_FIXTURES = Object.freeze({
  modes: Object.freeze(['save', 'load']),
  sources: Object.freeze(['bar', 'menu', 'title']),
  emptySlots: Object.freeze([]),
  populatedSlots: Object.freeze([
    Object.freeze({ slot: 1, preview: 'Arrival at the observatory', date: '2026-06-22 20:00', thumbnail: null }),
    Object.freeze({ slot: 9, preview: 'The sealed archive', date: '2026-06-22 21:15', thumbnail: 'data:image/png;base64,AAAA' }),
  ]),
});

export const BACKLOG_FIXTURES = Object.freeze({
  empty: Object.freeze([]),
  recorded: Object.freeze([
    Object.freeze({ speaker: null, speakerName: null, text: 'Rain traced the window.', voice: null }),
    Object.freeze({ speaker: 'alice', speakerName: 'Alice', text: 'You came back.', voice: null }),
  ]),
  voiced: Object.freeze([
    Object.freeze({ speaker: 'alice', speakerName: 'Alice', text: 'Listen carefully.', voice: 'voice/alice/001.ogg' }),
  ]),
  characters: Object.freeze({ alice: Object.freeze({ name: 'Alice', color: '#f08aa6' }) }),
});

export const GALLERY_FIXTURES = Object.freeze({
  empty: Object.freeze({ cg: Object.freeze({}), endings: Object.freeze({}), cgUnlocks: Object.freeze({}), endingUnlocks: Object.freeze({}) }),
  mixed: Object.freeze({
    cg: Object.freeze({
      locked: Object.freeze({ title: 'Locked Memory', images: Object.freeze(['backgrounds/cg/locked.png']) }),
      unlocked: Object.freeze({ title: 'Moonrise', images: Object.freeze(['backgrounds/cg/moon-1.png', 'backgrounds/cg/moon-2.png']) }),
    }),
    cgUnlocks: Object.freeze({ unlocked: Object.freeze({ count: 1 }) }),
    endings: Object.freeze({
      good: Object.freeze({ title: 'Good End', thumbnail: 'ui/endings/good.png', endingVideo: Object.freeze({ videoId: 'ed_good', play: 'manual' }) }),
    }),
    endingUnlocks: Object.freeze({ good: Object.freeze({ count: 1 }) }),
  }),
});

export const GAME_MENU_FIXTURES = Object.freeze({
  openSources: Object.freeze(['keyboard-escape', 'quick-action-menu']),
  closeInputs: Object.freeze(['close-button', 'keyboard-escape', 'contextmenu']),
  layout: CUSTOMIZED_LEGACY_UI.gameMenu,
});

export const TITLE_FIXTURES = Object.freeze({
  default: Object.freeze({ hasSave: false, hasGallery: false, layout: null }),
  customized: Object.freeze({ hasSave: true, hasGallery: true, layout: CUSTOMIZED_LEGACY_UI.titleScreen }),
});

export const GAMEPLAY_UI_FIXTURES = Object.freeze({
  dialogue: Object.freeze({ speakerName: 'Alice', speakerColor: '#f08aa6', text: 'The archive remembers us.' }),
  choice: Object.freeze({ prompt: 'Which path?', options: Object.freeze([{ text: 'Follow the light' }, { text: 'Stay behind' }]) }),
  quickAction: Object.freeze({ auto: true, skip: false, quickLoadEnabled: true }),
});

export const OVERLAY_FIXTURES = Object.freeze({
  textInput: Object.freeze({ prompt: 'Name the archive', defaultValue: '', placeholder: 'Archive name', maxLength: 24, required: true, submitText: 'Confirm' }),
  confirmation: Object.freeze({ types: Object.freeze(['overwrite', 'delete']) }),
  videoControls: Object.freeze({ file: 'videos/op.webm', controls: true, skippable: true, fit: 'contain', volume: 0.8 }),
});
