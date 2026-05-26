# 全库 Bug 扫描报告

**扫描日期:** 2026-05-26
**扫描范围:** `src/`, `electron/`, `tools/` 下所有 .js/.vue 源文件
**发现问题:** 64 个

| 严重程度 | 数量 | 分布 |
|----------|------|------|
| **CRITICAL** | 4 | electron(2), ui(2) |
| **HIGH** | 14 | engine(2), ui(4), electron(4), editor(4) |
| **MEDIUM** | 30 | engine(7), ui(8), shared(6), electron(7), editor(7) |
| **LOW** | 16 | engine(5), ui(5), shared(6), electron(4), editor(5) |

---

## CRITICAL (4)

### BUG-01: `atomicWrite` 缺少错误恢复 -- 可能丢失存档数据

- **文件:** `electron/game/main.js:62-68`
- **代码:**

```js
async function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  const bak = filePath + '.bak';
  await fs.writeFile(tmp, content, 'utf-8');
  try { await fs.rename(filePath, bak); } catch {}
  await fs.rename(tmp, filePath);
  try { await fs.unlink(bak); } catch {}
}
```

- **问题:** 如果原文件存在且 `fs.rename(filePath, bak)` 成功（原文件移到 `.bak`），但后续 `fs.rename(tmp, filePath)` 失败（如 Windows 上 EPERM 文件锁定），则原文件已消失、新内容困在 `.tmp` 中，错误直接抛出不恢复备份。用户存档数据永久丢失。
- **对比:** 编辑器版本 `electron/main.js:153-167` 正确地在第二个 rename 失败时恢复备份。
- **修复建议:** 将第二个 `rename` 包在 try/catch 中，失败时从 `.bak` 恢复原文件。

---

### BUG-02: 任意文件读取漏洞 -- `preflight-theme-package`

- **文件:** `electron/themePackagePreflight.js:63` (由 `electron/main.js:1221-1229` 调用)
- **代码:**

```js
// themePackagePreflight.js:
const buffer = await fs.readFile(filePath);

// main.js IPC handler:
ipcMain.handle('preflight-theme-package', async (event, { filePath }) => {
  return await preflightThemePackage({ filePath, projectPath: currentProjectPath });
});
```

- **问题:** `filePath` 参数直接来自渲染进程，无任何路径验证。恶意渲染进程可通过 `ipcRenderer.invoke('preflight-theme-package', { filePath: '/etc/passwd' })` 读取系统任意文件。无 `hasDialogFileGrant` 或 `isInsideProject` 检查。
- **修复建议:** 在 IPC handler 中校验 `filePath` 必须在 `projectPath` 内或在已授权的对话框文件集合中。

---

### BUG-03: `_renderGrid` 异步竞态条件

- **文件:** `src/ui/SaveLoadScreen.js:235-258`
- **代码:**

```js
async _renderGrid() {
    const grid = this.el.querySelector('.save-load-grid');
    if (!grid) return;
    grid.innerHTML = '';
    // ...await this.saveManager.getAllSlots()...
    // ...then appends cards to grid...
}
```

- **问题:** `_renderGrid` 是 async 函数，但所有调用点（第 69、94、222、287、303、409、449 行）都不 await 也不 catch。快速翻页或保存/删除操作时，多个并发调用会交错执行：每个调用开头清空 grid，但异步 `getAllSlots()` 无取消机制。第一个调用恢复后追加卡片时，第二个调用可能已清空 grid 开始自己的请求，导致重复卡片、陈旧数据或不同页的卡片混在一起。
- **修复建议:** 使用代次计数器（generation counter）模式：每次调用递增计数，await 后检查计数是否仍匹配，不匹配则丢弃结果。

---

### BUG-04: `_renderGrid` 无 `.catch()` 处理

- **文件:** `src/ui/SaveLoadScreen.js` (第 69、94、222、287、303、409、449 行)
- **代码:**

```js
// Line 69:
if (this.el.classList.contains('visible')) this._render();
// Line 222:
this._renderGrid();
// Line 287:
this._renderGrid();
```

- **问题:** `_renderGrid()` 返回 Promise 但所有调用点都丢弃返回值，无 `.catch()`。如果 `saveManager.getAllSlots()` 拒绝（网络错误、存储配额超限等），该拒绝成为未处理的 Promise rejection。
- **修复建议:** 在 `_renderGrid` 内部 try/catch 或在调用点添加 `.catch()`。

---

## HIGH (14)

### BUG-05: BGM 淡出期间切换导致音频泄漏

- **文件:** `src/engine/AudioManager.js:73-93`
- **代码:**

```js
stopBgm(data) {
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }
    if (!this._bgm) return;       // <-- _bgm 为 null 时提前返回

    const fadeOut = data?.fadeOut || 0;
    if (fadeOut > 0) {
      const bgm = this._bgm;
      this._fadeVolume(bgm, bgm.volume, 0, fadeOut, () => {
        bgm.pause();
        bgm.currentTime = 0;
      });
    } else { ... }
    this._bgm = null;             // <-- 立即置 null
}
```

- **问题:** `stopBgm` 带 `fadeOut > 0` 时，捕获 `this._bgm` 的本地引用，启动淡出间隔，然后立即将 `this._bgm` 设为 null。如果淡出期间调用 `playBgm`，`playBgm` 先调用 `stopBgm({ fadeOut: 0 })`，该调用清除 `_fadeTimer`（停止间隔），但命中 `if (!this._bgm) return;`（因为 `_bgm` 已是 null）。旧 `Audio` 元素在闭包中永远不被暂停，两首音频同时播放。
- **修复建议:** 将 `_bgm = null` 移到淡出完成的回调中，或在 `stopBgm` 开头保留旧音频引用以便后续清理。

---

### BUG-06: `startGame()` 在 `load()` 前调用会空指针

- **文件:** `src/engine/ScriptEngine.js:120`
- **代码:**

```js
startGame(sceneId = 'start') {
    this.variables = seedRuntimeVariablesFromRegistry(this.script?.systems?.variables);  // 安全
    ...
    if (!this.script.scenes[resolvedId]) {   // <-- 无 optional chaining
```

- **问题:** 第 113 行使用 `this.script?.systems?.variables`（安全），但第 120 行访问 `this.script.scenes[resolvedId]` 无空值保护。如果 `load()` 未调用或失败，`this.script` 为 null，此行抛出 `TypeError`。同样模式出现在 `_currentPage()`（第 274 行）和 `_processCurrentPage()`（第 287 行）。
- **修复建议:** 统一使用 `this.script?.scenes?.[resolvedId]` 或在方法开头检查 `this.script`。

---

### BUG-07: 键盘事件监听器泄漏

- **文件:** `src/ui/SaveLoadScreen.js:86-96`、`478-492`
- **代码:**

```js
show(mode = 'save', source = 'bar') {
    // ...
    this._attachKeyboard();  // 无 _detachKeyboard()
}

_attachKeyboard() {
    this._keyHandler = (e) => { ... };
    document.addEventListener('keydown', this._keyHandler);
}
```

- **问题:** 如果 `show()` 在未调用 `hide()` 的情况下被调用两次，旧的 `this._keyHandler` 引用被覆盖，但旧事件监听器仍挂在 `document` 上。每次重复调用泄漏一个全局 keydown 监听器，旧监听器无法移除（引用丢失）。
- **修复建议:** 在 `_attachKeyboard()` 开头先调用 `_detachKeyboard()`。

---

### BUG-08: `audio.playVoice()` 无 `.catch()`

- **文件:** `src/ui/BacklogScreen.js:298-302`
- **代码:**

```js
this.audio.playVoice(voiceFile).then(() => {
    if (this._playingEntry === entryEl) {
        this._restoreEntry(entryEl, btn);
    }
});
```

- **问题:** 如果 `playVoice` 返回 rejected Promise（音频解码失败、文件缺失、编解码器不支持），无 `.catch()` 处理。此外失败后语音按钮停留在"播放中"状态（显示停止图标），无法恢复。
- **修复建议:** 添加 `.catch()` 处理，在失败时恢复按钮状态。

---

### BUG-09: `data.options` 未做空值保护

- **文件:** `src/ui/ChoiceMenu.js:54`
- **代码:**

```js
data.options.forEach((option, index) => {
```

- **问题:** 如果 `data` 没有 `options` 属性，或 `data.options` 为 null/undefined，`.forEach()` 会抛出 `TypeError`。
- **修复建议:** 使用 `(data.options || []).forEach(...)` 或在方法开头检查。

---

### BUG-10: `hide()` 的 800ms setTimeout 与 `show()` 竞态

- **文件:** `src/ui/TitleScreen.js:57-59`
- **代码:**

```js
hide() {
    this.el.classList.remove('visible');
    setTimeout(() => this.el.classList.add('hidden'), 800);
}
```

- **问题:** `hide()` 用 800ms 的 `setTimeout` 添加 `hidden` 类（淡出动画）。如果在那 800ms 内调用 `show()`，`show()` 移除 `hidden` 并添加 `visible`，但随后定时器触发又把 `hidden` 加回去，导致标题画面不可见。
- **修复建议:** 将 setTimeout 引用保存到实例变量，在 `show()` 中清除它。

---

### BUG-11: `open-folder` IPC 无路径验证

- **文件:** `electron/main.js:1309-1317`
- **代码:**

```js
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (e) { ... }
});
```

- **问题:** `folderPath` 直接来自渲染进程，无验证。`shell.openPath` 会打开系统默认处理器处理的任意路径，恶意渲染进程可打开任意可执行文件、URL 或系统目录。无 `hasDialogDirectoryGrant` 检查。
- **修复建议:** 添加路径验证，仅允许在已授权的目录集合中打开。

---

### BUG-12: 主题安装器路径穿越

- **文件:** `electron/themePackageInstaller.js:99-104`
- **代码:**

```js
async function writeThemeAsset(projectPath, relativeUiPath, bytes) {
  const relativeParts = relativeUiPath.split('/');
  const destination = path.join(projectPath, 'assets', ...relativeParts);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
}
```

- **问题:** 如果 `relativeUiPath` 包含 `../` 段（如 `../../malicious.js`），`path.join` 会解析它们，导致写入到项目 `assets/` 目录之外。builtin 来源通过 `isCanonicalBuiltInTargetPath` 验证，但基于文件的安装路径依赖 `planThemeAssetReimport` 的 `preflight.actions`，如果该函数有验证缺口，可覆盖磁盘上任意文件。
- **修复建议:** 校验解析后的路径必须在 `projectPath/assets/` 内。

---

### BUG-13: 主题导出器路径穿越

- **文件:** `electron/themePackageExporter.js:121`
- **代码:**

```js
const assetBytes = await fs.readFile(path.join(projectPath, 'assets', ...originalPath.split('/')));
```

- **问题:** `originalPath` 来自扫描脚本数据的 `collectUiImagePaths`。如果脚本包含 `../../etc/passwd` 这样的 UI 图片路径，`split('/')` 展开后会传入 `..` 段到 `path.join`，解析到 `assets/` 目录之外。无验证确保解析后的路径在 `projectPath/assets/` 内。
- **修复建议:** 校验解析后的路径必须在 `projectPath/assets/` 内。

---

### BUG-14: `process.noAsar` 异常后不恢复

- **文件:** `electron/exportDesktop.js:194-221`
- **代码:**

```js
const savedNoAsar = process.noAsar;
process.noAsar = true;
// ... 多个可能抛异常的操作 ...
process.noAsar = savedNoAsar;  // 第 221 行
```

- **问题:** 如果第 195 行到第 221 行之间抛出任何异常，`process.noAsar` 永久保持 `true`，因为 `finally` 块（第 265-269 行）只清理 staging 目录，不恢复 `noAsar`。`noAsar` 卡在 `true` 时，后续所有 Electron fs 操作会忽略 `.asar` 文件，破坏应用读取自身打包资源的能力。
- **修复建议:** 将 `process.noAsar = savedNoAsar` 移到 `finally` 块中。

---

### BUG-15: `save-slot` 无 slot 号验证

- **文件:** `electron/game/main.js:198-202`
- **代码:**

```js
ipcMain.handle('save-slot', async (event, { slot, state, previewText, thumbnail }) => {
    try {
      await fs.mkdir(savesDir, { recursive: true });
      const padded = String(slot).padStart(3, '0');
```

- **问题:** 编辑器版本 `electron/main.js:877` 验证 `!Number.isInteger(slot) || slot < 1 || slot > 108`，但游戏运行时不对 slot 做任何验证。可传入 `slot = -1`、`slot = "abc"`、`slot = null`，产生文件名如 `slot_-01.json`、`slot_NaN.json`，或 `String(undefined).padStart` 崩溃。
- **修复建议:** 复用编辑器的 slot 验证逻辑。

---

### BUG-16: `renameCg`/`deleteCg` 跳过 normal 页面的 effects

- **文件:** `src/editor/stores/script.js:620-621`、`655-656`
- **代码:**

```js
// renameCg, line 620-621
for (const page of scene.pages || []) {
  if (page?.type !== 'choice') continue;   // <-- 跳过 normal 页面
```

- **问题:** `renameEnding`（第 418 行）和 `deleteEnding`（第 487 行）都处理 normal 页面的 effects 和 choice 页面的选项 effects。但 `renameCg` 和 `deleteCg` 只处理 choice 页面的选项 effects。如果 CG `unlock:cg` effect 存在于 normal 页面（通过 `page.effects`），重命名或删除 CG 会静默留下过时的 CG ID。
- **修复建议:** 参照 `renameEnding`/`deleteEnding` 的实现，增加对 normal 页面 effects 的处理。

---

### BUG-17: Peer 元素吸附失效

- **文件:** `src/editor/utils/snapGuides.js:134`
- **代码:**

```js
// computeSnap, line 134
if (enablePeers) targets.push(...getElementSnapTargets(peerBounds));

// getElementSnapTargets, line 66-71
export function getElementSnapTargets(elements, activeIds = new Set()) {
  for (const el of elements) {
    const id = el.id;
    const b = getElementBounds(el);   // <-- 对预计算 bounds 重新计算
```

- **问题:** `computeSnap` 将 `peerBounds`（已计算的 `{ left, top, right, bottom, ... }` 对象）传入 `getElementSnapTargets`，该函数对其调用 `getElementBounds`。但 `getElementBounds` 期望原始元素（有 `x`、`y`、`width`、`height` 属性）。预计算 bounds 对象没有 `x`/`y`（有 `left`/`top`），所以 `getElementBounds` 读取 `element.x ?? 0` 和 `element.y ?? 0`，产生位置 (0, 0) 的吸附目标。Peer 吸附功能完全失效。
- **修复建议:** `computeSnap` 应直接传原始元素数组而非预计算 bounds，或 `getElementSnapTargets` 应检测输入是 bounds 还是元素。

---

### BUG-18: `loadAll` 失败后 `isLoading` 永远卡在 true

- **文件:** `src/editor/stores/assets.js:48-54`
- **代码:**

```js
async function loadAll() {
  isLoading.value = true;
  await Promise.all(
    ['backgrounds', 'characters', 'audio', 'fonts', 'ui'].map(c => loadCategory(c))
  );
  isLoading.value = false;
}
```

- **问题:** 如果任何 `loadCategory` 调用抛出（IPC 失败等），`Promise.all` 拒绝，`isLoading.value = false` 永远不会执行。store 永久处于加载状态，无法恢复。
- **修复建议:** 使用 `try/finally` 包裹，确保 `isLoading` 在任何情况下都被重置。

---

## MEDIUM (30)

### Engine 层 (7)

#### BUG-19: `restoreState()` 无输入校验

- **文件:** `src/engine/ScriptEngine.js:200-209`
- **问题:** 如果 `state` 为 null/undefined（损坏的存档数据），每个属性访问都会抛出 `TypeError`。该方法从存档文件加载数据调用，存档可能损坏或被篡改。
- **修复建议:** 在方法开头校验 `state` 是否为有效对象。

#### BUG-20: `save()` 缺 try-catch

- **文件:** `src/engine/ConfigManager.js:37-39`
- **问题:** `localStorage.setItem` 在存储满时抛 `QuotaExceededError`。`_load()` 方法正确地用了 try-catch，但 `save()` 没有。
- **修复建议:** 包裹 try-catch，失败时静默或警告。

#### BUG-21: `loadProfile` 的 `JSON.parse` 无错误处理

- **文件:** `src/engine/PlayerDataRepository.js:168-171`
- **问题:** 如果 localStorage 含损坏数据（之前的崩溃导致部分写入），`JSON.parse(raw)` 抛 `SyntaxError`，整个玩家资料加载失败。
- **修复建议:** 包裹 try-catch，失败时返回 null。

#### BUG-22: ReadHistory 从未加载的仓库读取导致数据丢失

- **文件:** `src/engine/ReadHistory.js:12-17`、`65-68`、`71-78`
- **问题:** 构造函数同步调用 `_loadFromRepository()`。如果 `PlayerDataRepository` 尚未从存储加载（`_loaded === false`），`getProfile()` 返回默认空 profile。ReadHistory 从空 Set 开始。用户阅读页面后 `_save()` 触发时，只写回本次会话读过的页面，覆盖整个已存储的阅读历史。静默数据丢失。
- **修复建议:** 延迟加载或在仓库就绪后再初始化 ReadHistory。

#### BUG-23: `resolveValue` 对无法识别的表达式返回 NaN

- **文件:** `src/engine/oklch.js:225-241`
- **问题:** 如果规则表条目有拼写错误（如 `'p.c0.15'` 而非 `'p.c*0.15'`），正则不匹配，`parseFloat('p.c0.15')` 返回 NaN。NaN 传播到 `oklchToRgb`，产生 `rgba(NaN, NaN, NaN, ...)` 的 CSS 值。无警告日志。
- **修复建议:** 在 fallback 处添加警告日志，或对 NaN 结果抛出/记录错误。

#### BUG-24: 一个回调抛异常会中断其余监听器

- **文件:** `src/engine/EventEmitter.js:39-41`
- **代码:**

```js
emit(event, data) {
    this._listeners.get(event)?.forEach(cb => cb(data));
}
```

- **问题:** `Set.forEach` 在任何回调抛异常时停止迭代。一个 broken 监听器会导致同一事件的所有后续监听器被静默跳过。
- **修复建议:** 将每个回调调用包在 try-catch 中。

#### BUG-25: `applyTheme` 不检查 container 是否为 null

- **文件:** `src/engine/ThemeManager.js:21-26`
- **问题:** 如果 `document.getElementById('game-container')` 返回 null（DOM 未就绪、加载顺序错误），`container.style.setProperty` 抛 `TypeError`。`resetTheme`（第 33 行）同样问题。
- **修复建议:** 添加 null 检查或在方法开头校验参数。

---

### UI 层 (8)

#### BUG-26: `_bindSlider` 不检查 querySelector 结果

- **文件:** `src/ui/SettingsScreen.js:1083-1088`
- **问题:** 无 null 检查。如果 DOM 查询失败，`slider.addEventListener(...)` 抛 `TypeError`。
- **修复建议:** 添加 null 检查。

#### BUG-27: nineSlice.slice 类型不安全 (ButtonWidget/PanelWidget)

- **文件:** `src/ui/widgets/ButtonWidget.js:77-81`、`src/ui/widgets/PanelWidget.js:75-80`
- **问题:** 如果 `config.nineSlice.slice` 是 truthy 非数组值（如简化配置中的数字 `12`），`(12).join(' ')` 抛 `TypeError`。无 `Array.isArray()` 检查。
- **修复建议:** 添加类型检查或使用 `Array.isArray` 保护。

#### BUG-28: nineSlice.slice 类型假设不一致 (TabWidget)

- **文件:** `src/ui/widgets/TabWidget.js:276-278`
- **问题:** ButtonWidget/PanelWidget 期望 `slice` 为数组（用 `.join(' ')`），TabWidget 期望为标量（直接模板字面量插值）。如果数组传给 TabWidget，`${[12,12,12,12]}` 产生 `"12,12,12,12"` 是错误的 CSS。
- **修复建议:** 统一类型约定。

#### BUG-29: min==max 时除零产生 NaN%

- **文件:** `src/ui/widgets/SliderWidget.js:97`
- **问题:** `min === max` 时 `(max - min)` 为 0，除法产生 NaN。CSS 属性设为 `"NaN%"`。
- **修复建议:** 添加 `if (max === min) { pct = 0; }` 守卫。

#### BUG-30/31: `clampField` 返回 undefined 产生无效 CSS

- **文件:** `src/ui/DialogueBox.js:137` 等、`src/ui/ChoiceMenu.js:35` 等
- **问题:** 守卫检查 `s.x !== undefined`，但 `clampField` 对非数字类型仍可返回 undefined，模板字面量产生 `"undefinedpx"`。
- **修复建议:** 对 `clampField` 结果做数字检查。

#### BUG-32: 图片加载失败时无 onerror 处理

- **文件:** `src/ui/CharacterLayer.js:275-286`
- **问题:** 图片 404 时 `imgEl.complete` 为 true 但 `naturalWidth` 为 0，进入 else 分支设置 `onload` 但永远不会触发。无 `onerror` 处理器。容器的 `aspectRatio` 永远不被设置。
- **修复建议:** 添加 `onerror` 处理器。

#### BUG-33: 图片路径未 URL 编码

- **文件:** `src/ui/CharacterLayer.js:92`、`98`、`194`
- **代码:** `activeEl.src = this.basePath + data.image;`
- **问题:** `data.image` 直接拼接为 URL，含空格/`#`/`?`/unicode 时 URL 畸形。其他 UI 组件使用 `resolvePath()`，但 CharacterLayer 不用。
- **修复建议:** 使用 `resolvePath()` 或 `encodeURI()`。

---

### Shared 层 (6)

#### BUG-34: `normalizeConditionPages` 直接修改调用方输入

- **文件:** `src/shared/branchingContract.js:197`
- **问题:** 函数直接重新赋值 `scene.pages = scene.pages.map(...)` 到原始 scene 对象上，破坏性修改调用方数据。其他 normalize 函数都通过 `cloneJsonValue` 克隆输入。
- **修复建议:** 先克隆 scriptData 再修改。

#### BUG-35: `collectVariableReferences` 调用 `normalizeConditionPage` 未传 registry

- **文件:** `src/shared/variableRegistry.js:319`
- **问题:** 未传 `{ registry }` 导致类型推断回退到 `typeof row.value === 'boolean'`，数字变量的布尔值条件会被错误推断为 `'bool'`。其他所有调用点都传了 registry。
- **修复建议:** 传入 `{ registry }` 参数。

#### BUG-36: `applyEffects` 部分失败时不回滚

- **文件:** `src/shared/effectDsl.js:234-275`
- **问题:** 变量修改（`variables.set`）在循环中同步执行，持久化写入（`unlockEnding` 等）收集后 await。如果任何持久化 Promise 拒绝，变量 Map 已被修改但不回滚。重试会重复应用变量效果。
- **修复建议:** 先收集所有变更，全部成功后再应用；或在失败时回滚。

#### BUG-37: `getLegacySetVariableCompat` 只返回第一个变量效果

- **文件:** `src/shared/effectDsl.js:180-192`
- **问题:** `effects.find(...)` 只返回第一个匹配项。多个变量效果时其余静默丢失。
- **修复建议:** 使用 `effects.filter(...)` 返回所有匹配项。

#### BUG-38: `normalizeSystems` 对有效输入直接修改引用

- **文件:** `src/shared/galgameContract.js:33-43`
- **问题:** 当 `systems` 是有效对象时，`normalizedSystems` 是同一引用。`??=` 赋值修改调用方原始对象。虽然 `ensureGalgameContract` 在调用前克隆了 scriptData，但直接调用 `normalizeSystems` 会修改输入。
- **修复建议:** 始终克隆：`const normalizedSystems = { ...systems }`。

#### BUG-39: `isNumberLike` 逻辑不一致

- **文件:** `src/shared/conditionAnalysis.js:18-20` vs `src/shared/projectValidator.js:186-190`
- **问题:** `conditionAnalysis.js` 版本对布尔值返回 true（`Number(true)` 是 1），`projectValidator.js` 版本明确拒绝布尔值。静态验证器和运行时分析引擎对同一条件值的合法性判断不一致。
- **修复建议:** 抽取共享实现。

---

### Electron 层 (7)

#### BUG-40: `sanitizeTitle` 缺少反斜杠

- **文件:** `electron/game/main.js:29-31`
- **问题:** 正则不包含 `\\`（反斜杠），Windows 文件名非法。编辑器的 `sanitizeProjectName` 正确包含 `\\/`。含反斜杠的游戏标题在 Windows 上创建错误的目录层级。
- **修复建议:** 正则改为 `/[<>:"|?*\\]/g`。

#### BUG-41: `create-project` 的 `location` 未校验

- **文件:** `electron/main.js:290-294`
- **问题:** `location` 来自渲染进程，无 `hasDialogDirectoryGrant` 检查。`export-game` 和 `export-game-desktop` 都验证了输出目录，但 `create-project` 完全信任渲染进程提供的路径。
- **修复建议:** 添加目录授权校验。

#### BUG-42: `migrate-legacy-saves` 可能 off-by-one

- **文件:** `electron/main.js:1039`
- **代码:** `const padded = String(slot + 1).padStart(3, '0');`
- **问题:** `slot` 值加 1 后用作文件名。`save-slot` 处理器验证 `slot >= 1 && slot <= 108`（1-based）。如果 legacy saves 也是 1-based 编号，`slot + 1` 产生偏移的文件名（legacy slot 1 变成 `slot_002.json`）。无文档说明 legacy 格式中 `slot` 是 0-based 还是 1-based。
- **修复建议:** 确认 legacy 格式并添加注释。

#### BUG-43: Range 请求 start/end 未校验

- **文件:** `electron/main.js:1439-1441`
- **问题:** 无验证 `start <= end`、`start >= 0` 或 `start < total`。客户端发送 `Range: bytes=999999-` 在 100 字节文件上产生负 `chunkSize`。
- **修复建议:** 添加范围校验，无效时返回 416 状态码。

#### BUG-44: `uncaughtException` 处理器对非 Error 值崩溃

- **文件:** `electron/game/main.js:73-76`
- **问题:** 如果未捕获异常是非 Error 值（`throw null`、`throw "string"`），访问 `err.stack` 或 `err.message` 在崩溃处理器内部抛 TypeError，导致递归崩溃。
- **修复建议:** 使用 `err?.stack || err?.message || String(err ?? 'Unknown error')`。

#### BUG-45: `win.on('close')` 重复点击堆叠对话框

- **文件:** `electron/main.js:1363-1386`
- **问题:** close 事件用 `e.preventDefault()` 拦截后显示异步对话框。快速多次点击关闭按钮会堆叠多个对话框，第二个可能引用已被第一个销毁的窗口。无 `closingInProgress` 守卫。
- **修复建议:** 添加关闭进行中标志位。

#### BUG-46: `engine.script.scenes` 可能为 undefined

- **文件:** `src/main.js:464`
- **代码:** `const currentPage = engine.script.scenes[engine.currentScene]?.pages[engine.pageIndex];`
- **问题:** optional chaining 只作用于 `.pages[engine.pageIndex]`，不作用于 `scenes` 本身。`engine.script.scenes` 为 undefined 时抛 TypeError。
- **修复建议:** 改为 `engine.script?.scenes?.[engine.currentScene]?.pages?.[engine.pageIndex]`。

---

### Editor 层 (7)

#### BUG-47: 全局事件监听器在生命周期外注册

- **文件:** `src/editor/composables/useTitlePreview.js:87`
- **问题:** `window.addEventListener('message', onEngineMessage)` 在 composable setup 期间立即注册，不在 `onMounted` 内。组件重新挂载时监听器累积，`onBeforeUnmount` 只移除一个。
- **修复建议:** 将监听器注册移到 `onMounted` 中。

#### BUG-48: 未清理的 setTimeout

- **文件:** `src/editor/composables/useTitlePreview.js:83`
- **代码:** `setTimeout(() => flushPreview(), 300);`
- **问题:** `cleanup` 函数清除 `debounceTimer` 但不清除此 setTimeout。组件在 300ms 内卸载时，`flushPreview` 对已卸载组件和陈旧 iframeRef 触发。
- **修复建议:** 保存 setTimeout 引用，在 cleanup 中 clearTimeout。

#### BUG-49: Map 无限增长的内存泄漏

- **文件:** `src/editor/composables/usePageEditor.js:9`、`252`
- **问题:** `effectPreviewProvenanceByRequestId` 在每次 `previewEffect` 调用时添加条目，但从不移除。长时间编辑会话中无限增长。
- **修复建议:** 在终态状态或组件卸载时清理条目。

#### BUG-50: `findSourceCommand` 不检查 cmd 是否 undefined

- **文件:** `src/editor/composables/useCanvasState.js:99`
- **问题:** 如果 `fromIndex` 超过 `cmds.length - 1`（命令删除后的陈旧索引），`cmds[i]` 为 undefined，`cmd.type` 抛 TypeError。
- **修复建议:** 添加 `if (!cmd) continue;` 守卫。

#### BUG-51: `preflightThemePackageImport` 的 `ipcRenderer` 无 null 保护

- **文件:** `src/editor/services/themePackageImport.js:79`
- **问题:** 函数解构默认值为 `{}`，`ipcRenderer` 可能为 undefined。调用 `ipcRenderer.invoke(...)` 抛 TypeError 而非友好错误信息。
- **修复建议:** 添加 null 检查或提前返回错误。

#### BUG-52: effect 模式停止后不重置 previewSessionType

- **文件:** `src/editor/composables/usePageEditor.js:287-296`
- **问题:** `previewSessionType` 为 `'effect'` 时，`stopActiveEffectPreview()` 发送停止消息但不本地重置类型。只在引擎响应终态时重置。如果引擎不响应（iframe 崩溃等），UI 永久卡在 effect-preview 模式。
- **修复建议:** 在 `stopPreview` 中同时重置 `previewSessionType`。

#### BUG-53: `findCgReferences` 不检查 optionIndex 导致 NaN

- **文件:** `src/editor/stores/script.js:592`
- **问题:** `optionIndex` 为 undefined 时，`reference.optionIndex + 1` 产生 NaN，显示文本出现 "选项 NaN"。
- **修复建议:** 参照 `findEndingReferences` 的实现，检查 `optionIndex == null` 并渲染不同文本。

---

## LOW (16)

### BUG-54: 零尺寸光标图片产生退化 canvas

- **文件:** `src/engine/ThemeManager.js:409-421`
- **问题:** `naturalWidth = 0` 或 `naturalHeight = 0` 时除法产生 Infinity，canvas 为 0x0，光标静默不显示。
- **严重程度:** LOW（需同时满足超大和零尺寸，概率极低）

### BUG-55: `||` 与 `??` 混用导致 `0` 被忽略

- **文件:** `src/engine/ThemeManager.js:112-114`
- **问题:** `config.width || config.slice` 中，`width` 为 `0` 时（合法的 falsy 值）被 `||` 跳过。应使用 `??`。
- **严重程度:** LOW

### BUG-56: `hexToRgb` 无输入校验

- **文件:** `src/engine/colorHarmony.js:13-19`、`src/engine/contrast.js:16-22`
- **问题:** 3 字符简写 `'#abc'` 产生 NaN。null/undefined 输入抛异常。两个文件各自定义了相同的函数（重复代码）。
- **严重程度:** LOW

### BUG-57: scenes 为空对象时引擎静默进入僵尸状态

- **文件:** `src/engine/ScriptEngine.js:119-127`
- **问题:** `Object.keys({})` 返回 `[]`，`resolvedId` 保持无效值，`_enterScene` 静默返回。引擎既不处理页面也不发出 `'end'` 事件。
- **严重程度:** LOW

### BUG-58: SaveManager IPC 调用无 try-catch

- **文件:** `src/engine/SaveManager.js:48`、`75`、`89`、`106`、`148`、`166`、`180`、`244`
- **问题:** 所有 `window.ipcRenderer.invoke(...)` 调用无 try-catch。主进程崩溃或非 Electron 环境下错误未处理。
- **严重程度:** LOW

### BUG-59: `hide()` 在回调前调用

- **文件:** `src/ui/GameMenu.js:50-64`
- **问题:** `this.hide()` 无条件在 switch 之前调用。回调抛异常时用户看不到错误反馈。
- **严重程度:** LOW

### BUG-60: 标签页切换时重建整个 DOM

- **文件:** `src/ui/SettingsScreen.js:721-724`
- **问题:** `_renderStructured` 重建整个设置屏幕 DOM，效率低且可能闪烁。只需更新内容区域。
- **严重程度:** LOW

### BUG-61: `clampField` 未知字段名静默回退

- **文件:** `src/ui/sanitize.js:46-49`
- **问题:** 字段名不在 `BOUNDS` 映射中时静默回退到 `[-10000, 10000]`，拼写错误不会报错。
- **严重程度:** LOW

### BUG-62: runtimeViewport 清理函数需手动调用

- **文件:** `src/ui/runtimeViewport.js:20-26`
- **问题:** 返回的清理函数如果未被调用，resize 监听器永久存在，容器元素无法被 GC。
- **严重程度:** LOW

### BUG-63: `getContainerEffects` 返回可变引用

- **文件:** `src/shared/effectDsl.js:126-140`
- **问题:** 返回原始数组引用，未来调用方如果修改结果会损坏源数据。
- **严重程度:** LOW

### BUG-64: legacy setVariable 结局解锁被遗漏

- **文件:** `src/shared/endingRegistry.js:85-97`
- **问题:** `normalizeEffectsForReferences` 对 legacy `setVariable` 格式返回 `[]`，不归一化。`collectEndingUnlockReferences` 遗漏 legacy 格式的结局解锁。
- **严重程度:** LOW

### BUG-65: `clone` 对 undefined 输入崩溃

- **文件:** `src/shared/themeLegacyMigrations.js:8`
- **问题:** `JSON.stringify(undefined)` 返回 `undefined`，`JSON.parse(undefined)` 抛 SyntaxError。
- **严重程度:** LOW

### BUG-66: BFS 用 `shift()` 性能差

- **文件:** `src/shared/sceneGraph.js:145`
- **问题:** `Array.shift()` 是 O(n)，BFS 总复杂度 O(n^2)。对典型项目（几十个场景）无影响。
- **严重程度:** LOW

### BUG-67: 邻接查找缺少防御性检查

- **文件:** `src/shared/sceneGraph.js:100`
- **问题:** `graph[edge.fromSceneId]` 可能为 undefined，`.includes()` 抛 TypeError。
- **严重程度:** LOW

### BUG-68: `execAsync` shell 注入风险

- **文件:** `electron/exportGame.js:184`、`electron/exportDesktop.js:90`
- **问题:** `configPath` 插入 shell 命令字符串。含 `"` 或 `$()` 的路径可导致命令注入。
- **严重程度:** LOW（值来自 `process.env.APP_ROOT`，正常使用下安全）

### BUG-69: end 事件 2s 定时器不可取消

- **文件:** `src/main.js:686-693`
- **问题:** 2 秒内用户开始新游戏或加载存档时，定时器仍会触发，清除新游戏状态强制回到标题画面。
- **严重程度:** LOW

### BUG-70: cachedScreenshot 不清理

- **文件:** `src/main.js:788-791`、`829-833`
- **问题:** JPEG buffer（可能几 KB）在保存完成后不设为 null，内存中保留到下次截图。
- **严重程度:** LOW

### BUG-71: postMessage 使用 `'*'` 通配源

- **文件:** 多个 composable（`useThemeEditor.js`、`useWidgetStylesEditor.js` 等）
- **问题:** 所有 composable 使用 `'*'` 作为 `postMessage` 目标源。iframe 被导航到不同源时，任何源都可接收消息数据。
- **严重程度:** LOW（内部工具，同源 iframe，但值得改进）

---

## 修复优先级建议

### 立即修复 (CRITICAL)
- BUG-01: `atomicWrite` 数据丢失
- BUG-02: 任意文件读取漏洞
- BUG-03/04: SaveLoadScreen 异步竞态 + 无 catch

### 尽快修复 (HIGH)
- BUG-05: 音频泄漏
- BUG-06: ScriptEngine 空指针
- BUG-07: 键盘监听器泄漏
- BUG-08: playVoice 无 catch
- BUG-09: options 空指针
- BUG-10: TitleScreen show/hide 竞态
- BUG-11-14: Electron 安全问题（路径穿越、open-folder、noAsar）
- BUG-15: slot 号验证
- BUG-16: CG 引用孤儿
- BUG-17: 吸附失效
- BUG-18: isLoading 卡死

### 计划修复 (MEDIUM)
- BUG-19-25: Engine 层错误处理
- BUG-26-33: UI 层类型安全和空值保护
- BUG-34-39: Shared 层一致性和数据完整性
- BUG-40-46: Electron 层校验和竞态
- BUG-47-53: Editor 层生命周期和内存管理

### 低优先级 (LOW)
- BUG-54-71: 性能优化、防御性编码、代码清理
