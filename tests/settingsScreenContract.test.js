import { describe, expect, it } from 'vitest';

import { createProjectSession } from '../src/authoring/projectSession.js';
import { validateProject } from '../src/shared/projectValidator.js';
import {
  isKnownSettingsCustomButtonAction,
  isKnownSettingsFooterButtonAction,
} from '../src/shared/settingsScreenContract.js';

function projectWithSettings(settingsScreen) {
  return {
    projectId: 'gm_settings_contract',
    characters: {},
    scenes: {},
    systems: {},
    ui: { settingsScreen },
  };
}

describe('settings screen canonical contract', () => {
  it('locks custom and structured button actions to declarative values', () => {
    expect(isKnownSettingsCustomButtonAction('close')).toBe(true);
    expect(isKnownSettingsCustomButtonAction('reset')).toBe(true);
    expect(isKnownSettingsCustomButtonAction('javascript:alert(1)')).toBe(false);
    expect(isKnownSettingsFooterButtonAction('title')).toBe(true);
    expect(isKnownSettingsFooterButtonAction('eval')).toBe(false);
  });

  it('validates tab mode and both button action surfaces', () => {
    const report = validateProject(projectWithSettings({
      tabBar: { enabled: 'no' },
      elements: [{ type: 'button', action: 'run-code' }],
      footer: { buttons: [{ action: 'open-url' }] },
    }), { checkReachability: false });
    const codes = report.warnings.map(issue => issue.code);
    expect(codes).toEqual(expect.arrayContaining([
      'invalid-settings-tab-mode',
      'invalid-settings-button-action',
      'invalid-settings-footer-action',
    ]));
  });

  it('accepts canonical single-page mode and reset actions', () => {
    const report = validateProject(projectWithSettings({
      tabBar: { enabled: false },
      elements: [{ type: 'button', action: 'reset' }],
      footer: { buttons: [{ action: 'reset' }, { action: 'close' }, { action: 'title' }] },
    }), { checkReachability: false });
    expect(report.warnings.filter(issue => issue.code.startsWith('invalid-settings'))).toEqual([]);
  });

  it('authoring rejects executable-looking actions and non-boolean mode values', () => {
    const session = createProjectSession({ script: projectWithSettings({}) });
    expect(() => session.setScreenLayout({
      screenId: 'settingsScreen',
      config: { elements: [{ type: 'button', action: 'javascript:alert(1)' }] },
    })).toThrow(/Unsupported custom settings button action/);
    expect(() => session.setScreenLayout({
      screenId: 'settingsScreen',
      config: { tabBar: { enabled: 0 } },
    })).toThrow(/tabBar\.enabled must be a boolean/);
  });
});
