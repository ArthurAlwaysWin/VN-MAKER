import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    testTimeout: 30000,
    // Default `forks` pool fails to initialize the test runner on this
    // environment (node 24 / Windows) — the module-level `runner` in
    // @vitest/runner is never set via clearCollectorContext before describe()
    // runs, causing "Cannot read properties of undefined (reading 'config')".
    // vmForks runs tests in a VM context within the same process and works.
    pool: 'vmForks',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-web/**',
      '**/dist-electron/**',
      '**/.worktrees/**',
      '**/tests/colorRecipe.test.js',
      '**/tests/configurableTabs.test.js',
      '**/tests/decorLayoutEditor.test.js',
      '**/tests/effectDsl.test.js',
      '**/tests/exportDesktop.test.js',
      '**/tests/oklch.test.js',
      '**/tests/packageEditorWin.test.js',
      '**/tests/scanAssets.test.js',
      '**/tests/scriptEngine.test.js',
      '**/tests/smartColorPanel.test.js',
      '**/tests/tabLayoutEditor.test.js',
      '**/tests/uiImageContract.test.js',
      '**/tests/widgetDefaults.test.js',
    ],
  },
});
