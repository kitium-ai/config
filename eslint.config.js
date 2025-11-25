import baseConfig from './eslint.config.base.js';

export default [
  ...baseConfig,
  {
    // Allow console statements in CLI files
    files: ['**/cli.ts', '**/cli.js'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Allow any types in test files and for enquirer types
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    // Allow any for enquirer prompt types
    files: ['**/prompter.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Allow any for package.json parsing
    files: ['**/detector.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Allow any for return type inference
    files: ['**/cli.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
