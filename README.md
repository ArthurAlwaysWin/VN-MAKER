# Galgame Maker — 开发进度报告

## 一、Phase 1 阶段性成果（运行时引擎 MVP）

### 已完成的功能模块

| 模块 | 文件 | 功能 |
|------|------|------|
| **脚本引擎** | `ScriptEngine.js` | JSON 脚本加载、指令执行、变量/条件/跳转、状态保存恢复 |
| **事件系统** | `EventEmitter.js` | 轻量级发布-订阅模式，模块间解耦通信 |
| **对话框** | `DialogueBox.js` | 打字机效果、说话人显示、点击推进/跳过 |
| **角色立绘** | `CharacterLayer.js` | 多角色同屏、位置（左/中/右）、表情切换、进出场过渡动画 |
| **背景系统** | `BackgroundLayer.js` | 双层交叉渐变转场 |
| **音频管理** | `AudioManager.js` | BGM（循环/淡入淡出）、SE（一次性播放） |
| **选项分支** | `ChoiceMenu.js` | 选择肢 UI、变量设置、场景跳转 |
| **存档系统** | `SaveManager.js` | 8 槽位 localStorage 存档，预览文字+时间戳 |
| **存读档 UI** | `SaveLoadScreen.js` | 存档/读档网格界面 |
| **回想功能** | `BacklogScreen.js` | 可滚动的对话历史记录 |
| **系统设置** | `SettingsScreen.js` | BGM/SE 音量、文字速度、Auto 等待时间 |
| **设置持久化** | `ConfigManager.js` | 用户设置 localStorage 持久化 |
| **标题画面** | `TitleScreen.js` | 开始游戏、继续游戏、设定 |
| **游戏菜单** | `GameMenu.js` | ESC/右键呼出，存档/读档/回想/设定/返回标题 |

### 操作方式

| 操作 | 效果 |
|------|------|
| **点击画面任意位置** | 推进对话 |
| **右键** | 呼出/关闭游戏菜单 |
| **ESC** | 呼出/关闭游戏菜单 |
| **空格 / Enter** | 推进对话 |
| **A** | 切换 Auto 模式 |
| **S** | 切换 Skip 模式 |
| **L** | 打开回想 |

### 技术栈

- **构建工具**: Vite（端口 3000）
- **语言**: 纯 JavaScript（ES Modules），无框架
- **样式**: 纯 CSS，暗色毛玻璃主题
- **数据格式**: JSON 脚本（详见 [script-format.md](file:///e:/projects/my-awesome-project/docs/script-format.md)）
- **目标平台**: Windows 10/11 桌面浏览器（Chrome / Edge）

---

## 二、Phase 2 展望：可视化编辑器

### 目标

让不懂编程的用户也能通过 **图形化界面** 制作完整的视觉小说，无需手写 JSON。

### 核心功能规划

#### 1. 场景编辑器（Scene Editor）
- **时间轴视图**：类似视频编辑软件，横轴为时间/指令顺序，可拖拽排列指令
- **指令面板**：点选添加对话、立绘、背景、音频、分支等指令，通过表单填写参数
- **实时预览**：编辑即所见，右侧实时预览当前场景效果

#### 2. 场景流程图（Scene Flow Graph）
- **节点图**：每个场景是一个节点，选项分支用连线表示跳转关系
- **可视化分支**：一目了然地看到整个游戏的分支结构和结局走向
- **拖拽连线**：直接拖拽创建场景间的跳转关系

#### 3. 资源管理器（Asset Manager）
- **拖拽上传**：直接拖拽图片/音频到项目中
- **资源分类**：背景、角色立绘、BGM、SE 等分类管理
- **缩略图预览**：图片资源缩略图，音频资源可试听

#### 4. 角色管理（Character Manager）
- **角色档案**：设置角色名、名字颜色
- **表情管理**：上传不同表情的立绘，可视化预览
- **快捷引用**：编辑对话时直接选角色和表情

#### 5. 变量与条件编辑器
- **变量面板**：创建和管理游戏变量（好感度、标志位等）
- **条件构建器**：可视化设置条件判定（如：好感度 >= 5 → 好结局）

#### 6. 导出功能
- **Web 导出**：打包为静态网站（可部署到任意服务器）
- **桌面导出**：通过 Electron 封装为 Windows .exe 独立应用
- **项目文件**：保存/加载编辑器项目（.galgame 格式）

### 技术选型方向

| 组件 | 候选方案 |
|------|----------|
| 编辑器框架 | React / Vue + 自定义 UI |
| 节点图 | React Flow / Rete.js |
| 时间轴 | 自研拖拽组件 |
| 桌面导出 | Electron / Tauri |
| 项目管理 | IndexedDB + File System API |

---

## 三、现阶段如何制作 Demo

当前引擎完全通过 `public/game/script.json` 驱动。你只需要 **编辑 JSON + 放入资源文件** 即可制作一个完整的视觉小说 Demo。

### 制作流程

#### Step 1：准备素材

将素材放入 `public/game/` 对应目录：

```
public/game/
├── backgrounds/     ← 背景图（推荐 1280×720 或 16:9 图片）
│   ├── school.png
│   ├── classroom.png
│   └── sunset.png
├── characters/      ← 角色立绘（推荐 PNG 透明底，高度匹配 720px）
│   ├── hero_normal.png
│   ├── hero_smile.png
│   ├── heroine_normal.png
│   └── heroine_blush.png
└── audio/           ← 音频（BGM 用 MP3/OGG，SE 用 MP3/WAV）
    ├── bgm_main.mp3
    ├── bgm_sad.mp3
    └── se_door.mp3
```

#### Step 2：编辑 script.json

```json
{
  "meta": {
    "title": "你的游戏标题",
    "version": "1.0.0",
    "author": "你的名字",
    "resolution": { "width": 1280, "height": 720 }
  },

  "characters": {
    "hero": {
      "name": "主角",
      "color": "#7EB6FF",
      "expressions": {
        "normal": "characters/hero_normal.png",
        "smile": "characters/hero_smile.png"
      }
    },
    "heroine": {
      "name": "女主",
      "color": "#FF9CAE",
      "expressions": {
        "normal": "characters/heroine_normal.png",
        "blush": "characters/heroine_blush.png"
      }
    }
  },

  "scenes": {
    "start": {
      "name": "第一幕",
      "commands": [
        { "type": "set_background", "image": "backgrounds/school.png", "transition": "fade", "duration": 1000 },
        { "type": "play_bgm", "file": "audio/bgm_main.mp3", "volume": 0.6, "fadeIn": 2000 },
        { "type": "dialogue", "speaker": null, "text": "旁白文字（speaker 为 null）" },
        { "type": "show_character", "id": "heroine", "expression": "normal", "position": "center", "transition": "fade", "duration": 600 },
        { "type": "dialogue", "speaker": "heroine", "text": "你好，这是女主的台词。" },
        { "type": "set_expression", "id": "heroine", "expression": "blush" },
        { "type": "dialogue", "speaker": "heroine", "text": "（切换表情后的台词）" },
        {
          "type": "choice",
          "prompt": "你想说什么？",
          "options": [
            { "text": "选项A", "jump": "scene_a", "setVariable": { "love": 1 } },
            { "text": "选项B", "jump": "scene_b" }
          ]
        }
      ]
    },
    "scene_a": {
      "name": "分支A",
      "commands": [
        { "type": "dialogue", "speaker": "hero", "text": "这是选了A之后的剧情。" },
        { "type": "jump", "target": "ending_check" }
      ]
    },
    "scene_b": {
      "name": "分支B",
      "commands": [
        { "type": "dialogue", "speaker": "hero", "text": "这是选了B之后的剧情。" },
        { "type": "jump", "target": "ending_check" }
      ]
    },
    "ending_check": {
      "name": "结局判定",
      "commands": [
        {
          "type": "condition",
          "variable": "love",
          "operator": ">=",
          "value": 1,
          "trueJump": "good_end",
          "falseJump": "bad_end"
        }
      ]
    },
    "good_end": {
      "name": "好结局",
      "commands": [
        { "type": "dialogue", "speaker": null, "text": "【GOOD END】" },
        { "type": "end" }
      ]
    },
    "bad_end": {
      "name": "普通结局",
      "commands": [
        { "type": "dialogue", "speaker": null, "text": "【NORMAL END】" },
        { "type": "end" }
      ]
    }
  }
}
```

#### Step 3：运行测试

```bash
npm run dev
```

浏览器打开 `http://localhost:3000/` 即可看效果。修改 JSON 后保存，Vite 会自动热更新。

### 可用指令速查

| 指令 | 作用 | 关键参数 |
|------|------|----------|
| `dialogue` | 显示对话 | `speaker`（角色ID 或 null）、`text` |
| `show_character` | 显示角色 | `id`、`expression`、`position`（left/center/right）、`transition`、`duration` |
| `hide_character` | 隐藏角色 | `id`、`transition`、`duration` |
| `set_expression` | 切换表情 | `id`、`expression` |
| `set_background` | 切换背景 | `image`、`transition`（fade/none）、`duration` |
| `play_bgm` | 播放背景音乐 | `file`、`volume`、`fadeIn` |
| `stop_bgm` | 停止背景音乐 | `fadeOut` |
| `play_se` | 播放音效 | `file` |
| `choice` | 分支选项 | `prompt`、`options`（含 `text`、`jump`、`setVariable`） |
| `jump` | 跳转场景 | `target` |
| `set_variable` | 设置变量 | `name`、`value` |
| `condition` | 条件跳转 | `variable`、`operator`、`value`、`trueJump`、`falseJump` |
| `end` | 结束游戏 | 无 |

> [!TIP]
> 完整格式文档参见 [script-format.md](file:///e:/projects/my-awesome-project/docs/script-format.md)
