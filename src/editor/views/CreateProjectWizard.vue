<template>
  <div class="wizard-overlay">
    <div class="wizard">
      <div class="wizard-header">
        <h2>创建新项目</h2>
        <div class="steps">
          <span v-for="(s, i) in steps" :key="i" :class="{ active: step === i, done: step > i }">
            {{ s }}
          </span>
        </div>
      </div>

      <div class="wizard-body">
        <div v-if="step === 0" class="step-content">
          <label>项目名称
            <input v-model="form.name" placeholder="我的视觉小说" />
          </label>
          <label>保存位置
            <div class="path-input">
              <input v-model="form.location" readonly />
              <button @click="browseLocation">浏览...</button>
            </div>
          </label>
          <label>作者
            <input v-model="form.author" placeholder="（可选）" />
          </label>
        </div>

        <div v-if="step === 1" class="step-content">
          <label>游戏分辨率</label>
          <div class="resolution-options">
            <button
              v-for="r in resolutions" :key="r.label"
              :class="{ selected: form.resolution.width === r.w && form.resolution.height === r.h }"
              @click="form.resolution = { width: r.w, height: r.h }"
            >
              {{ r.label }}<br><small>{{ r.w }}×{{ r.h }}</small>
            </button>
          </div>
        </div>

        <div v-if="step === 2" class="step-content">
          <label>项目模板</label>
          <div class="template-options">
            <div :class="['tpl-card', { selected: form.template === 'blank' }]" @click="form.template = 'blank'">
              <div class="tpl-icon">📄</div>
              <div class="tpl-name">空白项目</div>
              <div class="tpl-desc">从零开始创建</div>
            </div>
            <div :class="['tpl-card', { selected: form.template === 'demo' }]" @click="form.template = 'demo'">
              <div class="tpl-icon">🎮</div>
              <div class="tpl-name">示例项目</div>
              <div class="tpl-desc">包含「樱花之约」完整示例</div>
            </div>
          </div>
        </div>

        <div v-if="step === 3" class="step-content confirm">
          <h3>确认项目信息</h3>
          <div class="confirm-row"><span>名称：</span><strong>{{ form.name }}</strong></div>
          <div class="confirm-row"><span>位置：</span><strong>{{ form.location }}/{{ form.name }}</strong></div>
          <div class="confirm-row"><span>分辨率：</span><strong>{{ form.resolution.width }}×{{ form.resolution.height }}</strong></div>
          <div class="confirm-row"><span>模板：</span><strong>{{ form.template === 'demo' ? '示例项目' : '空白项目' }}</strong></div>
        </div>
      </div>

      <div class="wizard-footer">
        <button class="btn-cancel" @click="$emit('cancel')">取消</button>
        <div class="footer-right">
          <button v-if="step > 0" class="btn-back" @click="step--">上一步</button>
          <button v-if="step < 3" class="btn-next" @click="step++" :disabled="!canNext">下一步</button>
          <button v-if="step === 3" class="btn-create" @click="handleCreate" :disabled="creating">
            {{ creating ? '创建中...' : '✨ 创建项目' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();
const emit = defineEmits(['cancel', 'created']);
const step = ref(0);
const creating = ref(false);
const steps = ['基本信息', '画面设置', '选择模板', '确认创建'];

const resolutions = [
  { label: '标准 (16:9)', w: 1280, h: 720 },
  { label: '高清 (16:9)', w: 1920, h: 1080 },
  { label: '方形 (4:3)', w: 1024, h: 768 },
];

const form = reactive({
  name: '',
  location: '',
  author: '',
  resolution: { width: 1280, height: 720 },
  template: 'blank'
});

const canNext = computed(() => {
  if (step.value === 0) return form.name.trim() && form.location.trim();
  return true;
});

async function browseLocation() {
  if (!window.ipcRenderer) return;
  const result = await window.ipcRenderer.invoke('dialog-open-directory');
  if (result) form.location = result;
}

async function handleCreate() {
  creating.value = true;
  const result = await project.createProject({
    name: form.name.trim(),
    author: form.author.trim(),
    location: form.location,
    resolution: form.resolution,
    template: form.template
  });
  creating.value = false;
  if (result.success) {
    emit('created', result.path);
  } else {
    alert('创建失败: ' + result.error);
  }
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.wizard {
  background: #252526; border: 1px solid #444; border-radius: 12px;
  width: 520px; max-height: 80vh; display: flex; flex-direction: column;
}
.wizard-header { padding: 20px 24px 12px; border-bottom: 1px solid #333; }
.wizard-header h2 { margin: 0 0 12px; font-size: 18px; color: #e0e0e0; font-weight: 600; }
.steps { display: flex; gap: 8px; }
.steps span {
  font-size: 12px; color: #666; padding: 4px 12px; border-radius: 12px; background: #1e1e1e;
}
.steps span.active { color: #fff; background: #007acc; }
.steps span.done { color: #4ade80; background: #1a2a1a; }

.wizard-body { padding: 24px; flex: 1; overflow-y: auto; }
.step-content label { display: block; color: #aaa; font-size: 13px; margin-bottom: 12px; }
.step-content input {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box;
}
.path-input { display: flex; gap: 8px; margin-top: 4px; }
.path-input input { flex: 1; }
.path-input button {
  background: #333; color: #ccc; border: 1px solid #555; padding: 8px 16px;
  border-radius: 6px; cursor: pointer; white-space: nowrap;
}

.resolution-options { display: flex; gap: 12px; margin-top: 8px; }
.resolution-options button {
  flex: 1; padding: 16px; background: #1e1e1e; border: 2px solid #333;
  border-radius: 8px; color: #ccc; cursor: pointer; text-align: center; font-size: 13px;
}
.resolution-options button.selected { border-color: #007acc; color: #fff; }
.resolution-options button small { color: #888; }

.template-options { display: flex; gap: 16px; margin-top: 8px; }
.tpl-card {
  flex: 1; padding: 24px 16px; background: #1e1e1e; border: 2px solid #333;
  border-radius: 8px; cursor: pointer; text-align: center;
}
.tpl-card.selected { border-color: #007acc; }
.tpl-icon { font-size: 36px; margin-bottom: 8px; }
.tpl-name { color: #e0e0e0; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.tpl-desc { color: #888; font-size: 12px; }

.confirm h3 { color: #e0e0e0; font-size: 16px; margin: 0 0 16px; }
.confirm-row { display: flex; gap: 8px; color: #aaa; font-size: 14px; margin-bottom: 8px; }
.confirm-row strong { color: #e0e0e0; }

.wizard-footer {
  padding: 16px 24px; border-top: 1px solid #333;
  display: flex; justify-content: space-between;
}
.footer-right { display: flex; gap: 8px; }
.btn-cancel { background: transparent; border: none; color: #888; cursor: pointer; font-size: 13px; }
.btn-back { background: #333; color: #ccc; border: 1px solid #555; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-next { background: #007acc; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-create { background: #0e633c; color: #fff; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
