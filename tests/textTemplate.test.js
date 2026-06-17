import { describe, expect, it } from 'vitest';

import {
  TEXT_TEMPLATE_PATTERN,
  collectTextTemplateVariableIds,
  interpolateTextTemplate,
  replaceTextTemplateVariableId,
} from '../src/shared/textTemplate.js';

describe('textTemplate', () => {
  it('resets exported regex state before template operations', () => {
    TEXT_TEMPLATE_PATTERN.lastIndex = 999;

    expect(collectTextTemplateVariableIds('${hero} ${mood}')).toEqual(['hero', 'mood']);

    TEXT_TEMPLATE_PATTERN.lastIndex = 999;
    expect(interpolateTextTemplate('${hero}', new Map([['hero', 'Sakura']]))).toBe('Sakura');

    TEXT_TEMPLATE_PATTERN.lastIndex = 999;
    expect(replaceTextTemplateVariableId('${hero}', 'hero', 'rival')).toBe('${rival}');
  });
});
