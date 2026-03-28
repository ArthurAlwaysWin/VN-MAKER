<template>
  <div class="title-designer">
    <div class="td-toolbar">
      <h3>标题页设计</h3>
      <p class="hint">拖拽元素到画布上，自定义你的游戏标题页面</p>
    </div>
    <div class="td-body">
      <div class="td-notice" v-if="!script.data">
        <p>请先加载项目</p>
      </div>
      <div class="td-notice" v-else>
        <p>🎨 标题页设计器</p>
        <p class="sub">使用「游戏内容」标签页中的画布模式编辑标题页布局。</p>
        <p class="sub">标题页元素（如"开始游戏"、"加载存档"等按钮）可在场景编辑器中通过 title_layout 配置。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useScriptStore } from '../stores/script.js';
const script = useScriptStore();
</script>

<style scoped>
.title-designer { display: flex; flex-direction: column; height: 100%; padding: 20px; }
.td-toolbar h3 { margin: 0; color: #e0e0e0; font-size: 18px; font-weight: 500; }
.hint { color: #888; font-size: 13px; margin: 4px 0 16px; }
.td-body { flex: 1; display: flex; align-items: center; justify-content: center; }
.td-notice { text-align: center; color: #888; }
.td-notice p { margin: 8px 0; font-size: 16px; }
.td-notice .sub { font-size: 13px; color: #666; }
</style>
