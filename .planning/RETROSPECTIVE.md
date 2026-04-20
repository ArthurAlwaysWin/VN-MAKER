# Retrospective

## v0.5 — 游戏 UI 补全

**Duration:** 2 days (2026-04-04 ~ 2026-04-05)
**Scope:** 4 phases, 8 plans, 27 requirements, ~51 commits

### What Worked Well

- **高并行度**：4 个 phase 在 2 天内全部完成，得益于 phase 间依赖清晰（19→20→21, 19→22）
- **SaveManager 异步重写**：一次性从 localStorage 迁移到文件系统，后续 phase 无需再改存档层
- **截图管线复用**：Phase 19 建立的 capturePage→IPC→JPEG 管线被 Phase 20（快存）和 Phase 21（存档界面）直接复用
- **CSS-only 动画**：快进指示器、存读档界面过渡均用纯 CSS，无额外依赖
- **内联确认模式**：覆盖存档用内联确认代替 window.confirm，避免 Electron prompt 限制

### What Could Be Better

- **gsd-tools frontmatter 提取不可靠**：SUMMARY 的 `requirements-completed` 字段部分缺失（19-01, 22-01, 22-02），导致 `milestone complete` 自动提取成果为垃圾文本，需手动修复 MILESTONES.md
- **Nyquist validation 全部 draft**：4 个 VALIDATION.md 均为 `nyquist_compliant: false`，未实际执行自动化验证。验证完全依赖人工 VERIFICATION.md
- **规格偏差未提前记录**：3 个有意偏差（SLUI-01 网格改 3×3, SLUI-03 来源路由, BAR-01 按钮数 6→8）在 phase 执行中决定，但 REQUIREMENTS.md 未同步更新

### Patterns to Keep

- Phase 粒度合理（每 phase 2 个 plan，1 个后端 + 1 个集成/UI）
- VERIFICATION.md 逐条对照需求的格式有效
- 集成检查（gsd-integration-checker）能发现跨 phase 遗漏

### Lessons Learned

- `gsd-tools milestone complete` 的自动提取功能不可靠，归档时应始终手动检查 MILESTONES.md 输出
- Electron 限制（无 prompt、asset 协议需 stream:true、preload .mjs 扩展名）应在项目级文档中记录，避免每次重新踩坑
- 快进模式的 BGM 影子状态是个精巧方案，但增加了 AudioManager 复杂度，后续如加入更多音频功能需注意

---

## v0.6 — 主题包系统

**Duration:** ~2 days (2026-04-06 ~ 2026-04-07)
**Scope:** 5 phases (23-27), 4 plans, 26 requirements

### What Worked Well

- **Token 驱动设计**：~35 CSS 自定义属性统一控制全 UI，主题切换零 JS 逻辑
- **九宫格 ::before 方案**：解决了 border-image 与 border-radius 不兼容问题
- **fflate ZIP**：8kB 同步 API，主题导入/导出无需 async 复杂度
- **色彩和谐算法**：HSL 空间自动推导配色，用户只选主色即获完整主题

### Patterns to Keep

- 数据映射表驱动（TOKEN_LABELS 前身 — token key→中文名）
- sanitize.js 阻断 url() 注入

---

## v0.7 — 游戏导出 Web 静态包

**Duration:** ~2 days
**Scope:** 4 phases (28-31), 6 plans, 21 requirements

### What Worked Well

- **scanAssets 配置表驱动**：11 已知路径显式遍历比递归更可靠，40 个测试全覆盖
- **vite.web.config.js 确定性输出**：engine.js + engine.css 固定文件名，HTML 模板无需 hash
- **6 步导出管线 + AbortController**：清晰步骤分离，支持取消
- **ExportModal 3 态单弹窗**：配置→进度→完成流畅无中断

---

## v0.8 — 游戏导出 Electron 桌面版

**Duration:** ~2 days (2026-04-09 ~ 2026-04-10)
**Scope:** 3 phases (32-34), 4 plans, 15 requirements

### What Worked Well

- **asar:false + win.loadFile() + 相对路径**：避免 asset:// 协议，桌面游戏资源加载最简化
- **4-way 环境检测**：统一代码库四种运行模式，零条件编译
- **exportDesktop 9 步流水线**：@electron/packager 一键打包到可运行 .exe
- **ExportModal 格式感知分发**：Web/桌面 Segment Toggle + 桌面独有图标选择器

---

## v0.9 — 编辑器本地化与帮助系统

**Duration:** 1 day (2026-04-11 ~ 2026-04-12)
**Scope:** 2 phases (35-36), 4 plans, 15 requirements, 54 files changed, +3368/-222 lines

### What Worked Well

- **TOKEN_LABELS 集中映射**：41 条 token→中文名，一处维护，5 个 row 组件通过 label prop 接收
- **label prop 透传模式**：TokenAccordion 传 label 给子组件，组件本身不需要知道映射逻辑
- **HelpTip Teleport 方案**：Teleport 到 body + fixed 定位，完美避开 overflow:hidden 裁切
- **helpTexts.js 6 区域导出**：按编辑器功能区组织（theme/export/settings/script/resource/designer），26 实例引用清晰
- **按钮 title 大扫描**：一次性覆盖 80+ 按钮 × 28 文件，无遗漏

### What Could Be Better

- **Characters.vue 'New Character' 遗留英文**：默认角色名仍为英文，应改为 '新角色'
- **6 个 orphaned helpTexts.js keys**：pre-provisioned 但未被任何组件引用，应清理或在后续 phase 使用
- **Nyquist validation 仍未完善**：Phase 35 缺少 VALIDATION.md，Phase 36 为 partial

### Patterns Established

- **映射表 + prop 透传**：适用于需要本地化的 UI 组件（TOKEN_LABELS 可扩展到其他语言）
- **Teleport tooltip**：任何需要突破父容器边界的浮层都可用此模式
- **集中帮助文本**：helpTexts.js 按区域导出，新增帮助只需添加 key + 放置 HelpTip

### Lessons Learned

- 本地化工作量主要在"找到所有英文"，翻译本身很快 — 下次可先做全量英文扫描再动手
- Tooltip 的 viewport flip 逻辑（上/下翻转）比想象中简单，getBoundingClientRect 即可
- gsd-tools 的 milestone complete 命令统计数据不准（把所有历史 phase 计入），需手动修正

---

## v1.0 — 角色表情/差分場景切換

**Duration:** 3 days (2026-04-12 ~ 2026-04-15)
**Scope:** 5 phases (37-41), 7 plans, 10 requirements, 60 files changed, +9533/-849 lines

### What Was Built

- CharacterLayer 雙圖層重構（div+imgA/imgB 容器結構，4 種定位模式保留）
- 表情交叉漸變（300ms CSS opacity crossfade + img.decode() 預加載 + skipMode 即時替換）
- 表情狀態管理（引擎 Map + 頁面繼承 + 存讀檔持久化 + 場景重置 + 36 單元測試）
- ExpressionDropdown 視覺選擇器（Teleport 縮略圖網格 + 角色行/對話行雙處集成）
- 畫布繼承預覽 + 安全刪除（反向頁面查找 + 全場景引用掃描 + 批量替換 + 單步撤銷）

### What Worked Well

- **A/B crossfade 架構精巧**：Phase 37 奠基（雙圖層），Phase 38 添加 crossfade，兩步分離清晰，Phase 37 可獨立驗證
- **Resolution chain 統一模式**：`char.expression → inherited → first → ''`，引擎/畫布/刪除三處復用同一解析邏輯
- **TDD 引擎驗證**：D-07 stale expression 測試先寫失敗（RED），再實作（GREEN），確保 fallback 正確
- **PPT-style addPage**：深拷貝上一頁角色/背景/BGM，符合用戶直覺（"下一頁應該延續上一頁的畫面"）
- **整合檢查器有效**：gsd-integration-checker 掃描 12 個跨 phase 導出全部消費，0 孤立導出
- **VERIFICATION.md 逐 phase 驗證**：5 個 phase 全部有正式驗證報告（37:5/5, 38:5/5, 39:5/5, 40:8/8, 41:10/10）

### What Could Be Better

- **gsd-tools milestone complete 統計仍不準**：報告 9 phases/13 plans/18 tasks（累計值），需手動修正 MILESTONES.md — 此問題 v0.5 就存在，至今未修
- **Phase 37/40 缺少 VERIFICATION.md**：原始執行時未生成，milestone audit 發現後才補。應在 execute-phase 流程中強制生成
- **SUMMARY frontmatter 不一致**：Phase 37 無 frontmatter，Phase 38 有但格式不同於 39-41。標準化 frontmatter 可改善自動提取
- **Canvas vs Engine 繼承不對稱**：雖然是有意設計（靜態 vs 運行時），但初次理解需要看 HelpTip 才知道差異，可能造成用戶困惑

### Patterns Established

- **A/B 雙圖層 crossfade**：可復用於任何需要平滑過渡的圖片切換（如背景切換）
- **Generation counter 防快速切換**：過期操作不執行，防殘影堆疊
- **全場景引用掃描 + 批量替換 + 單步撤銷**：安全刪除資源的標準模式
- **反向頁面查找繼承**：畫布預覽「向上找」最近顯式值的模式

### Key Lessons

- 整圖切換（vs 分層合成）大幅簡化實作，扁平式數據模型易於理解和遍歷
- img.decode() 是防閃白的關鍵 — 瀏覽器 decode 完成後才觸發 CSS transition
- 表情系統的核心複雜度在「繼承」和「刪除」，渲染本身反而簡單
- Teleport + fixed 定位已成為專案標準 UI 模式（HelpTip、ExpressionDropdown）

---

## v1.1 — UI Theme System v2 引擎配置化

*(Shipped 2026-04-17 — retrospective deferred, covered by milestone audit)*

---

## v1.2 — 编辑器主题配置 + 示范主题

*(Shipped 2026-04-17 — retrospective deferred, covered by milestone audit)*

---

## v1.3 — 主题系统表达力升级

**Duration:** 3 days (2026-04-18 → 2026-04-20)
**Scope:** 9 phases (52-60), 21 plans, 27 requirements, 81 commits, 108 files, +17292/-2808 lines

### What Worked Well

- **双轨并行设计**：Smart Color（52, 56）和 Structural Params（53-55, 57-58）两条独立轨道，引擎先行 → 编辑器跟进，依赖清晰
- **OKLCH 零依赖**：60 行纯 JS 模块 + 规则表，2 色输入 → 36 token，无 npm 依赖
- **三层合并架构**：colorRecipe → deriveTokens → overrides，用户可自动派生也可手动微调，互不冲突
- **provide/inject + postMessage**：3 个编辑器 composable 共享架构，5 种消息类型统一 iframe 实时预览
- **内联执行模式**：多数 phase 跳过 discuss → plan 直接 inline 执行，大幅缩短开发周期
- **集成检查器**：28/28 exports 全部消费，7/7 E2E flows 端到端验证通过

### What Could Be Better

- **VERIFICATION.md 全部缺失**：9 个 phase 中 0 个有正式验证报告 — inline 执行模式跳过了验证步骤
- **Phase 57 缺 SUMMARY**：唯一没有总结的 phase，虽有 commits + 25 tests 证明完成
- **Nyquist 全部 non-compliant**：4 个 VALIDATION.md 均为 `nyquist_compliant: false`，5 个完全缺失
- **REQUIREMENTS.md 复选框未勾**：27 个需求全部 `[ ]`，虽然实际全部满足但文档不同步
- **gsd-tools roadmap analyze 仍然坏**：返回 v0.1 + 0 phases，已是多个版本的已知问题

### Patterns Established

- **colorRecipe 三层合并模式**：recipe → tokens → overrides，适用于任何"自动生成 + 手动覆盖"场景
- **编辑器 composable + Section SFC 模式**：useXxxEditor composable 管状态 + XxxSection.vue 管 UI，可复用于新编辑器
- **iframe postMessage 协议**：start → update-* → show-screen 消息链，标准化编辑器预览通信
- **TDD 引擎层 → inline UI 层**：引擎 phase 用 TDD（先写测试），编辑器 phase 用 inline（直接实现 + 目视验证）

### Key Lessons

- inline 执行效率极高但牺牲了文档完整性 — 适合成熟项目中的增量功能，不适合需要审计追溯的场景
- 双轨设计让 Title Page Preview（Phase 59）可以独立并行，不阻塞主线
- 5 套主题升级（Phase 60）作为最终集成测试效果很好 — 同时验证所有新功能的端到端可用性

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | Files | +Lines | Reqs |
|-----------|--------|-------|------|-------|--------|------|
| v0.5 | 4 | 8 | 2 | ~60 | ~6k | 27 |
| v0.6 | 5 | 4 | 2 | ~40 | ~5k | 26 |
| v0.7 | 4 | 6 | 2 | ~45 | ~6k | 21 |
| v0.8 | 3 | 4 | 2 | 45 | 8585 | 15 |
| v0.9 | 2 | 4 | 1 | 54 | 3368 | 15 |
| v1.0 | 5 | 7 | 3 | 60 | 9533 | 10 |
| v1.1 | 4 | 9 | — | — | — | 17 |
| v1.2 | 6 | 8 | 1 | 21 | 2453 | 17 |
| v1.3 | 9 | 21 | 3 | 108 | 17292 | 27 |

**趨勢觀察：**
- v1.3 是代码量和需求量最大的里程碑（+17292 行，27 需求），反映主题系统全面升级的广度
- 9 phases + 21 plans 是迄今最大 scope，但 3 天完成得益于 inline 执行模式
- 里程碑粒度穩定在 2-9 phases，避免過大或過小
- VERIFICATION.md 補充機制在 v1.0 首次啟用，v1.3 因 inline 模式回退 — 应纳入标准流程
