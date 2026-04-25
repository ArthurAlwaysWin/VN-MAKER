# 代码审查报告 — 2026-04-24

> **状态: ✅ 已解决 (2026-04-24)**
> 
> 所有 6 个 Bug 和 3 项采纳的改进建议已在同日完成修复。测试全部通过。
> 详见下方各条目的修复记录。

全量代码审查，覆盖运行时引擎、UI 层、主题系统、编辑器、Electron 主进程全部源码。

---

## Bug（确认的缺陷）

### BUG-01: CharacterLayer.hide() 存在 race condition — 可导致角色"幽灵化"

**严重度**: 高  
**文件**: `src/ui/CharacterLayer.js:163-166`

```js
setTimeout(() => {
  entry.container.remove();
  this.characters.delete(data.id);
}, duration);
```

**问题**: `hide()` 创建的 setTimeout 没有存储在 entry 上，`clear()` 无法清除它。

**复现场景**:
1. 角色 "hero" 可见，调用 `hide({ id: 'hero', duration: 400 })`
2. 400ms 内调用 `clear()`（如返回标题画面）— Map 被清空，DOM 被移除
3. 随后开始新游戏，`show({ id: 'hero' })` 创建新的 entry 放入 Map
4. 旧的 setTimeout 触发 → `this.characters.delete('hero')` **删除了新 entry**
5. 新角色精灵在 DOM 中但不再被 Map 追踪 → 后续 `hide`/`setExpression` 全部失效

**修复方向**: 在 entry 上存储 hide timer ID，`clear()` 时遍历清除；或在 setTimeout 回调中检查当前 entry 是否仍是原始对象（对象引用比较）。

---

### BUG-02: `hide_character` 事件未被页面转场门控拦截

**严重度**: 中  
**文件**: `src/main.js:549-555`

```js
engine.on('hide_character', (data) => {
  if (skipMode) {
    characters.hide({ ...data, duration: 0 });
    return;
  }
  characters.hide(data);
});
```

**问题**: `show_character`（行 540）和 `set_expression`（行 557）都有 `if (pageTransitionGateOpen) { pendingCharacterEvents.push(...); return; }` 的门控逻辑，但 `hide_character` **没有**。

**后果**: 背景转场进行中，旧角色已立即被隐藏，但新角色的 show 被缓冲。玩家会看到一个短暂的"空舞台"闪烁。

**修复方向**: 给 `hide_character` 加上与 `show_character` 相同的门控逻辑，将 hide 事件也推入 `pendingCharacterEvents`，在 `flushPageTransitionGate` 中统一回放。

---

### BUG-03: AudioManager 音频解锁存在监听器泄漏

**严重度**: 低  
**文件**: `src/engine/AudioManager.js:29-31`

```js
this._unlockHandler = () => this._unlock();
document.addEventListener('click', this._unlockHandler, { once: true });
document.addEventListener('keydown', this._unlockHandler, { once: true });
```

**问题**: `{ once: true }` 仅保证该监听器自身触发一次后自动移除。click 和 keydown 是两个独立监听器。如果 click 先触发，click 监听器被移除，但 keydown 监听器仍在文档上，会在下一次按键时再次调用 `_unlock()`。`_unlock()` 虽然是幂等的不会出错，但多余的监听器永远不会被清理。

**修复**:

```js
_unlock() {
  this._unlocked = true;
  document.removeEventListener('click', this._unlockHandler);
  document.removeEventListener('keydown', this._unlockHandler);
  if (this._bgm) {
    this._bgm.play().catch(() => {});
  }
}
```

---

### BUG-04: captureGameScreenshot 破坏打字机状态

**严重度**: 中  
**文件**: `src/main.js:377-385`

```js
dialogueBox.hide();  // 停止打字机 + 移除 visible
await new Promise(r => requestAnimationFrame(r));
const result = await window.ipcRenderer.invoke('capture-screenshot');
if (dlgWasVisible) dialogueBox.el.classList.add('visible');  // 只恢复 class，不恢复打字机
```

**问题**: `hide()` 内部调用 `_stopTypewriter()` 清除了打字机定时器。恢复时只加回了 CSS class，打字机效果永远不会继续。如果截图发生在文字正在逐字显示的过程中（菜单→存档），文字会卡在截图那一刻已显示的字数。

**修复方向**: 截图时不调用 `hide()`，而是仅操作 CSS 可见性（直接 toggle class 或设置 `visibility: hidden`），避免触发打字机停止逻辑。

> ✅ **已修复** — `captureGameScreenshot` 改用 `visibility: hidden` 代替 `dialogueBox.hide()`，不触发 `_stopTypewriter()`。

---

### BUG-05: CSS 注入防护不一致 — TitleScreen 和 BacklogScreen

**严重度**: 低（当前数据来自作者控制的 script.json，但如果未来支持主题导入则升级为中）  
**文件**:
- `src/ui/TitleScreen.js:81` — 背景 URL 未经 `sanitizeCssValue()`
- `src/ui/BacklogScreen.js:138` — 背景图 URL 未经 `sanitizeCssValue()`

**对比**: SaveLoadScreen（行 149）、SettingsScreen（行 155）、GameMenu（行 141）都正确使用了 `sanitizeCssValue()` 过滤后再构建 CSS URL。

**TitleScreen.js:81**:
```js
const bgUrl = resolvePath(this.layout.background);
this.el.style.backgroundImage = `url('${bgUrl}')`;  // 未经 sanitizeCssValue
```

**BacklogScreen.js:138**:
```js
const resolved = resolvePath(cfg.backgroundImage);
this.el.style.backgroundImage = `url("${resolved}")`;  // 未经 sanitizeCssValue
```

**修复**: 与其他组件保持一致，在 `resolvePath()` 前先调用 `sanitizeCssValue()`。

---

### BUG-06: SettingsScreen 切换布局时 `_activeTab` 可能越界

**严重度**: 低  
**文件**: `src/ui/SettingsScreen.js:101-104`

```js
setLayout(layout) {
  this.customLayout = layout;
  if (this.isVisible) this.show();
}
```

**问题**: 如果从 5 个标签的布局切换到 3 个标签的布局，`_activeTab` 可能是 4，但新布局只有 3 个标签。`_renderStructuredContent` 会因 `groupKeys` 为 undefined 而渲染空白内容区，标签栏高亮也会错位。

**修复**: 在 `setLayout()` 或 `_renderStructured()` 入口处 clamp：

```js
this._activeTab = Math.min(this._activeTab, resolvedTabs.length - 1);
```

---

## 改进建议

### SUG-01: EventEmitter.emit() 不支持异步 — 存在隐蔽的隐式依赖

**文件**: `src/engine/EventEmitter.js:35-37`

```js
emit(event, data) {
  this._listeners.get(event)?.forEach(cb => cb(data));
}
```

`set_background` 的处理器是 async 函数（`main.js:566`），但 `emit()` 不 await 返回值。当前因为门控系统的微任务设计正好能工作，但这是一个脆弱的隐式依赖。如果未来有人在 `_renderPage()` 中 `set_background` emit 之后加入依赖转场完成的逻辑，就会出 bug。

**建议**: 至少在 EventEmitter 中加一个 `emitAsync()` 方法用于需要等待的场景，或在 `emit()` 的 JSDoc 中明确标注 "不等待异步处理器返回值"。

---

### SUG-02: ConfigManager 缺少变更通知机制

**文件**: `src/engine/ConfigManager.js`

当前 `ConfigManager.set()` 直接写入 localStorage 但不通知监听者。main.js 的 `settingsScreen.onChange` 手动桥接到 `applyConfig()`。

如果有代码直接调用 `configManager.reset()` 或 `configManager.set()` 而不经过 SettingsScreen，音量等设置**不会实时生效**（直到用户手动调整某个设置触发 onChange）。

**建议**: `ConfigManager` 加一个简单的 `onChange` 回调或事件通知，`set()`/`reset()` 时自动触发。当前 SettingsScreen 结构化模式的 footer reset 按钮虽然手动调了 `_notifyChange()`，但其他调用路径没有保障。

---

### SUG-03: Toast 通知缺少去重 — 快速操作会堆叠重叠

**文件**: `src/main.js:98-109`

每次 `showToast()` 都创建新 DOM 元素追加到 gameContainer。快速连续操作（如连续点击"快速存档"）会导致多个 toast 同时显示在同一位置重叠。

**建议**: 维护一个 `currentToast` 引用，新 toast 出现时先移除旧的，或复用同一个 DOM 元素。

---

### SUG-04: DialogueBox._applyStyle 每条对话都完整重置

**文件**: `src/ui/DialogueBox.js:110-160`

每条对话行都执行完整循环：保存自定义属性 → 清空 cssText → 恢复属性 → 重应用全局字体 → 页面覆盖 → 行级样式。

在同一页面内的连续对话中，全局和页面字体设置不会变化。这个完整重置-重应用循环是不必要的开销。

**建议**: 标记一个 dirty flag（`_lastPageIndex`），仅在页面切换时执行完整重置，同页面内只处理行级样式差异。

---

### SUG-05: SaveLoadScreen 每次打开都强制重新拉取全部存档

**文件**: `src/ui/SaveLoadScreen.js:77`

```js
show(mode = 'save', source = 'bar') {
  ...
  this._cachedSlots = null; // 每次打开都强制失效
  ...
}
```

108 个槽位的元数据在 Electron IPC 下较快，但 Web 模式的 IndexedDB `getAll()` 可能有感知延迟。而 `_cachedSlots` 已有 save/delete 操作后的失效逻辑。

**建议**: 移除 `show()` 中的强制失效，改为只在外部操作（如 quicksave 后再打开存档界面）时手动失效。或增加一个简单的 TTL（如 5 秒内复用缓存）。

---

### SUG-06: CharacterLayer._crossfade 的 decode() 对大尺寸立绘缺少超时保护

**文件**: `src/ui/CharacterLayer.js:299-305`

```js
try {
  await incoming.decode();
} catch (e) {
  // decode() failed — proceed anyway
}
```

视觉小说常用 2000×3000+ 的高清立绘。`decode()` 在低端设备上可能耗时较长，期间 UI 无响应反馈。虽然有 generation token 防止过期 crossfade，但缺少超时保护。

**建议**: 用 `Promise.race([incoming.decode(), timeout(500)])` 加超时兜底，超时则直接显示未解码图片（会有短暂白闪但不会卡死）。

> ✅ **已采纳** — `Promise.race([decode(), 500ms timeout])`。

---

## 优先级排序

| 编号 | 类型 | 严重度 | 修复成本 | 建议优先级 |
|------|------|--------|----------|-----------|
| BUG-01 | 角色 hide race condition | 高 | 低 | P0 |
| BUG-02 | hide_character 未门控 | 中 | 低 | P1 |
| BUG-04 | 截图破坏打字机 | 中 | 低 | P1 |
| BUG-03 | 音频解锁监听器泄漏 | 低 | 极低 | P2 |
| BUG-05 | CSS 注入防护不一致 | 低 | 极低 | P2 |
| BUG-06 | _activeTab 越界 | 低 | 极低 | P2 |
| SUG-01 | EventEmitter async | — | 低 | 酌情 |
| SUG-02 | ConfigManager 通知 | — | 低 | 酌情 |
| SUG-03 | Toast 去重 | — | 极低 | 酌情 |
| SUG-04 | DialogueBox 重置优化 | — | 中 | 低 |
| SUG-05 | SaveLoadScreen 缓存 | — | 低 | 低 |
| SUG-06 | decode() 超时保护 | — | 低 | 低 |
