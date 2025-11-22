const { defineConfig } = require('vitest/config');

/**
 * Shared Vitest base config.
 * Consumers need to have vitest installed in their project.
 */
module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'html']
    }
  },
  esbuild: {
    target: 'es2020'
  }
});
