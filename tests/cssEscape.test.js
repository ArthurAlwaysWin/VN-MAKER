import { describe, expect, it } from 'vitest';

import { cssUrl, escapeCssString } from '../src/engine/cssEscape.js';

describe('CSS string escaping', () => {
  it('escapes characters that can break out of quoted CSS url strings', () => {
    expect(escapeCssString('asset://ui/bad"); color:red;/*\\next\nline')).toBe(
      'asset://ui/bad\\"); color:red;/*\\\\next\\A line',
    );
    expect(cssUrl('asset://fonts/bad"); src:url(file:///x)')).toBe(
      'url("asset://fonts/bad\\"); src:url(file:///x)")',
    );
  });
});
