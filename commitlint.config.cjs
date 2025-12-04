/**
 * Shared commitlint preset aligning with multi-package release needs.
 * Consumers should install `@commitlint/cli` and reference this file via
 * `"extends": ["@kitiumai/config/commitlint.config.cjs"]`.
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'header-max-length': [2, 'always', 100],
    'scope-empty': [2, 'never'],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
  },
  prompt: {
    questions: {
      scope: {
        description:
          'Specify the impacted area (package name, app, service, docs, release, deps, infra)',
      },
    },
  },
};
