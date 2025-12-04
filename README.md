# KitiumAI Shared Configs

Central place for settings that should be reused across packages and apps.

## Quick Start

The easiest way to set up configs in your repository is using the interactive CLI tool:

```bash
# Install the package
pnpm add -D @kitiumai/config

# Run the interactive setup
npx kitiumai-config

# Or run in a specific directory
npx kitiumai-config /path/to/repo

# Non-interactive mode with auto-detection
npx kitiumai-config --auto

# Opt into UI tooling while in auto mode
npx kitiumai-config --auto --ui

# Opt into Jest instead of Vitest
npx kitiumai-config --auto --jest

# Preview changes without applying
npx kitiumai-config --dry-run
```

The CLI tool will:

- 🔍 Detect your package type (Library, App, Next.js, CLI, Monorepo)
- 📋 Suggest appropriate configuration groups
- ❓ Prompt you for configuration choices
- 📝 Generate all necessary config files
- ⚠️ Warn about existing files (with option to override)

## CLI Tool

### Installation

```bash
pnpm add -D @kitiumai/config
```

### Usage

```bash
kitiumai-config [options] [target-dir]
```

### Options

- `--auto` - Non-interactive mode with auto-detected defaults
- `--dry-run` - Preview changes without actually creating/modifying files
- `--force` - Override existing files without prompting
- `--public` - Mark the package as public and scaffold governance + publish settings
- `--ui` - Include UI tooling (Playwright e2e, Storybook docs) when running non-interactively
- `--granular` - **NEW!** Enable granular file selection mode (choose individual config files instead of groups)
- `--jest` - Opt into Jest configs instead of the default Vitest setup
- `--vitest` - Use Vitest for testing (default)
- `--mocha` - Use Mocha for testing
- `--jasmine` - Use Jasmine for testing
- `--ava` - Use AVA for testing
- `--tape` - Use Tape for testing
- `--help, -h` - Show help message

### Examples

```bash
# Interactive setup in current directory
kitiumai-config

# Setup in specific directory
kitiumai-config /path/to/repo

# Non-interactive with defaults
kitiumai-config --auto

# Include UI tooling in auto mode (Playwright + Storybook)
kitiumai-config --auto --ui

# Preview changes without applying
kitiumai-config --dry-run

# Force override existing files
kitiumai-config --force

# Configure a public package with CI + security baselines
kitiumai-config --auto --force --public

# Use Jest instead of Vitest when scaffolding testing
kitiumai-config --auto --jest

# Enable granular file selection (choose individual configs)
kitiumai-config --granular
```

## NEW: Granular File Selection

The CLI now supports **granular file selection mode**, giving you fine-grained control over which config files to generate. This is perfect for:

- **Selective configuration**: Only add the exact configs you need
- **Incremental adoption**: Add configs one at a time to existing projects
- **Advanced users**: Full control over your configuration stack

### How to Use Granular Mode

**Interactive Mode:**
```bash
kitiumai-config --granular
```

You'll be prompted to:
1. Choose between **Group Mode** (quick) or **Granular Mode** (advanced)
2. Select individual config files organized by category
3. See descriptions and recommendations for each file

**Example Interactive Flow:**
```
How would you like to select configurations?
  📦 By Groups (Quick - recommended for most users)
❯ 🎯 Individual Files (Advanced - granular control)

🎯 Core Configs:
  ✓ TypeScript Config - tsconfig.json with strict mode
  ✓ Prettier Config - Code formatting
  ✓ ESLint Config - Linting rules

🧪 Testing Configs:
  ✓ Vitest Config - Modern, fast test runner (recommended)
  ☐ Jest Config - Popular test framework
  ☐ Playwright E2E - End-to-end testing

... and more categories
```

### Benefits of Granular Mode

- **No repeated code**: Configs are managed through a centralized registry system
- **Smart dependencies**: Automatically includes required dependencies
- **Conflict detection**: Warns about incompatible config combinations
- **Better UX**: Organized by category with helpful descriptions

### Configuration Groups

The tool supports the following configuration groups:

- **Core** - TypeScript, ESLint, Prettier
- **Testing** - Vitest by default (Jest opt-in), Playwright (opt-in via `--ui` or prompt)
- **Docs** - TypeDoc (Storybook opt-in via `--ui` or prompt)
- **Release** - CommitLint, Semantic Release, Changesets
- **Security** - ESLint Security, Gitleaks, Dependabot, npm registry hardening, security workflow
- **CI** - GitHub Actions workflow for install/lint/test/coverage/build matrix
- **Governance** - CODEOWNERS, PR template, issue templates
- **Git Hooks** - Lint-Staged, Husky (requires manual setup)
- **Editor** - EditorConfig

### What Gets Generated

The tool creates configuration files that extend the base configs from `@kitiumai/config`:

- `tsconfig.json` - Extends `@kitiumai/config/tsconfig.base.json`
- `.prettierrc.cjs` - Requires `@kitiumai/config/prettier.config.cjs`
- `eslint.config.js` - Imports `@kitiumai/config/eslint.config.base.js`
- `vitest.config.ts` - Extends `@kitiumai/config/vitest.config.base.js`
- And more based on your selections...

When the Security, CI, or Governance groups are selected, the generator also produces:

- `.github/workflows/ci.yml` with lint/test/coverage/build jobs and concurrency guardrails
- `.github/workflows/security.yml` pairing code scanning with `@kitiumai/scripts`
- `.github/dependabot.yml` pinned to npm + GitHub Actions ecosystems
- `.npmrc` registry hardening to prevent accidental publishes to the wrong registry
- `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, and issue templates for bugs/features

Package manifests are automatically synced with scripts from `package.template.json` and the `@kitiumai/scripts` devDependency so that lint, test, and security automation stay consistent across repos.

### Notes

- The tool respects existing files by default (won't overwrite unless `--force` is used)
- Git hooks (Husky) setup requires manual installation: `pnpm add -D husky && npx husky install`
- Make sure `@kitiumai/config` is installed as a dependency before running the tool

## TypeScript

- `@kitiumai/config/tsconfig.base.json`: Strict base with language/runtime defaults and interop flags. Extend it from package-level `tsconfig.json` and set project-specific fields (`baseUrl`, `paths`, `rootDir`, `outDir`, `include`/`exclude`).
- Example:
  ```jsonc
  {
    "extends": "@kitiumai/config/tsconfig.base.json",
    "compilerOptions": {
      "baseUrl": ".",
      "outDir": "./dist",
    },
    "include": ["src"],
  }
  ```

## Formatting

- `@kitiumai/config/prettier.config.cjs`: Shared Prettier opinions (mirrors the rules enforced by ESLint's `prettier/prettier`). Import or reference this from package-level Prettier configs to avoid drift.

## Testing

- `@kitiumai/config/vitest.config.base.js`: Primary test runner base with Node env and coverage reporters (install `vitest` in consumers).
- `@kitiumai/config/jest.config.base.js`: Opt-in Jest defaults (uses `ts-jest`; install `jest` and `ts-jest` in consumers).
- `@kitiumai/config/playwright.config.base.js`: Opt-in UI E2E base with retries, tracing, and multi-browser projects (install `@playwright/test` in consumers).

## Security & compliance

- `@kitiumai/config/eslint.config.security.js`: Extends the base ESLint config with `eslint-plugin-security` rules for Node/TS services.
- `@kitiumai/config/gitleaks.toml`: Hardened secret-scanning baseline (extend in repo root or CI workflows).

## Package scaffolding

- `@kitiumai/config/package.template.json`: Copy/merge when creating new packages to inherit common metadata (license, engines, publishConfig, scripts, toolchain pins).
- `@kitiumai/config/packageBase.cjs`: Exported JS object for scaffolding scripts; merge and override per-package fields.
- Validate existing manifests with `pnpm run validate:package-manifests` (checks for license, engines.node, type, and publishConfig for public scoped packages).

### Node API (for automation)

Use the exported detector, prompter, and generator when you need to embed setup flows into custom tooling or migrations:

```ts
import { ConfigDetector, ConfigGenerator, ConfigGroup, ConfigPrompter } from '@kitiumai/config';

const detector = new ConfigDetector('/path/to/repo');
const detection = await detector.detect();

const prompter = new ConfigPrompter(detection);
const choices = await prompter.prompt();

const generator = new ConfigGenerator('/path/to/repo');
await generator.generate(
  {
    ...choices,
    configGroups: [ConfigGroup.Core, ConfigGroup.Ci, ConfigGroup.Security],
    overrideExisting: true,
    setupGitHooks: detection.hasGit,
    skipValidation: false,
    dryRun: false,
    publicPackage: true,
    enableUiConfigs: false,
    useJest: false,
  },
  false
);
```

The `configGroupMap` export maps each group to its generated files and can be used to build custom prompts or dashboards.

## Quality gates & git hygiene

- `@kitiumai/config/commitlint.config.cjs`: Conventional commit enforcement with scope guidance for multi-package releases.
- `@kitiumai/config/lint-staged.config.cjs`: Pre-commit runner hook (wire via `lint-staged` + `husky`).
- `@kitiumai/config/editorconfig.base`: Editor defaults to reduce whitespace churn.

## Documentation & UI

- `@kitiumai/config/typedoc.config.base.cjs`: API doc generation baseline (Markdown output, strict warnings).
- `@kitiumai/config/storybook.main.base.cjs`: Storybook preset for React + Vite projects with accessibility and interaction addons.

## Release automation

- `@kitiumai/config/semantic-release.config.base.cjs`: Semantic-release pipeline with changelog, npm, git, and GitHub publish steps.
- `@kitiumai/config/changeset.config.base.json`: Standard Changesets template for new packages/repos (aligns with `main` as release branch).

## Repository structure

- **Root configs**: All base configuration exports live at the repository root for easy consumption via `exports` in `package.json`.
- **CLI + automation**: The `src/` directory hosts the TypeScript sources for the detector, prompter, and generator used by the `kitiumai-config` CLI.
- **Templates**: `package.template.json` and `packageBase.cjs` centralize package defaults so scripts and tooling stay synchronized across repos.
- The current layout keeps configuration artifacts alongside their base presets, so no restructuring is required to extend or consume them.

## Architecture Improvements

The CLI has been significantly refactored to improve code quality and maintainability:

### 1. Config Registry System (`config-registry.ts`)

**Problem Solved**: Eliminated 23+ repeated template methods and a massive switch statement.

**Solution**: Centralized configuration metadata in a declarative registry:

```ts
export const CONFIG_REGISTRY: ConfigMetadata[] = [
  {
    id: ConfigFile.TypeScript,
    displayName: 'TypeScript Config',
    description: 'tsconfig.json with strict mode',
    group: ConfigGroup.Core,
    filePath: 'tsconfig.json',
    template: '...',
    defaultEnabled: true,
    priority: 100,
  },
  // ... all configs defined declaratively
];
```

**Benefits**:
- **DRY (Don't Repeat Yourself)**: Single source of truth for all configs
- **Easy to extend**: Add new configs by adding metadata entries
- **Type-safe**: Full TypeScript support with interfaces
- **Maintainable**: No more scattered template methods

### 2. File Operations Utility (`file-operations.ts`)

**Problem Solved**: Duplicated file I/O logic across multiple functions.

**Solution**: Centralized file operations utility class:

```ts
const fileOps = new FileOperations(targetDir);

// Smart file writing with conflict handling
const result = fileOps.writeFile(path, content, {
  overrideExisting: true,
  dryRun: false
});

// Intelligent package.json merging
fileOps.updatePackageJson({ scripts: newScripts }, options);
```

**Benefits**:
- **Reusable**: Common operations extracted once
- **Consistent**: Same behavior across all file operations
- **Safer**: Built-in checks for file existence and conflicts

### 3. Refactored Generator (`generator-refactored.ts`)

**Problem Solved**: 1292-line file with massive code duplication.

**Solution**: Clean, registry-driven generator:

- **Before**: 23+ template methods, 200+ lines switch statement
- **After**: Registry lookup + template resolution (~400 lines)

**Key Improvements**:
- Uses `CONFIG_REGISTRY` for all templates
- Supports both group-based and granular selection
- Cleaner separation of concerns
- Better error handling and warnings

### 4. Enhanced Prompter (`prompter-refactored.ts`)

**Problem Solved**: No way to select individual config files.

**Solution**: Two-mode prompter with granular support:

```ts
// Mode selection
const mode = await promptSelectionMode(); // 'group' or 'granular'

// Granular selection with organized categories
const files = await promptGranularFileSelection(packageType);
```

**Benefits**:
- **Flexible**: Supports both quick (group) and precise (granular) modes
- **Organized**: Configs grouped by category with descriptions
- **Smart defaults**: Recommends configs based on project type
- **Backward compatible**: Group mode works exactly as before

### Code Quality Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Template methods | 23+ | 0 (registry-based) | ✅ 100% reduction |
| Switch statement lines | 200+ | ~20 | ✅ 90% reduction |
| Code duplication | High | Minimal | ✅ Significant |
| Maintainability | Medium | High | ✅ Much easier |
| User control | Group-only | Group + Granular | ✅ Enhanced |

### Backward Compatibility

All improvements maintain **100% backward compatibility**:

- Existing CLI commands work unchanged
- Group-based selection is the default
- Original generator available via environment variable
- No breaking changes to API or behavior

### Environment Variables

- `USE_REFACTORED=false` - Use original implementation (default: true)

This allows gradual rollout and easy rollback if needed.
