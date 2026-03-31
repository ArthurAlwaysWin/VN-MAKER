# Phase 10: Page Data Schema & Engine Adaptation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

定义页面式数据格式（page-based schema），替代现有的命令式格式（command-based），并适配游戏引擎使其能播放页面式脚本。不涉及编辑器 UI 改造（Phase 11）。

</domain>

<decisions>
## Implementation Decisions

### 页面粒度
- **D-01:** 一页 = 一个视觉状态（背景 + 角色阵列 + BGM），包含 `dialogues[]` 数组。每个对话条目可以附带表情变化（`expression` 字段）。背景变化、角色增加/移除时才新建页面。玩家点击在同一页内推进对话，直到该页对话全部播完才翻页。

### 场景分组
- **D-02:** 保留"场景"作为页面的分组容器，类似 PPT 的"节"。数据结构为 `scenes[sceneId].pages[]`。场景提供章节/分支的自然组织边界，与现有引擎的跳转逻辑兼容。

### 视觉状态自包含
- **D-03:** 每页完整声明所有视觉信息（背景、角色列表、BGM），不从前一页继承。任意页面可独立渲染（编辑器从任意位置开始试玩）。页面排序/插入/删除不会破坏视觉状态链。

### 选择分支模型
- **D-04:** 选择页是独立的页面类型 `type: "choice"`，与普通页面 `type: "normal"` 并列。选择页包含 `prompt` 和 `options[]`，每个选项有 `text` 和 `target`（跳转到目标场景/页面）。选择页在编辑器侧栏中有视觉区分标识。

### Agent's Discretion
- 页面 ID 生成策略（自增数字/UUID/自定义名称）— Agent 决定
- BGM 为空时的引擎行为（继续播放上一页 BGM 还是静音）— Agent 决定
- 引擎在页面间的角色进出场动画处理方式 — Agent 决定
- SaveManager 状态结构细节（存 pageIndex 还是 pageId）— Agent 决定

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有引擎架构
- `src/engine/ScriptEngine.js` — 当前命令式执行引擎，需要改为页面式
- `src/engine/SaveManager.js` — 保存/加载逻辑，需适配新状态结构
- `src/engine/AudioManager.js` — BGM/SE 播放，事件驱动不变
- `src/engine/EventEmitter.js` — 事件总线，不变

### 运行时 UI 层
- `src/main.js` — 事件监听 + 用户交互处理，需适配页面式播放流程
- `src/ui/DialogueBox.js` — 对话框，消费 dialogue 事件
- `src/ui/ChoiceMenu.js` — 选项菜单，消费 choice 事件

### 编辑器数据层
- `src/editor/stores/script.js` — Pinia store，读写 script.json 数据
- `src/editor/views/Scenes.vue` — 当前场景编辑器（参考现有命令结构）

### 数据格式参考
- `public/game/script.json` — 现有命令式脚本示例

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **EventEmitter**: Engine 事件总线完全可复用，页面播放仍通过事件驱动 UI 更新
- **UI 组件**: DialogueBox, CharacterLayer, ChoiceMenu 等均消费事件，无需修改
- **AudioManager**: BGM/SE 播放 API 不变
- **SaveManager**: 核心逻辑可复用，只需修改 state 结构

### Established Patterns
- **事件驱动**: ScriptEngine emit → main.js listen → UI render。页面式播放也走这条路
- **命令执行分两类**: 阻塞型（dialogue/choice → waiting=true）和自动推进型（其余 → 继续下一条）
- **场景跳转**: `_enterScene(sceneId)` 重置 commandIndex=0，页面式改为重置 pageIndex=0

### Integration Points
- `ScriptEngine.startGame()` → 需要从 pages[0] 开始而不是 commands[0]
- `ScriptEngine.next()` → 需要区分"页面内推进对话"和"翻到下一页"
- `ScriptEngine.getState()` / `restoreState()` → 需要保存 pageIndex + dialogueIndex
- `main.js` 的 click handler → 可能需要感知"这是对话推进还是翻页"
- `script.js` Pinia store → loadFromData() 需要处理新格式

</code_context>

<specifics>
## Specific Ideas

- 编辑器核心理念"开发者不碰逻辑" — 数据格式必须对编辑器 UI 友好，不暴露复杂结构
- 页面模型参考 PPT 幻灯片：每页是完整快照，对话是页面内的"动画步骤"
- 表情变化绑定到对话行的设计来自用户讨论，避免为每次表情切换新建页面

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-page-data-schema-engine-adaptation*
*Context gathered: 2026-03-31*
