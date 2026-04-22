import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('dialogueBox preview wiring', () => {
  it('adds a dedicated preview message in main.js that uses the real DialogueBox runtime owner', () => {
    const source = readSource('src/main.js');

    expect(source).toContain("case 'show-dialogue-preview'");
    expect(source).toContain('stopAuto()');
    expect(source).toContain('stopSkip()');
    expect(source).toContain('dialogueBox.applyGlobalStyle(engine.script.ui?.dialogueBox)');
    expect(source).toContain('dialogueBox.setNameplateStyle(engine.script.ui.dialogueBox.nameplateStyle)');
    expect(source).toContain('dialogueBox.renderPreviewLine({');
  });

  it('keeps ProjectSettings as the iframe owner for the stable dialogue preview sample', () => {
    const source = readSource('src/editor/views/ProjectSettings.vue');

    expect(source).toContain("type: 'show-dialogue-preview'");
    expect(source).toContain("speakerName: '预览角色'");
    expect(source).toContain('这是一段用于检查对话框图片层、文字层和继续指示的稳定示例台词。');
    expect(source).toContain('themeEditor.startEngine()');
  });
});
