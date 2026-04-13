# Phase 38: 表情交叉漸變 - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

表情切換時執行 CSS opacity crossfade 過渡動畫，新圖片預加載完成後才開始過渡，快進模式下 0ms 即時替換。涵蓋 `setExpression()` 的對話中切換和 `show()` 的跨頁表情變化兩個觸發點。

</domain>

<decisions>
## Implementation Decisions

### 漸變持續時間
- **D-01:** 表情 crossfade 預設時長為 300ms（快速自然，不拖沓）。背景切換 800ms、角色進場 500ms，表情變化節奏更快。

### 跨頁表情變化
- **D-02:** 角色在頁面間持續存在（wasVisible=true）且表情不同時，也使用 crossfade 過渡。`show()` 方法需檢測表情是否改變，若改變則觸發 A/B 圖層交叉漸變而非直接替換 src。

### 創作者可配置性
- **D-03:** 固定全局預設值 300ms，不在 script.json 中增加逐事件 duration 配置。保持腳本結構簡潔。

### Agent's Discretion
- CSS transition 屬性的具體寫法（添加到 `.char-img-a/.char-img-b` 或使用 JS 控制）
- 預加載策略（new Image() + onload、img.decode() 等具體方案選擇）
- 快速連續切換的取消/中斷邏輯實現
- skipMode 在 main.js 中的集成方式（參考 set_background 模式）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 引擎渲染層（核心修改目標）
- `src/ui/CharacterLayer.js` — 雙層 DOM 已就緒（Phase 37），需在 setExpression() 和 show() 中添加 crossfade 邏輯
- `src/ui/BackgroundLayer.js` — 交叉漸變參考模式：incoming.classList.add('active') + outgoing.classList.remove('active') + setTimeout cleanup
- `src/style.css:100-112` — `.bg-image-layer` 的 opacity 過渡 CSS 規則（模板）
- `src/style.css:127-143` — `.char-img-a/.char-img-b` 現有規則（需添加 transition 屬性）

### 引擎入口（skipMode 集成點）
- `src/main.js:209` — `set_expression` 事件處理器（當前無 skipMode 檢查，需添加）
- `src/main.js:170-237` — 其他事件的 skipMode 模式參考（set_background 用 duration:0）

### 引擎邏輯（crossfade 觸發源）
- `src/engine/ScriptEngine.js:320-336` — `_renderPage()` 跨頁角色處理（wasVisible + show_character 事件）
- `src/engine/ScriptEngine.js:379-387` — `_playCurrentDialogue()` 對話中 set_expression 事件

### Phase 37 決策（上游約束）
- `.planning/phases/37-characterlayer-dom/37-CONTEXT.md` — D-07: 容器負責進出場動畫，子 img 負責 crossfade opacity
- `.planning/phases/37-characterlayer-dom/37-CONTEXT.md` — D-08: Phase 37 只有一個 img 顯示（.active），另一個隱藏

### 需求
- `.planning/REQUIREMENTS.md` — ENG-02（crossfade + 預加載）、ENG-03（快進模式跳過）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BackgroundLayer crossfade 模式**: incoming/outgoing + `.active` 類切換 + setTimeout 清理 → 直接照搬到 CharacterLayer
- **`.bg-image-layer` CSS transition**: `transition: opacity 0.8s ease;` → 改為 `transition: opacity 0.3s ease;` 應用到 `.char-img-a/.char-img-b`
- **skipMode 模式**: `main.js` 中 set_background 的 `if (skipMode) { ...duration: 0... }` → 照搬到 set_expression

### Established Patterns
- **A/B 圖層切換**: activeImg 'A'↔'B' 翻轉，active class 切換，與 BackgroundLayer 的 _activeLayer 完全對齊
- **預加載**: BackgroundLayer 的 incoming layer 先設 backgroundImage，再 add('active') — 對 img 元素可用 `img.src = url` + `onload`/`decode()` 等待

### Integration Points
- `main.js:209` — set_expression handler 需添加 skipMode 檢查，傳遞 skip 標誌或 duration
- `CharacterLayer.show()` — wasVisible=true 且表情改變時需觸發 crossfade（可能需 ScriptEngine 或 main.js 傳遞上次表情資訊，或由 CharacterLayer 內部追蹤當前表情）
- `CharacterLayer.setExpression()` — 核心 crossfade 邏輯入口

</code_context>

<specifics>
## Specific Ideas

- 對齊 BackgroundLayer 的 A/B 切換模式，代碼風格一致
- 300ms 比背景的 800ms 快，適合對話中的表情節奏
- 跨頁表情變化也需 crossfade，避免生硬切換影響視覺連續性

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-expression-crossfade*
*Context gathered: 2026-04-13*
