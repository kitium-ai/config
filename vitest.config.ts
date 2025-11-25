import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.base.js';

export default defineConfig({
  ...baseConfig,
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{spec,test}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src'],
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
    },
  },
});
