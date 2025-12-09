import { ConfigFile, ConfigGroup, TestFramework } from './types.js';

/**
 * Config metadata interface
 */
export interface ConfigMetadata {
  /** Unique identifier */
  id: ConfigFile;
  /** Display name */
  displayName: string;
  /** Description for user */
  description: string;
  /** Config group this belongs to */
  group: ConfigGroup;
  /** File path relative to project root (can be dynamic based on context) */
  filePath: string | ((context: TemplateContext) => string);
  /** Template content or generator function */
  template: string | ((context: TemplateContext) => string);
  /** Whether this is a JSON file */
  isJson?: boolean | undefined;
  /** Dependencies - other configs that must be selected with this one */
  dependencies?: ConfigFile[] | undefined;
  /** Conflicts - configs that cannot be selected together */
  conflicts?: ConfigFile[] | undefined;
  /** Conditions for when this config should be available */
  condition?: ((context: TemplateContext) => boolean) | undefined;
  /** Whether this should be enabled by default for its group */
  defaultEnabled?: boolean | undefined;
  /** Priority order within group (higher = shown first) */
  priority?: number | undefined;
}

/**
 * Context passed to template generators
 */
export interface TemplateContext {
  packageName: string;
  testFramework: TestFramework;
  enableUiConfigs: boolean;
  publicPackage: boolean;
  hasGit: boolean;
  year: number;
}

/**
 * Centralized configuration registry
 * Eliminates the need for 23+ individual template methods
 */
export const CONFIG_REGISTRY: ConfigMetadata[] = [
  // ===== CORE GROUP =====
  {
    id: ConfigFile.TypeScript,
    displayName: 'TypeScript Config',
    description: 'tsconfig.json with strict mode and modern settings',
    group: ConfigGroup.Core,
    filePath: 'tsconfig.json',
    isJson: true,
    defaultEnabled: true,
    priority: 100,
    template: JSON.stringify(
      {
        extends: '@kitiumai/config/tsconfig.base.json',
        compilerOptions: {
          baseUrl: '.',
          outDir: './dist',
        },
        include: ['src'],
      },
      null,
      2
    ),
  },

  {
    id: ConfigFile.CodeqlConfig,
    displayName: 'CodeQL Config',
    description: 'Shared CodeQL query configuration',
    group: ConfigGroup.Security,
    filePath: '.github/codeql-config.yml',
    defaultEnabled: true,
    priority: 65,
    condition: (ctx) => ctx.hasGit,
    template: `# CodeQL Configuration
disable-default-queries: false

queries:
  - uses: security-and-quality
  - uses: security-experimental

paths-ignore:
  - node_modules
  - .pnpm-store
  - dist
  - build
  - coverage
  - .next
  - .turbo
  - .changeset\n`,
  },

  {
    id: ConfigFile.DependencyReviewConfig,
    displayName: 'Dependency Review Config',
    description: 'License and vulnerability thresholds',
    group: ConfigGroup.Security,
    filePath: '.github/dependency-review-config.yml',
    defaultEnabled: true,
    priority: 64,
    condition: (ctx) => ctx.hasGit,
    template: `fail_on_severity: moderate
allow_licenses:
  - MIT
  - Apache-2.0
  - BSD-2-Clause
  - BSD-3-Clause
  - ISC
  - CC0-1.0
deny_licenses:
  - MS-PL
  - CC-BY-NC
vulnerability_check: true
license_check: true\n`,
  },

  {
    id: ConfigFile.LabelerConfig,
    displayName: 'PR Labeler Config',
    description: 'Labeler rules for automatic PR labels',
    group: ConfigGroup.Governance,
    filePath: '.github/labeler.yml',
    defaultEnabled: true,
    priority: 55,
    condition: (ctx) => ctx.hasGit,
    template: `# PR Labeler Configuration
version: 2

labels:
  - label: 'enhancement'
    sync: true
    matcher:
      files: ['packages/**', 'apps/**', 'services/**']
      title: '/^(feat|feature)/i'

  - label: 'bug'
    sync: true
    matcher:
      title: '/^(fix|bug)/i'

  - label: 'documentation'
    sync: true
    matcher:
      files: ['*.md', 'docs/**', 'README*']

  - label: 'ci'
    sync: true
    matcher:
      files: ['.github/**', 'scripts/**']

  - label: 'security'
    sync: true
    matcher:
      files: ['packages/core/@kitiumai/security/**', 'SECURITY.md']

  - label: 'dependencies'
    sync: true
    matcher:
      files: ['package.json', 'pnpm-lock.yaml']

  - label: 'breaking-change'
    sync: true
    matcher:
      title: '/breaking|major/i'\n`,
  },

  {
    id: ConfigFile.PrSizeLabeler,
    displayName: 'PR Size Labeler',
    description: 'Custom size buckets for PRs',
    group: ConfigGroup.Governance,
    filePath: '.github/pr-size-labeler.yml',
    defaultEnabled: true,
    priority: 50,
    condition: (ctx) => ctx.hasGit,
    template: `ci:
  - .github/**
  - scripts/**

size/xs:
  - changed-files:
      - any-glob-to-any-file: ['**/*.{md,txt}', 'docs/**']

size/s:
  - changed-files:
      - any-glob-to-any-file: ['**/*.{js,ts,tsx,jsx,json,yml,yaml}']

size/m:
  - changed-files:
      - any-glob-to-any-file: ['packages/**', 'apps/**']

size/l:
  - changed-files:
      - any-glob-to-any-file: ['services/**', 'products/**']

size/xl:
  - changed-files:
      - any-glob-to-any-file: ['**/*']\n`,
  },

  {
    id: ConfigFile.IssueTemplateDocs,
    displayName: 'Docs Issue Template',
    description: 'Issue template for documentation fixes',
    group: ConfigGroup.Governance,
    filePath: '.github/ISSUE_TEMPLATES/documentation.yml',
    defaultEnabled: true,
    priority: 65,
    condition: (ctx) => ctx.hasGit,
    template: `---
name: Documentation Issue
about: Report issues with documentation
title: "[DOCS] "
labels: ["documentation", "triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Help us improve our documentation!

  - type: textarea
    id: description
    attributes:
      label: Description
      description: What documentation issue did you find?
    validations:
      required: true

  - type: input
    id: location
    attributes:
      label: Location
      description: Where is this documentation located?
      placeholder: "README.md, docs/setup.md, etc."
    validations:
      required: true

  - type: textarea
    id: improvement
    attributes:
      label: Suggested Improvement
      description: How can we improve this documentation?
    validations:
      required: true

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      description: Please verify the following
      options:
        - label: I have searched existing documentation issues
          required: true\n`,
  },

  {
    id: ConfigFile.IssueTemplateSecurity,
    displayName: 'Security Issue Template',
    description: 'Security vulnerability disclosure template',
    group: ConfigGroup.Governance,
    filePath: '.github/ISSUE_TEMPLATES/security_report.yml',
    defaultEnabled: true,
    priority: 60,
    condition: (ctx) => ctx.hasGit,
    template: `---
name: Security Vulnerability
about: Report a security vulnerability
title: "[SECURITY] "
labels: ["security", "urgent"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        **IMPORTANT:** Please do not report security vulnerabilities through public GitHub issues.

        Instead, please report security vulnerabilities by emailing security@kitiumai.com

        We will investigate all legitimate reports and do our best to quickly fix the problem.

  - type: textarea
    id: description
    attributes:
      label: Vulnerability Description
      description: Please provide a detailed description of the vulnerability.
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How severe is this vulnerability?
      options:
        - Critical
        - High
        - Medium
        - Low
    validations:
      required: true

  - type: textarea
    id: impact
    attributes:
      label: Potential Impact
      description: What could an attacker achieve by exploiting this vulnerability?
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Reproduction Steps
      description: How can this vulnerability be reproduced?
    validations:
      required: true

  - type: input
    id: contact
    attributes:
      label: Contact Information
      description: How can we reach you for follow-up questions?
      placeholder: "email@example.com or GitHub username"
    validations:
      required: true\n`,
  },

  {
    id: ConfigFile.Prettier,
    displayName: 'Prettier Config',
    description: 'Code formatting with Prettier',
    group: ConfigGroup.Core,
    filePath: '.prettierrc.cjs',
    defaultEnabled: true,
    priority: 90,
    template: `module.exports = require('@kitiumai/config/prettier.config.cjs');\n`,
  },

  {
    id: ConfigFile.ESLint,
    displayName: 'ESLint Config',
    description: 'Linting rules for code quality',
    group: ConfigGroup.Core,
    filePath: 'eslint.config.js',
    defaultEnabled: true,
    priority: 85,
    template: `import baseConfig from '@kitiumai/config/eslint.config.base.js';

export default [
  ...baseConfig,
  // Add your custom rules here
];\n`,
  },

  {
    id: ConfigFile.EditorConfig,
    displayName: 'EditorConfig',
    description: 'Editor settings for consistent formatting',
    group: ConfigGroup.Editor,
    filePath: '.editorconfig',
    defaultEnabled: true,
    priority: 50,
    template: `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_size = 2
indent_style = space

[Makefile]
indent_style = tab
\n`,
  },

  // ===== TESTING GROUP =====
  {
    id: ConfigFile.Vitest,
    displayName: 'Vitest Config',
    description: 'Modern, fast test runner (recommended)',
    group: ConfigGroup.Testing,
    filePath: 'vitest.config.ts',
    defaultEnabled: true,
    priority: 100,
    condition: (ctx) => ctx.testFramework === TestFramework.Vitest,
    conflicts: [
      ConfigFile.Jest,
      ConfigFile.Mocha,
      ConfigFile.Jasmine,
      ConfigFile.Ava,
      ConfigFile.Tape,
    ],
    template: `import baseConfig from '@kitiumai/config/vitest.config.base.js';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...baseConfig,
  // Add your custom config here
});\n`,
  },

  {
    id: ConfigFile.Jest,
    displayName: 'Jest Config',
    description: 'Popular test framework with rich features',
    group: ConfigGroup.Testing,
    filePath: 'jest.config.cjs',
    defaultEnabled: false,
    priority: 90,
    condition: (ctx) => ctx.testFramework === TestFramework.Jest,
    conflicts: [
      ConfigFile.Vitest,
      ConfigFile.Mocha,
      ConfigFile.Jasmine,
      ConfigFile.Ava,
      ConfigFile.Tape,
    ],
    template: `const config = require('@kitiumai/config/jest.config.base.cjs');

module.exports = {
  ...config,
  // Override with your custom settings
};\n`,
  },

  {
    id: ConfigFile.Mocha,
    displayName: 'Mocha Config',
    description: 'Flexible test framework',
    group: ConfigGroup.Testing,
    filePath: 'mocha.opts',
    defaultEnabled: false,
    priority: 80,
    condition: (ctx) => ctx.testFramework === TestFramework.Mocha,
    conflicts: [
      ConfigFile.Vitest,
      ConfigFile.Jest,
      ConfigFile.Jasmine,
      ConfigFile.Ava,
      ConfigFile.Tape,
    ],
    template: `--require ts-node/register
--require source-map-support/register
--recursive
--extension .ts
src/**/*.spec.ts\n`,
  },

  {
    id: ConfigFile.Jasmine,
    displayName: 'Jasmine Config',
    description: 'BDD-style testing framework',
    group: ConfigGroup.Testing,
    filePath: 'jasmine.json',
    isJson: true,
    defaultEnabled: false,
    priority: 70,
    condition: (ctx) => ctx.testFramework === TestFramework.Jasmine,
    conflicts: [
      ConfigFile.Vitest,
      ConfigFile.Jest,
      ConfigFile.Mocha,
      ConfigFile.Ava,
      ConfigFile.Tape,
    ],
    template: JSON.stringify(
      {
        ['spec_dir']: 'src',
        ['spec_files']: ['**/*.spec.ts'],
        helpers: ['helpers/**/*.ts'],
        stopSpecOnExpectationFailure: false,
        random: false,
      },
      null,
      2
    ),
  },

  {
    id: ConfigFile.Ava,
    displayName: 'AVA Config',
    description: 'Concurrent test runner',
    group: ConfigGroup.Testing,
    filePath: 'ava.config.js',
    defaultEnabled: false,
    priority: 60,
    condition: (ctx) => ctx.testFramework === TestFramework.Ava,
    conflicts: [
      ConfigFile.Vitest,
      ConfigFile.Jest,
      ConfigFile.Mocha,
      ConfigFile.Jasmine,
      ConfigFile.Tape,
    ],
    template: `export default {
  files: ['src/**/*.spec.ts'],
  extensions: {
    ts: 'module',
  },
  nodeArguments: ['--loader=ts-node/esm'],
};\n`,
  },

  {
    id: ConfigFile.Tape,
    displayName: 'Tape Config',
    description: 'Minimal TAP-producing test harness',
    group: ConfigGroup.Testing,
    filePath: 'tape.config.js',
    defaultEnabled: false,
    priority: 50,
    condition: (ctx) => ctx.testFramework === TestFramework.Tape,
    conflicts: [
      ConfigFile.Vitest,
      ConfigFile.Jest,
      ConfigFile.Mocha,
      ConfigFile.Jasmine,
      ConfigFile.Ava,
    ],
    template: `module.exports = {
  files: ['src/**/*.spec.ts'],
};\n`,
  },

  {
    id: ConfigFile.Playwright,
    displayName: 'Playwright E2E',
    description: 'End-to-end testing for web applications',
    group: ConfigGroup.Testing,
    filePath: 'playwright.config.ts',
    defaultEnabled: false,
    priority: 40,
    condition: (ctx) => ctx.enableUiConfigs,
    template: `import baseConfig from '@kitiumai/config/playwright.config.base.js';

export default baseConfig;\n`,
  },

  // ===== DOCS GROUP =====
  {
    id: ConfigFile.TypeDoc,
    displayName: 'TypeDoc Config',
    description: 'API documentation generator',
    group: ConfigGroup.Docs,
    filePath: 'typedoc.json',
    isJson: true,
    defaultEnabled: true,
    priority: 100,
    template: JSON.stringify(
      {
        extends: ['@kitiumai/config/typedoc.config.base.cjs'],
        out: 'docs/api',
        exclude: ['**/*.spec.ts', '**/*.test.ts'],
      },
      null,
      2
    ),
  },

  {
    id: ConfigFile.Storybook,
    displayName: 'Storybook Config',
    description: 'UI component documentation',
    group: ConfigGroup.Docs,
    filePath: '.storybook/main.cjs',
    defaultEnabled: false,
    priority: 90,
    condition: (ctx) => ctx.enableUiConfigs,
    template: `const config = require('@kitiumai/config/storybook.main.base.cjs');

module.exports = {
  ...config,
  // Override with your custom settings
};\n`,
  },

  // ===== RELEASE GROUP =====
  {
    id: ConfigFile.CommitLint,
    displayName: 'CommitLint Config',
    description: 'Enforce conventional commit messages',
    group: ConfigGroup.Release,
    filePath: 'commitlint.config.cjs',
    defaultEnabled: true,
    priority: 100,
    template: `module.exports = require('@kitiumai/config/commitlint.config.cjs');\n`,
  },

  {
    id: ConfigFile.SemanticRelease,
    displayName: 'Semantic Release Config',
    description: 'Automated versioning and changelog',
    group: ConfigGroup.Release,
    filePath: 'release.config.cjs',
    defaultEnabled: true,
    priority: 90,
    template: `const config = require('@kitiumai/config/semantic-release.config.base.cjs');

module.exports = {
  ...config,
  // Override with your custom settings
};\n`,
  },

  {
    id: ConfigFile.Changesets,
    displayName: 'Changesets Config',
    description: 'Version and changelog management for monorepos',
    group: ConfigGroup.Release,
    filePath: '.changeset/config.json',
    isJson: true,
    defaultEnabled: true,
    priority: 80,
    template: JSON.stringify(
      {
        $schema: 'https://docs.bump.sh/schemas/changesets/config.json',
        changelog: ['@changesets/changelog-github', { repo: 'org/repo' }],
        commit: false,
        fixed: [],
        linked: [],
        access: 'restricted',
        baseBranch: 'main',
        updateInternalDependencies: 'patch',
        ignore: [],
      },
      null,
      2
    ),
  },

  // ===== SECURITY GROUP =====
  {
    id: ConfigFile.ESLintSecurity,
    displayName: 'ESLint Security Rules',
    description: 'Security-focused linting rules',
    group: ConfigGroup.Security,
    filePath: 'eslint.config.security.js',
    defaultEnabled: true,
    priority: 100,
    dependencies: [ConfigFile.ESLint],
    template: `import securityConfig from '@kitiumai/config/eslint.config.security.js';

export default [
  ...securityConfig,
  // Add your custom rules here
];\n`,
  },

  {
    id: ConfigFile.Gitleaks,
    displayName: 'Gitleaks Config',
    description: 'Secret scanning configuration',
    group: ConfigGroup.Security,
    filePath: '.gitleaks.toml',
    defaultEnabled: true,
    priority: 90,
    condition: (ctx) => ctx.hasGit,
    template: `extends = ["@kitiumai/config/gitleaks.toml"]\n`,
  },

  {
    id: ConfigFile.SecurityWorkflow,
    displayName: 'Security CI Workflow',
    description: 'Automated security scanning in CI',
    group: ConfigGroup.Security,
    filePath: '.github/workflows/security.yml',
    defaultEnabled: true,
    priority: 80,
    condition: (ctx) => ctx.hasGit,
    dependencies: [ConfigFile.GithubSharedWorkflow],
    template: (ctx) => generateSecurityWorkflow(ctx),
  },

  {
    id: ConfigFile.Dependabot,
    displayName: 'Dependabot Config',
    description: 'Automated dependency updates',
    group: ConfigGroup.Security,
    filePath: '.github/dependabot.yml',
    defaultEnabled: true,
    priority: 70,
    condition: (ctx) => ctx.hasGit,
    template: `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    assignees: []
    labels: ["deps", "automation"]
    commit-message:
      prefix: "chore"
      prefix-development: "chore"
      include: "scope"
    groups:
      typescript:
        patterns:
          - "typescript"
          - "@types/*"
      eslint:
        patterns:
          - "eslint*"
          - "@typescript-eslint/*"
      testing:
        patterns:
          - "jest*"
          - "@testing-library/*"
          - "vitest*"
      build-tools:
        patterns:
          - "turbo"
          - "webpack*"
          - "rollup*"
          - "vite*"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    labels: ["ci", "automation"]
    commit-message:
      prefix: "ci"
      include: "scope"

  - package-ecosystem: "docker"
    directory: "/dev-setup/.devcontainer"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 3
    labels: ["docker", "automation"]
    commit-message:
      prefix: "docker"
      include: "scope"\n`,
  },

  {
    id: ConfigFile.Npmrc,
    displayName: '.npmrc Config',
    description: 'npm configuration settings',
    group: ConfigGroup.Security,
    filePath: '.npmrc',
    defaultEnabled: true,
    priority: 60,
    template: `registry=https://registry.npmjs.org/
engine-strict=true
strict-ssl=true
save-exact=false\n`,
  },

  // ===== CI/CD GROUP =====
  {
    id: ConfigFile.GithubSharedWorkflow,
    displayName: 'Shared Workflow Action',
    description: 'Reusable composite action for shared setup tasks',
    group: ConfigGroup.Ci,
    filePath: '.github/actions/kitium-shared-setup/action.yml',
    defaultEnabled: true,
    priority: 110,
    condition: (ctx) => ctx.hasGit,
    template: () => generateSharedWorkflowAction(),
  },

  {
    id: ConfigFile.GithubCi,
    displayName: 'CI Workflow',
    description: 'Continuous integration pipeline',
    group: ConfigGroup.Ci,
    filePath: '.github/workflows/ci.yml',
    defaultEnabled: true,
    priority: 100,
    condition: (ctx) => ctx.hasGit,
    dependencies: [ConfigFile.GithubSharedWorkflow],
    template: (ctx) => generateCiWorkflow(ctx),
  },

  {
    id: ConfigFile.GithubRelease,
    displayName: 'Release Workflow',
    description: 'Automated release and publishing',
    group: ConfigGroup.Ci,
    filePath: (ctx: TemplateContext) => `.github/workflows/release-${ctx.packageName}.yml`,
    defaultEnabled: true,
    priority: 90,
    condition: (ctx) => ctx.hasGit && ctx.publicPackage,
    dependencies: [ConfigFile.GithubSharedWorkflow],
    template: (ctx) => generateReleaseWorkflow(ctx),
  },

  {
    id: ConfigFile.GithubTagRelease,
    displayName: 'Tag Release Workflow',
    description: 'Manual version tagging workflow',
    group: ConfigGroup.Ci,
    filePath: (ctx: TemplateContext) => `.github/workflows/tag-release-${ctx.packageName}.yml`,
    defaultEnabled: true,
    priority: 80,
    condition: (ctx) => ctx.hasGit && ctx.publicPackage,
    dependencies: [ConfigFile.GithubSharedWorkflow],
    template: (ctx) => generateTagReleaseWorkflow(ctx),
  },

  {
    id: ConfigFile.GithubLabelPr,
    displayName: 'Label PR Workflow',
    description: 'Automatically label pull requests',
    group: ConfigGroup.Ci,
    filePath: '.github/workflows/label-pr.yml',
    defaultEnabled: true,
    priority: 70,
    condition: (ctx) => ctx.hasGit,
    dependencies: [ConfigFile.LabelerConfig, ConfigFile.PrSizeLabeler],
    template: `name: Label PR

on:
  pull_request_target:
    types: [opened, ready_for_review]

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Label PR based on branch
        uses: actions/labeler@v5
        with:
          repo-token: \${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml

      - name: Auto-label PR size
        uses: codacy/git-version@2.7.1
        with:
          release-branch: main
          dev-branch: develop

      - name: Label PR size
        uses: codelytv/pr-size-labeler@v1
        with:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          xs_label: 'size/xs'
          xs_max_size: 10
          s_label: 'size/s'
          s_max_size: 100
          m_label: 'size/m'
          m_max_size: 500
          l_label: 'size/l'
          l_max_size: 1000
          xl_label: 'size/xl'
          message_if_xl: |
            This PR is very large. Consider splitting it into multiple smaller PRs for easier review.\n`,
  },

  {
    id: ConfigFile.GithubDependencyReview,
    displayName: 'Dependency Review Workflow',
    description: 'Runs GitHub dependency review on PRs',
    group: ConfigGroup.Ci,
    filePath: '.github/workflows/dependency-review.yml',
    defaultEnabled: true,
    priority: 60,
    condition: (ctx) => ctx.hasGit,
    dependencies: [ConfigFile.DependencyReviewConfig],
    template: `name: Dependency Review

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Dependency Review
        uses: actions/dependency-review-action@v4
        with:
          config-file: '.github/dependency-review-config.yml'\n`,
  },

  {
    id: ConfigFile.GithubWeeklyMaintenance,
    displayName: 'Weekly Maintenance Workflow',
    description: 'Security scans and maintenance checks',
    group: ConfigGroup.Ci,
    filePath: '.github/workflows/weekly-maintenance.yml',
    defaultEnabled: true,
    priority: 50,
    condition: (ctx) => ctx.hasGit,
    dependencies: [ConfigFile.GithubSharedWorkflow, ConfigFile.CodeqlConfig],
    template: `name: Weekly Maintenance

on:
  schedule:
    - cron: '0 3 * * 1'
  workflow_dispatch:

jobs:
  security-maintenance:
    name: "Security & Maintenance"
    runs-on: ubuntu-latest
    container:
      image: docker.io/ashishyd/kitiumai-dev:latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install dependencies
        run: pnpm install --frozen-lockfile --ignore-scripts

      - name: Run comprehensive security audit
        run: pnpm audit --prod --audit-level moderate

      - name: Check for vulnerable dependencies
        run: |
          if pnpm audit --prod --json | jq -e '.metadata.vulnerabilities.high > 0 or .metadata.vulnerabilities.critical > 0'; then
            echo "🚨 High or critical vulnerabilities found!"
            pnpm audit --prod
            exit 1
          else
            echo "✅ No high or critical vulnerabilities found"
          fi

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Dependency license check
        run: |
          pnpm licenses list --json | jq -r '.[] | select(.license == null or (.license | test("MIT|Apache-2.0|BSD-2-Clause|BSD-3-Clause|ISC") | not)) | .name' > unlicensed_deps.txt
          if [ -s unlicensed_deps.txt ]; then
            echo "⚠️  Dependencies with potentially problematic licenses:"
            cat unlicensed_deps.txt
          else
            echo "✅ All dependencies have acceptable licenses"
          fi

  codeql-weekly:
    name: "CodeQL Weekly Scan"
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'typescript', 'python']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: \${{ matrix.language }}
          config-file: ./.github/codeql-config.yml

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:\${{ matrix.language }}"\n`,
  },

  // ===== GOVERNANCE GROUP =====
  {
    id: ConfigFile.Codeowners,
    displayName: 'CODEOWNERS',
    description: 'Code ownership and review rules',
    group: ConfigGroup.Governance,
    filePath: '.github/CODEOWNERS',
    defaultEnabled: true,
    priority: 100,
    condition: (ctx) => ctx.hasGit,
    template: `# Default ownership rules
* @kitium-ai/maintainers
.github/ @kitium-ai/security\n`,
  },

  {
    id: ConfigFile.Funding,
    displayName: 'Funding Links',
    description: 'Sponsor and funding configuration',
    group: ConfigGroup.Governance,
    filePath: '.github/FUNDING.yml',
    defaultEnabled: true,
    priority: 95,
    condition: (ctx) => ctx.hasGit,
    template: `github: [kitium-ai]
patreon: kitiumai
open_collective: kitiumai
ko_fi: kitiumai
tidelift: npm/@kitiumai/root
custom: ["https://kitiumai.com/sponsor", "https://opencollective.com/kitiumai"]\n`,
  },

  {
    id: ConfigFile.PullRequestTemplate,
    displayName: 'PR Template',
    description: 'Pull request template',
    group: ConfigGroup.Governance,
    filePath: '.github/PULL_REQUEST_TEMPLATE.md',
    defaultEnabled: true,
    priority: 90,
    condition: (ctx) => ctx.hasGit,
    template: `# Pull Request Template

## Description
Brief description of the changes made in this PR.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Style/UX improvements
- [ ] 🔧 Refactoring (no functional changes)
- [ ] 🧪 Tests (adding/updating tests)
- [ ] 🔒 Security improvements
- [ ] 🚀 Performance improvements
- [ ] 🏗️ Build/CI improvements

## Changes Made
### What was changed?
- Detailed description of changes

### Why was this changed?
- Rationale for the changes

### How was this tested?
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] Existing tests pass

## Screenshots (if applicable)
<!-- Add screenshots to help explain your changes -->

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

## Additional Notes
<!-- Any additional information or context about this PR -->\n`,
  },

  {
    id: ConfigFile.IssueTemplateBug,
    displayName: 'Bug Report Template',
    description: 'Issue template for bug reports',
    group: ConfigGroup.Governance,
    filePath: '.github/ISSUE_TEMPLATES/bug_report.yml',
    defaultEnabled: true,
    priority: 80,
    condition: (ctx) => ctx.hasGit,
    template: `---
name: Bug Report
about: Create a report to help us improve
title: "[BUG] "
labels: ["bug", "triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!

  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear and concise description of what the bug is.
      placeholder: Tell us what you were trying to do and what happened instead.
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Reproduction Steps
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true

  - type: textarea
    id: expected-behavior
    attributes:
      label: Expected Behavior
      description: A clear and concise description of what you expected to happen.
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How severe is this bug?
      options:
        - Critical (blocks core functionality)
        - High (major feature broken)
        - Medium (feature impaired)
        - Low (minor issue)
    validations:
      required: true

  - type: input
    id: environment
    attributes:
      label: Environment
      description: Please provide details about your environment.
      placeholder: "OS: Windows 11, Node: 18.17.0, pnpm: 8.6.0"
    validations:
      required: true

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: Add any other context about the problem here.
      placeholder: Screenshots, logs, or other relevant information.

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      description: Please verify the following
      options:
        - label: I have searched for similar issues and confirmed this is not a duplicate
          required: true
        - label: I have provided clear reproduction steps
          required: true
        - label: I have included relevant environment details
          required: true\n`,
  },

  {
    id: ConfigFile.IssueTemplateFeature,
    displayName: 'Feature Request Template',
    description: 'Issue template for feature requests',
    group: ConfigGroup.Governance,
    filePath: '.github/ISSUE_TEMPLATES/feature_request.yml',
    defaultEnabled: true,
    priority: 70,
    condition: (ctx) => ctx.hasGit,
    template: `---
name: Feature Request
about: Suggest an idea for this project
title: "[FEATURE] "
labels: ["enhancement", "triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature!

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What's the problem this feature would solve?
      placeholder: I'm always frustrated when...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe the solution you'd like.
      placeholder: I would like to see...
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternative Solutions
      description: Describe alternatives you've considered.
      placeholder: I also considered...

  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How important is this feature to you?
      options:
        - Nice to have
        - Should have
        - Must have
    validations:
      required: true

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: Add any other context or screenshots about the feature request here.

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      description: Please verify the following
      options:
        - label: This feature would benefit other users
          required: true
        - label: I have searched for similar feature requests
          required: true\n`,
  },

  // ===== GIT HOOKS GROUP =====
  {
    id: ConfigFile.LintStaged,
    displayName: 'Lint-Staged Config',
    description: 'Run linters on git staged files',
    group: ConfigGroup.GitHooks,
    filePath: 'lint-staged.config.cjs',
    defaultEnabled: true,
    priority: 100,
    condition: (ctx) => ctx.hasGit,
    template: `module.exports = require('@kitiumai/config/lint-staged.config.cjs');\n`,
  },

  {
    id: ConfigFile.Husky,
    displayName: 'Husky Git Hooks',
    description: 'Git hooks management',
    group: ConfigGroup.GitHooks,
    filePath: '.husky/pre-commit',
    defaultEnabled: true,
    priority: 90,
    condition: (ctx) => ctx.hasGit,
    dependencies: [ConfigFile.LintStaged],
    template: `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec lint-staged\n`,
  },

  // ===== GIT GROUP =====
  {
    id: ConfigFile.Gitignore,
    displayName: '.gitignore',
    description: 'Git ignore rules for Node.js projects',
    group: ConfigGroup.Git,
    filePath: '.gitignore',
    defaultEnabled: true,
    priority: 100,
    condition: (ctx) => ctx.hasGit,
    template: `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/
*.lcov

# Build outputs
dist/
build/
out/
*.tsbuildinfo

# Misc
.DS_Store
*.log
*.log.*
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db

# Cache
.cache/
.parcel-cache/
.next/
.nuxt/
.vuepress/dist/

# Temporary files
*.tmp
*.temp
.temp/

# Logs
logs/

# Storybook
storybook-static/

# TypeScript
*.tsbuildinfo
.tsbuildinfo

# Playwright
test-results/
playwright-report/
playwright/.cache/\n`,
  },
];

/**
 * Helper function to generate security workflow content
 */
function generateSecurityWorkflow(_ctx: TemplateContext): string {
  return `name: Security

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read

jobs:
  security:
    runs-on: ubuntu-latest
    container:
      image: docker.io/ashishyd/kitiumai-dev:latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Shared setup (install + audit)
        uses: ./.github/actions/kitium-shared-setup
        with:
          run-security-audit: "true"
          audit-allow-failure: "true"

      - name: Install TruffleHog CLI
        run: |
          apt-get update
          apt-get install -y python3-venv
          python3 -m venv /tmp/trufflehog
          /tmp/trufflehog/bin/pip install --no-cache-dir trufflehog

      - name: Check for secrets with TruffleHog
        run: |
          /tmp/trufflehog/bin/trufflehog filesystem --no-update --fail --path .
        continue-on-error: true\n`;
}

/**
 * Helper function to generate CI workflow content
 */
function generateCiWorkflow(_ctx: TemplateContext): string {
  return `name: CI

on:
  push:
    branches: [main, master]
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    container:
      image: docker.io/ashishyd/kitiumai-dev:latest
    steps:
      - uses: actions/checkout@v4
      - name: Shared setup (build, lint, test, typecheck)
        uses: ./.github/actions/kitium-shared-setup
        with:
          run-build: "true"
          run-lint: "true"
          lint-command: pnpm run lint
          run-tests: "true"
          test-command: pnpm run test
          run-typecheck: "true"
          typecheck-command: pnpm run typecheck\n`;
}

/**
 * Helper function to generate release workflow content
 */
function generateReleaseWorkflow(ctx: TemplateContext): string {
  return `name: Release

on:
  push:
    tags:
      - 'v*'
  create:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      tag:
        description: 'Tag to release (e.g., v1.0.0)'
        required: true
        type: string

permissions:
  contents: write
  id-token: write

jobs:
  release:
    name: "Release"
    runs-on: ubuntu-latest
    container:
      image: docker.io/ashishyd/kitiumai-dev:latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Git
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git config --global --add safe.directory $GITHUB_WORKSPACE

      - name: Environment health check
        run: |
          echo "📋 Environment diagnostics:"
          echo "Node: $(node --version)"
          echo "NPM: $(npm --version)"
          echo "Git: $(git --version)"
          echo "Working directory: $(pwd)"
          echo "User: $(whoami)"

      - name: Get tag name
        id: tag
        run: |
          if [ "\${{ github.event_name }}" = "workflow_dispatch" ]; then
            TAG_NAME="\${{ inputs.tag }}"
          else
            TAG_NAME="\${GITHUB_REF#refs/tags/}"
          fi
          echo "tag=\${TAG_NAME}" >> "$GITHUB_OUTPUT"
          echo "Processing tag: $TAG_NAME"

      - name: Extract version from tag
        id: version
        run: |
          VERSION=$(echo "\${{ steps.tag.outputs.tag }}" | sed 's/^v//')
          echo "version=\${VERSION}" >> "$GITHUB_OUTPUT"
          echo "Extracted version: $VERSION"

      - name: Shared setup (install + verify)
        uses: ./.github/actions/kitium-shared-setup
        with:
          run-build: "true"
          run-tests: "true"
          run-lint: "true"
          run-typecheck: "true"

      - name: Security checks
        run: |
          pnpm exec kitiumai-config security check || echo "⚠️ Security check failed, continuing..."

      - name: Verify package version
        run: |
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          TARGET_VERSION="\${{ steps.version.outputs.version }}"

          if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
            echo "✅ Version matches tag: $TARGET_VERSION"
          else
            echo "❌ Version mismatch detected!"
            echo "   package.json version: $CURRENT_VERSION"
            echo "   Tag version: $TARGET_VERSION"
            echo ""
            echo "⚠️  The package.json version must match the tag version before publishing."
            echo "   Please update package.json to version $TARGET_VERSION and commit the change."
            echo "   Then re-run the tag-release workflow."
            exit 1
          fi

      - name: Configure npm for trusted publishing
        env:
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: |
          if [ -z "$NPM_TOKEN" ]; then
            echo "❌ NPM_TOKEN is required for publishing"
            exit 1
          fi

          echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc
          npm config set provenance true
          echo "✅ npm configured for trusted publishing"

      - name: Check if version already published
        id: version_check
        run: |
          VERSION="\${{ steps.version.outputs.version }}"
          PACKAGE_NAME="${ctx.packageName}"

          if npm view "\${PACKAGE_NAME}@\${VERSION}" version 2>/dev/null; then
            echo "already_published=true" >> "$GITHUB_OUTPUT"
            echo "⏭️  Version \${VERSION} already published to npm, skipping publish step"
          else
            echo "already_published=false" >> "$GITHUB_OUTPUT"
            echo "📦 Version \${VERSION} not found on npm, proceeding with publish"
          fi

      - name: Publish to NPM
        if: steps.version_check.outputs.already_published != 'true'
        env:
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: |
          npm publish --access public --provenance

      - name: Generate SBOM
        continue-on-error: true
        run: |
          pnpm exec kitiumai-config observability setup || echo "⚠️ Observability setup failed"
          echo '{"bomFormat":"CycloneDX","specVersion":"1.5","version":1,"metadata":{"component":{"name":"${ctx.packageName}","version":"\${{ steps.version.outputs.version }}"}}}' > sbom.json

      - name: Create GitHub Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: \${{ steps.tag.outputs.tag }}
          release_name: "${ctx.packageName} \${{ steps.version.outputs.version }}"
          body: |
            ## 🚀 Release ${ctx.packageName}@\${{ steps.version.outputs.version }}

            ### Installation
            \`\`\`bash
            npm install ${ctx.packageName}@\${{ steps.version.outputs.version }}
            # or
            pnpm add ${ctx.packageName}@\${{ steps.version.outputs.version }}
            \`\`\`

            ### Documentation
            📖 [API Reference](https://github.com/kitiumai/config/blob/main/README.md)

            ### Security
            🔒 [SBOM](https://github.com/kitiumai/config/releases/download/\${{ steps.tag.outputs.tag }}/sbom.json)
          draft: false
          prerelease: false

      - name: Upload SBOM to release
        continue-on-error: true
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: \${{ steps.create_release.outputs.upload_url }}
          asset_path: sbom.json
          asset_name: sbom.json
          asset_content_type: application/json

      - name: Notify on success
        if: success()
        run: |
          echo "✅ Successfully released ${ctx.packageName}@\${{ steps.version.outputs.version }}"
          echo "📦 Published to NPM: https://www.npmjs.com/package/${ctx.packageName}/v/\${{ steps.version.outputs.version }}"
          echo "🏷️  GitHub Release: https://github.com/kitiumai/config/releases/tag/\${{ steps.tag.outputs.tag }}"

      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ Failed to release ${ctx.packageName}@\${{ steps.version.outputs.version }}"
          echo "Please check the workflow logs for details"\n`;
}

/**
 * Helper function to generate tag release workflow content
 */
function generateTagReleaseWorkflow(ctx: TemplateContext): string {
  return `name: Tag Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to tag (e.g., 1.0.0, 1.1.0, 2.0.0)'
        required: true
        type: string
      release_type:
        description: 'Release type'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

permissions:
  contents: write
  pull-requests: write

jobs:
  tag-release:
    name: "Create Release Tag"
    runs-on: ubuntu-latest
    container:
      image: docker.io/ashishyd/kitiumai-dev:latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Git
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git config --global --add safe.directory $GITHUB_WORKSPACE

      - name: Environment health check
        run: |
          echo "📋 Environment diagnostics:"
          echo "Node: $(node --version)"
          echo "NPM: $(npm --version)"
          echo "Git: $(git --version)"
          echo "Working directory: $(pwd)"
          echo "User: $(whoami)"

      - name: Validate version format
        run: |
          VERSION="\${{ inputs.version }}"
          if [[ ! $VERSION =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then
            echo "❌ Invalid version format: $VERSION"
            echo "Version must be in format: x.y.z (e.g., 1.0.0, 2.1.3)"
            exit 1
          fi
          echo "✅ Valid version format: $VERSION"

      - name: Check if tag already exists
        id: check_tag
        run: |
          TAG="v\${{ inputs.version }}"
          if git tag -l | grep -q "^$TAG$"; then
            echo "❌ Tag $TAG already exists"
            echo "exists=true" >> "$GITHUB_OUTPUT"
            exit 1
          else
            echo "✅ Tag $TAG is available"
            echo "exists=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Shared setup (build, lint, test)
        uses: ./.github/actions/kitium-shared-setup
        with:
          run-build: "true"
          run-tests: "true"
          run-lint: "true"

      - name: Check package version
        id: version_check
        run: |
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          TARGET_VERSION="\${{ inputs.version }}"

          if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
            echo "✅ Version already set to $TARGET_VERSION"
            echo "needs_update=false" >> "$GITHUB_OUTPUT"
          else
            echo "📦 Version needs update: $CURRENT_VERSION → $TARGET_VERSION"
            echo "needs_update=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Update package.json version
        if: steps.version_check.outputs.needs_update == 'true'
        run: |
          TARGET_VERSION="\${{ inputs.version }}"
          echo "📦 Updating package.json version to $TARGET_VERSION"
          npm version "$TARGET_VERSION" --no-git-tag-version

      - name: Create PR for version bump
        if: steps.version_check.outputs.needs_update == 'true'
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          TARGET_VERSION="\${{ inputs.version }}"
          BRANCH_NAME="release/v$TARGET_VERSION"

          # Create and switch to new branch
          git checkout -b "$BRANCH_NAME"

          # Commit changes
          git add "package.json"
          git commit -m "chore: bump ${ctx.packageName} to v$TARGET_VERSION"

          # Push branch
          git push origin "$BRANCH_NAME"

          # Create PR using gh CLI
          gh pr create \\
            --title "chore: bump ${ctx.packageName} to v$TARGET_VERSION" \\
            --body "## 📦 Version Bump

          This PR updates the package version to \`$TARGET_VERSION\`.

          **Changes:**
          - Updated \`package.json\` version field

          **Next Steps:**
          1. Review and merge this PR
          2. The tag \`v$TARGET_VERSION\` will be created automatically
          3. Release workflow will publish to npm

          ---
          🤖 Auto-generated by tag-release workflow" \\
            --base main \\
            --head "$BRANCH_NAME"

          echo "✅ PR created successfully"
          echo "⚠️  Please merge the PR, then re-run this workflow to create the tag"
          exit 0

      - name: Create and push tag
        if: steps.version_check.outputs.needs_update == 'false'
        run: |
          TAG="v\${{ inputs.version }}"
          echo "🏷️  Creating tag: $TAG"
          git tag "$TAG"
          git push origin "$TAG"

      - name: Verify tag creation
        if: steps.version_check.outputs.needs_update == 'false'
        run: |
          TAG="v\${{ inputs.version }}"
          echo "✅ Tag created successfully: $TAG"
          echo "🔗 Tag URL: https://github.com/kitiumai/config/releases/tag/$TAG"
          echo ""
          echo "The release workflow will now be triggered automatically."
          echo "Monitor the 'Release ${ctx.packageName}' workflow for the publishing status."\n`;
}

/**
 * Helper to generate shared composite action content
 */
function generateSharedWorkflowAction(): string {
  return `name: Kitium Shared Setup
description: Install dependencies and run shared project tasks
inputs:
  working-directory:
    description: Relative path to the project root
    required: false
    default: .
  run-build:
    description: Run build command
    required: false
    default: "false"
  build-command:
    description: Command to run for building
    required: false
    default: pnpm run build
  run-lint:
    description: Run lint command
    required: false
    default: "false"
  lint-command:
    description: Command to run for linting
    required: false
    default: pnpm run lint
  run-tests:
    description: Run tests command
    required: false
    default: "false"
  test-command:
    description: Command to run for tests
    required: false
    default: pnpm run test
  run-typecheck:
    description: Run type-check command
    required: false
    default: "false"
  typecheck-command:
    description: Command to run for type-checks
    required: false
    default: pnpm run typecheck
  run-security-audit:
    description: Run pnpm audit
    required: false
    default: "false"
  audit-allow-failure:
    description: Allow pnpm audit failures without failing workflow
    required: false
    default: "false"
runs:
  using: composite
  steps:
    - name: Install dependencies
      run: pnpm install --frozen-lockfile --prefer-offline --ignore-scripts
      shell: bash

    - name: Build
      if: \${{ inputs.run-build == 'true' }}
      run: |
        WORKDIR="\${{ inputs.working-directory }}"
        cd "$WORKDIR"
        \${{ inputs.build-command }}
      shell: bash

    - name: Lint
      if: \${{ inputs.run-lint == 'true' }}
      run: |
        WORKDIR="\${{ inputs.working-directory }}"
        cd "$WORKDIR"
        \${{ inputs.lint-command }}
      shell: bash

    - name: Tests
      if: \${{ inputs.run-tests == 'true' }}
      run: |
        WORKDIR="\${{ inputs.working-directory }}"
        cd "$WORKDIR"
        \${{ inputs.test-command }}
      shell: bash

    - name: Type check
      if: \${{ inputs.run-typecheck == 'true' }}
      run: |
        WORKDIR="\${{ inputs.working-directory }}"
        cd "$WORKDIR"
        \${{ inputs.typecheck-command }}
      shell: bash

    - name: pnpm audit
      if: \${{ inputs.run-security-audit == 'true' }}
      run: |
        if pnpm audit --audit-level moderate; then
          exit 0
        elif [ "\${{ inputs.audit-allow-failure }}" = "true" ]; then
          echo "pnpm audit detected issues but continuing as requested"
          exit 0
        else
          exit 1
        fi
      shell: bash\n`;
}

/**
 * Get configuration by ID
 */
export function getConfigById(id: ConfigFile): ConfigMetadata | undefined {
  return CONFIG_REGISTRY.find((config) => config.id === id);
}

/**
 * Get all configurations for a specific group
 */
export function getConfigsByGroup(group: ConfigGroup): ConfigMetadata[] {
  return CONFIG_REGISTRY.filter((config) => config.group === group).sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );
}

/**
 * Get available configurations based on context
 */
export function getAvailableConfigs(
  context: TemplateContext,
  group?: ConfigGroup
): ConfigMetadata[] {
  let configs = group ? getConfigsByGroup(group) : CONFIG_REGISTRY;

  // Filter by conditions
  configs = configs.filter((config) => {
    if (config.condition) {
      return config.condition(context);
    }
    return true;
  });

  return configs;
}

/**
 * Resolve config file path (supports dynamic paths)
 */
export function resolveConfigPath(config: ConfigMetadata, context: TemplateContext): string {
  if (typeof config.filePath === 'function') {
    return config.filePath(context);
  }
  return config.filePath;
}

/**
 * Generate template content
 */
export function generateTemplateContent(config: ConfigMetadata, context: TemplateContext): string {
  if (typeof config.template === 'function') {
    return config.template(context);
  }
  return config.template;
}
