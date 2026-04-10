# Phase 35 — 中文本地化 (Chinese Localization)

## Domain Boundary

把编辑器中残留的英文 UI 文本全部替换为中文。不涉及 i18n 框架引入，不涉及引擎运行时，不涉及帮助系统（Phase 36）。

**In scope:**
- Token 中文名映射（41 个 CSS token）
- 系统字体下拉列表中文化
- 过渡效果下拉选项中文化
- AudioPicker tab 标签中文化
- ExportModal 按钮标签中文化
- 坐标标签中文化
- 其余零散英文 UI 文本

**Out of scope:**
- 多语言 / i18n 框架
- 引擎运行时文本
- Tooltip 帮助系统（Phase 36）
- script.json / project.json 数据字段（保持英文 key）

## Decisions

### D-01: Token 命名风格 → 简洁派

- **选择:** 2-4 个汉字，组名已提供上下文，无需重复前缀
- **理由:** 组标题（如 🔘 按钮）已明确分类，token 名只需区分同组内的含义
- **示例:**
  - `primary` → 主色 | `danger` → 危险色 | `accent` → 强调色
  - `dialogue-bg` → 对话框 | `btn-bg` → 底色 | `btn-hover-bg` → 悬停色
  - `body-font` → 正文 | `heading-font` → 标题
  - `border-radius-sm` → 小 | `border-radius-lg` → 大
- **实现:** 在 TokenAccordion.vue 中创建 `TOKEN_LABELS` 映射对象 `{ 'primary': '主色', ... }`，token row 组件通过 prop 或 inject 获取中文名

### D-02: BGM/SE 策略 → BGM 保留，SE 改"音效"

- **选择:** BGM 作为广泛认知的缩写保留，SE 认知度低改为"音效"
- **影响文件:** AudioPicker.vue (tab 标签), PageInspector.vue (音频相关占位符)

### D-03: 技术性文本边界

#### D-03a: 坐标标签
- `X (px)` → `X坐标`，`Y (px)` → `Y坐标`
- 去掉 px 后缀（不需要单位提示）

#### D-03b: Placeholder 值格式
- 保留英文原样：`#ffffff`、`rgba(0,0,0,0.7)`、`Noto Sans SC`
- 理由：这些是用户需要照着输入的真实值格式示例

#### D-03c: 过渡效果选项
- 翻译 `<option>` 显示文本，`value` 属性不变
- `fade` → 淡入淡出 | `slide-left` → 左滑入 | `slide-right` → 右滑入 | `none` → 无

#### D-03d: Export 按钮
- `Web` → `网页版`（与已有的"桌面版"对称）

## Code Context

### 核心修改点

| 文件 | 改动内容 | 复杂度 |
|------|---------|--------|
| `TokenAccordion.vue` (L47-57) | 新建 TOKEN_LABELS 映射，41 个 token | 高 |
| `ColorTokenRow.vue` / `FontTokenRow.vue` / `SliderTokenRow.vue` / `GradientTokenRow.vue` | 接收中文 label prop 替代 `{{ tokenKey }}` | 低 |
| `FontTokenRow.vue` (L29-34) | systemFonts label 中文化 | 低 |
| `PageInspector.vue` (L24-29) | transition option 显示文本中文化 | 低 |
| `PageInspector.vue` (L356-360) | 字体下拉同步 FontTokenRow 改动 | 低 |
| `AudioPicker.vue` (L11) | SE → 音效 | 低 |
| `ExportModal.vue` (L13) | Web → 网页版 | 低 |
| `Scenes.vue` (L120-125, L191-195, L258-262) | X (px)/Y (px) → X坐标/Y坐标 | 低 |
| `DialogueBoxSettings.vue` (L124-128) | systemFonts label 中文化 | 低 |
| `SettingsDesigner.vue` (L141-145) | systemFonts label 中文化 | 低 |
| `TitleDesigner.vue` (L141-145, L196-200) | systemFonts label 中文化 | 低 |

### 模式说明

- **Token 映射模式:** 集中在 TokenAccordion.vue 定义 `TOKEN_LABELS` 对象，子组件通过 prop 传入中文名。不创建单独的 i18n 文件。
- **系统字体:** 多处共享同一个 systemFonts 数组模式。考虑提取为共享常量或在每处独立修改（文件不多，6 处）。
- **值 vs 显示文本分离:** transition、export 等 select/button 只改显示文本，底层 value 保持英文。

## Canonical References

- Requirements: L10N-01 ~ L10N-07 (.planning/REQUIREMENTS.md)
- Roadmap: Phase 35 section (.planning/ROADMAP.md)
- Prior milestone context: v0.6 theme system added TOKEN_GROUPS structure
