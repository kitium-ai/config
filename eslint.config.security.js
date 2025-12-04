/**
 * Security-focused ESLint preset building on the base KitiumAI defaults.
 * Adds `eslint-plugin-security` recommendations to catch high-risk patterns.
 */
import baseConfig from './eslint.config.base.js';
import securityPlugin from 'eslint-plugin-security';

export default [
  ...baseConfig,
  {
    name: 'kitiumai/security-hardening',
    plugins: {
      security: securityPlugin,
    },
    rules: {
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'warn',
    },
  },
];
