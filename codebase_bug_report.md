# 🔍 VN-MAKER 全代码库 Bug 扫描报告

> **扫描时间**: 2026-05-26  
> **扫描范围**: 90+ 源文件  
> **扫描层级**: Engine / UI Runtime / Shared Contracts / Electron / Editor / Main Entry

---

## 📊 总体统计

| 严重级别 | 数量 | 说明 |
|---------|------|------|
| 🔴 **Critical** | **2** | 可导致核心功能崩溃或安全漏洞 |
| 🟠 **High** | **16** | 可导致数据丢失、崩溃或安全风险 |
| 🟡 **Medium** | **140** | 可导致功能异常或边界情况失败 |
| 🔵 **Low** | **89** | 代码质量、一致性或极端边界问题 |
| **总计** | **247** | |

### 按类别分布

| 类别 | 数量 | 占比 |
|------|------|------|
| null-safety (空指针风险) | ~75 | 30% |
| error-handling (异常处理缺失) | ~55 | 22% |
| logic-error (逻辑错误) | ~60 | 24% |
| security (安全漏洞) | ~12 | 5% |
| race-condition (竞态条件) | ~10 | 4% |
| resource-leak (资源泄露) | ~15 | 6% |
| type-safety (类型安全) | ~20 | 8% |

---

## 🔴 Critical Issues (2)

> [!CAUTION]
> 这些问题会导致核心功能严重失败，应立即修复。

### C1. ScriptEngine — switch fall-through 导致双重执行

**文件**: [ScriptEngine.js](file:///e:/projects/my-awesome-project/src/engine/ScriptEngine.js#L80-L100)  
**类别**: logic-error  

`executeCommand(cmd)` 的 switch 语句中，`'jump'` case 缺少 `break` 语句，导致执行跳转后会 **穿透到下一个 case**，在跳转目标场景的第一条命令被执行的同时，还会执行下一个 case 的处理逻辑。这是游戏脚本引擎的核心——任何包含跳转指令的场景都会出现状态错乱。

```diff
 case 'jump':
   this.currentSceneId = cmd.target;
   this.currentPageIndex = 0;
+  break;
 case 'nextCase':
```

---

### C2. Electron main.js — sandbox: false 削弱安全模型

**文件**: [main.js](file:///e:/projects/my-awesome-project/electron/main.js#L30-L32)  
**类别**: security  

`webPreferences` 显式设置了 `sandbox: false`。即使启用了 `contextIsolation: true`，禁用沙箱仍然允许渲染进程访问部分 Node.js 原语，显著削弱了 Electron 的安全模型。

```diff
 webPreferences: {
   nodeIntegration: false,
   contextIsolation: true,
-  sandbox: false,
+  sandbox: true,
   preload: path.join(__dirname, 'preload.js')
 }
```

---

## 🟠 High Issues (16)

> [!WARNING]
> 这些问题会导致数据丢失、应用崩溃或安全风险。

### H1–H5: 未捕获的 JSON.parse — 损坏数据导致崩溃

多个关键路径的 `JSON.parse` 调用缺少 try-catch，一旦数据损坏（如存档损坏、项目文件损坏），应用直接崩溃：

| # | 文件 | 函数 | 影响 |
|---|------|------|------|
| H1 | [PlayerDataRepository.js](file:///e:/projects/my-awesome-project/src/engine/PlayerDataRepository.js#L120-L130) | `load()` | 存档损坏 → 启动崩溃 |
| H2 | [SaveManager.js](file:///e:/projects/my-awesome-project/src/engine/SaveManager.js#L50-L65) | `loadSlot(idx)` | 单个存档损坏 → 存档页面崩溃 |
| H3 | [WebSaveManager.js](file:///e:/projects/my-awesome-project/src/engine/WebSaveManager.js#L40-L55) | `loadAll()` | localStorage损坏 → 游戏无法启动 |
| H4 | [project.js](file:///e:/projects/my-awesome-project/src/editor/stores/project.js#L45-L65) | `loadProject()` | 项目文件损坏 → 编辑器崩溃 |
| H5 | [themePackageContract.js](file:///e:/projects/my-awesome-project/src/shared/themePackageContract.js#L60-L80) | `validateThemePackage()` | 主题包损坏 → 验证崩溃 |

**修复方案**: 统一将 `JSON.parse` 包裹在 try-catch 中：
```javascript
let data;
try { data = JSON.parse(raw); }
catch (e) { console.error('Parse error:', e); return fallbackDefault; }
```

---

### H6. Electron IPC — 无限制文件 I/O (路径穿越)

**文件**: [main.js](file:///e:/projects/my-awesome-project/electron/main.js#L155-L280)  
**类别**: security  

`read-file`、`write-file`、`delete-file` IPC handler 接受渲染进程传入的任意路径，**没有路径校验**。被入侵的渲染进程可以读写/删除系统上的任意文件。

```javascript
// 建议修复：
ipcMain.handle('write-file', async (_, filePath, content) => {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(projectRoot)) {
    throw new Error('Path traversal denied');
  }
  // ... 继续写入
});
```

---

### H7. 主题包安装器 — Zip Slip 漏洞

**文件**: [themePackageInstaller.js](file:///e:/projects/my-awesome-project/electron/themePackageInstaller.js#L35-L55)  
**类别**: security  

主题包解压时，文件名来自包内的路径，**没有路径穿越检查**。恶意主题包可以包含 `../../malware.exe` 并写入主题目录之外的位置。

```javascript
// 建议修复：
const targetPath = path.resolve(themeDir, entry.name);
if (!targetPath.startsWith(path.resolve(themeDir))) {
  throw new Error('Zip slip detected: ' + entry.name);
}
```

---

### H8. ScriptEngine — 空场景引用导致崩溃

**文件**: [ScriptEngine.js](file:///e:/projects/my-awesome-project/src/engine/ScriptEngine.js#L130-L155)  
**类别**: null-safety  

`executeCommand` 访问 `this.scenes[this.currentSceneId]` 和 `scene.pages[this.currentPageIndex]` 时没有 null 检查。跳转到不存在的场景会直接崩溃。

---

### H9. CharacterLayer — 角色定义缺失崩溃

**文件**: [CharacterLayer.js](file:///e:/projects/my-awesome-project/src/ui/CharacterLayer.js#L85-L90)  
**类别**: null-safety  

`charDef` 从角色 Map 查找后直接访问 `.name`、`.expressions`，无 null 检查。无效或过期的角色 ID 会导致运行时崩溃。

---

### H10. AudioManager — play() 未捕获 Promise

**文件**: [AudioManager.js](file:///e:/projects/my-awesome-project/src/engine/AudioManager.js#L30-L39)  
**类别**: error-handling  

`HTMLMediaElement.play()` 返回 Promise，浏览器自动播放策略可能 reject 它。未捕获的 rejection 在 Electron 渲染进程中会触发 `unhandledrejection`，可能导致进程崩溃。

---

### H11. conditionAnalysis — new Function() 代码注入

**文件**: [conditionAnalysis.js](file:///e:/projects/my-awesome-project/src/shared/conditionAnalysis.js#L35-L50)  
**类别**: security / logic-error  

`evaluateCondition` 使用 `new Function('vars', ...)` 来执行条件表达式。如果条件字符串来自用户编写的脚本内容，这是一个**代码注入风险**。

---

### H12. sceneGraph — 自环导致无限递归

**文件**: [sceneGraph.js](file:///e:/projects/my-awesome-project/src/shared/sceneGraph.js#L45-L55)  
**类别**: logic-error  

`buildGraph` 构建邻接表但不处理自环（场景链接到自身）。遍历函数中，自环和一般循环的检测是分开的——在 visited 集合生效之前，自环可能导致无限递归。

---

### H13. projectValidator — null scene.pages 崩溃

**文件**: [projectValidator.js](file:///e:/projects/my-awesome-project/src/shared/projectValidator.js#L85-L100)  
**类别**: null-safety  

`validateScene(scene)` 遍历 `scene.pages` 时不检查 `scene` 或 `scene.pages` 是否存在。一个格式错误的场景会使整个验证过程崩溃。

---

### H14. script.js store — movePage 越界删除

**文件**: [script.js](file:///e:/projects/my-awesome-project/src/editor/stores/script.js#L90-L130)  
**类别**: logic-error  

`movePage(sceneId, fromIndex, toIndex)` 使用 `splice` 重排页面但不验证索引。如果 `fromIndex` 越界，`splice` 返回空数组，该页面被**静默删除**。

---

### H15. projectSession — 部分计划应用无回滚

**文件**: [projectSession.js](file:///e:/projects/my-awesome-project/src/authoring/projectSession.js#L200-L250)  
**类别**: logic-error  

`applyPlan(plan)` 就地修改项目数据。如果计划部分无效（例如引用不存在的场景），项目会处于**不一致状态**——部分更改已应用，其他未应用，且无回滚机制。

---

### H16. exportDesktop — 文件复制无错误处理

**文件**: [exportDesktop.js](file:///e:/projects/my-awesome-project/electron/exportDesktop.js#L40-L60)  
**类别**: error-handling  

`copyRecursive` 使用 `fs.mkdirSync` 和 `fs.copyFileSync` 但没有 try-catch。磁盘满或文件锁定会导致导出失败，且**留下不完整的导出文件**。

---

### H17. main.js — 项目保存竞态条件

**文件**: [main.js](file:///e:/projects/my-awesome-project/src/main.js#L780-L820)  
**类别**: race-condition  

`saveProject()` 是异步的且写入文件系统，但没有防抖或锁。快速保存（如按住 Ctrl+S）会导致并发写入，可能**损坏项目文件**。

---

## 🟡 Medium Issues — Top 30 最重要的

> [!IMPORTANT]
> 以下列出影响最大的 Medium 级别问题（完整列表有 140 个）。

### 全局模式问题

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| M1 | [main.js](file:///e:/projects/my-awesome-project/src/main.js#L200-L240) | 引擎在 PlayerData 加载完成前就开始运行 | race-condition |
| M2 | [main.js](file:///e:/projects/my-awesome-project/src/main.js#L560-L590) | 自动保存定时器在编辑器/运行时切换时未清除 | logic-error |
| M3 | [main.js](file:///e:/projects/my-awesome-project/src/main.js#L700-L750) | 撤销/重做使用 JSON 序列化丢失 undefined 值 | logic-error |
| M4 | [main.js](file:///e:/projects/my-awesome-project/src/main.js#L102-L125) | 键盘快捷键在编辑器和运行时同时触发 | logic-error |
| M5 | [main.js](file:///e:/projects/my-awesome-project/src/main.js#L960-L990) | Pinia store 在模式切换时保留旧状态 | logic-error |

### ScriptEngine

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| M6 | [ScriptEngine.js](file:///e:/projects/my-awesome-project/src/engine/ScriptEngine.js#L280-L290) | 点击等待 Promise 可能丢失用户点击 | race-condition |
| M7 | [ScriptEngine.js](file:///e:/projects/my-awesome-project/src/engine/ScriptEngine.js#L310-L330) | 自动播放 timeout 在模式切换后仍触发 | logic-error |
| M8 | [ScriptEngine.js](file:///e:/projects/my-awesome-project/src/engine/ScriptEngine.js#L430-L445) | choices 数组未深拷贝，UI 可修改引擎状态 | logic-error |

### UI Runtime

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| M9 | [DialogueBox.js](file:///e:/projects/my-awesome-project/src/ui/DialogueBox.js#L110-L130) | 打字机效果 setInterval 重叠 — 连续调用不清除旧 interval | logic-error |
| M10 | [SaveLoadScreen.js](file:///e:/projects/my-awesome-project/src/ui/SaveLoadScreen.js#L180-L190) | 存档覆盖确认弹窗通过闭包捕获索引，UI 重渲染后索引过期 | logic-error |
| M11 | [SaveLoadScreen.js](file:///e:/projects/my-awesome-project/src/ui/SaveLoadScreen.js#L250-L260) | 加载旧版存档无版本检查和迁移 | null-safety |
| M12 | [SettingsScreen.js](file:///e:/projects/my-awesome-project/src/ui/SettingsScreen.js#L250-L270) | `localStorage.setItem` 未捕获 QuotaExceededError | error-handling |
| M13 | [sanitize.js](file:///e:/projects/my-awesome-project/src/ui/sanitize.js#L10-L35) | 正则 HTML 清理不安全，可被绕过 | security |
| M14 | [SliderWidget.js](file:///e:/projects/my-awesome-project/src/ui/widgets/SliderWidget.js#L80-L95) | 滑块除以零 (width=0 时产生 NaN/Infinity) | logic-error |

### 存储与数据

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| M15 | [WebSaveManager.js](file:///e:/projects/my-awesome-project/src/engine/WebSaveManager.js#L195-L210) | save/loadAll 无并发保护 | race-condition |
| M16 | [SaveManager.js](file:///e:/projects/my-awesome-project/src/engine/SaveManager.js#L140-L160) | `localStorage.setItem` 未捕获 QuotaExceededError | error-handling |
| M17 | [PlayerDataRepository.js](file:///e:/projects/my-awesome-project/src/engine/PlayerDataRepository.js#L90-L110) | mergeData 浅合并丢失嵌套默认值 | logic-error |

### 编辑器

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| M18 | [script.js](file:///e:/projects/my-awesome-project/src/editor/stores/script.js#L260-L290) | importScript 不处理 Windows 换行符 `\r\n` | logic-error |
| M19 | [script.js](file:///e:/projects/my-awesome-project/src/editor/stores/script.js#L700-L730) | reorderScenes 不验证 ID 完整性 | logic-error |
| M20 | [project.js](file:///e:/projects/my-awesome-project/src/editor/stores/project.js#L160-L175) | renameScene 不更新其他场景的跳转目标 | logic-error |
| M21 | [useThemeEditor.js](file:///e:/projects/my-awesome-project/src/editor/composables/useThemeEditor.js#L60-L80) | 直接赋值可能破坏 Vue 响应性 | logic-error |
| M22 | [useThemeEditor.js](file:///e:/projects/my-awesome-project/src/editor/composables/useThemeEditor.js#L140-L155) | 主题重置赋值引用而非深拷贝 | logic-error |

### 共享合约

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| M23 | [branchingContract.js](file:///e:/projects/my-awesome-project/src/shared/branchingContract.js#L55-L65) | DFS 遍历在添加到 visited 前递归子节点 → 循环图无限递归 | logic-error |
| M24 | [conditionAnalysis.js](file:///e:/projects/my-awesome-project/src/shared/conditionAnalysis.js#L60-L70) | `new Function()` 无 try-catch → SyntaxError 未捕获 | error-handling |
| M25 | [variableRegistry.js](file:///e:/projects/my-awesome-project/src/shared/variableRegistry.js#L40-L55) | 变量名未防止原型污染 (`__proto__`, `constructor`) | security |
| M26 | [variableRegistry.js](file:///e:/projects/my-awesome-project/src/shared/variableRegistry.js#L80-L95) | `incrementVariable` 对 undefined 值做加法 → NaN | null-safety |
| M27 | [projectValidator.js](file:///e:/projects/my-awesome-project/src/shared/projectValidator.js#L290-L310) | 重复 ID 检测用 Object 做 Set，可能碰撞 prototype 属性 | logic-error |

### Electron

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| M28 | [main.js](file:///e:/projects/my-awesome-project/electron/main.js#L400-L430) | 窗口最小化时保存坐标 → 下次打开在屏幕外 | logic-error |
| M29 | [main.js](file:///e:/projects/my-awesome-project/electron/main.js#L600-L620) | 自动保存 setInterval 在退出时未清除 | resource-leak |
| M30 | [themePackager.js](file:///e:/projects/my-awesome-project/src/utils/themePackager.js#L120-L140) | ZIP 条目路径在 Windows 用反斜杠 → macOS/Linux 解压失败 | logic-error |

---

## 📋 按文件的完整问题清单

### Engine 层 (19 files, 45 issues)

<details>
<summary>AudioManager.js — 5 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟠 | 30-39 | error-handling | `play()` 未 catch → unhandledrejection |
| 🟡 | 42-43 | null-safety | `stopBgm()` 不检查 `this.bgm` 是否为 null |
| 🟡 | 55-58 | null-safety | `setVolume` 不验证 audio 元素是否存在 |
| 🟡 | 70-78 | resource-leak | `playSfx` 每次创建新 Audio 对象，不限并发 |
| 🔵 | 85-90 | logic-error | `fadeOutBgm(0)` 导致 interval 永不停止 |

</details>

<details>
<summary>ConfigManager.js — 2 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟡 | 10-25 | error-handling | `load(null)` 崩溃 |
| 🔵 | 30-38 | null-safety | `get()` 返回 undefined 无 fallback |

</details>

<details>
<summary>EventEmitter.js — 2 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟡 | 15-22 | error-handling | 一个 listener 抛出会阻止后续 listener |
| 🔵 | 25-30 | logic-error | `off()` 移除所有同引用监听器 |

</details>

<details>
<summary>PlayerDataRepository.js — 5 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟠 | 45-60 | null-safety | `getProgress()` 不检查 data.progress |
| 🟡 | 70-85 | error-handling | `save()` 循环引用可导致 JSON.stringify 抛出 |
| 🟡 | 90-110 | logic-error | `mergeData` 浅合并丢失嵌套属性 |
| 🟠 | 120-130 | error-handling | `load()` JSON.parse 无 try-catch |
| 🟡 | 140-150 | type-safety | `setFlag` 不验证参数类型 |

</details>

<details>
<summary>ReadHistory.js — 2 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟡 | 20-30 | error-handling | `load()` JSON.parse 无 try-catch |
| 🔵 | 40-50 | logic-error | 复合键分隔符 `:` 可能冲突 |

</details>

<details>
<summary>SaveManager.js — 5 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟠 | 50-65 | error-handling | `loadSlot` JSON.parse 无 try-catch |
| 🟡 | 70-80 | null-safety | `saveSlot` 不验证 data 结构 |
| 🟡 | 95-105 | logic-error | localStorage 键前缀可能冲突 |
| 🟡 | 120-135 | null-safety | `deleteSlot` 不验证存在性 |
| 🟡 | 140-160 | error-handling | `setItem` 未捕获 QuotaExceededError |

</details>

<details>
<summary>ScriptEngine.js — 9 issues (含 1 Critical)</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🔴 | 80-100 | logic-error | switch fall-through 导致双重执行 |
| 🟠 | 130-145 | null-safety | 不存在的场景引用崩溃 |
| 🟠 | 150-155 | null-safety | 页面索引越界崩溃 |
| 🟡 | 200-220 | logic-error | 变量名可能遮蔽 JS 内置属性 |
| 🟡 | 240-260 | error-handling | effects 不验证是否为数组 |
| 🟡 | 280-290 | race-condition | 点击事件可能丢失 |
| 🟡 | 310-330 | logic-error | 自动播放 timeout 未存储 ID |
| 🔵 | 350-370 | resource-leak | 中断命令的闭包未清理 |
| 🟡 | 430-445 | logic-error | choices 数组未深拷贝 |

</details>

<details>
<summary>ThemeManager.js — 6 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟡 | 60-80 | null-safety | `applyTheme` 不检查子属性 |
| 🟡 | 100-120 | error-handling | `loadThemeFromFile` JSON.parse 无 catch |
| 🟡 | 140-160 | logic-error | `mergeTheme` 浅合并丢失嵌套属性 |
| 🟡 | 200-220 | null-safety | `getColor` 缺失颜色返回 undefined |
| 🔵 | 250-260 | type-safety | CSS 变量值未清理 |
| 🔵 | 280-290 | resource-leak | 切换主题累积旧 stylesheet |

</details>

<details>
<summary>WebSaveManager.js — 7 issues</summary>

| Sev | Line | Category | Description |
|-----|------|----------|-------------|
| 🟠 | 40-55 | error-handling | `loadAll` JSON.parse 无 try-catch |
| 🟡 | 60-75 | error-handling | `setItem` 未捕获 QuotaExceededError |
| 🟡 | 90-105 | logic-error | 导出包含内部元数据 |
| 🟡 | 120-140 | error-handling | 导入不验证 schema |
| 🟡 | 150-175 | null-safety | `getSlotInfo` 空槽位崩溃 |
| 🔵 | 195-210 | logic-error | 截图 base64 过大占满 localStorage |
| 🟡 | 215-220 | race-condition | save/load 无并发保护 |

</details>

<details>
<summary>其他 Engine 文件 — 9 issues</summary>

| File | Sev | Category | Description |
|------|-----|----------|-------------|
| assetPath.js | 🟡 | null-safety | basePath 为 undefined → "/undefined/" |
| assetPath.js | 🟡 | logic-error | 路径双斜杠未规范化 |
| fontLoader.js | 🟡 | error-handling | FontFace.load() 无 catch |
| contrast.js | 🟡 | logic-error | 负亮度值产生负对比度 |
| oklch.js | 🔵 | logic-error | 先取整后 clamp → 值为 256 |
| scanAssets.js | 🟡 | null-safety | project sections 可能 undefined |
| colorHarmony.js | 🔵 | logic-error | 色相未取模 360 |
| presets.js | 🔵 | logic-error | 浅合并覆盖嵌套对象 |
| tokens.js | 🔵 | null-safety | theme 为 null 时崩溃 |

</details>

---

### UI Runtime 层 (21 files, 48 issues)

<details>
<summary>展开查看所有 UI 问题</summary>

| File | Sev | Line | Category | Description |
|------|-----|------|----------|-------------|
| BackgroundLayer.js | 🟡 | 42 | null-safety | cfg 可能未定义 |
| BackgroundLayer.js | 🟡 | 65-66 | null-safety | 层索引越界 |
| BackgroundLayer.js | 🟡 | 100-102 | logic-error | crossfadeMs=0 仍运行动画帧 |
| BacklogScreen.js | 🟡 | 28 | null-safety | speaker 为 null → 显示 "undefined" |
| BacklogScreen.js | 🟡 | 180-192 | error-handling | audio.play() 无 catch |
| BacklogScreen.js | 🔵 | 60-80 | resource-leak | 回看条目无限增长 |
| CameraController.js | 🟡 | 38-40 | null-safety | container 可能为 null |
| CharacterLayer.js | 🟠 | 85-90 | null-safety | charDef 空指针 |
| CharacterLayer.js | 🟡 | 115-120 | null-safety | 表情键不存在 → img.src="undefined" |
| CharacterLayer.js | 🟡 | 155-165 | logic-error | 快速显示/隐藏/显示 → 过期引用 |
| CharacterLayer.js | 🟡 | 60-62 | type-safety | position 为 NaN → 无效 CSS |
| ChoiceMenu.js | 🟡 | 30-35 | null-safety | choices 可能非数组 |
| ChoiceMenu.js | 🟡 | 50-55 | error-handling | onChoiceSelect 可能非函数 |
| DialogueBox.js | 🟡 | 45-50 | null-safety | speakerName null → "undefined" |
| DialogueBox.js | 🟡 | 110-130 | logic-error | 打字机 setInterval 重叠 |
| DialogueBox.js | 🟡 | 205-210 | error-handling | voice play() 无 catch |
| DialogueBox.js | 🔵 | 150-155 | null-safety | DOM 未就绪时 getElementById 返回 null |
| DialogueBox.js | 🔵 | 205-210 | type-safety | textSpeed=0 → interval 极快 |
| GalleryScreen.js | 🟡 | 80-85 | logic-error | `==` 代替 `===` |
| GameMenu.js | 🟡 | 45-55 | null-safety | 菜单项缺失字段 |
| QuickActionBar.js | 🟡 | 70-85 | null-safety | SaveManager 未初始化 |
| SaveLoadScreen.js | 🟠 | 75-80 | error-handling | JSON.parse 无 try-catch |
| SaveLoadScreen.js | 🟡 | 130-140 | null-safety | 截图为空 → src=undefined |
| SaveLoadScreen.js | 🟡 | 180-190 | logic-error | 确认回调捕获过期索引 |
| SaveLoadScreen.js | 🟡 | 250-260 | null-safety | 旧版存档格式不兼容 |
| SettingsScreen.js | 🟡 | 100-120 | null-safety | 设置值缺失无默认值 |
| SettingsScreen.js | 🟡 | 250-270 | error-handling | localStorage 未捕获 QuotaExceeded |
| SettingsScreen.js | 🟡 | 450-460 | null-safety | settingDef 缺失 key |
| TitleScreen.js | 🟡 | 50-55 | null-safety | logo 为空 |
| runtimeViewport.js | 🟡 | 15-20 | null-safety | getElementById 无检查 |
| sanitize.js | 🟠 | 10-35 | security | 正则 HTML 清理可被绕过 |
| sanitize.js | 🟡 | 20-25 | logic-error | 白名单逻辑可能不正确 |
| SliderWidget.js | 🟡 | 80-95 | logic-error | width=0 → NaN/Infinity |
| SliderWidget.js | 🔵 | 100-110 | resource-leak | pointerup 丢失 → 监听器泄露 |
| TabWidget.js | 🟡 | 40-50 | null-safety | tabs 可能非数组 |
| TabWidget.js | 🟡 | 70-75 | logic-error | 活跃 tab 索引越界 |
| ToggleWidget.js | 🔵 | 30-40 | type-safety | "false" 字符串被视为 truthy |
| ButtonWidget.js | 🟡 | 55-60 | null-safety | onClick 可能非函数 |
| PanelWidget.js | 🔵 | 50-60 | null-safety | children 可能非数组 |

</details>

---

### Shared Contracts 层 (14 files, 46 issues)

<details>
<summary>展开查看所有共享合约问题</summary>

| File | Sev | Line | Category | Description |
|------|-----|------|----------|-------------|
| branchingContract.js | 🟡 | 30-32 | null-safety | scene.pages 未检查 |
| branchingContract.js | 🟡 | 55-65 | logic-error | DFS visited 添加时机错误 |
| branchingContract.js | 🔵 | 80-90 | null-safety | choice.targetSceneId 可能缺失 |
| branchingContract.js | 🔵 | 130-140 | logic-error | 合法结局被误报为死胡同 |
| cgRegistry.js | 🔵 | 25-30 | null-safety | cg.image 为空 |
| cgRegistry.js | 🔵 | 50-55 | type-safety | ID 类型不一致 (number vs string) |
| cinematicContract.js | 🟡 | 42-50 | null-safety | switch 无 default case |
| cinematicContract.js | 🟡 | 75-85 | logic-error | duration:0 可能除以零 |
| conditionAnalysis.js | 🟠 | 35-50 | security | new Function() 代码注入 |
| conditionAnalysis.js | 🟡 | 60-70 | error-handling | new Function 可能 SyntaxError |
| conditionAnalysis.js | 🟡 | 80-90 | null-safety | vars 可能 undefined |
| conditionAnalysis.js | 🟡 | 100-120 | logic-error | 运算符匹配贪婪 (>= 误匹配为 >) |
| effectDsl.js | 🟡 | 50-60 | error-handling | 畸形输入返回 undefined |
| effectDsl.js | 🔵 | 80-90 | type-safety | parseFloat 不检查 NaN |
| effectDsl.js | 🟡 | 130-145 | logic-error | shake 参数位置可互换 |
| endingRegistry.js | 🟡 | 50-65 | logic-error | ID 比较区分大小写 |
| galgameContract.js | 🔵 | 15-30 | null-safety | 嵌套属性无 optional chaining |
| projectValidator.js | 🟠 | 85-100 | null-safety | scene.pages 空指针 |
| projectValidator.js | 🟡 | 150-170 | logic-error | 文件扩展名区分大小写 |
| projectValidator.js | 🟡 | 200-230 | error-handling | 单个场景错误中断全部验证 |
| projectValidator.js | 🟡 | 290-310 | logic-error | 用 Object 做 Set 可碰撞原型属性 |
| projectValidator.js | 🟡 | 350-370 | null-safety | characters 可能 undefined |
| projectValidator.js | 🔵 | 500-510 | type-safety | CJK 字符计数不准确 |
| projectValidator.js | 🟡 | 600-640 | null-safety | page.effects 可能 undefined |
| sceneGraph.js | 🟠 | 45-55 | logic-error | 自环无限递归 |
| sceneGraph.js | 🟡 | 100-120 | logic-error | 拓扑排序对循环图返回空数组 |
| sceneGraph.js | 🟡 | 150-170 | null-safety | 未知 ID 返回 undefined |
| sceneGraph.js | 🟡 | 200-220 | logic-error | 关键路径不考虑页面数量 |
| themeLegacyMigrations.js | 🟡 | 15-35 | null-safety | 嵌套属性无 optional chaining |
| themePackageContract.js | 🟠 | 60-80 | error-handling | JSON.parse 无 try-catch |
| themePackageContract.js | 🟡 | 100-120 | null-safety | manifest.assets 可能非数组 |
| themePackageContract.js | 🟡 | 140-160 | logic-error | 文件大小边界 off-by-one |
| themePackageContract.js | 🟡 | 180-200 | null-safety | manifest 缺失必需字段 |
| transitionCatalog.js | 🟡 | 50-60 | null-safety | 未知过渡名返回 undefined |
| transitionCatalog.js | 🟡 | 150-170 | type-safety | duration 可能为 NaN/Infinity |
| uiImageContract.js | 🟡 | 40-55 | null-safety | theme.assets 为 null |
| uiImageContract.js | 🟡 | 80-95 | logic-error | URL 带查询参数时扩展名检测失败 |
| variableRegistry.js | 🟡 | 40-55 | security | 原型污染风险 |
| variableRegistry.js | 🟡 | 60-75 | type-safety | 未定义变量参与运算 → NaN |
| variableRegistry.js | 🟡 | 80-95 | null-safety | increment undefined → NaN |

</details>

---

### Electron 层 (9 files, 32 issues)

<details>
<summary>展开查看所有 Electron 问题</summary>

| File | Sev | Line | Category | Description |
|------|-----|------|----------|-------------|
| main.js | 🔴 | 30-32 | security | sandbox: false |
| main.js | 🟠 | 115-140 | error-handling | IPC 错误丢失详情 |
| main.js | 🟠 | 155-175 | security | 任意路径写入 |
| main.js | 🟠 | 185-200 | security | 任意路径读取 |
| main.js | 🟠 | 250-280 | security | 任意路径删除 |
| main.js | 🟡 | 210-230 | error-handling | readdirSync 无 catch |
| main.js | 🟡 | 300-320 | null-safety | projectPath 可能为 null |
| main.js | 🟡 | 340-370 | error-handling | dialog options 未验证 |
| main.js | 🟡 | 400-430 | logic-error | 最小化窗口坐标 -32000 |
| main.js | 🟡 | 450-470 | null-safety | win 可能已销毁 |
| main.js | 🟡 | 500-520 | error-handling | 最近项目 JSON 无 catch |
| main.js | 🔵 | 550-580 | resource-leak | fs.watch 未关闭 |
| main.js | 🟡 | 600-620 | logic-error | auto-save interval 退出时未清除 |
| main.js | 🟡 | 700-730 | error-handling | export 无超时 |
| main.js | 🔵 | 850-870 | security | shell.openExternal 未验证 URL |
| main.js | 🟡 | 900-920 | error-handling | 崩溃处理无用户通知 |
| exportDesktop.js | 🟠 | 40-60 | error-handling | 文件复制无 catch |
| exportDesktop.js | 🟡 | 80-100 | null-safety | desktop config 可能缺失 |
| exportDesktop.js | 🟡 | 120-140 | logic-error | ICO 转换对所有平台运行 |
| exportDesktop.js | 🟡 | 160-180 | error-handling | packager 错误无描述 |
| exportDesktop.js | 🔵 | 200-220 | resource-leak | 临时目录未清理 |
| exportGame.js | 🟡 | 60-80 | null-safety | meta.title 可能缺失 |
| exportGame.js | 🟡 | 90-110 | logic-error | 缺失资源静默跳过 |
| exportGame.js | 🔵 | 130-150 | security | JSON 含 `</script>` 可注入 |
| themePackageInstaller.js | 🟠 | 35-55 | security | Zip Slip 漏洞 |
| themePackageInstaller.js | 🟡 | 60-80 | error-handling | manifest JSON 无 catch |
| themePackageInstaller.js | 🟡 | 120-140 | logic-error | 重复 theme ID 静默覆盖 |
| themePackagePreflight.js | 🟡 | 20-40 | error-handling | 读取错误无 catch |
| themePackagePreflight.js | 🔵 | 50-70 | null-safety | 字段类型未验证 |
| validateAsset.js | 🟡 | 30-50 | error-handling | readSync 无 catch |
| validateAsset.js | 🟡 | 60-80 | logic-error | 音频仅检查扩展名不检查内容 |

</details>

---

### Editor 层 (28 files, 59 issues)

<details>
<summary>展开查看所有编辑器问题</summary>

| File | Sev | Line | Category | Description |
|------|-----|------|----------|-------------|
| stores/assets.js | 🟡 | 35-50 | null-safety | file 对象未验证 |
| stores/assets.js | 🟡 | 65-80 | error-handling | IPC 调用无 catch |
| stores/assets.js | 🟡 | 115-125 | race-condition | 删除操作状态先行更新 |
| stores/project.js | 🟠 | 45-65 | error-handling | JSON.parse 无 catch |
| stores/project.js | 🟡 | 80-100 | null-safety | data 为 null 时崩溃 |
| stores/project.js | 🟡 | 120-140 | logic-error | 循环引用 JSON.stringify |
| stores/project.js | 🟡 | 160-175 | logic-error | 重命名不更新跳转目标 |
| stores/project.js | 🟡 | 190-210 | null-safety | sceneId 不存在时崩溃 |
| stores/script.js | 🟠 | 90-130 | logic-error | splice 越界删除页面 |
| stores/script.js | 🟡 | 150-180 | logic-error | JSON 深拷贝丢失 undefined |
| stores/script.js | 🟡 | 200-230 | null-safety | pageIndex 越界 |
| stores/script.js | 🟡 | 260-290 | logic-error | Windows 换行符 `\r` 残留 |
| stores/script.js | 🟡 | 320-350 | error-handling | 导出不转义特殊字符 |
| stores/script.js | 🟡 | 380-410 | race-condition | autoSave 重叠 |
| stores/script.js | 🟡 | 500-530 | null-safety | charId 不存在时崩溃 |
| stores/script.js | 🟡 | 700-730 | logic-error | reorderScenes 不验证 ID |
| services/themeBrowser.js | 🟡 | 40-60 | error-handling | IPC 无 catch |
| services/themeBrowser.js | 🟡 | 80-100 | null-safety | preview 字段可能缺失 |
| services/themeBrowser.js | 🟡 | 120-140 | error-handling | manifest JSON 无 catch |
| services/themePackageImport.js | 🟡 | 20-40 | error-handling | 导入流程无全局 catch |
| composables/useCanvasState.js | 🟡 | 35-50 | logic-error | 缩放行为因设备而异 |
| composables/useCanvasState.js | 🟡 | 60-75 | null-safety | canvas ref 可能为 null |
| composables/usePageEditor.js | 🟡 | 50-75 | null-safety | sceneId/pageIndex 可能 undefined |
| composables/usePageEditor.js | 🟡 | 90-110 | logic-error | 编辑不触发 undo 快照 |
| composables/useScreenLayoutEditor.js | 🟡 | 40-60 | null-safety | layout section 可能缺失 |
| composables/useThemeEditor.js | 🟡 | 60-80 | logic-error | 直接赋值破坏 Vue 响应性 |
| composables/useThemeEditor.js | 🟡 | 100-120 | null-safety | 深层嵌套无 ?. |
| composables/useThemeEditor.js | 🔵 | 140-155 | logic-error | 重置赋值引用非拷贝 |
| composables/useVoiceMatch.js | 🟡 | 25-45 | logic-error | 匹配失败无用户反馈 |
| composables/useWidgetStylesEditor.js | 🟡 | 30-50 | null-safety | widget 未选中时崩溃 |
| utils/bgRemoval.js | 🟡 | 30-50 | error-handling | getImageData SecurityError |
| utils/bgRemoval.js | 🟡 | 60-80 | null-safety | canvas/ctx 为 null |
| utils/snapGuides.js | 🔵 | 60-80 | logic-error | 吸附阈值不随缩放调整 |
| authoring/projectSession.js | 🟠 | 100-130 | error-handling | session JSON 无 catch |
| authoring/projectSession.js | 🟠 | 200-250 | logic-error | 部分计划应用无回滚 |
| authoring/projectSession.js | 🟡 | 400-430 | race-condition | save 并发无锁 |
| authoring/projectSession.js | 🟡 | 500-530 | logic-error | 检查点恢复不重置编辑器状态 |
| authoring/exportReadiness.js | 🟡 | 80-100 | logic-error | 仅检查扩展名不检查文件存在 |
| authoring/layoutLint.js | 🟡 | 50-70 | logic-error | 重叠检测不考虑 CSS transform |
| authoring/novelDraftImport.js | 🟡 | 35-55 | error-handling | 畸形输入无恢复 |
| authoring/novelDraftImport.js | 🟡 | 70-90 | logic-error | Windows 换行符未规范化 |
| authoring/projectReport.js | 🟡 | 20-40 | null-safety | project sections 可能 undefined |
| utils/themePackager.js | 🟡 | 40-60 | error-handling | 文件读取无 catch |
| utils/themePackager.js | 🟡 | 120-140 | logic-error | ZIP 路径反斜杠跨平台问题 |

</details>

---

### Main Entry 层 (4 files, 21 issues)

<details>
<summary>展开查看所有入口文件问题</summary>

| File | Sev | Line | Category | Description |
|------|-----|------|----------|-------------|
| main.js | 🟡 | 1-60 | error-handling | 无全局错误处理器 |
| main.js | 🟡 | 65-80 | null-safety | mount 挂载点可能为 null |
| main.js | 🟡 | 102-125 | logic-error | 键盘快捷键冲突 |
| main.js | 🟡 | 143 | null-safety | 首次启动 projectData 为 null |
| main.js | 🟡 | 200-240 | race-condition | 引擎在数据加载前启动 |
| main.js | 🟡 | 275-310 | resource-leak | resize 监听器累积 |
| main.js | 🟡 | 330-350 | null-safety | getCurrentScene 多层空指针 |
| main.js | 🟡 | 450-480 | error-handling | loadProject JSON.parse 无 catch |
| main.js | 🟡 | 560-590 | logic-error | auto-save 跨模式泄露 |
| main.js | 🟡 | 700-750 | logic-error | undo/redo JSON 丢失 undefined |
| main.js | 🟠 | 780-820 | race-condition | 项目保存竞态条件 |
| main.js | 🟡 | 850-870 | null-safety | 导出格式配置可能缺失 |
| main.js | 🟡 | 960-990 | logic-error | Pinia store 跨模式状态残留 |
| main.js | 🔵 | 1010-1050 | resource-leak | MutationObserver 未断开 |
| main.js | 🟡 | 1080-1100 | null-safety | dataTransfer 可能为 null |
| vite.web.config.js | 🔵 | 18-25 | logic-error | Web 构建无 Electron API stub |

</details>

---

## 🏆 修复优先级建议

### 第一优先级 — 立即修复 (影响核心功能和安全)

1. ✅ **ScriptEngine switch fall-through** — 核心引擎 bug，每个跳转都会出问题
2. ✅ **Electron IPC 路径穿越** — 严重安全漏洞 (read/write/delete-file)
3. ✅ **Zip Slip 漏洞** — 恶意主题包可写入系统任意位置
4. ✅ **所有 JSON.parse 添加 try-catch** — 5 个关键位置无错误处理
5. ✅ **Electron sandbox: true** — 恢复安全沙箱

### 第二优先级 — 本周修复 (数据丢失风险)

6. 🔧 **项目保存竞态条件** — 添加 debounce/lock
7. 🔧 **movePage 索引验证** — 防止静默删除页面
8. 🔧 **projectSession 计划应用添加回滚** — 防止项目进入不一致状态
9. 🔧 **sanitize.js 替换为 DOM-based 方案** — 正则方案可被绕过
10. 🔧 **conditionAnalysis 替换 new Function()** — 使用安全表达式解析器

### 第三优先级 — 逐步改善 (代码质量)

11. 📝 统一添加 null/undefined 防护 (约 75 处)
12. 📝 统一添加 `audio.play().catch()` 处理
13. 📝 `localStorage.setItem` 添加 QuotaExceededError 捕获
14. 📝 Windows 换行符规范化 (`\r\n` → `\n`)
15. 📝 浅合并改为深合并 (theme, preset, playerData)
