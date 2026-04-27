# Phase 81: Golden Theme 验收样板 - Research

**Researched:** 2026-04-27  
**Domain:** full-theme contract 扩边（含 titleScreen）+ golden baseline 交付链路  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 用户明确要求 golden theme 是一套 **完整的整体 UI/UX 美术与方案**，范围包含 `title screen`，而不只是当前 frozen full-theme contract 的 7 个 theme-owned UI area。
- **D-02:** Phase 81 必须把“当前 contract 不含 title screen”视为本 phase 需要对齐的真实边界，而不是把 title 排除在 golden theme 验收之外。
- **D-03:** golden theme 的验收口径是“游戏内容之外主要 UI 面整体交付感”，不是“只要 package contract 满足现有 7 项 coverage 就算完成”。
- **D-04:** 推荐以现有 **`wafuu`** 作为 golden baseline，而不是在本 phase 凭空新开一套完全陌生的主题方向；原因是它是当前唯一明确被标注为 full-like、且已经带有九宫格/界面布局倾向的 built-in theme。
- **D-05:** 以 `wafuu` 为 baseline 不等于只做小修小补；planner 应把它视为“升格为成品样板”，补齐 title 与其余非内容 UI 的整体艺术一致性。
- **D-06:** 其他 built-in themes 目前更像配色/控件风格变体，不应与 golden theme 一样要求在本 phase 达到相同成品度。
- **D-07:** Phase 81 继续复用 Phase 78-80 已经冻结的 browser / install / apply / export / import 路线；不得为了 golden theme 再造第二条链路。
- **D-08:** Phase 81 允许为 title screen 纳入 golden theme 范围而扩展现有 contract / browser / export surfaces，但扩展必须服从现有 shared theme package ownership，而不是旁挂一套 title-only 特例系统。
- **D-09:** golden theme 的浏览器呈现仍然使用 Phase 80 的统一主题浏览器；title 被纳入后，浏览器中的 coverage / impact / 完整度说明也必须反映这次扩边。
- **D-10:** golden theme 应用后必须在编辑器预览、保存/重开、试玩、导出产物、重新导入后保持一致，不允许出现 title 或其他 major UI 面掉图、回退到默认态、或局部 contract 漂移。
- **D-11:** Phase 81 的核心不是“先做一张好看的图”，而是让 **一套完整美术方案** 穿过整条 v1.6 delivery pipeline 并保持一致。
- **D-12:** planner 应将 title 纳入 requirement / validation / verification 证据链，而不是只在实现里顺手支持、文档里却继续按旧 coverage 写法验收。

### the agent's Discretion
- `wafuu` 升格时是保留现有和风方向还是对细节做中度重塑，只要仍能作为第一套 shipped golden theme 即可
- title screen 与其他 UI 面的具体视觉连接方式（字体、饰件、按钮语言、背景/边框母题）
- browser 中如何展示“这套 theme 额外覆盖 title screen”的 copy 与 badge，只要不弱化已锁定状态语义

### Deferred Ideas (OUT OF SCOPE)
- 剩余 4 套完整主题的量产、风格矩阵与主题库扩展 —— Phase 82
- 主题商店、社区共享、远程仓库等主题分发能力 —— 不属于 Phase 81
- 新的 preview runtime 或新的 package format —— 不属于本 phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THM-01 | 产品先交付 1 套 golden theme，完整覆盖 v1.6 定义的主题覆盖面，并用它验证导入、应用、保存、重开和导出的整链路 | 本研究给出 `titleScreen` 扩边合同、built-in/imported 共线路径、browser badge/coverage 调整、wafuu baseline uplift、以及需扩展的测试闭环 |
</phase_requirements>

## Summary

Phase 81 不是单纯“给 `wafuu` 加一张 title 图”，而是把当前 **7-key full-theme contract** 升级为真正能承载 golden theme 验收的 **8-key contract**。仓库里的关键事实很明确：`src/shared/themePackageContract.js`、`electron/themePackageInstaller.js`、`electron/themePackageExporter.js`、`src/editor/services/themeBrowser.js`、`src/editor/stores/script.js` 以及对应测试，全部都还把 full theme 当成 `theme / widgetStyles / dialogueBox / saveLoadScreen / backlogScreen / gameMenu / settingsScreen` 这 7 个 owner surface；`titleScreen` 目前只存在于 runtime/editor 能力里，还不在 theme package ownership 里。

最稳妥的实现方向是：**把 `titleScreen` 变成现有 full-theme contract 的第 8 个 coverage key，但只把 title 的“视觉字段”纳入 theme ownership，明确排除 `bgm`。** 这样可以继续复用 Phase 78-80 的 `.gmtheme` / preflight / install / apply / browser / export / import 路线，同时避免把 title BGM 这种非 UI 资源强行拖进图片主题包合同。对 Phase 81 来说，真正的技术工作量主要在“合同与管线对齐 + built-in golden baseline 可落地”两块，而不是 ThemeBrowserModal 或 TitleScreen runtime 能力本身。

**Primary recommendation:** 将 `titleScreen` 纳入现有 full-theme contract，但把 owner 范围限定为 `ui.titleScreen.background` + `ui.titleScreen.elements` 的视觉快照，保留现有 `bgm` 为非主题字段；随后用同一 `.gmtheme` 管线打通 built-in `wafuu` 的 title 覆盖、应用、保存/重开、导出、重导入和浏览器说明。

## Project Constraints (from copilot-instructions.md)

- 保持 **JavaScript (ES Modules) + Vue 3 + Electron**；**不要迁移到 TypeScript**。
- Windows 优先，但实现不能破坏 macOS 兼容。
- 编辑器/文案保持中文；样式保持暗色、纯 CSS。
- JS 模块继续使用 **named exports**，并保留显式 `.js` import 扩展名。
- 代码风格保持：2 空格缩进、分号、单引号。
- Renderer 不直接做文件系统写入；继续通过现有 Electron IPC 边界。
- 错误处理继续使用边界 `try/catch` + `{ success, error? }` 返回对象模式。
- 不要绕开既有 GSD workflow；Phase 81 规划应建立在现有 planning artifact 之上。

## Surface Map: 当前仍假定“旧 7-key full theme”的代码面

### Contract / pipeline surfaces
| File | Current assumption | Phase 81 required change |
|------|--------------------|--------------------------|
| `src/shared/themePackageContract.js` | `FULL_THEME_COVERAGE_KEYS` 只有 7 项；`detectCoverage()` 与 `collectThemeRefs()` 不看 title | 新增 `titleScreen` coverage key；新增 title visual ref 收集；title coverage 检测必须忽略 `bgm` |
| `src/shared/uiImageContract.js` | `collectUiImagePaths()` 不扫描 titleScreen 视觉资源 | 新增 title collector，收集 `ui.titleScreen.background` 与 `ui.titleScreen.elements[].src` 的 canonical `ui/...` 资源 |
| `electron/themePackageInstaller.js` | `OWNED_UI_KEYS` 只有 7 项；builtin branch 不复制任何 theme asset；`createBuiltInThemeUi()` 不产出 title | 新增 `titleScreen` ownership；builtin golden theme 若带真实资产，必须安装到项目内 `assets/ui/themes/<themeId>/...`，不能只回 bundle |
| `electron/themePackageExporter.js` | `OWNED_UI_KEYS` 只有 7 项；`extractThemeSnapshot()` 不导出 title；只收集现有 UI image contract 路径 | 导出 title visual snapshot；保留现有 `titleScreen.bgm` 不进包；把 title 视觉资源纳入 manifest/files |
| `src/editor/stores/script.js` | `applyThemeBundle()` 原子替换 7 个 key；title 完全不受 full theme 影响 | 新增 title 应用逻辑；但应只替换 visual fields，**保留已有 `ui.titleScreen.bgm`** |
| `src/editor/builtinThemes.js` | built-in manifest 只覆盖 4 个 `screens.*` runtime screen + tokens/widgetStyles | `wafuu` 需要补 title baseline；建议继续放在 `screens.titleScreen` 并由 installer 归一到 `ui.titleScreen` |
| `src/editor/services/themeBrowser.js` | `COVERAGE_LABELS`、`getAppliedCoverage()`、builtin fallback coverage、reopen reconstruction 都默认 7 key | 新增 `titleScreen: '标题界面'`；browser badge/impact/reopen coverage 自动扩成 8 面 |
| `src/editor/services/themePackageImport.js` | import summary 的 coverage/missingCoverage 文案不含 title | 加 title label；legacy/blocked/ready 文案与 planLines 要反映 title coverage |

### Browser / persistence / UX surfaces
| File | Current assumption | Phase 81 required change |
|------|--------------------|--------------------------|
| `src/editor/components/theme/ThemeBrowserModal.vue` | coverage 文案只会显示现有 label 集；“完整主题”实际仍是旧 contract 语义 | 不改成第二个 title modal；只更新 coverage/detail/badge 文案，让 unified browser 正确显示 title 已纳入完整覆盖 |
| `src/editor/views/ProjectSettings.vue` | 已是唯一 browser 入口，方向正确 | 只需要继续复用，不要回退到 split modal；必要时更新导出/帮助 copy |
| `src/editor/helpTexts.js` | `themeBrowser` help 仍是泛化“完整主题”说明 | 可补一句“含标题界面 coverage”，但不是必须单独起新入口 |

### Tests that encode the old shape
| Test file | Current assumption | Required update |
|-----------|--------------------|-----------------|
| `tests/themePackageContract.test.js` | `createFullTheme()` 与 manifest files 只覆盖旧 7-key 里的图片面 | 增加 `titleScreen` visual refs 与 title coverage/missingCoverage 断言 |
| `tests/themePackager.test.js` | full `.gmtheme` 示例不含 title；legacy missingCoverage 不含 title | full 示例补 title；legacy missingCoverage 应新增 `titleScreen` |
| `tests/themePackagePreflight.test.js` | ready package 与 copy/overwrite 示例不含 title assets | 增加 title visual asset file；验证 preflight 能识别 title coverage |
| `tests/themePackageInstaller.test.js` | installer bundle shape不含 title | 断言 imported / builtin 安装结果含 title visual snapshot；若 builtin 带资产，要断言已复制进项目 |
| `tests/themePackageInstallFlow.test.js` | renderer orchestration bundle shape不含 title | 加 title bundle key 断言 |
| `tests/scriptThemeApply.test.js` | 明确断言 titleScreen 在 apply 后保持旧值不变 | 改成断言 title visual fields 被替换、`bgm` 被保留、undo 能恢复 |
| `tests/themePackageExporter.test.js` | export 只验证 7-key snapshot | 加 title visual snapshot 与 manifest files 断言；验证非主题 `bgm` 不被打包或不覆盖 |
| `tests/themePackageRoundTrip.test.js` | round-trip 不覆盖 title | 增加 title snapshot round-trip parity |
| `tests/themeBrowserService.test.js` | builtin/imported coverage labels 与 overlap 文案基于旧 key 集 | 新增 `标题界面` label、8-key overlap/first-write 断言 |
| `tests/themePackageImportUx.test.js` | summary/missingCoverage 示例不含 title | 更新 missingCoverage / coverage labels |

## Standard Stack

### Core
| Library / Module | Version | Purpose | Why Standard |
|------------------|---------|---------|--------------|
| `src/shared/themePackageContract.js` | repo current | full-theme coverage/missingCoverage/namespace 真相源 | Phase 81 必须扩这个合同，不应旁挂第二套 title 规则 |
| `electron/themePackageInstaller.js` + `src/editor/services/themePackageInstall.js` | repo current | built-in / imported 共用 install+apply orchestration | 已是 Phase 79/80 冻结路径，必须继续复用 |
| `electron/themePackageExporter.js` + `src/utils/themePackager.js` | repo current | `.gmtheme` 导出与 round-trip payload | 现有导出格式已稳定，Phase 81 只扩 title ownership |
| `src/editor/services/themeBrowser.js` + `ThemeBrowserModal.vue` | repo current | 统一 browser item normalization / coverage / apply impact | Phase 80 已锁定为唯一浏览器入口 |
| `src/ui/TitleScreen.js` + `src/editor/views/TitleDesigner.vue` | repo current | title runtime surface 与现有 preview/editor surface | title 能力已存在，Phase 81 不需要发明新 title runtime |

### Supporting
| Library | Local Version | Current npm | Purpose | When to Use |
|---------|---------------|-------------|---------|-------------|
| Vue | 3.5.31 | 3.5.33 | editor UI | 继续用于 browser / Project Settings / TitleDesigner |
| Pinia | 3.0.4 | 3.0.4 | editor state | 继续作为 script/project store 真相源 |
| Electron | 41.0.4 | 41.3.0 | IPC/file I/O | 继续承载 preflight/install/export IPC |
| fflate | 0.8.2 | 0.8.2 | `.gmtheme` zip build/parse | 保持现有 packager 实现 |
| Vitest | 4.1.4 | 4.1.5 | focused regression suite | Phase 81 直接扩现有 test matrix |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 扩现有 `.gmtheme` contract | 新建 title-only 包格式/导出按钮 | 明确违背 D-07 / D-08；还会复制 browser/install/export 逻辑 |
| 统一 browser badge/coverage 扩边 | 在 TitleDesigner 单独提示“此主题有标题页” | 会造成第二真相源，且不能覆盖 imported/reopen/export 语义 |
| title visual-only ownership | 把 `titleScreen.bgm` 也塞进 theme package | 会把图片主题扩成音频主题，波及 package contract、资产命名空间与用户内容边界 |

**Installation:**
```bash
# No new package is recommended for Phase 81.
```

**Version verification:**
```bash
node --version           # v24.13.1
npm --version            # 11.11.1
npx vitest --version     # vitest/4.1.4
npm view vue version     # 3.5.33
npm view pinia version   # 3.0.4
npm view electron version# 41.3.0
npm view vite version    # 8.0.10
npm view vitest version  # 4.1.5
npm view fflate version  # 0.8.2
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── shared/
│   ├── themePackageContract.js   # full-theme coverage/refs truth
│   └── uiImageContract.js        # theme-owned UI asset scanning
├── editor/
│   ├── builtinThemes.js          # built-in golden baseline metadata
│   ├── services/
│   │   ├── themeBrowser.js       # browser normalization + coverage labels
│   │   ├── themePackageImport.js # preflight summary
│   │   ├── themePackageInstall.js# renderer apply orchestration
│   │   └── themePackageExport.js # renderer export UX
│   └── stores/script.js          # applyThemeBundle persistence point
├── ui/
│   └── TitleScreen.js            # runtime title rendering
└── utils/themePackager.js        # .gmtheme build/parse
electron/
├── themePackageInstaller.js      # project-local install path
├── themePackageExporter.js       # project-local export path
└── themePackagePreflight.js      # preflight summary
tests/                            # focused theme/browser/round-trip suites
```

### Pattern 1: `titleScreen` 进入 full-theme contract，但 owner 只包含视觉字段
**What:** 把 `titleScreen` 作为第 8 个 coverage key 纳入 shared contract，同时把 ownership 明确定义为 `background + elements`，**不包含 `bgm`**。  
**When to use:** full `.gmtheme` validate / preflight / install / apply / export / import / browser coverage 全链路。  
**Why:** 这既满足“golden theme 必须含 title”的锁定决策，又不把非 UI 音频拖进图片主题包。

**Example:**
```javascript
// Source: src/shared/themePackageContract.js + src/editor/stores/script.js
export const FULL_THEME_COVERAGE_KEYS = Object.freeze([
  'theme',
  'widgetStyles',
  'dialogueBox',
  'saveLoadScreen',
  'backlogScreen',
  'gameMenu',
  'settingsScreen',
  'titleScreen',
]);

// applyThemeBundle() should replace only the title visual snapshot,
// while preserving existing ui.titleScreen.bgm.
```

### Pattern 2: built-in golden theme 仍然必须落成 project-local 资产
**What:** 一旦 `wafuu` title/其他 UI 面开始引用真实 `ui/themes/wafuu/...` 资源，builtin install path 就不能只回内存 bundle，必须把这些资源安装到项目内。  
**When to use:** `source: 'builtin'` 的 golden theme apply/export/round-trip。  
**Why:** 当前 imported path 已经 project-local，自包含；golden built-in 若不 materialize 资产，保存/重开/导出会漂移，直接违背 D-10 / THM-01。

**Example:**
```javascript
// Source: electron/themePackageInstaller.js
const OWNED_UI_KEYS = Object.freeze([
  'theme',
  'widgetStyles',
  'dialogueBox',
  'saveLoadScreen',
  'backlogScreen',
  'gameMenu',
  'settingsScreen',
  'titleScreen',
]);
```

### Pattern 3: browser coverage / reopen lifecycle 继续只认 contract + `packageMeta`
**What:** 不引入 browser-only title registry；统一让 `FULL_THEME_COVERAGE_KEYS`、`COVERAGE_LABELS`、`packageMeta` 驱动 coverage、impact、reopen reconstruction。  
**When to use:** ThemeBrowserModal、preflight summary、reopen 后 applied imported item 重建。  
**Why:** Phase 80 已冻结“`script.data.ui.theme.packageMeta` 是唯一 applied truth”。title 扩边后也必须服从这个规则。

**Example:**
```javascript
// Source: src/editor/services/themeBrowser.js
function getAppliedCoverage(scriptData = {}) {
  const packageMeta = scriptData?.ui?.theme?.packageMeta;
  if (packageMeta?.mode === 'full') {
    return FULL_THEME_COVERAGE_KEYS;
  }
  return [];
}
```

### Recommended Plan Decomposition
1. **Plan A — Contract & ownership expansion**
   - 扩 `FULL_THEME_COVERAGE_KEYS` / coverage labels / refs collectors / title visual-only snapshot
   - 更新 installer/exporter/store apply 逻辑
   - 先锁定“title 包含什么、不包含什么（bgm 不属于 theme）”
2. **Plan B — Built-in wafuu integration through existing pipeline**
   - 给 `builtinThemes.js` 的 `wafuu` 补 title baseline
   - 若使用真实图片，补 builtin asset materialization 到 project-local namespace
   - 更新 browser/import/export 文案与 completeness badge
3. **Plan C — Golden acceptance evidence**
   - 扩 focused tests：contract/preflight/install/apply/export/round-trip/browser
   - 明确 save/reopen、runtime title、reimport parity 证据链

### Anti-Patterns to Avoid
- **标题页单独导出/安装按钮：** 会重开第二条 delivery path，违背 D-07 / D-08。
- **把 `bgm` 计入 title coverage：** 会把视觉主题误扩成音频包，并在 apply 时覆盖用户内容选择。
- **builtin golden 只改 JS 对象不落地资产：** 一旦 title 使用真实图，保存/导出/重导入必然失真。
- **浏览器自己硬编码“完整主题=7 面”：** 会让 imported/builtin/reopen 的状态语义漂移。
- **继续保留 `scriptThemeApply.test.js` 那种“title 不变”断言：** 这会把 Phase 81 的真实需求直接测死。

## Effort Split

| Workstream | Estimated share | Why |
|------------|-----------------|-----|
| Contract / pipeline / persistence | 65% | title 进入 full-theme contract 会波及 shared contract、installer/exporter、apply/store、browser、preflight、round-trip tests |
| Wafuu baseline uplift | 35% | `wafuu` 已有 token/widget/screen 基线，但 title 仍为空白，且当前仓库未发现现成 wafuu asset 目录 |

**Key insight:** 这阶段不是“纯内容 production phase”。在当前仓库状态下，先把 title 纳入合同和管线，才有资格谈 golden theme 验收。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| title 主题交付 | title-only export/import/apply path | 现有 `.gmtheme` + preflight/install/apply/export/import | 统一浏览器、保存/重开、round-trip 证据都已围绕这条路径冻结 |
| applied state | browser 内持久化 title coverage registry | `script.data.ui.theme.packageMeta` + shared coverage keys | Phase 80 已锁定单一真相源 |
| title preview | 新的 live title preview runtime | 现有 `TitleScreen.js` + `TitleDesigner.vue` / iframe preview | 能力已存在，需求只是复用，不是再造 |
| asset inclusion | 手工拼 manifest / 手工复制路径 | `validateThemePackageDefinition()` + `buildFullThemeZip()` + installer/preflight | 已有 namespace、manifest、copy/skip/overwrite 规则 |
| coverage 文案 | 组件里散落中文字符串判断 | `themeBrowser.js` / `themePackageImport.js` 的 coverage label map | 便于 7→8 key 一次性对齐 |

**Key insight:** Phase 81 的正确做法是把 title 纳入“现有 shared ownership system”，不是给 title 做特判系统。

## Common Pitfalls

### Pitfall 1: 把 `titleScreen` 整个对象当作 theme-owned
**What goes wrong:** apply/export 会把用户现有 `titleScreen.bgm` 一起覆盖或打包。  
**Why it happens:** 当前 `TitleScreen` 配置把视觉和音频混在同一对象里。  
**How to avoid:** 为 theme pipeline 明确一个 visual-only title snapshot；apply 时保留原 `bgm`。  
**Warning signs:** 测试里出现“apply 后 title bgm 被改掉”或 `.gmtheme` manifest 里开始出现音频文件。

### Pitfall 2: 只扩 contract，不扩 builtin asset materialization
**What goes wrong:** browser 看起来是完整的，但 built-in golden theme 应用后 title/其它 UI 面引用的 `ui/themes/wafuu/...` 文件并未写入项目。  
**Why it happens:** 当前 `source: 'builtin'` 分支只回 bundle，不复制资产。  
**How to avoid:** 如果 `wafuu` 使用真实图像，builtin installer 必须像 imported path 一样把资产落到项目内。  
**Warning signs:** 保存/重开后掉图；导出 `.gmtheme` 或导出游戏时缺文件 warning。

### Pitfall 3: export/import 只带 title 配置，不带 title 资源
**What goes wrong:** round-trip 后 titleLayout 存在，但背景/装饰图丢失。  
**Why it happens:** 当前 `uiImageContract` 不扫描 title；exporter 也不导出 title snapshot。  
**How to avoid:** 让 title 视觉资源进入 shared UI image collector，并要求 canonical `ui/...` 命名空间。  
**Warning signs:** `themePackageRoundTrip.test.js` 只能断言 title JSON，不能断言 manifest files。

### Pitfall 4: browser 文案仍按旧 7 面解释“完整主题”
**What goes wrong:** 实现已经支持 title，但 browser detail/missingCoverage/applyImpact 仍然显示旧定义。  
**Why it happens:** `themeBrowser.js` 与 `themePackageImport.js` 有独立 label map。  
**How to avoid:** 统一补 `titleScreen` label，并补 focused browser tests。  
**Warning signs:** imported ready item 的 detail 面板不出现“标题界面”。

### Pitfall 5: 继续用非 namespaced `backgrounds/...` 作为 theme-owned title 资源
**What goes wrong:** theme package 无法 fail-closed 校验 title 资源归属，也不利于 project-local 自包含重导入。  
**Why it happens:** TitleDesigner 历史上用的是 `backgrounds/` 与 `audio/` picker。  
**How to avoid:** golden theme 的 title visual 资源使用 `ui/themes/<themeId>/title/...` canonical path；`bgm` 继续留在非主题侧。  
**Warning signs:** `validateThemePackageDefinition()` 需要为 title 特判放行非 `ui/...` 路径。

## Code Examples

Verified local patterns to extend:

### Shared contract is already the right expansion point
```javascript
// Source: src/shared/themePackageContract.js
export const FULL_THEME_COVERAGE_KEYS = Object.freeze([
  'theme',
  'widgetStyles',
  'dialogueBox',
  'saveLoadScreen',
  'backlogScreen',
  'gameMenu',
  'settingsScreen',
]);
```

### Apply path is already centralized in one store method
```javascript
// Source: src/editor/stores/script.js
function applyThemeBundle(bundleConfig, packageMeta) {
  data.value.ui.theme = nextTheme;
  data.value.ui.widgetStyles = JSON.parse(JSON.stringify(bundleConfig?.widgetStyles ?? {}));
  data.value.ui.dialogueBox = JSON.parse(JSON.stringify(bundleConfig?.dialogueBox ?? {}));
  data.value.ui.saveLoadScreen = JSON.parse(JSON.stringify(bundleConfig?.saveLoadScreen ?? {}));
  data.value.ui.backlogScreen = JSON.parse(JSON.stringify(bundleConfig?.backlogScreen ?? {}));
  data.value.ui.gameMenu = JSON.parse(JSON.stringify(bundleConfig?.gameMenu ?? {}));
  data.value.ui.settingsScreen = JSON.parse(JSON.stringify(bundleConfig?.settingsScreen ?? {}));
}
```

### Browser lifecycle already derives full coverage from shared keys
```javascript
// Source: src/editor/services/themeBrowser.js
function buildAppliedImportedEntry(scriptData = {}, importedEntries = []) {
  return {
    themeId: packageMeta.themeId,
    source: 'imported',
    mode: packageMeta.mode ?? 'full',
    coverage: packageMeta.mode === 'full' ? FULL_THEME_COVERAGE_KEYS : [],
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| “full theme = 7 个 coverage key，不含 title” | “full theme = 8 个 coverage key，含 `titleScreen`” | Phase 81 应实施 | browser completeness、preflight missingCoverage、apply/export/import/test matrix 全部同步扩边 |
| `titleScreen` 只存在 runtime/editor，不在 package ownership | `titleScreen` 进入 shared package ownership，但只 owner 视觉字段 | Phase 81 应实施 | title 可穿过 `.gmtheme` 闭环，同时不把 `bgm` 拖入图片主题包 |
| builtin theme 只返回 bundle，不考虑资产落盘 | golden built-in 若有真实图，必须 project-local materialize | Phase 81 应实施 | 才能满足 save/reopen/export/reimport 一致性 |

**Deprecated/outdated:**
- “THM-01 只要覆盖旧 7 面就算完整” —— 已被 81-CONTEXT 显式否决。
- “title 只能通过 TitleDesigner 单独处理，和 full-theme contract 无关” —— 已与 D-08 冲突。

## Open Questions

1. **title BGM 是否属于 golden theme 的 owner 范围？**
   - What we know: `src/ui/TitleScreen.js` 与 `TitleDesigner.vue` 都支持 `bgm`；但当前 theme package contract 只围绕 UI 资源与 `ui/...` 路径。
   - What's unclear: 用户是否希望 golden theme 连 title BGM 也一并分发。
   - Recommendation: **Phase 81 不把 `bgm` 纳入 theme ownership。** 保留 `bgm` 为项目内容字段；theme 只接管视觉 title。

2. **`wafuu` 是否需要新的真实图像资产，还是 CSS/layout uplift 即可过关？**
   - What we know: 当前仓库快照里未发现现成的 `wafuu` 内置 theme 资产目录；`builtinThemes.js` 也没有任何实际图片路径。
   - What's unclear: 验收对“golden theme 成品感”的最低视觉 bar 是否允许纯配置/纯 CSS。
   - Recommendation: planner 应把“是否补 real asset set”作为显式任务决策；如果目标是图片化 golden sample，应单列资产生产与 builtin asset install work。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | test/build/export scripts | ✓ | v24.13.1 | — |
| npm | package scripts / `npm view` / `npx vitest` | ✓ | 11.11.1 | — |
| Vitest | focused regression suite | ✓ | 4.1.4 (`npx vitest --version`) | — |
| npm registry access | version verification | ✓ | queried 2026-04-27 | 若离线则退回 `package.json` / lockfile |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themePackageImportUx.test.js tests/themeBrowserRouting.test.js` |
| Full suite command | `npx vitest run && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THM-01-A | `titleScreen` 被认定为 full-theme coverage，并只校验/收集视觉 title 资源 | unit | `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js` | ✅ |
| THM-01-B | install/apply 会把 title 视觉快照写入项目脚本，但保留已有 `titleScreen.bgm` | unit/integration | `npx vitest run tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js` | ✅ |
| THM-01-C | export/reimport/round-trip 保留 title 视觉结果与 manifest files 一致 | integration | `npx vitest run tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js` | ✅ |
| THM-01-D | unified browser/import summary/reopen lifecycle 正确展示“标题界面” coverage，不引入第二状态源 | unit/source-contract | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themePackageImportUx.test.js tests/themeBrowserRouting.test.js` | ✅ |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/themePackageContract.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js`
- **Per wave merge:** `npx vitest run tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themePackageImportUx.test.js`
- **Phase gate:** `npx vitest run && npm run build`

### Wave 0 Gaps
- None — 现有 Vitest 基础设施和 focused theme/browser suites 已存在；Phase 81 主要是**扩现有文件中的 title case**，不是先补测试框架。

## Sources

### Primary (HIGH confidence)
- `src/shared/themePackageContract.js` — full-theme coverage keys、coverage detection、asset ref validation
- `src/shared/uiImageContract.js` — 现有 theme-owned UI image collector scope
- `electron/themePackageInstaller.js` — built-in / imported install shape、`OWNED_UI_KEYS`
- `electron/themePackageExporter.js` — export snapshot scope、path rewrite logic
- `src/editor/stores/script.js` — `applyThemeBundle()`、`getTitleScreen()` / `updateTitleScreen()`
- `src/editor/services/themeBrowser.js` — browser coverage labels、apply impact、reopen reconstruction
- `src/editor/services/themePackageImport.js` — import summary coverage copy
- `src/editor/builtinThemes.js` — `wafuu` baseline current completeness
- `src/ui/TitleScreen.js` — title runtime visual capabilities
- `src/editor/views/TitleDesigner.vue` — title editor/preview existing path
- `tests/themePackageContract.test.js`, `tests/scriptThemeApply.test.js`, `tests/themePackageInstaller.test.js`, `tests/themePackageExporter.test.js`, `tests/themePackageRoundTrip.test.js`, `tests/themeBrowserService.test.js`, `tests/themePackageImportUx.test.js` — current behavior locks and exact old assumptions

### Secondary (MEDIUM confidence)
- `npm view vue version`, `npm view pinia version`, `npm view electron version`, `npm view vite version`, `npm view vitest version`, `npm view fflate version` — package version currency check on 2026-04-27

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — 完全基于 repo 当前依赖与 `npm view` 版本检查
- Architecture: **HIGH** — 关键结论直接来自 contract/installer/exporter/store/browser 源码与测试
- Pitfalls: **MEDIUM** — 大部分由源码交叉验证支撑，但 `wafuu` 成品视觉 bar 与是否需要真实资产仍有人工验收不确定性

**Research date:** 2026-04-27  
**Valid until:** 2026-05-27
