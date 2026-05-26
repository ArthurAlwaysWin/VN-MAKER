# Example Novel Adaptation Preview

This is the human-readable preview an external agent should show before converting prose into a structured draft or apply-plan. It demonstrates the required shape: concrete resources, page beats, choices, variable effects, and missing asset notes.

## Source Excerpt

```text
雨越下越大。樱站在校门口，手里攥着一封没有署名的信。悠真撑着伞跑来，问她为什么还不回家。樱没有回答，只是把信藏到身后。
```

## Adaptation Preview

我会先把这段改成一个可玩的 VN 小片段，拆分如下：

背景：雨中的校门口

- 首选资源：`backgrounds/school_gate_rainy.png`
- 备选资源：`backgrounds/school_gate.png`
- 缺失时备注：需要一张雨天校门口背景

角色：

- 樱：左侧，紧张/隐瞒情绪
  - 首选资源：`characters/sakura_nervous.png`
  - 备选资源：`characters/sakura_normal.png`
- 悠真：右侧，担心
  - 首选资源：`characters/haruma_worried.png`
  - 备选资源：无

BGM/SE：

- BGM：`audio/rain_theme.ogg`
- SE：`audio/rain_loop.ogg`

变量：

- `sakura_trust`：number，初始值 0，用于记录樱是否愿意透露信的事。

页面 1：

- 背景：`backgrounds/school_gate_rainy.png`
- 角色：樱，左侧，紧张
- 旁白：雨越下越大，校门口的灯光被水雾晕开。
- 樱：……

页面 2：

- 角色：樱左侧，悠真右侧
- 旁白：悠真撑着伞跑到她面前，呼吸还没平稳。
- 悠真：樱？你怎么还不回家？

页面 3：

- 角色：樱左侧，悠真右侧
- 旁白：樱把那封没有署名的信藏到身后。
- 樱：没什么，只是在等雨小一点。

选择：

- 问她信的事
  - 效果：`sakura_trust +1`
  - 目标路线：`letter_question`
- 先把伞递过去
  - 效果：`sakura_trust +2`
  - 目标路线：`umbrella_kindness`

可能需要补充的资源：

- `characters/haruma_worried.png`：悠真担心表情立绘。
- 如果没有 `backgrounds/school_gate_rainy.png`，需要雨天校门口背景或同场景雨天差分。
- 如果没有 `audio/rain_loop.ogg`，需要雨声音效。

需要确认的改编选择：

- 是否允许新增两个分支路线：`letter_question` 和 `umbrella_kindness`。
- 是否把“信”的内容暂时保留为悬念，不在本段透露。
- 是否接受用 `characters/sakura_normal.png` 作为紧张表情的临时替代。

## Next Step After Approval

After the human approves this preview, the agent can create a structured draft with:

- `characters[]` for Sakura and Haruma.
- `variables[]` containing `sakura_trust`.
- `locations[]` containing the rainy school gate background hint.
- `scenes[]` with three normal beats and one choice beat.
- `choices[]` with `effects[]` for route state.

Then run `draft-plan --require-adaptation-preview`, `apply-plan --validate-only`, `apply-plan --checkpoint`, and `review-handoff --write-editor-handoff`.
