# Project Research Summary

**Project:** VN-MAKER — v1.7「Galgame 标配系统补全」  
**Domain:** 变量/Flag、好感度预设、结局追踪、CG 鉴赏  
**Researched:** 2026-04-28  
**Confidence:** HIGH

## Executive Summary

v1.7 不该被做成“再塞几个逻辑字段”，而应被定义为：在现有 page-based runtime 和 `variables = new Map()` 基础上，补齐一套 **作者能看懂、运行时可验证、持久化不串档** 的剧情系统基础设施。研究结论高度一致：**变量系统是主轴，好感度只是变量预设，结局与 CG 必须走显式注册表 + 独立 persistent profile，不能靠 save slot 或运行时猜测。**

本里程碑最稳的范围是：项目级变量注册表、页面内变量效果编辑、最小条件 GUI、ending registry + persistent unlock、CG registry + explicit unlock、以及对应的最小查看界面。最大风险不是功能点本身，而是把 run state、save state、persistent unlock state、editor authoring state 混在一起，导致旧项目/旧存档兼容性、解锁可信度和作者心智模型同时崩掉。

## Recommended v1.7 Scope

### Must ship

1. **变量注册表**
   - 项目级定义：`id` / 显示名 / 类型（bool、number）/ 默认值 / 分组 / 备注
   - 页面和选项里使用变量选择器，不再依赖自由手输 key
   - 最小运算集：`set` / `add` / `subtract` / `compare`

2. **条件分支 GUI**
   - 独立条件页
   - 支持 `== != > >= < <=`
   - 支持 1~3 条条件、全部满足/任一满足
   - 跳转目标必须用场景选择器

3. **好感度预设**
   - 本质是带标签的 number 变量
   - 提供快速创建、`+1/-1` 快捷入口、阈值检查建议
   - 不引入单独 runtime 子系统

4. **结局注册表 + 持久化追踪**
   - ending ID、标题、类型/分类、顺序、可选缩略图/说明
   - `end` 或等效流程显式携带 `endingId`
   - 持久化记录至少包含：是否解锁、首次到达时间、达成次数

5. **CG 注册表 + 显式解锁**
   - CG item ID、标题、缩略图、锁定占位图、图片列表、顺序/分组
   - 运行时通过 `unlock_cg(id)` 或等效 effect 解锁
   - 玩家端最小图鉴：locked/unlocked + 简单查看器

6. **最小检查闭环**
   - 引用计数/反向引用
   - 重命名/删除安全检查
   - 基础规则检查：未引用 ending、孤儿 CG、无兜底结局

## Explicit Deferrals

- 不做流程图/分支图
- 不做 replay scene system
- 不做 BGM room
- 不做成就系统
- 不做通用 persistent variables
- 不做字符串变量、表达式语言、复杂公式
- 不做复杂 affection 公式、衰减、关系图
- 不做自动识别 CG / 根据图片出现自动解锁
- 不做复杂 gallery 分页、筛选、缩略图生成
- 不做云同步/Steam 同步

**If scope slips:** 先保 `变量系统 + 好感度预设 + 结局追踪`，CG 鉴赏 UI 可以后移，但 **save/profile contract 不能砍**。

## Strongest Architectural Decisions

1. **作者数据与玩家数据彻底分离**
   - `script.json` 只存 definitions：variables / endings / gallery
   - player progress 只存在 `profile + saves`

2. **引入稳定 `projectId/gameId`**
   - 不能再用 title 作为 persistent key
   - read history、ending unlock、CG unlock 都绑定稳定 ID

3. **持久化分层**
   - `save slot` = 当前跑团快照
   - `profile` = 跨周目持久化进度（read history / endings / cg）
   - 普通存档不作为 ending/CG 真相源

4. **统一 effect DSL，而不是继续堆特例字段**
   - 统一为 `var:set / var:add / var:sub / unlock:ending / unlock:cg`
   - 取代单独的 `option.setVariable` 语义扩散

5. **显式注册、显式解锁**
   - ending 用 canonical ID
   - CG 用 registry item/group ID
   - 绝不按图片路径、资源出现次数或 save 推断解锁

## Strongest UX Decisions

1. **新增顶层「剧情系统」工作区**
   - 子区：变量 / 结局 / CG 图鉴
   - 这些是项目级对象，不应全塞进页面 Inspector

2. **页面只负责消费项目级定义**
   - 选择页：附加变量变化
   - 条件页：可视化条件 + 跳转
   - 页面/场景：触发结局或 CG 解锁

3. **好感度只做“带标签数值变量”的编辑器糖层**
   - 作者看到的是 `樱 +1 / 凛 -1`
   - 不是一套新系统配置页面

4. **自然语言摘要优先**
   - 条件页、结局规则、CG 解锁规则都应显示为可读摘要
   - 所有跳转显示场景名，内部再存 ID

5. **就地创建与反向引用必须有**
   - 在条件/选项里发现缺变量时可立即创建
   - 变量、ending、CG 都要能查看引用位置和使用次数

## Biggest Pitfalls

1. **把 save state 和 persistent unlock state 混在一起**
   - 后果：旧存档漂移、解锁丢失、删除存档影响收集进度
   - 对策：独立 `profile`，`restoreState()` 对缺字段容错

2. **继续沿用 title 作为持久化 key**
   - 后果：改名即丢 read history / ending / CG
   - 对策：新增稳定 `projectId`

3. **编辑器 authoring flow 不闭环**
   - 后果：runtime 有能力，但作者不会正确配置
   - 对策：先做变量注册表、最小运算集、条件 builder，再上好感度糖层

4. **试图自动推断 ending/CG**
   - 后果：误判、漏判、资源重命名即失效
   - 对策：endingId 和 CG unlock 都必须显式声明

5. **把 v1.7 做成半个平台**
   - 后果：变量、CG、BGM、成就、流程图一起膨胀，交付失焦
   - 对策：坚持 cut line，只交付“变量/结局/CG 的可管理闭环”

## Recommended Requirement Categories

建议 requirements 直接按下面 6 类写，避免 roadmap 把“数据契约、编辑器、runtime、持久化、验证”拆散：

1. **Data Contracts**
   - `projectId`
   - variable / ending / CG schema
   - effect DSL
   - save/profile separation rules

2. **Variable Authoring**
   - 变量注册表
   - 类型/分组/默认值
   - picker、就地创建、引用扫描

3. **Branching Logic Authoring**
   - 条件页 GUI
   - 运算符范围
   - scene picker
   - 自然语言摘要

4. **Affection + Ending Progression**
   - affection preset
   - ending registry
   - ending unlock write path
   - title/extras 最小 ending 展示

5. **CG Gallery Progression**
   - CG registry
   - explicit unlock triggers
   - locked/unlocked gallery viewer
   - orphan/trigger validation

6. **Compatibility, Persistence, Validation Gates**
   - old project open
   - old save load
   - export parity
   - rename/delete safety
   - persistent separation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Systems scope | HIGH | 4 份研究对 cut line 高度一致 |
| Architecture | HIGH | 直接基于当前 runtime/save/editor 结构 |
| Authoring UX | MEDIUM | 方向明确，但具体工作区信息架构仍需设计收口 |
| Pitfalls | HIGH | 多数来自现仓库真实缺口与兼容性约束 |

**Overall confidence:** HIGH

## Sources

- `.planning/research/v1.7-systems.md`
- `.planning/research/v1.7-architecture.md`
- `.planning/research/v1.7-authoring-ux.md`
- `.planning/research/v1.7-pitfalls.md`

---
*Research completed: 2026-04-28*  
*Ready for requirements: yes*
