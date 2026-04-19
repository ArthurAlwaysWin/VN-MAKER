# Editor Tab Reorganization — 按游戏页面重组编辑器标签页

## Problem

编辑器现有 8 个标签页，其中设置页相关的配置分散在 4 个 Tab 里（设置页、主题、控件风格、界面布局），用户要自定义游戏设置页需要在多个 Tab 间跳转。游戏内只有少数几个页面（标题页、设置页、游戏菜单、存读档、回想），应按游戏页面组织编辑器标签页，每个页面的所有配置集中在一处。

## Approach

按游戏页面重新组织编辑器 Tab 结构，每个游戏页面一个 Tab，集成该页面的全部配置和 iframe 实时预览。取消设置页的画布拖拽模式，全部改用表单 + iframe 预览。全局配色和主题功能移入项目设置。

## New Tab Structure

| # | Icon | Label | Component | Source |
|---|------|-------|-----------|--------|
| 1 | 🎬 | 游戏内容 | PageEditor | 不变 |
| 2 | 🖼️ | 标题页 | TitleDesigner | 不变 |
| 3 | ⚙️ | 设置页 | **SettingsPageEditor** (新建) | 合并 SettingsDesigner + WidgetStylesEditor + SettingsSection |
| 4 | 🎮 | 游戏菜单 | **GameMenuEditor** (新建) | 从 ScreenLayoutEditor 拆出 |
| 5 | 📋 | 存读档 | **SaveLoadEditor** (新建) | 从 ScreenLayoutEditor 拆出 |
| 6 | 📖 | 回想 | **BacklogEditor** (新建) | 从 ScreenLayoutEditor 拆出 |
| 7 | 📦 | 资源库 | ResourceLibrary | 不变 |
| 8 | ⚡ | 项目设置 | ProjectSettings (扩展) | 现有 + SmartColor + 主题 |

**删除的 Tab:** 🎨 主题 / 🎛️ 控件风格 / 📐 界面布局

## Component Design

### 3.1 SettingsPageEditor.vue (新建, ~300 行)

**Layout:** 左侧表单面板 (360px, scrollable) + 右侧 iframe 预览

**左侧 collapsible sections:**

1. **📌 Tab 结构**
   - TabCrudSection (复用) — Tab 增删改名 + 图标选择
   - SettingMatrix (复用) — 设置项按 Tab 分配
   - Tab 位置切换 (top/left)

2. **📐 布局与行样式**
   - LayoutControlsSection (复用) — 列数(1/2), 分隔线, 斑马条纹, 标签位置, 数值标签

3. **🎛️ 控件风格**
   - TabShapeSection (复用)
   - ToggleStyleSection (复用)
   - SliderConfigSection (复用)
   - PanelConfigSection (复用)
   - ButtonConfigSection (复用)

4. **🎨 装饰与背景** (Phase 58 内容 — 暂为空壳)
   - 头部装饰图管理 (add/remove, x/y/width/height)
   - 底部按钮配置 (text + action: close/title/reset)
   - 面板背景图 + 透明度
   - 关闭按钮模式 (icon/text)

**右侧 iframe:**
- 加载 `/index.html`
- 接收三种 postMessage: `update-theme`, `update-widget-styles`, `update-screen-layout`
- 引擎 start 后发送 `show-screen: settingsScreen` 打开设置页
- SettingsSection.vue 的现有字段全部保留并纳入对应 section：
  - 标题栏配置（text, color, fontSize, height, backgroundImage）→ 放入「Tab 结构」section 底部
  - 内容区定位（x, y, width, height）→ 放入「布局与行样式」section 顶部

**Composable strategy:**
- 创建 `useSettingsPageEditor()` 工厂函数
- 内部协调三个数据流：widget styles + screen layout (settingsScreen) + theme tokens
- 统一 debounce 200ms，合并为一次 postMessage batch
- Provide via Symbol key，子组件 inject 使用

### 3.2 GameMenuEditor.vue (新建, ~80 行)

**Layout:** 左侧 GameMenuSection (复用) + 右侧 iframe 预览

**Composable:** 创建独立 `useScreenLayoutEditor()` 实例，`activeScreen` 固定为 `'gameMenu'`

**改动:** GameMenuSection 的 inject 来源从共享实例变为本 view 的 provide。组件代码本身无需修改——它通过 `useScreenLayoutEditor()` inject 读写数据，只要 provide 正确即可。

### 3.3 SaveLoadEditor.vue (新建, ~80 行)

与 GameMenuEditor 结构相同，`activeScreen = 'saveLoadScreen'`，左侧使用 SaveLoadSection。

### 3.4 BacklogEditor.vue (新建, ~80 行)

与 GameMenuEditor 结构相同，`activeScreen = 'backlogScreen'`，左侧使用 BacklogSection。

### 3.5 ProjectSettings.vue (扩展)

**Layout 变更:** 从纯表单变为左侧表单 + 右侧 iframe 预览（与 ThemeDesigner 相同的 split layout）

**左侧面板新增内容:**

1. **🎨 全局配色**
   - SmartColorPanel (复用) — 双取色器 + 暗/亮模式 + 和谐算法
   - TokenAccordion (复用) — 41 个 token 精细编辑

2. **🖼️ 九宫格贴图**
   - NineSliceModal 触发入口

3. **📦 内置主题**
   - PresetModal — 5 套一键应用
   - ThemePackageModal — 导入/导出

**Composable:** 复用 `useThemeEditor()` 的 `createThemeEditor()` 工厂，provide 给 SmartColorPanel 和 TokenAccordion。

### 3.6 App.vue (修改)

```javascript
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-page', icon: '⚙️', label: '设置页' },
  { id: 'game-menu', icon: '🎮', label: '游戏菜单' },
  { id: 'save-load', icon: '📋', label: '存读档' },
  { id: 'backlog', icon: '📖', label: '回想' },
  { id: 'resource-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚡', label: '项目设置' },
];

const tabComponents = {
  'scenes': markRaw(PageEditor),
  'title': markRaw(TitleDesigner),
  'settings-page': markRaw(SettingsPageEditor),
  'game-menu': markRaw(GameMenuEditor),
  'save-load': markRaw(SaveLoadEditor),
  'backlog': markRaw(BacklogEditor),
  'resource-library': markRaw(ResourceLibrary),
  'project-settings': markRaw(ProjectSettings),
};
```

Remove imports: ThemeDesigner, WidgetStylesEditor, ScreenLayoutEditor, SettingsDesigner

## Composable Refactoring

### useScreenLayoutEditor.js changes

Current: `activeScreen` is a reactive ref toggled by the parent ScreenLayoutEditor.

Change: Support passing a fixed `screenId` parameter to `createScreenLayoutEditor(screenId?)`:
- If `screenId` provided: lock `activeScreen` to that value (no switching)
- If not provided: behave as before (reactive switching)

This lets GameMenuEditor/SaveLoadEditor/BacklogEditor each create their own instance with a fixed screen.

### New: useSettingsPageEditor.js

Factory function that coordinates:
1. Widget styles data (from `useWidgetStylesEditor` pattern)
2. Screen layout data for settingsScreen (from `useScreenLayoutEditor` pattern)
3. A single shared iframe ref

Exposes:
- `iframeRef`, `isEngineReady`
- `setWidgetField(category, field, value)` — delegates to widget styles logic
- `setScreenField(field, value)` / `setScreenNestedField(group, field, value)` — delegates to screen layout logic
- `startEngine()`, `onEngineMessage()`, `cleanup()`
- Unified debounced preview: sends both `update-widget-styles` and `update-screen-layout` in one batch

Provides via Symbol key for child components to inject.

## iframe Navigation

New postMessage type: `show-screen`

```javascript
iframe.contentWindow.postMessage({
  type: 'show-screen',
  screenId: 'settingsScreen' // or 'saveLoadScreen', 'backlogScreen', 'gameMenu'
}, '*');
```

Engine's `main.js` handles this by calling the screen's `.show()` method with appropriate preview-mode arguments:
- `settingsScreen.show()` — no special args
- `gameMenu.show()` — no special args
- `saveLoadScreen.show('save', 'preview')` — default to save mode, preview source
- `backlogScreen.show([], {})` — empty history and chars for preview layout

Each editor Tab sends `show-screen` after engine `start` completes and initial layout flush. Project Settings iframe shows settingsScreen by default (most tokens visible there).

**ThemeToolbar.vue:** Currently a sub-component within ThemeDesigner.vue (not a separate file). Its preset/import/export trigger buttons will be inlined into ProjectSettings.vue's expanded template directly; no separate component needed.

## Backward Compatibility

- Engine retains `elements[]` absolute-positioning renderer — no engine code removed
- Editor no longer provides canvas-based drag-drop for settings page
- Old projects with `elements[]` data: engine still renders them correctly
- No automatic migration in this phase; future phase could add "upgrade to structured layout" prompt
- SettingsDesigner.vue is soft-deleted (removed from tabs/imports but kept in git history)

## Files Changed

### New files
- `src/editor/views/SettingsPageEditor.vue` (~300 lines)
- `src/editor/views/GameMenuEditor.vue` (~80 lines)
- `src/editor/views/SaveLoadEditor.vue` (~80 lines)
- `src/editor/views/BacklogEditor.vue` (~80 lines)
- `src/editor/composables/useSettingsPageEditor.js` (~150 lines)

### Modified files
- `src/editor/App.vue` — tab definitions + component imports
- `src/editor/views/ProjectSettings.vue` — split layout + theme components
- `src/editor/composables/useScreenLayoutEditor.js` — fixed screenId mode
- `src/main.js` — handle `show-screen` postMessage

### Deleted files
- `src/editor/views/ThemeDesigner.vue`
- `src/editor/views/WidgetStylesEditor.vue`
- `src/editor/views/ScreenLayoutEditor.vue`
- `src/editor/views/SettingsDesigner.vue`

Note: `DraggableElement.vue` is NOT deleted — TitleDesigner still uses it.

## Success Criteria

1. 编辑器 8 个 Tab 按游戏页面组织，每个游戏界面集成全部配置
2. 设置页 Tab 内所有设置（Tab 结构 + 控件风格 + 行样式 + 装饰背景）通过表单 + iframe 预览完成
3. 游戏菜单/存读档/回想各自独立 Tab，有 iframe 实时预览
4. 全局配色（SmartColor + Token 编辑）在项目设置中，带 iframe 预览
5. 内置主题选择和导入/导出在项目设置中
6. 旧项目的 `elements[]` 数据引擎仍能正常渲染
7. 所有现有功能不丢失（只是重新组织位置）
