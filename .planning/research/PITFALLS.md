# Domain Pitfalls — v1.5 UI 图片驱动体系

**Domain:** 现有 VN Maker 的图片驱动 UI 主题升级  
**Researched:** 2026-04-22  
**Overall confidence:** HIGH — 主要基于本仓库现状代码、`.planning/PROJECT.md`、`docs/gap-analysis-vs-mature-engines.md` 的直接审查

---

## Milestone-Scoped Boundaries

v1.5 应该交付的是：**固定范围、项目内可拥有、运行时真实可预览** 的图片化 UI 通路，不是通用 UI 平台。

**v1.5 内必须坚持的边界：**

- **只做已知界面与已知槽位**：对话框 / 按钮 / 全屏界面背景 / 光标 / 图标集，不做任意组件注册表
- **项目内资产归属统一**：保存到项目 `assets/ui/`，`script.json` 只存相对路径，不存长期 base64
- **预览必须走真实 runtime owner**：延续 v1.4 的 runtime-backed iframe 原则
- **CSS 主题仍然是一等公民**：图片字段为空时必须回退到现有 token/CSS 外观
- **导出可用是定义的一部分**：Web/桌面导出漏图片 = 功能未完成

**明确不属于 v1.5：**

- 通用插件/扩展系统
- 任意 CSS selector 注入
- 任意数量的装饰层/任意 UI 组件注册
- 社区主题市场
- 资源压缩管线

---

## Critical Pitfalls

### Pitfall 1: 主题资产来源失控，最后没人知道“图到底归谁管”

**What goes wrong:**  
同一类 UI 图片同时以三种方式存在：  
1. 项目资产库 `assets/ui/*`  
2. 配置里的任意字符串路径（当前 `SaveLoadSection.vue` / `BacklogSection.vue` / `GameMenuSection.vue` 已大量使用文本输入）  
3. `NineSliceModal.vue` 这种直接写进 `ui.theme.nineSlice` 的 base64 data URL

**Why it happens:**  
仓库现在已经存在三套资产入口：资产库、自由文本路径、base64 嵌入。v1.5 如果继续沿用，图片越多越乱。

**Failure modes:**  
- `script.json` 被 base64 图片迅速撑大  
- 同一张图在 `assets/ui` 和 JSON 里重复保存  
- 重命名/删除资产后引用失效但没人发现  
- 主题导出/导入时无法判断哪些图片属于项目、哪些属于主题包

**Warning signs:**  
- 新字段继续用 `<input type="text" placeholder="图片路径">`  
- 新图片面板继续用 `FileReader.readAsDataURL()` 直接持久化到项目数据  
- 相同图片既能填 `ui/foo.png`，又能填绝对路径，又能贴 base64

**Prevention:**  
1. **v1.5 共享 requirement（跨 65-69）**：项目保存格式只允许 **项目相对路径**（如 `ui/dialogue/frame.png`）。  
2. **Phase 69 / UIIMG-05**：图片选择统一走资产库/`selectAsset(['ui'])`，不要再新增自由文本路径主入口。  
3. **v1.5 兼容规则**：允许旧 base64 / 旧字符串读入，但编辑器一旦重新选择资源，应立刻复制到 `assets/ui` 并改写为相对路径。  
4. **v1.6 Phase 70**：主题包格式升级时再处理“主题级资产清单 + 打包复制”。

**Mitigation belongs to:**  
**v1.5 shared schema gate + Phase 69**, 后续完整封装归 **v1.6 / Phase 70**

---

### Pitfall 2: 导出链路看起来能跑，实际上图片主题一导出就丢

**What goes wrong:**  
当前 `scanAssets.js` 只扫描场景背景/音频/字体/角色/`titleScreen`/`settingsScreen` 的少数路径，不扫描：

- `ui.theme.nineSlice`
- `ui.widgetStyles.*Image`
- `ui.saveLoadScreen` / `ui.backlogScreen` / `ui.gameMenu` 中的图片字段
- v1.5 新增的对话框装饰层、按钮三态、光标、图标集

**Why it happens:**  
导出系统是 v0.7 建的，当时还没有“图片驱动 UI 全面铺开”。

**Failure modes:**  
- 编辑器里主题正常，导出 Web/桌面后按钮/背景全丢  
- 只在本机能用，因为预览读的是项目文件，导出包没拷进去  
- 某些界面正常、某些界面退回默认 CSS，形成“半成品皮肤”

**Warning signs:**  
- v1.5 改了运行时 schema，但 `scanAssets.js` 没同步扩字段  
- 新图片功能只在编辑器预览验证，没有做一次真实导出回归  
- PR 里出现“先不管导出，后面再补”

**Prevention:**  
1. **v1.5 shared export requirement（发版前）**：所有新 UI 图片字段必须进入 `scanAssets()`。  
2. 给 `scanAssets()` 建一份 **UI image field registry**，不要散落 `if (cfg.xxx)`。  
3. 增加回归：**导出 Web / 导出桌面 / 打开导出产物 / 检查 5 类界面图片存在**。  
4. **v1.6 Phase 70** 再处理 `.gmtheme` 内部资产打包；但 **项目导出漏图不能等 v1.6**。

**Mitigation belongs to:**  
**v1.5 cross-cutting acceptance gate**, 主题包深化归 **v1.6 / Phase 70**

---

### Pitfall 3: 编辑器预览和运行时开始各画各的，v1.4 刚解决的问题又回来了

**What goes wrong:**  
图片驱动 UI 很容易诱导出“做个本地小预览就行”。但当前仓库已经明确在 v1.4 选择了 **runtime-backed iframe preview**；如果 v1.5 对话框装饰层、按钮 hover/active、全屏背景层改成 Vue 本地模拟，编辑器和游戏实际渲染会再次漂移。

**Repo evidence:**  
- `main.js` 已支持 `update-theme` / `update-screen-layout` / `show-screen`  
- `useScreenLayoutEditor.js` 已用 iframe runtime 展示 SaveLoad / Backlog / GameMenu / Settings  
- 但 `DialogueBoxSettings.vue` 右侧仍是本地 mini preview，只适合字体，不适合图片层级

**Failure modes:**  
- 编辑器里名牌装饰位置正确，游戏里被真实 DOM/CSS 层级压住  
- 本地 hover/active 预览正确，运行时按钮状态切换错误  
- 编辑器能显示多层装饰，导出游戏只显示最底层

**Warning signs:**  
- 新增 `PreviewDialogueBox.vue` 之类本地模拟组件  
- 图片层顺序、状态切换逻辑在 Vue 里再写一套  
- “iframe 没 ready 先本地假预览一下”

**Prevention:**  
1. **Phase 65 / UIIMG-01**：对话框图片化预览必须走真实 `DialogueBox` runtime。  
2. **Phase 66-69**：按钮状态、背景层、图标/光标都通过 iframe runtime 更新，不在编辑器 DOM 重做。  
3. 保留本地 mini preview 只能做“非权威辅助预览”，不能作为图片层级验收依据。  
4. 如果 iframe 未 ready，明确禁用预览，不做 silent fallback。

**Mitigation belongs to:**  
**Phase 65 + Phase 69**

---

### Pitfall 4: 覆盖面不完整，最后得到的是“只有标题页像游戏，别的界面还是软件”

**What goes wrong:**  
v1.5 最容易做成“核心 demo 好看，实际产品不完整”。当前 `ThemeManager.js` 只把九宫格挂到 6 个目标；按钮三态只支持 `choiceButton` 和 `titleButton`。但现有 CSS 里真正影响观感的按钮远不止这些：

- `.game-menu-button`
- `.save-load-close`
- `.backlog-close`
- `.page-tab`
- `.save-confirm-btn`
- `.save-slot-delete`
- `.backlog-voice-btn`
- `.qab-btn`
- `.settings-close`

**Why it happens:**  
按组件逐个补最容易漏“次按钮”和“状态按钮”。

**Failure modes:**  
- 主按钮换肤了，关闭按钮还是默认灰框  
- 存读档主体有背景插画，但分页 tab/确认按钮风格完全不搭  
- 玩家一眼看出“只有常用路径做了图，边角没做完”

**Warning signs:**  
- 需求只写“大按钮支持三态”，没写覆盖清单  
- PR 截图只展示标题页/对话框，不展示 SaveLoad / Backlog / GameMenu / Settings 全套  
- 代码里继续按 selector 零散追加，不先列 matrix

**Prevention:**  
1. **v1.5 shared requirement**：先冻结一份 **screen × element coverage matrix**，再开发。  
2. **Phase 66 / UIIMG-02**：以“按钮族”验收，不以“某个按钮成功”验收。  
3. **Phase 67 / UIIMG-03**：全屏背景和装饰层要按界面清单验收，不能只做 SaveLoad。  
4. 所有未配置图片的元素必须有 **一致 CSS fallback**，避免出现空白或透明点击区。

**Mitigation belongs to:**  
**Phase 66 + Phase 67**, matrix 先作为 **v1.5 requirement gate**

---

### Pitfall 5: 兼容性回退没守住，旧项目和 CSS 主题被新系统“反向伤害”

**What goes wrong:**  
当前大量主题仍是 **CSS/token 驱动**：比如 `modern-sky`、`minimal-white` 没有完整图片包。旧项目也可能根本没有 `ui.theme` / `ui.widgetStyles` / 新图片字段。v1.5 如果把图片层当主路径，容易把“没图”误判为“不完整状态”。

**Failure modes:**  
- 老项目打开后界面变空、透明、排版错位  
- 纯 CSS 主题被迫显示错误占位图或无意义边框  
- 导入旧 `.theme` 后只有一半字段生效，另一半被错误重置

**Warning signs:**  
- 新 renderer 遇到 `null` 图片时不回退现有 CSS  
- migration 自动写入大量空对象/空数组  
- 导入旧 `.theme` 时直接覆盖为新 schema 默认值

**Prevention:**  
1. **v1.5 compatibility requirement**：所有图片字段都必须是 **可选增强**，`null/缺失 => 当前 CSS 外观保持不变`。  
2. 不做强制 migration，不为旧项目 materialize 一整套图片 schema。  
3. 保持现有 `.theme` 导入可用；新能力缺失时只丢“增强”，不丢旧外观。  
4. **v1.6 Phase 70** 再扩展 richer theme package；不要在 v1.5 破坏旧包。

**Mitigation belongs to:**  
**v1.5 compatibility gate**, 包格式演进归 **v1.6 / Phase 70**

---

### Pitfall 6: 为了解决“图片不够自由”，把 v1.5 做成半个插件系统

**What goes wrong:**  
会出现很强的诱惑：既然要支持更多图片层，不如顺手做通用 `layers[]`、任意 selector、任意组件皮肤、主题脚本钩子。这样很快就会踩到 `docs/gap-analysis-vs-mature-engines.md` 里明确放到 **第三层自由度 / v1.8+** 的领域。

**Failure modes:**  
- schema 从固定槽位膨胀成自由 JSON DSL  
- 编辑器需要做通用组件编排和验证  
- 预览、导出、兼容性、资产扫描复杂度同时爆炸  
- v1.5 交付延迟，但用户拿到的还是不稳定半平台

**Warning signs:**  
- 新字段命名成 `customComponents` / `layers[]` / `selectors[]`  
- 讨论从“这几个按钮怎么配图”跳到“任何 DOM 都能换皮”  
- 要求让主题包注入自定义 HTML/CSS/JS

**Prevention:**  
1. **v1.5 边界**：只允许固定枚举槽位和固定界面。  
2. 装饰层也要有上限（例如每屏固定少量槽位），不要开放无限数组。  
3. 把“插件/扩展系统、自定义 UI 组件”明确留给 **v1.8+**。  
4. Roadmap 文档里直接写“不在 v1.5 范围内”。

**Mitigation belongs to:**  
**Milestone-level scope gate for v1.5**, 真正的扩展系统归 **v1.8+**

---

## Moderate Pitfalls

### Pitfall 7: UI 资产重命名/删除后静默断链

**What goes wrong:**  
当前仓库只有角色表情做了全场景引用扫描与替换；通用资产 `delete-asset` / `rename-asset` 只是文件系统操作。v1.5 一旦把 UI 图片分散到 `dialogueBox`、`gameMenu`、`saveLoadScreen`、`theme`、`widgetStyles` 多处，重命名/删除就会产生大量静默坏引用。

**Warning signs:**  
- 删除 `assets/ui/*.png` 后编辑器没有任何引用警告  
- 新 UI 图片字段越来越多，但没有统一 ref-scan  
- bug 报告变成“为什么这个按钮突然没图了”

**Prevention:**  
- **v1.5 shared validation requirement**：新增 UI 资产引用扫描与预警  
- **Phase 69 / UIIMG-05**：编辑器素材管理面板至少要能显示“被哪些界面/槽位使用”  
- 导出前 preflight 检出缺失 UI 资源并阻止静默导出

**Mitigation belongs to:**  
**Phase 69 + v1.5 export preflight gate**

---

### Pitfall 8: 图片层、blur、伪元素一起叠，性能和可读性同时掉线

**What goes wrong:**  
现有 CSS 已在多个界面大量使用 `backdrop-filter`。`ThemeManager.applyNineSlice()` 甚至专门对部分目标在启用九宫格时关闭 backdrop。v1.5 如果再给对话框和全屏界面叠多层大图、装饰层、hover/active 图、光标图，Electron 下很容易出现：

- hover 卡顿
- 菜单打开/关闭掉帧
- 文本可读性下降
- 多层半透明导致“图是有了，但更花更糊”

**Warning signs:**  
- 一个界面同时保留 blur + 半透明渐变 + 多张全屏图层  
- 按钮状态切换改成 DOM `<img>` 叠加，而不是背景图/伪元素切换  
- 为了“更精致”无限增加装饰层数量

**Prevention:**  
- **Phase 65 / UIIMG-01**：沿用现有 nine-slice 思路，明确谁拥有背景层、谁拥有装饰层  
- **Phase 67 / UIIMG-03**：每个全屏界面限制背景层与装饰层数量，优先 1 张主背景 + 少量装饰  
- 有不透明图片皮肤时，允许像现有 `HAS_BACKDROP` 一样关闭 blur  
- 验收必须包含低端机/Electron 真机交互手感，而不是只看静态截图

**Mitigation belongs to:**  
**Phase 65 + Phase 67**

---

### Pitfall 9: 编辑器给了太多“图片旋钮”，反而让零代码用户不会用

**What goes wrong:**  
当前 `NineSliceModal.vue` 已经有 6 个目标页签；现有 screen editor 也偏表单化。如果 v1.5 把每个按钮、每个状态、每层装饰、每个 icon 都单独暴露，用户会从“换一套皮肤”变成“管理几十个图片字段”。

**Failure modes:**  
- 新手不知道先改哪一个字段  
- 同一张按钮图要重复填 10 次  
- 编辑器面板过长，预览与配置映射关系不清  
- 产品卖点从“无代码”退化成“无代码但极繁琐”

**Warning signs:**  
- 一上来设计成按 DOM 节点逐项暴露  
- 没有“复用同一按钮皮肤到一组按钮”的能力  
- 所有字段都默认展开显示

**Prevention:**  
1. **Phase 69 / UIIMG-05**：按“界面/部件组”组织，而不是按 DOM class 组织。  
2. 支持 **组级复用**：如“菜单按钮组共用一套三态图”“关闭按钮族共用一套小按钮图”。  
3. 先进阶后细化：默认只露主背景 / 主按钮 / 对话框主皮肤，装饰层放高级折叠区。  
4. 给出内置示例包与“一键套用后微调”，不要强迫用户从空白开始。

**Mitigation belongs to:**  
**Phase 69**, 内容与示例补齐归 **v1.6**

---

## Minor Pitfalls

### Pitfall 10: 光标和图标集抢了主线节奏

**What goes wrong:**  
光标和图标集确实能提升“游戏感”，但相对对话框、主按钮、全屏背景，它们不是 v1.5 成败主因。若 Phase 68 先深挖热点区域、尺寸、点击态、不同平台差异，会挤压主路径收口。

**Prevention:**  
- **Phase 68 / UIIMG-04** 保持小而硬：自定义 cursor + 一套可替换图标映射即可  
- 不要在 v1.5 里继续扩成 animated cursor、多分辨率打包、按界面切换图标主题

**Mitigation belongs to:**  
**Phase 68**

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 65 — 对话框图片化 | 本地假预览、层级 ownership 混乱、blur 与图片叠加过重 | 预览走真实 `DialogueBox` runtime；限制层数；定义主背景/装饰层 ownership |
| Phase 66 — 按钮图片三态扩面 | 只覆盖主按钮，遗漏 close/tab/QAB/confirm 等次按钮 | 先冻结 coverage matrix，再按按钮族验收 |
| Phase 67 — 全屏界面背景图 | 只做 SaveLoad，不做 Backlog/GameMenu/Settings 全套；导出漏图 | 全屏界面逐个截图验收；同步扩 `scanAssets()` |
| Phase 68 — 光标 + 图标集 | 过早扩 scope，抢走主线时间 | 只做基础映射，不做复杂平台差异层 |
| Phase 69 — 编辑器图片管理 | 资产来源混乱、自由文本路径泛滥、旋钮爆炸 | 统一走资产库；按部件组配置；显示引用关系；高级项折叠 |
| v1.5 Shared Gate | 旧 CSS 主题/旧项目被破坏 | 所有图片字段可选增强，缺失即回退现有 CSS |
| v1.6 Phase 70 — 主题包格式升级 | v1.5 把包格式半做在项目 schema 里，导致双重迁移 | v1.5 先守住项目内资产与导出；主题包升级留到 v1.6 完整做 |
| v1.8+ — 插件/扩展系统 | v1.5 过早抽象成通用平台 | 明确拒绝通用 selector / 自定义 UI 组件 / 主题脚本注入 |

---

## Sources

- `E:\projects\my-awesome-project\.planning\PROJECT.md`
- `E:\projects\my-awesome-project\docs\gap-analysis-vs-mature-engines.md`
- `E:\projects\my-awesome-project\src\engine\ThemeManager.js`
- `E:\projects\my-awesome-project\src\engine\scanAssets.js`
- `E:\projects\my-awesome-project\src\utils\themePackager.js`
- `E:\projects\my-awesome-project\src\main.js`
- `E:\projects\my-awesome-project\src\style.css`
- `E:\projects\my-awesome-project\src\ui\DialogueBox.js`
- `E:\projects\my-awesome-project\src\ui\SaveLoadScreen.js`
- `E:\projects\my-awesome-project\src\ui\BacklogScreen.js`
- `E:\projects\my-awesome-project\src\ui\GameMenu.js`
- `E:\projects\my-awesome-project\src\editor\components\theme\NineSliceModal.vue`
- `E:\projects\my-awesome-project\src\editor\components\DialogueBoxSettings.vue`
- `E:\projects\my-awesome-project\src\editor\composables\useThemeEditor.js`
- `E:\projects\my-awesome-project\src\editor\composables\useScreenLayoutEditor.js`
- `E:\projects\my-awesome-project\src\editor\components\layout\SaveLoadSection.vue`
- `E:\projects\my-awesome-project\src\editor\components\layout\BacklogSection.vue`
- `E:\projects\my-awesome-project\src\editor\components\layout\GameMenuSection.vue`
