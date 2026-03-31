# Phase 7: Asset Library UI - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

用户在一个统一的"资源库"标签页中管理所有项目资源（背景、角色、音频、字体），替代原来分离的"素材库"和"角色"两个标签页（标签数 6→5）。包含：缩略图网格、音频播放、角色表情管理、删除/重命名、拖放批量导入、字体预览。

不含：新增资源类别、图片编辑器、音频编辑器、资源搜索/过滤（未在需求中）。

</domain>

<decisions>
## Implementation Decisions

### 视图布局 (View Layout)
- **D-01:** 使用子标签页切换模式 — 顶部 4 个分类标签（🖼️ 背景 / 👤 角色 / 🎵 音频 / 🔤 字体），每次显示一个分类的内容，复用现有 Assets.vue 的子标签模式
- **D-02:** 标签数从 6 变 5 — 删除独立的"素材库"和"角色"标签页，合并为统一"资源库"标签页

### 角色编辑器 (Character Editor)
- **D-03:** 使用侧栏+编辑区双栏布局 — 左侧角色列表（含头像缩略图），右侧显示选中角色的名称/颜色编辑 + 表情网格
- **D-04:** 角色头像 = 该角色第一张差分图的上半部分裁剪（CSS object-fit: cover + object-position: top）
- **D-05:** 角色差分（表情）是用户上传的图片资产，不提供图片编辑功能，只显示缩略图+名称
- **D-06:** 表情操作通过右键菜单实现 — 右键表情缩略图弹出菜单：重命名 / 删除。简洁不占空间
- **D-07:** 可修改表情名称（重命名），但不编辑图片本身
- **D-08:** 编辑区内表情以缩略图网格显示（grid），点击"+ 导入表情"通过文件选择器添加

### 音频播放控件 (Audio Playback)
- **D-09:** 迷你播放器样式 — play/pause 圆形按钮 + 进度条（可拖拽定位） + 时长显示（当前/总时长）
- **D-10:** 纯 HTMLAudioElement API 实现，无额外依赖

### 拖放批量导入 (Drag-Drop Import)
- **D-11:** 全视图覆盖层模式 — 用户拖文件进入资源库区域时显示半透明蓝色覆盖层 + "释放导入" 文字提示
- **D-12:** 导入目标 = 当前活动子标签的分类（如当前在"背景"标签则导入到 backgrounds/）
- **D-13:** 导入完成后显示结果 — 成功数量 + 失败文件列表（继承 Phase 6 D-02 批量导入失败处理）

### 资源操作 (Asset Operations)
- **D-14:** 删除操作 — 所有资源类型统一使用确认对话框（Electron dialog）
- **D-15:** 重命名操作 — 就地编辑（inline edit），点击文件名进入编辑模式

### Agent's Discretion
- 子标签页的具体样式细节（间距、图标大小）
- 缩略图网格的列数和卡片尺寸
- 角色侧栏的宽度
- 进度条的精确样式
- 覆盖层的动画效果和过渡时间
- 右键菜单的实现方式（自定义 CSS 菜单 vs Electron context menu）
- 空状态的具体文案和图标

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有视图（将被替换/合并）
- `src/editor/views/Assets.vue` — 当前素材库视图：子标签页 + 网格 + 上传。**将被新的统一资源库组件替换**
- `src/editor/views/Characters.vue` — 当前角色视图：侧栏 + 编辑区。**将被合并到资源库角色子标签**

### App 标签系统
- `src/editor/App.vue` lines 78-94 — 标签定义和组件映射，**需修改为 5 个标签**
- `src/editor/components/TabBar.vue` — 顶部标签栏组件

### Phase 6 产出（后端基础设施）
- `src/editor/stores/assets.js` — Pinia asset store：loadAll/importAssets/deleteAsset/selectAsset/importFont
- `electron/validateAsset.js` — Magic bytes + 扩展名验证
- `src/engine/fontLoader.js` — FontFace API 加载器
- `electron/main.js` — 4 个 IPC handlers: select-asset, import-assets, delete-asset, list-assets

### Phase 6 Context（继承决策）
- `.planning/phases/06-asset-library-foundation/06-CONTEXT.md` — D-01~D-08 验证反馈 + 字体策略

### UI 模式参考
- `src/editor/views/SettingsDesigner.vue` — 表单布局、颜色选择器、资源选择按钮的参考实现
- `src/editor/components/canvas/DraggableElement.vue` — 拖拽基础设施（可能用于排序）

### Store 模式
- `src/editor/stores/script.js` — 角色数据结构：`data.characters[id].{name, color, expressions}`
- `src/editor/stores/project.js` — Composition API Pinia store 参考

### 研究文档
- `.planning/research/ARCHITECTURE.md` — 集成架构、数据模型
- `.planning/research/PITFALLS.md` — 11 个陷阱及预防策略

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Assets.vue` 子标签切换模式（backgrounds/characters/audio tabs）→ 扩展为 4 分类
- `Assets.vue` 缩略图网格 CSS（auto-fill, minmax(140px, 1fr)）→ 背景/字体分类复用
- `Characters.vue` 侧栏+编辑区布局 → 角色子标签复用
- `assets.js` store 全部 IPC 封装 → 直接调用
- `SettingsDesigner.vue` 表单行模式（.form-row label + input）→ 角色编辑区复用
- `SettingsDesigner.vue` 颜色选择器模式（input[type=color] + hex text）→ 角色颜色编辑复用

### Established Patterns
- 暗色主题色板：`#1e1e1e`(bg) / `#252526`(cards) / `#007acc`(accent) / `#333`(borders)
- Pinia Composition API store + ref/computed + IPC wrapper
- `JSON.parse(JSON.stringify())` 解构 Vue Proxy
- `asset://category/filename` 自定义协议显示图片

### Integration Points
- `App.vue` tabs 数组：删除 'assets' + 'characters'，添加 'resource-library'
- `App.vue` tabComponents：映射新的 ResourceLibrary 组件
- `assets.js` store：已有 loadAll/importAssets/deleteAsset 等方法
- `script.js` store：角色数据 `data.characters` 的 CRUD 操作
- `electron/main.js`：可能需要新增 rename-asset IPC handler

</code_context>

<specifics>
## Specific Ideas

- 角色头像用第一张差分图的上半部分裁剪（CSS object-position: top），不是等比缩放
- 角色差分是纯资产（用户上传的图片），不提供任何图片编辑功能
- 右键菜单操作表情（重命名/删除），保持界面干净
- 拖放覆盖层用半透明蓝色（#007acc 主题色 + 透明度），与应用设计语言一致
- 音频播放器进度条可拖拽定位，不只是被动显示进度

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-asset-library-ui*
*Context gathered: 2026-03-29*
