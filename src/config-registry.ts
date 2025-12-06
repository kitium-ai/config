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
    versioning-strategy: increase
    open-pull-requests-limit: 10\n`,
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
    id: ConfigFile.GithubCi,
    displayName: 'CI Workflow',
    description: 'Continuous integration pipeline',
    group: ConfigGroup.Ci,
    filePath: '.github/workflows/ci.yml',
    defaultEnabled: true,
    priority: 100,
    condition: (ctx) => ctx.hasGit,
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
    template: (ctx) => generateTagReleaseWorkflow(ctx),
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
    id: ConfigFile.PullRequestTemplate,
    displayName: 'PR Template',
    description: 'Pull request template',
    group: ConfigGroup.Governance,
    filePath: '.github/pull_request_template.md',
    defaultEnabled: true,
    priority: 90,
    condition: (ctx) => ctx.hasGit,
    template: `## Summary
- [ ] Ready for review
- [ ] Includes tests
- [ ] Documentation updated

## Changes
- Describe the key changes

## Testing
- [ ] pnpm test
- [ ] pnpm lint
- [ ] pnpm run security:secrets\n`,
  },

  {
    id: ConfigFile.IssueTemplateBug,
    displayName: 'Bug Report Template',
    description: 'Issue template for bug reports',
    group: ConfigGroup.Governance,
    filePath: '.github/ISSUE_TEMPLATE/bug_report.md',
    defaultEnabled: true,
    priority: 80,
    condition: (ctx) => ctx.hasGit,
    template: `---
name: "Bug report"
about: Report a bug or regression
title: "[Bug] "
labels: bug
---

## Expected behavior

## Current behavior

## Steps to reproduce

## Environment
- OS:
- Node version:
- Package version:\n`,
  },

  {
    id: ConfigFile.IssueTemplateFeature,
    displayName: 'Feature Request Template',
    description: 'Issue template for feature requests',
    group: ConfigGroup.Governance,
    filePath: '.github/ISSUE_TEMPLATE/feature_request.md',
    defaultEnabled: true,
    priority: 70,
    condition: (ctx) => ctx.hasGit,
    template: `---
name: "Feature request"
about: Suggest a new feature or improvement
title: "[Feature] "
labels: enhancement
---

## Problem to solve

## Proposed solution

## Alternatives considered
-

## Additional context\n`,
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
  schedule:
    - cron: '0 6 * * 1'
  pull_request:
    paths:
      - 'pnpm-lock.yaml'
      - 'package.json'
      - '.gitleaks*'
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Dependency audit (via @kitiumai/scripts)
        run: >
          pnpm exec node --input-type=module -e "import { auditDependencies } from '@kitiumai/scripts/security';
            const summary = await auditDependencies({ severityThreshold: 'moderate' });
            console.log(JSON.stringify(summary, null, 2));
            const blocking = (summary.severityCounts?.critical || 0) + (summary.severityCounts?.high || 0) + (summary.severityCounts?.moderate || 0);
            if (blocking > 0) { process.exit(1); }"
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Secret scan (gitleaks via @kitiumai/scripts)
        run: >
          pnpm exec node --input-type=module -e "import { scanSecrets } from '@kitiumai/scripts/security';
            const result = await scanSecrets({ configPath: '.gitleaks.toml', failOnFinding: true });
            if (result.findings?.length) { console.error(JSON.stringify(result.findings, null, 2)); process.exit(1); }"\n`;
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
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Verify shared configs
        run: >
          pnpm exec node --input-type=module -e "import { ensureSharedConfigs } from '@kitiumai/scripts/dx';
            const results = await ensureSharedConfigs({ requireTsconfig: true, requireEslint: true });
            const issues = results.flatMap((entry) => entry.issues || []);
            if (issues.length) { console.error(issues.join('\\n')); process.exit(1); }
            console.log('Shared configs verified');"
      - name: Lint (via @kitiumai/scripts)
        run: pnpm exec node --input-type=module -e "import { lintAll } from '@kitiumai/scripts/lint'; await lintAll(false);"
      - name: Tests with coverage
        run: pnpm exec node --input-type=module -e "import { runTestsCoverage } from '@kitiumai/scripts/test'; await runTestsCoverage();"
      - name: Type check
        run: pnpm exec tsc -b --noEmit\n`;
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

      - name: Ensure pnpm available (corepack fallback)
        run: |
          if ! command -v pnpm >/dev/null 2>&1; then
            echo "ℹ️ pnpm not found, enabling via corepack"
            corepack enable
            corepack prepare pnpm@8 -o /usr/local/bin/pnpm
          fi

      - name: Get tag name
        id: tag
        run: |
          if [ "\${{ github.event_name }}" = "push" ]; then
            TAG_NAME="\${GITHUB_REF#refs/tags/}"
          else
            TAG_NAME="\${{ inputs.tag }}"
          fi
          echo "tag=\${TAG_NAME}" >> "$GITHUB_OUTPUT"
          echo "Processing tag: $TAG_NAME"

      - name: Extract version from tag
        id: version
        run: |
          VERSION=$(echo "\${{ steps.tag.outputs.tag }}" | sed 's/^v//')
          echo "version=\${VERSION}" >> "$GITHUB_OUTPUT"
          echo "Extracted version: $VERSION"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile --prefer-offline --ignore-scripts

      - name: Build package
        run: |
          pnpm run build

      - name: Run tests
        run: |
          pnpm run test

      - name: Run linting
        run: |
          pnpm run lint

      - name: Security checks
        run: |
          pnpm exec kitiumai-config security check || echo "⚠️ Security check failed, continuing..."

      - name: Update package version
        run: |
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          TARGET_VERSION="\${{ steps.version.outputs.version }}"

          if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
            echo "ℹ️ Version already set to $TARGET_VERSION, skipping npm version"
          else
            echo "📦 Updating package.json version from $CURRENT_VERSION to $TARGET_VERSION"
            npm version "$TARGET_VERSION" --no-git-tag-version
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

      - name: Ensure pnpm available (corepack fallback)
        run: |
          if ! command -v pnpm >/dev/null 2>&1; then
            echo "ℹ️ pnpm not found, enabling via corepack"
            corepack enable
            corepack prepare pnpm@8 -o /usr/local/bin/pnpm
          fi

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

      - name: Install dependencies
        run: pnpm install --frozen-lockfile --prefer-offline --ignore-scripts

      - name: Build and test package
        run: |
          echo "🔨 Building package..."
          pnpm run build

          echo "🧪 Running tests..."
          pnpm run test

          echo "🔍 Running linting..."
          pnpm run lint

      - name: Update package.json version
        run: |
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          TARGET_VERSION="\${{ inputs.version }}"

          if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
            echo "ℹ️ Version already set to $TARGET_VERSION, skipping npm version"
          else
            echo "📦 Updating package.json version from $CURRENT_VERSION to $TARGET_VERSION"
            npm version "$TARGET_VERSION" --no-git-tag-version
          fi

      - name: Commit version bump
        run: |
          if git diff --quiet "package.json"; then
            echo "ℹ️ No changes to commit"
          else
            git add "package.json"
            git commit -m "chore: bump ${ctx.packageName} to v\${{ inputs.version }}"
            git push origin main
          fi

      - name: Create and push tag
        run: |
          TAG="v\${{ inputs.version }}"
          echo "🏷️  Creating tag: $TAG"
          git tag "$TAG"
          git push origin "$TAG"

      - name: Verify tag creation
        run: |
          TAG="v\${{ inputs.version }}"
          echo "✅ Tag created successfully: $TAG"
          echo "🔗 Tag URL: https://github.com/kitiumai/config/releases/tag/$TAG"
          echo ""
          echo "The release workflow will now be triggered automatically."
          echo "Monitor the 'Release ${ctx.packageName}' workflow for the publishing status."\n`;
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
