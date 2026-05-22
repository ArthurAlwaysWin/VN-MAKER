# Novel Adaptation Skill

Use this skill when an external agent is asked to turn prose, a chapter draft, or a raw novel excerpt into an editable Galgame Maker visual novel draft.

The agent should not paste prose into dialogue boxes verbatim by default. It should first present a readable adaptation breakdown, then convert the approved breakdown into structured draft JSON or an apply-plan manifest.

See [example-adaptation-preview.md](./example-adaptation-preview.md) for a complete short prose excerpt and approved-preview shape.

## Product Boundary

- Keep the human creator in control of adaptation choices.
- Preserve the original story intent, but adapt prose into visual novel pacing.
- Prefer scene/page/dialogue/choice/character/variable/media operations through the authoring CLI/API.
- Treat missing art, audio, and expression assets as explicit handoff items instead of pretending they exist.
- Do not create CG/gallery/ending screens unless the editor and authoring commands support them.

## Required First Response

When the user provides prose and asks the agent to make a visual novel, first produce a short adaptation preview before writing files.

Use this shape:

```text
我会先把这段改成一个可玩的 VN 小片段，拆分如下：

背景：雨中的校门口（计划使用：backgrounds/rainy_school_gate.png）
角色：
- 樱：站位偏左，表情紧张（计划使用：characters/sakura_nervous.png）
- 悠真：站位偏右，表情担心（计划使用：characters/haruma_worried.png）
BGM：雨中（计划使用：audio/rain_theme.ogg）
SE：雨声（计划使用：audio/rain_loop.ogg）

页面 1：
旁白：雨水顺着校门口的铁栏落下。
樱：……

页面 2：
旁白：她把那封没有署名的信攥得更紧。
悠真：樱？你怎么还在这里？

选择：
- 问她信的事：樱好感度 +1，进入 letter_question 路线
- 先把伞递过去：樱好感度 +2，进入 umbrella_kindness 路线

可能需要补充的资源：
- 背景：雨中的校门口
- 立绘：樱（紧张差分）
- 立绘：悠真（担心差分）
- 音频：雨中 BGM、雨声音效
```

Ask for confirmation when the adaptation changes meaning, adds choices, invents dialogue, or requires placeholder assets.

## Adaptation Rules

- Convert descriptive location prose into background and ambience.
- Convert character emotion into expression hints.
- Convert blocking cues into layout presets:
  - one character: center
  - two characters: left/right
  - three characters: left/center/right
- Convert action into short narration or page transitions.
- Convert internal thought into narration, short monologue, or expression changes.
- Split long prose into multiple pages. Prefer one focused beat per page.
- Add choices only at meaningful decision points; describe resulting variables or route targets.
- Register variables before choices reference them.
- Create character registry entries before staging characters on pages.

## Asset Policy

Before proposing concrete assets for an existing project, inspect the library:

```bash
npm run vn -- list-assets --script path/to/script.json --json
```

Use the returned `tokens` to match semantic names such as `rainy_school_gate.png` to story needs like "rainy school gate".

Use concrete proposed asset names, even when the asset does not exist yet, so the human knows what to supply.

Recommended naming:

- Backgrounds: `backgrounds/<location>_<mood_or_time>.png`
- Character expressions: `characters/<character>_<expression>.png`
- BGM: `audio/<mood_or_scene>_theme.ogg`
- SE: `audio/<sound_or_action>.ogg`
- UI: `ui/<screen_or_widget>_<role>.png`

For fuller naming rules and ambiguous asset handling, see [asset-naming-guidelines.md](./asset-naming-guidelines.md).

If a required asset is missing:

- keep the draft playable when possible;
- record the missing asset as a handoff item;
- do not claim visual fidelity until runtime preview confirms it.

## Structured Draft Mapping

After the human accepts the adaptation preview, convert it into structured draft fields:

- `characters[]` from the character list.
- `locations[]` from backgrounds.
- `variables[]` from affection, flags, or route state.
- `scenes[]` from major story units or route branches.
- `beats[]` from pages.
- `dialogues[]` from narration and spoken lines.
- `choices[]` from decision points.
- `effects[]` from affection/flag changes.

Then run:

```bash
npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script path/to/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script path/to/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:author-check -- --script path/to/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
npm run vn:handoff-report -- --script path/to/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff --json
```

## Handoff Notes

The final response should include:

- scenes/pages created;
- choices and route effects;
- variables created;
- concrete missing assets;
- changed paths from `changeSummary.changedPaths`;
- checkpoint path and rollback command when present;
- pages the human should inspect in the no-code editor.
