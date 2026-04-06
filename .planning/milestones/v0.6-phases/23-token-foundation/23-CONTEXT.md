# Phase 23: Token Foundation - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

将游戏引擎所有 UI 的硬编码视觉样式（颜色/字体/圆角/透明度）迁移为 `--gm-*` CSS 自定义属性。建立 ~35-40 个 Token 词汇表和 `DEFAULT_TOKENS` 常量。迁移后无主题应用时游戏外观与 v0.5 完全一致（零视觉回归）。

不包含：ThemeManager 引擎（Phase 24）、九宫格图片（Phase 25）、可视化编辑器（Phase 26）、预设/导出（Phase 27）。

</domain>

<decisions>
## Implementation Decisions

### 字体 Token 与现有字体系统
- **D-01:** 字体优先级三层叠加：主题字体 Token（底层默认）→ ui.dialogueBox / 逐组件覆盖（内容层）→ 逐元素覆盖。主题层设全局默认，现有 Phase 17 字体设置继续生效，互不冲突。
- **D-02:** 字体 Token 只保留 2 个槽位：`--gm-font-display`（标题/显示）+ `--gm-font-body`（正文/UI）。对话框字体属于"内容创作层"而非"主题层"，通过 `ui.dialogueBox.fontFamily` 覆盖，fallback 链为：`ui.dialogueBox.fontFamily` → `var(--gm-font-body)`。未来如果主题包需要控制对话框字体，再扩展 `font.dialogue` 槽位。

### 默认调色板
- **D-03:** 默认调色板完全保留当前 v0.5 色值，不做任何调整。所有现有 rgba/hex 值原样写入 CSS `var(--gm-*, fallback)`，确保零视觉回归（TKN-06）。更精致的配色方案通过 Phase 27 内置主题预设提供。

### 自定义布局 vs Token 优先级
- **D-04:** 优先级层次：逐元素自定义（设置页/标题页设计器中用户手动设置的属性）> 主题 Token > 硬编码 fallback。切换主题时，已有的逐元素自定义永久保留，不弹确认对话框，不自动清除。提供"重置为主题默认"按钮（属于 Phase 26 主题编辑器范畴），用户主动清除时才清除。Phase 23 需确保优先级层次的数据架构正确。

### Agent's Discretion
- Token 命名细节（具体的 `--gm-*` 命名约定和分组方式）
- JS 内联样式迁移的具体策略（哪些改为 CSS var、哪些保留 JS 但读取 token 值）
- CSS 迁移顺序和分批策略
- `cssText = ''` 重置问题的具体防护实现（研究已给出方向：token 注入到 `#game-container` 祖先而非目标元素）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 研究文档
- `.planning/research/SUMMARY.md` — v0.6 主题系统研究摘要，包含推荐架构和关键决策
- `.planning/research/ARCHITECTURE.md` — 主题系统集成架构详解：数据流、组件边界、Token 注入模型
- `.planning/research/PITFALLS.md` — 17 个陷阱及防护方案，P1/P2 对本阶段最关键（内联样式覆盖 + cssText 重置）
- `.planning/research/STACK.md` — 技术栈选型和依赖决策
- `.planning/research/FEATURES.md` — 功能优先级分层

### 需求文档
- `.planning/REQUIREMENTS.md` — TKN-01~TKN-06 为本阶段需求

### 关键源码
- `src/style.css` — 1271 行，120 个 rgba + 22 个 hex 值需迁移为 `var(--gm-*)`
- `src/ui/DialogueBox.js` — 23 处内联样式，含 `_applyStyle()` 的 `cssText = ''` 重置
- `src/ui/TitleScreen.js` — 35 处内联样式，`_renderCustom()` 直接设样式
- `src/ui/SettingsScreen.js` — 27 处内联样式，自定义布局模式设背景
- `src/ui/ChoiceMenu.js` — 15 处内联样式
- `src/ui/SaveLoadScreen.js` — 内联样式（标题色等）
- `src/ui/CharacterLayer.js` — 11 处内联样式（位置/尺寸为主，非主题相关）
- `src/engine/settingDefs.js` — DEFAULT_COMPONENT_STYLE / DEFAULT_LABEL_STYLE / DEFAULT_BUTTON_STYLE 含硬编码色值
- `src/main.js:748-751` — `applyGlobalStyle()` 调用点，Phase 17 字体设置入口

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **已有 CSS 变量模式**: `--track-color`, `--thumb-color`, `--toggle-active` 在 SettingsScreen.js 中通过 `setProperty()` 设置，style.css 中通过 `var()` 消费 — 证明模式可行
- **`--dialogue-opacity` 变量**: main.js 中已使用，可作为 token 迁移参考
- **settingDefs.js 默认值常量**: `DEFAULT_COMPONENT_STYLE`, `DEFAULT_LABEL_STYLE`, `DEFAULT_BUTTON_STYLE` 可参考其结构定义 `DEFAULT_TOKENS`

### Established Patterns
- **样式注入**: `element.style.setProperty('--var', value)` 已在 SettingsScreen.js 和 main.js 中使用
- **自定义布局渲染**: 设置页和标题页的 `_renderCustom()` 从 script.json 读元素数据并逐个设置 inline style
- **per-page fontOverride**: `currentPage.fontOverride` 通过 `data.fontOverride` 传递给 DialogueBox

### Integration Points
- **`#game-container`**: Token 注入的目标元素，所有游戏 UI 的根容器
- **`ui.theme` in script.json**: 主题数据存储位置（与 ui.titleScreen / ui.settingsScreen 同级）
- **postMessage**: 编辑器 iframe 预览通信协议，Phase 24 将添加 `update-theme` 消息类型

</code_context>

<specifics>
## Specific Ideas

- 对话框字体属于"内容创作层"而非"主题层"——同一个主题可以被用在多款字体风格完全不同的 VN 里。这一设计哲学应指导所有 Token 边界划分：主题管"皮肤"（颜色/图片/圆角），内容层管"创作意图"（字体/文字/布局）。
- "重置为主题默认"按钮比切换主题时弹确认对话框更轻量，不打断切主题的流程。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-token-foundation*
*Context gathered: 2026-04-06*
