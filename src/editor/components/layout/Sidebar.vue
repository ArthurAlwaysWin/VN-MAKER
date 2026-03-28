<template>
  <aside class="sidebar">
    <div class="brand">GM 编辑器</div>
    <nav class="nav-links">
      <router-link to="/">仪表盘</router-link>
      <router-link to="/assets">素材库</router-link>
      <router-link to="/characters">角色管理</router-link>
      <router-link to="/scenes">场景编辑</router-link>
    </nav>
    <div class="spacer"></div>
    <div class="actions-area">
      <button class="play-btn" @click="playPreview">▶ 预览游戏</button>
    </div>
  </aside>
</template>

<script setup>
function playPreview() {
  if (window.ipcRenderer) {
    window.ipcRenderer.invoke('open-preview');
  } else {
    window.open('/index.html', '_blank');
  }
}
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: #252526;
  border-right: 1px solid #111;
  display: flex;
  flex-direction: column;
}
.brand {
  padding: 20px 15px;
  font-weight: bold;
  font-size: 1.1rem;
  color: #fff;
  border-bottom: 1px solid #333;
}
.nav-links {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
}
.nav-links a {
  padding: 10px 15px;
  color: #ccc;
  text-decoration: none;
  font-size: 14px;
}
.nav-links a:hover {
  background: #2a2d2e;
  color: #fff;
}
.nav-links a.router-link-active {
  background: #37373d;
  color: #fff;
  border-left: 2px solid #007acc;
}
.spacer { flex: 1; }
.actions-area { padding: 15px; border-top: 1px solid #333; }
.play-btn { width: 100%; border: none; background: #0e633c; color: #fff; padding: 10px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.play-btn:hover { background: #117748; }
</style>
