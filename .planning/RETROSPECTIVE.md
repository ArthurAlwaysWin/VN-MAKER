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
