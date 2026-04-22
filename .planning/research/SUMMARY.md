# Project Research Summary

**Project:** Galgame Maker — v1.5 UI 图片驱动体系  
**Domain:** 图片驱动的 VN UI 主题化  
**Researched:** 2026-04-22  
**Confidence:** HIGH

## Executive Summary

v1.5 不是“重做 UI 引擎”，而是把现有 Electron + Vue + Pinia + DOM/CSS runtime 扩成一条完整的 **UI 图片资产通路**：项目内 `assets/ui/` 持有图片，编辑器用现有资产库与 iframe runtime 预览配置，运行时把图片应用到对话框、按钮、主要界面、光标与图标，导出链路再把这些资源完整带走。核心判断一致：**不加新依赖，不换渲染栈，只补 schema、runtime owner、预览消息和资产扫描。**

本里程碑的正确切法是“固定槽位、可视化配置、真实预览、导出可用”。必须优先解决 shared contract、ThemeManager 扩面、DialogueBox/major screens 的图片层、以及 `scanAssets()` 对 UI 图片的覆盖；否则会出现编辑器能看、导出丢图，或 editor/runtime/schema 三套字段漂移的问题。

最大风险不是实现不了，而是 **资产来源失控、预览与运行时分叉、覆盖面半完成**。缓解方式也很明确：所有图片只存项目相对路径；继续使用 runtime-backed iframe；先冻结按钮族/界面 coverage matrix；把“主题包重构、插件化、自由 selector、动画特效系统”明确留到后续版本。

## Key Findings

### Stack Additions

- **新增 npm 依赖：无**
- **新增栈迁移：无**
- 需要的只是：
  - 结构化 UI 图片 schema（theme / dialogue / screen chrome / cursor / icons）
  - `ThemeManager` 扩展到更多 selector 与更多状态
  - 小型图片预加载工具（内部模块即可）
  - `scanAssets()` / export / themePackager 对 UI 图片路径的补齐

### Must-Have Feature Categories

1. **对话框图片化** — 主框图、名牌图、装饰层，且文本安全区不坏。  
2. **主要按钮图片态扩面** — 覆盖 game menu、save/load、backlog、QAB、分页/标签、close 等按钮族。  
3. **非标题主界面背景图与装饰层** — SaveLoad / Backlog / GameMenu / Settings 统一支持。  
4. **主题光标与图标集** — 限定为 default/pointer cursor 与核心 action icon slots。  
5. **编辑器图片资产管理 + 即时预览** — 必须走资产库、缩略图选择、runtime-backed iframe 预览。

### Explicit Deferrals / Out of Scope

- 不引入 PixiJS / Canvas / WebGL / GSAP / icon font / 新预览框架
- 不做 `.gmtheme` 格式升级或社区分享流
- 不做任意 selector 注入、插件系统、通用 UI 组件注册
- 不做 per-scene / per-page 主题切换
- 不做动画装饰、视差、图片优化/压缩、编辑器内绘图工具

### Architecture Approach

- **`ui.theme`**：放跨界面复用的按钮皮肤、cursor、icons  
- **`ui.dialogueBox`**：新增 chrome/visuals，承载对话框图片层  
- **`ui.<screen>.chrome`**：各 major screen 的背景图与 decorations  
- **`ThemeManager`**：继续做统一 CSS skin 注入中心，不改成新引擎  
- **iframe runtime preview**：继续做权威预览，不允许 editor-only 假预览

### Biggest Risks

1. **资产来源混乱** — 文本路径、base64、项目资源并存；要求统一为 `assets/ui/` + 项目相对路径。  
2. **导出漏图** — `scanAssets()` 目前覆盖不足；UI 图片扫描与 export 是本里程碑完成定义的一部分。  
3. **预览/运行时分叉** — 对话框和按钮预览必须走真实 runtime owner。  
4. **覆盖面半成品** — 必须先冻结按钮族与 screen coverage matrix，再按族验收。  
5. **兼容性回退失守** — 所有图片字段都是可选增强；缺失时必须回退现有 CSS 外观。

## Implications for Roadmap

### Recommended Build Order

**Phase 1 — Shared contract + export gate**  
先统一 schema、slot registry、decor model、preview message、`scanAssets()` 框架。  
交付：shared UI image contract、ThemeManager 状态扩面、UI asset scan registry。  
避免：schema 漂移、导出漏图。

**Phase 2 — Dialogue box first**  
先做最显眼的主视觉区域，并把对话框预览切到真实 runtime。  
交付：对话框主框图 / 名牌图 / 装饰层 / sample preview。  
避免：本地假预览、文本区被图片破坏。

**Phase 3 — Button family rollout**  
以按钮族而非零散 selector 推进，统一 normal/hover/pressed，必要处加 selected/disabled。  
交付：game-menu / save-load / backlog / QAB / tabs / close button 皮肤扩面。  
避免：只做主按钮、次按钮漏掉。

**Phase 4 — Major screen chrome**  
复用 screen config 与 decorations 思路，统一铺 SaveLoad / Backlog / GameMenu / Settings。  
交付：每屏背景图 + decorations + 真实 screen preview。  
避免：只做 SaveLoad 的 demo 化交付。

**Phase 5 — Cursor/icons + editor workflow polish**  
最后收小而硬的 polish，并把资产管理、引用提示、导出回归补齐。  
交付：cursor/icon slots、AssetPicker 接入、缺失资源预警、导出验证。  
避免：小特性抢主线、图片路径继续靠手填。

### Research Flags

- **Likely needs deeper phase research:** Phase 1（shared schema / scan registry boundary）, Phase 5（themePackager 与引用校验收口）
- **Standard patterns, can plan directly:** Phase 2-4（DOM image layers、CSS state skins、screen decorations、iframe preview 复用）

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 基于仓库现状，结论明确为“无新依赖” |
| Features | HIGH | 里程碑目标与 feature cut line 一致 |
| Architecture | HIGH | 可复用主线清晰，改动集中 |
| Pitfalls | HIGH | 主要来自仓库现状与既有缺口，风险具体 |

**Overall confidence:** HIGH

### Gaps to Address

- 需要在 requirements 中先冻结 **按钮族 coverage matrix** 与 **screen slot 清单**
- 需要明确旧 base64 / 旧路径字段的兼容读入与“重新选择后改写”为相对路径规则
- 需要定义 editor 里哪些入口放在 Project Settings、哪些放在 screen sections，避免 UI 面板爆炸

## Sources

- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/PROJECT.md`

---
*Research completed: 2026-04-22*  
*Ready for roadmap: yes*

## Recommendation for Requirement Scoping

把 v1.5 requirement 写成 **5 个固定能力包**：对话框图片化、按钮族图片态、major screen chrome、cursor/icon slots、编辑器资产管理与预览；每个 requirement 都必须同时写清 **配置槽位、runtime owner、预览入口、导出扫描、CSS fallback**，这样 roadmap 才不会把“能配”“能看”“能导出”拆成不闭环的半成品。
