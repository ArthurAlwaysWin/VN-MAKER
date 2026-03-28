# Galgame Maker — 开发进度

## 已完成的阶段

### Phase 1: 运行时引擎 MVP ✅
- 脚本引擎：JSON 驱动事件系统
- 角色系统：多角色同屏、表情、进出场动画
- 对话系统：打字机效果、说话人高亮
- 选项/分支：条件跳转、变量系统
- 背景/音频：交叉渐变、BGM/SE
- 存档系统：8 槽位 localStorage
- 系统菜单：ESC 呼出

### Phase 2: PPT 式画布编辑器 ✅
- 1280×720 可视化画布预览
- 拖拽元素自由定位（角色、对话框、选项菜单）
- 标题页自定义拖拽布局
- 场景编辑：时间线 + 画布双模式
- CSS 消毒 + 坐标边界检查
- 撤销/重做 + 中文 UI + 素材上传

### Phase 3A: 项目系统 + 编辑器工作流重构 ✅
- **Electron IPC 重写**：项目创建/打开/加载/保存/关闭全套 IPC
- **asset:// 自定义协议**：项目内素材加载（含路径遍历防护）
- **原子写入**：temp → rename 模式防数据丢失（Windows 兼容）
- **Pinia 项目 Store**：projectData、isDirty、保存竞态锁
- **Script Store 重构**：loadFromData/reset、_skipWatch 防止 undo/redo 栈损坏
- **欢迎界面**：Figma 风格居中布局 + 最近项目列表
- **项目创建**：首次 4 步向导 + 后续快速创建
- **6 标签页导航**：TabBar 组件 + keep-alive 切换
  - 游戏内容（Scenes）、标题页、设置页（占位）、素材库、角色、项目设置
- **App.vue 状态机**：welcome → editing 双模式
- **素材面板 AssetPanel**：140px 侧栏，拖拽到画布自动创建指令
- **自动保存**：2s 防抖 + Ctrl+S 手动保存
- **窗口关闭保护**：3 选项对话框（保存/不保存/取消）
- **键盘快捷键**：Ctrl+Z 撤销、Ctrl+Y 重做、Ctrl+S 保存
- **安全措施**：路径遍历防护、CSS 消毒、项目名消毒、保存竞态锁
- **移除 vue-router**：改用 component :is + keep-alive

---

## 已知问题（待修复）

### 🔴 文件对话框不弹出（高优先级）
**症状**：在创建项目向导中，点击"浏览..."按钮选择保存位置时没有反应。

**已尝试的修复**：
- 所有 `dialog.showOpenDialog()` 和 `dialog.showMessageBox()` 已添加 `win` 父窗口参数
- 添加了 try-catch 错误处理

**排查方向**：
1. 打开 DevTools (F12)，在 Console 中查看是否有错误信息
2. 检查点击"浏览..."按钮时，Console 是否输出 `Failed to open directory dialog` 错误
3. 可能的原因：
   - `win` 变量在 IPC handler 调用时为 `undefined`（变量声明在 handler 之后）
   - preload 的 `contextBridge` 限制了某些 IPC 行为
   - Electron 安全策略阻止了 dialog 调用
4. 调试步骤：在 DevTools Console 中输入 `window.ipcRenderer.invoke('dialog-open-directory').then(console.log).catch(console.error)` 直接测试 IPC

### 🟡 vite-plugin-electron Windows 热重载崩溃（低优先级）
**症状**：修改 electron/main.js 后，热重载时偶尔报 `taskkill /pid xxx /T /F` 找不到进程的错误，导致 dev server 退出。

**原因**：vite-plugin-electron 在 Windows 上使用 `taskkill` 杀旧进程时，进程已经退出。

**临时解决**：重新运行 `npm run dev` 即可。

---

## 下一步：Phase 3B

### 计划内容
1. **设置页设计器**：自定义游戏设置页的布局和功能
2. **桌面应用导出**：打包为独立可运行的 Electron 应用

### 前置条件
- 修复文件对话框问题
- 完成 Phase 3A 的手动集成测试

---

## 项目架构概览

```
galgame-maker/
├── electron/
│   ├── main.js          # Electron 主进程（IPC、asset:// 协议、原子写入）
│   └── preload.js       # 安全桥接（contextBridge）
├── src/
│   ├── engine/          # 游戏运行时引擎
│   ├── editor/
│   │   ├── App.vue      # 状态机（welcome/editing）+ 标签导航
│   │   ├── main.js      # Vue 3 + Pinia 入口
│   │   ├── stores/
│   │   │   ├── project.js   # 项目状态（路径、数据、保存）
│   │   │   └── script.js    # 脚本状态（undo/redo、历史）
│   │   ├── views/
│   │   │   ├── WelcomeScreen.vue
│   │   │   ├── CreateProjectWizard.vue
│   │   │   ├── CreateProjectQuick.vue
│   │   │   ├── Scenes.vue           # 场景编辑器 + AssetPanel
│   │   │   ├── Assets.vue           # 素材管理
│   │   │   ├── Characters.vue       # 角色管理
│   │   │   ├── ProjectSettings.vue  # 项目设置
│   │   │   ├── TitleDesigner.vue    # 标题页（占位）
│   │   │   └── SettingsDesigner.vue # 设置页（Phase 3B 占位）
│   │   └── components/
│   │       ├── TabBar.vue       # 标签栏
│   │       ├── AssetPanel.vue   # 素材拖拽面板
│   │       └── canvas/          # 画布预览组件
│   └── ...
├── docs/
│   ├── script-format.md         # 脚本格式规格
│   ├── progress.md              # 本文件
│   └── superpowers/
│       ├── specs/               # 设计规格
│       └── plans/               # 实施计划
└── public/game/                 # 示例游戏素材
```

## 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 路由方案 | component :is + keep-alive | 避免 vue-router 与标签页的冲突 |
| 项目格式 | 文件夹（project.json + script.json + assets/） | 方便版本控制和素材管理 |
| 素材加载 | asset:// 自定义协议 | 避免硬编码路径，支持任意项目位置 |
| 保存策略 | 原子写入（temp → rename） | 防止断电或崩溃导致数据丢失 |
| 状态管理 | Pinia store | Vue 3 官方推荐，简洁高效 |
