# Phase 2 实施计划：Galgame Maker Visual Editor (Vue + Electron)

## Goal

开发 Galgame Maker 的桌面端图形化编辑器。不编写代码的用户可以通过带有拖拽支持的所见即所得界面来编排场景、管理角色/资产、并一键生成/预览供运行时引擎使用的 `script.json`。

## Assumptions

- 技术栈：Vue 3 (Composition API / `<script setup>`) + Vite + Electron
- 状态管理：Pinia (用于管理当前的脚本数据和整个编辑器的状态)
- 桌面容器：Electron (利用 Node.js `fs` 直接读写本地项目目录，如读取素材目录、写入 script.json)
- 界面设计：暗黑模式，类似 IDE 的布局（侧边栏、中心工作区、右侧属性面板）
- 节点库：使用纯 CSS 或引入类似 Vue Flow 的组件实现场景流程图（初期优先列表视图）

## Plan

### Step 1: Editor 脚手架搭建 (Vue + Vite + Electron)
- **Files**: `package.json`, `electron/main.js`, `electron/preload.js`, `vite.config.ts`
- **Change**: 
  - 集成 Electron 到现有的 Vite 项目或配置双层入口。
  - 配置 IPC (Inter-Process Communication) 通道以允许 Vue 渲染进程访问本地文件。
- **Verify**: `npm run electron:dev` 能弹出一个包含 Vue 基本界面的 Electron 桌面窗口。

### Step 2: UI 框架与核心布局
- **Files**: `src/editor/App.vue`, `src/editor/components/layout/*`
- **Change**:
  - 创建类似 VS Code/Unity 的基础三栏布局：左侧导航栏（资产/角色/场景列表），中间编辑区，右侧属性检查器。
- **Verify**: 运行后看到完整的暗色系大体布局结构。

### Step 3: Project Manager 与 Asset Browser (资产管理)
- **Files**: `src/editor/stores/project.js`, `src/editor/components/AssetBrowser.vue`
- **Change**:
  - 实现本地目录的读取（通过 Electron IPC），扫描 `public/game/backgrounds`、`images` 和 `audio`。
  - 界面上以网格形式显示缩略图和文件名。
- **Verify**: 界面左侧可以列出本地已存在的图片和音频列表。

### Step 4: 角色与变量编辑器 (Character & Variables)
- **Files**: `src/editor/components/CharacterEditor.vue`, `src/editor/components/VariableEditor.vue`
- **Change**:
  - 增删改查 `characters` 数据字典（添加角色、修改颜色、绑定不同的立绘差分图片路径）。
  - 全局变量的定义与初始值设置面板。
- **Verify**: 能够添加一个新角色，并能在 JSON 对象中正确反映出来。

### Step 5: Scene Flow (场景管理器)
- **Files**: `src/editor/components/SceneList.vue`, `src/editor/stores/script.js`
- **Change**:
  - 实现场景（Scenes）的增删改查列表。
  - 允许修改场景的入口和属性。
  - (可选/后期) 使用连线节点图展示多结局分支情况。
- **Verify**: 可以在列表中添加新的场景并重命名。

### Step 6: 场景指令时间轴/列表 (Scene Detail Editor)
- **Files**: `src/editor/components/CommandEditor.vue`, `src/editor/components/commands/*`
- **Change**:
  - 在选中某一个场景时，中间展示该场景从上到下的指令列表（拖拽排序功能）。
  - 右侧显示当前选中指令的属性设置（例如：对话指令显示说话人和文本输入框；图片指令显示素材下拉菜单等）。
- **Verify**: 点选一个指令（如 dialogue），右侧能修改文字并且立刻同步到当前内存状态中。

### Step 7: 实时预览集成 (Live Preview)
- **Files**: `src/editor/components/PreviewWindow.vue`
- **Change**:
  - 利用 iframe 或者直接在 Electron 内挂载 Phase 1 写好的 `ScriptEngine` 画布。
  - 将当前编辑器内存中的 `script.json` 直接发送给引擎，并在编辑区旁边即时预览执行效果。
- **Verify**: 点击"预览"按钮，可以看到弹出的引擎窗口并完整运行当前的剧本数据。

## Risks & Mitigations

| 风险 | 缓解 |
|------|------|
| Electron 与 Vite 集成时的相对路径与打包问题 | 参考社区成熟模板（如 `electron-vite`），确保开发与打包环境路径一致 |
| 拖拽排序体验卡顿 | 采用成熟的 Vue 拖拽库如 `vuedraggable` 或 `Sortable.js` |
| IPC 通信带来的异步延迟 | 在 Vue 的 Store (Pinia) 内维护状态树，只在保存时通过 IPC 写入文件，减少高频 IO |

## Rollback Plan

- 由于加入 Electron 和重构目录结构改动较大，所有新代码先放在 `src/editor` 或另外新建分支，保障 `main` 分支原先的纯 Web 运行时不受影响。
- 如果打包有严重阻塞问题，可以退回仅仅通过浏览器操作 API (`showDirectoryPicker`) 的纯 Web 方案。
