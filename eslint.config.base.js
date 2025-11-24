/**
 * Base ESLint configuration for KitiumAI monorepo
 * Compatible with ESLint 9+ flat config format
 * 
 * Note: This config requires the following packages to be installed:
 * - eslint (^9.0.0)
 * - @eslint/js
 * - typescript-eslint
 * - eslint-config-prettier
 * - eslint-plugin-prettier
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': [
        'error',
        {
          semi: true,
          singleQuote: true,
          trailingComma: 'es5',
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          arrowParens: 'always',
        },
      ],
      // TypeScript Rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],
      // Import Rules
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../*', '../../*'],
        },
      ],
      // General Rules
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      'no-debugger': 'error',
      'no-empty': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
  {
    // Test file overrides
    files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-types': 'off',
    },
  },
  {
    ignores: ['dist', 'build', 'node_modules', '.turbo', '.next'],
  },
];

