import { describe, expect, it } from 'vitest';
import { createProjectSession } from '../src/authoring/projectSession.js';

describe('read-only UI authoring inspection', () => {
  it('lists and inspects screens, nodes, overlays, and schema without mutating the script', () => {
    const source = { projectId: 'gm_inspect', characters: {}, scenes: {}, ui: { titleScreen: { elements: [] } } };
    const session = createProjectSession({ script: source });
    const before = session.toJSON();
    expect(session.listUiScreens()).toMatchObject({ schemaVersion: 2, screens: { length: 7 }, overlays: { length: 3 } });
    expect(session.inspectUiScreen('title')).toMatchObject({ id: 'title', kind: 'screen', authority: 'legacy-only' });
    expect(session.listUiNodes('confirmation', { overlay: true }).nodes[1]).toMatchObject({ type: 'confirmation' });
    expect(session.inspectUiSchema()).toMatchObject({ schemaVersion: 2, screens: { length: 7 }, overlays: { length: 3 } });
    expect(session.toJSON()).toEqual(before);
  });
});
