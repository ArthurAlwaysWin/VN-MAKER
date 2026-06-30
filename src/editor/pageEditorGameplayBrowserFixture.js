import { createApp } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import PageEditor from './views/PageEditor.vue';
import { useScriptStore } from './stores/script.js';

const pinia = createPinia();
setActivePinia(pinia);
const script = useScriptStore();
script.loadFromData({
  projectId: 'phase9_page_editor_fixture',
  meta: { title: 'Phase 9 Page Editor Fixture', resolution: { width: 1280, height: 720 } },
  assets: { backgrounds: [], audio: [], fonts: [], videos: {} },
  characters: {}, variables: {}, systems: {},
  scenes: {
    start: {
      name: 'Start',
      pages: [{
        type: 'normal', background: null, characters: [],
        dialogues: [{ speaker: '', text: 'Story page content must remain unchanged.' }],
        camera: { x: 0, y: 0, zoom: 1 }, particles: null, effects: [],
      }],
    },
  },
  ui: { dialogueBox: { fontSize: 24, nameplateStyle: 'inline', decorations: [] } },
});
window.__phase9StoryBefore = JSON.stringify(script.data.scenes);
window.__phase9ScriptStore = script;
createApp(PageEditor).use(pinia).mount('#app');
