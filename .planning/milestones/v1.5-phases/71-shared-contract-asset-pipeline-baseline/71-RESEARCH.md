# Phase 71: 共享契约与资产通路基线 - Research

**Researched:** 2026-04-23  
**Domain:** UI 图片共享契约、标准资源写入、扫描/导出基线  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### 资产所有权与标准写入
- **D-01:** v1.5 新增或经用户重新设置的 UI 图片字段，一律通过标准选图流程写入：**复制文件到 `assets/ui/`，配置中只记录项目相对路径**。
- **D-02:** Phase 71 锁定的输入格式只有 **PNG / WebP / JPEG**；不为 SVG、GIF、视频帧或其他格式扩 scope。
- **D-03:** Phase 71 不接受“自由文本路径仍是主入口”的方案；标准路线必须建立在现有 `assets` store / IPC 资产导入能力之上，而不是继续扩散手填路径。

### 兼容读入与迁移边界
- **D-04:** 旧项目中的旧路径字符串与旧 base64 UI 图片字段必须继续 **可读、可运行、不崩**，但它们在本阶段仍视为 legacy input，不作为新的标准写法。
- **D-05:** **不做静默自动迁移。** 旧字段只有在用户显式通过标准选图流程重新设置后，才改写为 `assets/ui/` 下的项目相对路径。
- **D-06:** Phase 71 不把“待迁移徽章 / 确认弹窗 / 迁移向导”作为必须交付；如果后续 planning 认为需要轻量提示，可以作为 planner discretion，而不是本阶段硬 requirement。

### 共享 contract 与 ownership 边界
- **D-07:** 本阶段应新增或冻结一个 **shared UI image contract / registry** 入口，统一管理 path normalization、slot key、legacy read helpers 与 scan/export field registry，避免字段名散落在 editor / runtime / export 各处。
- **D-08:** schema 方向先锁定为：**跨界面复用资源放 `ui.theme`，表面对话框资源放 `ui.dialogueBox`，screen 级图片资源放 `ui.<screen>.chrome`**；Phase 71 先定 contract，不要求一次做完所有 surface DOM/preview。
- **D-09:** 继续复用既有 owner：资产导入走 `src/editor/stores/assets.js`，theme 预览走 `useThemeEditor.js`，screen 预览走 `useScreenLayoutEditor.js` / `main.js`；禁止为 v1.5 再造第二套资产流或本地假预览。

### Scan / export 基线
- **D-10:** Phase 71 负责把 **UI 图片字段扫描方式** 先集中化、注册化，确保后续 Phase 72-75 新增字段时有统一接入口；但完整的 preview/runtime/export parity gate 仍由 Phase 75 收口。
- **D-11:** `scanAssets()` 的 UI 图片扩展必须采用 **registry / helper 驱动**，而不是继续在函数里散落 `if (cfg.xxx)`；否则随着对话框、按钮族、screen chrome 扩面会再次漏字段。
- **D-12:** `.gmtheme` / `themePackager` 现有 base64 打包模型本阶段只需被纳入 canonical refs 和风险边界，不在 Phase 71 内重做格式升级。

### the agent's Discretion
- shared contract 的具体文件名（例如 `src/shared/uiImageContract.js`）与 helper 拆分粒度
- 标准选图流程最终复用 `selectAsset()`、`importAssets()` 还是二者组合的具体交互顺序
- legacy read helper 放在 shared contract、assetPath helper，还是更贴近各 consumer 的适配层
- scan/export registry 的 API 形式（静态数组、对象映射或 traversal helper）

### Deferred Ideas (OUT OF SCOPE)
- legacy 字段“待迁移”徽章、确认弹窗或迁移面板 —— 可以作为后续 UX polish，但不是本阶段硬边界
- `.gmtheme` 格式升级、图片资产打包 / 分享 / 社区流 —— 留到后续 milestone
- 对话框图片层 DOM、按钮族 selected/disabled 行为、major screen decorations —— 分别留到 Phase 72-74
- cursor / icon slots 的最终运行时接线与全链路 parity gate —— 留到 Phase 75
- 静默 bulk migration、一次性清洗所有旧字段 —— 明确不纳入本阶段
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AST-01 | 用户选取 UI 图片时，编辑器会将文件复制到 `assets/ui/`，并在项目配置中只记录项目相对路径 | 复用 `useAssetStore().selectAsset(['ui'])` + Electron `select-asset` 现有复制能力；新增 shared contract 统一 canonical path |
| AST-02 | 用户可以导入 PNG / WebP / JPEG 作为 UI 图片资源 | `electron/main.js` 已对 `ui` 分类限制 `png/jpg/jpeg/webp`；Phase 71 只需把标准 UI 图片入口全部收口到该流程 |
| AST-05 | 旧项目中的旧路径或旧 base64 UI 图片配置仍可被读取并正常运行，不会导致项目损坏或运行时崩溃 | 兼容读保留原值；`resolvePath()` 已可读旧路径/URL/data URL；NineSlice 需补 `resolvePath()` 注入以支持 canonical 相对路径且不破坏旧 data URL |
| AST-06 | 当用户通过 v1.5 的标准选图流程重新设置旧字段时，新值按 AST-01 写入 `assets/ui/` 并记录为项目相对路径 | 所有 legacy 写入口改为统一 UI 图片选择 helper；仅显式重选时规范化，不做静默迁移 |
</phase_requirements>

## Summary

Phase 71 最小且安全的落点不是“先做所有 UI 图片表面”，而是先把 **一条可复用的 UI 图片引用规则** 钉死：新值统一写成 `ui/...` 这类相对 `assets/` 根的 canonical path，旧值继续原样可读，只有用户显式重选时才改写。现有仓库已经具备最关键的基础：`assets.js` + Electron `select-asset` 已经能把外部文件复制到 `assets/ui/` 并返回相对路径；screen/runtime preview 也已有 owner，不需要新增依赖或第二套资产系统。

当前最危险的问题不是“功能还没做”，而是 **写法分裂**：`NineSliceModal.vue` 直接写 base64，多个 screen section 直接写文本路径，而 `ThemeManager.js` 又直接把 `config.src` 塞进 CSS，导致 canonical 相对路径一旦进入 nine-slice 就会失效。与此同时，`scanAssets.js` 仍是旧的 5 类返回值，没有为 UI 图片建立独立 registry，后续 Phase 72-75 每多一批字段就会继续漏扫。

**Primary recommendation:** 本阶段只做一条主线：新增 shared UI image contract/registry，先把 editor 写入、ThemeManager 读取、scan/export 注册三处统一，再把 surface rollout 和 `.gmtheme` 收口明确留给后续 phase。

## Project Constraints (from copilot-instructions.md)

- 保持 **JavaScript ES Modules + Vue 3 + Electron**，**不迁移 TypeScript**。
- JS import 保持显式 `.js` 扩展名。
- JS 模块继续使用 **named exports**，不引入 default export。
- 保持现有代码风格：2 空格缩进、分号、单引号。
- renderer 不直接做文件系统写入；项目文件/资源导入继续走 `window.ipcRenderer.invoke(...)`。
- 继续遵守现有安全模式：路径必须留在项目目录内，样式值继续走 sanitize/clamp 边界。
- 继续使用 **runtime-backed iframe preview**，不要做 editor-only 假预览。

## Recommended Approach

### 最小安全共享契约设计

推荐新增一个单文件 shared contract，例如 `src/shared/uiImageContract.js`，只放四类内容：

1. **canonical path 规则**
   - 新写入值必须是相对 `assets/` 根的字符串，如 `ui/frame.png`
   - 不写 `assets/ui/frame.png`
   - 不写绝对路径
   - 不写 data URL

2. **legacy 读辅助**
   - 判定空值 / canonical 值 / legacy path / legacy data URL
   - 只做“识别与保留”，不做静默迁移

3. **slot / surface 常量**
   - `UI_THEME_ROOT = 'ui.theme'`
   - `UI_DIALOGUE_ROOT = 'ui.dialogueBox'`
   - `UI_SCREEN_IDS = ['saveLoadScreen', 'backlogScreen', 'gameMenu', 'settingsScreen']`
   - 只冻结根和当前已存在 surface key，不提前硬编码未来所有 Phase 72-75 字段

4. **scan/export registry**
   - 导出一个 registry 数组，每项是 collector function
   - `scanAssets()` 只循环 registry，不再继续堆散落的 `if (cfg.xxx)`

### Editor 写入策略

- **单图字段**：统一走 `assets.selectAsset(['ui'])`
- **现有文本路径入口**：改为“选择图片 / 清除”主操作，文本仅做只读展示或兼容显示
- **旧值显示**：允许继续显示 legacy path/data URL，但用户一旦重选，就保存为 canonical path
- **不新增第二套 picker**：不做新资源系统，不做复杂图库 redesign

### Runtime / Preview 读取策略

- 所有 UI 图片 consumer 都以“原值保留 + 最终 resolve”方式读取
- `ThemeManager.js` 必须改成对 nine-slice `src` / `states.hover.src` / `states.active.src` 调用 `resolvePath()`
- screen 类已经大多使用 `resolvePath()`；Phase 71 重点是补齐 nine-slice 这条漏口

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| JavaScript ESM | ES Modules | Phase 71 全部 shared/helper/runtime 改动 | 项目明确锁定 JS，不迁移 TS |
| Vue 3 | repo `^3.5.31` / latest `3.5.33` (2026-04-22) | 编辑器组件与 composable | 现有编辑器主栈，足够承载轻量 UI 图片选择收口 |
| Pinia | repo `^3.0.4` / latest `3.0.4` (2025-11-05) | `assets` / `script` store | 现有 editor state owner，避免新增状态层 |
| Electron | repo `^41.0.4` / latest `41.2.2` (2026-04-21) | 资产导入 IPC、文件复制、项目目录安全 | `select-asset` 已具备 Phase 71 所需能力 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite | repo `^6.3.0` / latest `8.0.9` (2026-04-20) | 构建 editor/runtime | 本 phase 不升级，只维持现有构建 |
| Vitest | repo `^4.1.4` / latest `4.1.5` (2026-04-21) | jsdom 单测 | 适合 ThemeManager / UI section / flow helper 测试 |
| node:test | Node v24.13.1 内置 | 纯函数测试 | 适合 shared contract / scan registry |
| fflate | repo `^0.8.2` / latest `0.8.2` (2024-02-07) | themePackager 边界参考 | 本 phase 只标注风险，不扩 scope |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 复用 `assets` store + IPC | 新建 UI 图片资产系统 | 没必要，重复 owner，违反 D-09 |
| registry-driven scan | 继续在 `scanAssets()` 里堆 `if` | 短期快，后续 72-75 必漏字段 |
| runtime iframe preview | editor 本地假预览 | 会再次产生 preview/runtime 分叉 |

**Installation:**
```bash
# 无新增依赖
```

**Version verification:** 已通过 `npm view electron/vue/pinia/vite/vitest/fflate version` 检查当前 registry 版本与日期；Phase 71 不建议顺手升级依赖。

## Touched Files

### 必改
| File | Why touch | Recommended change |
|------|-----------|-------------------|
| `src/shared/uiImageContract.js` *(new)* | 共享契约入口 | 放 canonical path、legacy 判定、scan registry |
| `src/editor/components/theme/NineSliceModal.vue` | 当前直接写 base64 data URL | 改为标准选图流程写 `ui/...`；保留 slice/state UI |
| `src/engine/ThemeManager.js` | 当前 nine-slice CSS 直接使用原始 `src` | 对所有 nine-slice 图片统一 `resolvePath()` |
| `src/engine/scanAssets.js` | 当前无 UI 图片 registry / 无 `ui` bucket | 改为 registry 驱动并返回 UI 图片集合 |
| `electron/exportGame.js` | 当前不复制 UI 图片 bucket | 纳入 `assetDict.ui` |
| `electron/exportDesktop.js` | 同上 | 纳入 `assetDict.ui` |

### 应改（legacy 写入口）
| File | Current legacy write path | Replace with |
|------|---------------------------|--------------|
| `src/editor/components/layout/DecorationSection.vue` | `deco.src` 文本输入直写 | 统一 UI 图片选择 helper |
| `src/editor/components/layout/PanelBackgroundSection.vue` | `settingsScreen.background` 文本输入直写 | 统一 UI 图片选择 helper |
| `src/editor/components/layout/BacklogSection.vue` | `backgroundImage` / `header.backgroundImage` 文本输入直写 | 统一 UI 图片选择 helper |
| `src/editor/components/layout/GameMenuSection.vue` | `backgroundImage` 文本输入直写 | 统一 UI 图片选择 helper |
| `src/editor/components/layout/SaveLoadSection.vue` | `background` / `header.backgroundImage` 文本输入直写 | 统一 UI 图片选择 helper |

### 边界确认，不宜扩做
| File | Boundary |
|------|----------|
| `src/editor/components/DialogueBoxSettings.vue` | 当前只做字体与本地 mini preview；Phase 71 不应顺手做对话框图片 DOM rollout |
| `src/main.js` | 现有 `update-theme` / `update-screen-layout` owner 已够用；除必要接线外不要扩成 surface rollout |
| `src/utils/themePackager.js` | 当前仍以 data URL 主题包为前提；只标注风险，不做格式重构 |
| `src/editor/stores/assets.js` | 现有 API 已够；尽量通过 helper 包装复用，而不是重写 store |

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── shared/
│   └── uiImageContract.js      # canonical path / legacy read / scan registry
├── editor/
│   └── ...                     # 现有 section 只改写入入口
├── engine/
│   ├── ThemeManager.js         # nine-slice resolvePath 接线
│   └── scanAssets.js           # registry-driven UI image scan
└── ui/
    └── ...                     # 本 phase 不做大面积 DOM rollout
```

### Pattern 1: Canonical UI Image Ref
**What:** 所有新写入 UI 图片统一保存为 `ui/...` 相对路径。  
**When to use:** 用户通过 v1.5 标准选图重新设置任一 UI 图片字段时。  
**Example:**
```javascript
const relPath = await assets.selectAsset(['ui']);
if (!relPath) return;
target.src = relPath; // e.g. "ui/dialogue-frame.png"
```
Source: `src/editor/stores/assets.js`, `electron/main.js`

### Pattern 2: Legacy Read, Explicit Rewrite
**What:** 读取时保留旧值，写入时只在显式重选后规范化。  
**When to use:** 旧项目打开、预览、运行、保存再打开。  
**Example:**
```javascript
if (isLegacyUiImageValue(currentValue)) {
  // read as-is
  preview(currentValue);
}

const relPath = await assets.selectAsset(['ui']);
if (relPath) {
  fieldValue = relPath; // rewrite only after explicit user action
}
```
Source: `71-CONTEXT.md`, `src/engine/assetPath.js`

### Pattern 3: Registry-Driven Scan
**What:** 所有 UI 图片扫描入口集中到 registry。  
**When to use:** `scanAssets()`、exportGame、exportDesktop。  
**Example:**
```javascript
const ui = new Set();
for (const collect of UI_IMAGE_SCAN_REGISTRY) {
  collect(script, (path) => _add(ui, path));
}
```
Source: recommended extension of `src/engine/scanAssets.js`

### Anti-Patterns to Avoid
- **Nine-slice raw CSS URL:** 继续 `url("${config.src}")` 直接写入，会让 `ui/...` 相对路径失效。
- **文本路径仍做主入口:** 会继续把绝对路径、临时路径、错目录路径写回 script。
- **提前做全部 surface schema:** 本 phase 只冻结 contract/root/registry，不铺所有 DOM 图片层。
- **顺手改 `.gmtheme` 语义:** 会把 Phase 71 拉成包格式升级，不再是“基线 phase”。

## Exact Legacy Write Paths

### 已确认的 legacy 写入口

1. **`NineSliceModal.vue`**
   - `onImageUpload()` 使用 `FileReader.readAsDataURL()`
   - 直接写入 `theme.nineSlice[key].src`
   - 以及 `theme.nineSlice[key].states[state].src`
   - 这是当前最明确的 **base64 legacy write path**

2. **`DecorationSection.vue`**
   - `onFieldInput(idx, 'src', ...)` 直接写 `header.decorations[idx].src`

3. **`PanelBackgroundSection.vue`**
   - `onBgImage()` 直接写 `settingsScreen.background`

4. **`BacklogSection.vue`**
   - `onField('backgroundImage', ...)`
   - `onNested('header', 'backgroundImage', ...)`

5. **`GameMenuSection.vue`**
   - `onField('backgroundImage', ...)`

6. **`SaveLoadSection.vue`**
   - `onField('background', ...)`
   - `onNested('header', 'backgroundImage', ...)`

### 替换原则

- 这些入口都不应再把 `<input type="text">` 当主写入路径
- 最小替换不是重做整个 section，而是把“写图片字段”收口到一个共用 helper：
  - `pickUiImage(fieldSetter)`
  - `clearUiImage(fieldSetter)`
  - 可选 `displayUiImageValue(value)` 用于 legacy 展示

## Don’t Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UI 图片导入 | 新 IPC / 新文件复制流程 | `useAssetStore().selectAsset(['ui'])` | 已自带复制进 `assets/ui/` + 返回相对路径 |
| 运行时路径拼接 | 每个 consumer 自己拼 `asset://` | `resolvePath()` | 已覆盖 preview/electron/web/desktop 四环境 |
| 预览 owner | 新 preview 通道 | `useThemeEditor` / `useScreenLayoutEditor` / `main.js` 现有 postMessage | 已验证的 runtime-backed 流程 |
| 扫描扩面 | 深递归猜路径 / 硬编码 if 链 | shared registry collector | 更容易维护 phase 72-75 扩面 |
| 主题包收口 | 顺手重写 `.theme` / `.gmtheme` | 明确 deferred | 否则 phase 71 失控 |

**Key insight:** Phase 71 不需要“更强的系统”，只需要把已经存在的 asset import、runtime resolve、preview owner 三套能力接成同一条规则。

## What Phase 71 Can Finish vs Defer

### Phase 71 可现实完成

| Area | Complete in Phase 71 | Why safe |
|------|----------------------|----------|
| Shared contract | canonical path / legacy 判定 / registry 入口 | 纯结构收口，不依赖 surface rollout |
| Standard write flow | 把已知 legacy 写入口改成统一选图 | 只改写法，不改视觉功能 |
| Theme nine-slice runtime read | `ThemeManager` 改为 `resolvePath()` | 当前唯一阻断 canonical path 的 runtime 漏口 |
| Scan/export foundation | `scanAssets()` 新增 UI 图片 registry + `ui` bucket，导出纳入复制 | 后续 phase 只追加 registry 项 |
| Focused tests | contract / ThemeManager / scan registry / 写入 helper | 都是 Phase 71 边界内可验证内容 |

### 明确 defer 到后续

| Deferred to | Do not finish in Phase 71 |
|-------------|---------------------------|
| Phase 72 | 对话框图片层 DOM、名牌背景图、装饰层 runtime 呈现 |
| Phase 73 | 按钮族 normal/hover/pressed/selected 图片态扩面 |
| Phase 74 | 四大 major screen 背景图/装饰层全面 rollout |
| Phase 75 | cursor/icon slots、preview/runtime/export parity gate、fallback 完整审计 |
| Later | `.gmtheme` / themePackager 相对路径资产打包升级 |

## Sequencing Risks

### Risk 1: 先改 editor 写入、后补 runtime 解析
**What goes wrong:** `NineSliceModal` 一旦开始写 `ui/...`，当前 `ThemeManager` 会直接把相对路径塞进 CSS，预览立刻坏。  
**How to avoid:** `ThemeManager.js` 与 `NineSliceModal.vue` 必须同一 wave。

### Risk 2: 先加 scan registry、但 export pipeline 不消费新 bucket
**What goes wrong:** `scanAssets()` 看起来“支持 UI 图片”，导出仍然不复制。  
**How to avoid:** `scanAssets.js`、`exportGame.js`、`exportDesktop.js` 和测试同一波提交。

### Risk 3: 把 themePackager 一起拖进来
**What goes wrong:** scope 爆炸，Phase 71 从“路径与注册表”变成“主题包格式升级”。  
**How to avoid:** 只记录边界和风险，不承诺在本 phase 解决 theme export/import。

### Risk 4: 一次性设计未来全部 slot schema
**What goes wrong:** planner 把 contract phase 做成 Phase 72-75 的总实现。  
**How to avoid:** 只冻结 root、path rule、registry API，不一次列完所有 future slot field。

## Implementation Order

1. **Wave 1 — shared contract + tests**
   - 新增 `src/shared/uiImageContract.js`
   - 补纯函数测试
   - 冻结 canonical / legacy / registry API

2. **Wave 2 — nine-slice打通标准写入**
   - 改 `NineSliceModal.vue` 从 base64 写入切到 `selectAsset(['ui'])`
   - 同步改 `ThemeManager.js` 用 `resolvePath()`
   - 验证 preview/runtime 不坏

3. **Wave 3 — 收口 legacy 文本写入口**
   - 逐个替换 `DecorationSection.vue` / `PanelBackgroundSection.vue` / `BacklogSection.vue` / `GameMenuSection.vue` / `SaveLoadSection.vue`
   - 只改图片字段，不扩 UI surface

4. **Wave 4 — scan/export foundation**
   - `scanAssets.js` 接 registry + `ui` bucket
   - `exportGame.js` / `exportDesktop.js` 消费新 bucket
   - 扩展 focused tests

5. **Wave 5 — manual compatibility sweep**
   - legacy 值仍可读
   - 重选后改写为 canonical path
   - 保存/重开不回写绝对路径

## Common Pitfalls

### Pitfall 1: `ThemeManager` 是当前 canonical path 的真实断点
**What goes wrong:** 以为 `resolvePath()` 已经全仓可用，于是只改 editor 写入。  
**Why it happens:** screen 类大多已经 resolve，nine-slice 例外。  
**How to avoid:** 把 `ThemeManager.js` 视为 Phase 71 主文件之一。  
**Warning signs:** nine-slice 预览仅在 data URL 下工作，换成 `ui/...` 后失效。

### Pitfall 2: “兼容读”被误做成“静默迁移”
**What goes wrong:** 打开旧项目就被批量改写。  
**Why it happens:** 想顺手清理 legacy 值。  
**How to avoid:** 只在用户显式重选后改写。  
**Warning signs:** 旧项目未操作任何图片字段却出现大量 script.json diff。

### Pitfall 3: scan foundation 只覆盖 touchpoint，漏掉现有 runtime 字段
**What goes wrong:** settings structured header decorations / tab icons / widget panel image 等继续导出丢图。  
**Why it happens:** 只盯住 phase touchpoint，没回看现有 runtime 已支持字段。  
**How to avoid:** registry 首版至少覆盖当前仓库已经能 `resolvePath()` 的 UI 图片字段。  
**Warning signs:** 编辑器预览有图，导出静态包缺图。

### Pitfall 4: 对 legacy base64 的支持范围说得过大
**What goes wrong:** 承诺所有 UI 图片字段都支持 base64 旧值。  
**Why it happens:** AST-05 写的是“旧 base64 UI 图片字段”，但仓库里明确存在的是 nine-slice 写法。  
**How to avoid:** 把 base64 兼容明确限定到历史上确实写过 data URL 的字段。  
**Warning signs:** screen image 字段试图喂 data URL，却被 `sanitizeCssValue()` 拒绝。

## Code Examples

Verified patterns from repository:

### 标准 UI 图片选择写入
```javascript
// Based on src/editor/stores/assets.js + electron/main.js
async function rewriteUiImageField(setter, assets) {
  const relPath = await assets.selectAsset(['ui']);
  if (!relPath) return false;
  setter(relPath); // canonical: "ui/..."
  return true;
}
```

### Nine-slice runtime 读取
```javascript
// Recommended for src/engine/ThemeManager.js
import { resolvePath } from './assetPath.js';

const src = resolvePath(config.src);
const hoverSrc = resolvePath(config.states?.hover?.src);
```

### Registry-driven scan
```javascript
// Recommended for src/engine/scanAssets.js
const ui = new Set();
for (const collect of UI_IMAGE_SCAN_REGISTRY) {
  collect(script, (value) => _add(ui, value));
}
return {
  backgrounds: [...bg].sort(),
  audio: [...audio].sort(),
  fonts: [...fonts].sort(),
  characters: [...chars].sort(),
  voices: [...voices].sort(),
  ui: [...ui].sort(),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 手填路径 / data URL 直接写入各字段 | shared contract + canonical `ui/...` path | Phase 71 | 写法统一，兼容边界清楚 |
| `ThemeManager` 直接吃原始 `src` | 统一通过 `resolvePath()` | Phase 71 | preview/runtime 可读 canonical path |
| `scanAssets()` 固定 5 类手写遍历 | registry-driven UI image collectors | Phase 71 | 72-75 只追加 registry，不重构扫描器 |

**Deprecated/outdated:**
- `NineSliceModal.vue` 内 `FileReader.readAsDataURL()` 作为项目持久化主路径
- screen section 图片字段以文本输入作为主入口

## Open Questions

1. **themePackager 对 canonical `ui/...` nine-slice 的处理何时收口？**
   - What we know: 当前 `themePackager.js` 主要按 data URL 打包；relative path 不会被自动嵌入 ZIP
   - What's unclear: Phase 71 后导出主题包是否允许带有未嵌入的 project-relative 引用
   - Recommendation: 本 phase 只明确边界并在 planning 中把 theme package 兼容列为非 gate 风险，不并入主实现

2. **首版 scan registry 是否覆盖所有既有 UI image consumer？**
   - What we know: 除 touchpoint 外，`SettingsScreen.js`、`GameMenu.js`、`TabWidget.js`、`PanelWidget.js` 已存在更多图片字段
   - What's unclear: planner 是要做“只覆盖本 phase touchpoint”还是“覆盖所有已存在 runtime 字段”
   - Recommendation: 以“当前 runtime 已支持的 UI 图片字段全部纳入 registry”为准，这仍属于 foundation，不属于 surface rollout

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests / build helpers | ✓ | v24.13.1 | — |
| npm | package execution | ✓ | 11.11.1 | — |
| Vitest | jsdom focused tests | ✓ | 4.1.4 | node:test for pure modules |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + node:test (Node v24.13.1) |
| Config file | `vitest.config.js` |
| Quick run command | `node --test tests/scanAssets.test.js tests/decorLayoutEditor.test.js && npx vitest run tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js tests/dialogueBoxNameplate.test.js` |
| Full suite command | `node --test tests/scanAssets.test.js tests/decorLayoutEditor.test.js tests/uiImageContract.test.js && npx vitest run tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js tests/dialogueBoxNameplate.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AST-01 | 选图后复制到 `assets/ui/` 且写入 canonical 相对路径 | unit + focused integration | `npx vitest run tests/uiImageFieldFlow.test.js` | ❌ Wave 0 |
| AST-02 | 仅允许 PNG/WebP/JPEG 作为 UI 图片入口 | unit + manual smoke | `npx vitest run tests/uiImageFieldFlow.test.js` | ❌ Wave 0 |
| AST-05 | 旧路径 / nine-slice data URL 仍可读取 | unit | `npx vitest run tests/themeManagerUiImage.test.js` | ❌ Wave 0 |
| AST-06 | 显式重选后 legacy 值改写为 canonical path | unit + focused integration | `npx vitest run tests/uiImageFieldFlow.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/scanAssets.test.js && npx vitest run tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js`
- **Per wave merge:** `node --test tests/scanAssets.test.js tests/uiImageContract.test.js && npx vitest run tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js`
- **Phase gate:** Focused gate green；不要把 repo-wide `npx vitest run` 的历史失败混入 Phase 71 closure

### Wave 0 Gaps
- [ ] `tests/uiImageContract.test.js` — 覆盖 canonical path / legacy 判定 / registry helper
- [ ] `tests/themeManagerUiImage.test.js` — 覆盖 nine-slice `resolvePath()` 与 legacy data URL 兼容
- [ ] `tests/uiImageFieldFlow.test.js` — 覆盖 editor 选图改写流程
- [ ] `tests/scanAssets.test.js` — 从 5-key 输出扩到 UI 图片 registry 覆盖

## Sources

### Primary (HIGH confidence)
- `E:\projects\my-awesome-project\.planning\ROADMAP.md` — Phase 71 goal / success criteria
- `E:\projects\my-awesome-project\.planning\REQUIREMENTS.md` — AST-01 / AST-02 / AST-05 / AST-06
- `E:\projects\my-awesome-project\.planning\PROJECT.md` — v1.5 边界与技术约束
- `E:\projects\my-awesome-project\.planning\STATE.md` — 当前 phase 顺序与风险说明
- `E:\projects\my-awesome-project\.planning\research\SUMMARY.md` — 里程碑架构结论
- `E:\projects\my-awesome-project\.planning\phases\71-shared-contract-asset-pipeline-baseline\71-CONTEXT.md` — 本 phase 锁定决策
- `E:\projects\my-awesome-project\src\editor\stores\assets.js` — 标准资产导入/选择 owner
- `E:\projects\my-awesome-project\electron\main.js` — `select-asset` / `import-assets` / UI category filter
- `E:\projects\my-awesome-project\src\engine\ThemeManager.js` — nine-slice 当前读取方式
- `E:\projects\my-awesome-project\src\engine\scanAssets.js` — 当前扫描边界
- `E:\projects\my-awesome-project\electron\exportGame.js` / `electron\exportDesktop.js` — 导出复制逻辑
- `E:\projects\my-awesome-project\src\engine\assetPath.js` — 运行时路径解析与 legacy pass-through
- `E:\projects\my-awesome-project\src\editor\components\theme\NineSliceModal.vue` — base64 legacy 写入口
- `E:\projects\my-awesome-project\src\editor\components\layout\DecorationSection.vue`
- `E:\projects\my-awesome-project\src\editor\components\layout\PanelBackgroundSection.vue`
- `E:\projects\my-awesome-project\src\editor\components\layout\BacklogSection.vue`
- `E:\projects\my-awesome-project\src\editor\components\layout\GameMenuSection.vue`
- `E:\projects\my-awesome-project\src\editor\components\layout\SaveLoadSection.vue`

### Secondary (MEDIUM confidence)
- `E:\projects\my-awesome-project\src\ui\SettingsScreen.js` — 现有更多 UI 图片 consumer，说明 registry 首版不应只看 touchpoint
- `E:\projects\my-awesome-project\src\ui\widgets\PanelWidget.js`
- `E:\projects\my-awesome-project\src\ui\widgets\TabWidget.js`
- `npm view electron/vue/pinia/vite/vitest/fflate version` — 版本核对

### Tertiary (LOW confidence)
- `E:\projects\my-awesome-project\src\utils\themePackager.js` — Phase 71 与 canonical path 的包兼容仍有未决边界

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 全部基于仓库现状与 npm registry 核对，无新增依赖
- Architecture: HIGH - owner、触点、顺序都能从现有代码直接验证
- Pitfalls: HIGH - 主要风险已由实际代码断点（NineSlice base64、ThemeManager raw src、scanAssets 5-key contract）支持

**Research date:** 2026-04-23  
**Valid until:** 2026-05-23
