# @kitiumai/config

> **The Intelligent Configuration Management System for Modern JavaScript/TypeScript Projects**

A revolutionary CLI tool and configuration library that transforms how development teams manage project configurations. Unlike traditional config packages that just provide static files, `@kitiumai/config` offers intelligent auto-detection, interactive setup, and comprehensive tooling integration.

[![npm version](https://badge.fury.io/js/%40kitiumai%2Fconfig.svg)](https://badge.fury.io/js/%40kitiumai%2Fconfig)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What Makes @kitiumai/config Different

### The Problem with Traditional Config Management

Most configuration packages suffer from:
- **Static configs** that don't adapt to project needs
- **Manual setup** requiring deep knowledge of each tool
- **Inconsistent configurations** across team members
- **Maintenance burden** keeping configs updated
- **Poor discoverability** of available options

### Our Intelligent Solution

`@kitiumai/config` revolutionizes config management with:
- **🧠 Auto-detection** of project type, existing configs, and needs
- **🎯 Interactive CLI** with smart recommendations
- **⚡ One-command setup** with `--auto` flag
- **🔄 Registry-driven architecture** for easy maintenance
- **🛡️ Security-first** with built-in GitHub security setup
- **📦 Granular control** for advanced users

## 🎯 Key Features

### Intelligent Auto-Detection
- Detects package type (Library, App, Next.js, CLI, Monorepo)
- Analyzes existing configurations
- Suggests optimal config combinations
- Adapts to your project's specific needs

### Revolutionary CLI Experience
- **Interactive mode** with guided setup
- **Auto mode** for zero-touch configuration
- **Granular mode** for precise control
- **Dry-run capability** to preview changes
- **Force override** when needed

### Comprehensive Configuration Coverage
- **Core**: TypeScript, ESLint, Prettier
- **Testing**: Vitest, Jest, Playwright, Mocha, Jasmine, AVA, Tape
- **Documentation**: TypeDoc, Storybook
- **Release**: CommitLint, Semantic Release, Changesets
- **Security**: ESLint Security, Gitleaks, Dependabot, GitHub Security
- **CI/CD**: GitHub Actions workflows
- **Governance**: CODEOWNERS, PR/Issue templates
- **Git**: Comprehensive .gitignore, Husky hooks
- **Editor**: EditorConfig

### Built-in Security Integration
- **Automatic GitHub security setup** in `--auto` mode
- **Branch protection rules** via integrated scripts
- **Security scanning workflows**
- **Dependency vulnerability monitoring**

## 📊 Comparison with Competitors

| Feature | @kitiumai/config | create-react-app | @typescript-eslint/recommended | prettier-config-standard |
|---------|------------------|------------------|-------------------------------|---------------------------|
| **Auto-detection** | ✅ Intelligent | ❌ None | ❌ None | ❌ None |
| **Interactive CLI** | ✅ Full-featured | ❌ None | ❌ None | ❌ None |
| **One-command setup** | ✅ `--auto` flag | ❌ None | ❌ None | ❌ None |
| **Security integration** | ✅ GitHub security | ❌ None | ❌ None | ❌ None |
| **Git integration** | ✅ Husky + hooks | ❌ None | ❌ None | ❌ None |
| **CI/CD setup** | ✅ GitHub Actions | ❌ None | ❌ None | ❌ None |
| **Granular control** | ✅ File-level | ❌ None | ❌ None | ❌ None |
| **Registry system** | ✅ Maintainable | ❌ Static | ❌ Static | ❌ Static |
| **Monorepo support** | ✅ Full | ❌ None | ❌ None | ❌ None |
| **TypeScript support** | ✅ Advanced | ✅ Basic | ✅ Advanced | ❌ None |

## 🏆 Unique Selling Proposition (USP)

### 1. **Intelligent Project Analysis**
Unlike static config packages, `@kitiumai/config` analyzes your project and recommends the perfect configuration stack.

### 2. **Zero-Touch Auto Mode**
The `--auto` flag provides complete setup with security integration - no manual configuration needed.

### 3. **Registry-Driven Architecture**
Our innovative registry system makes adding new configurations trivial and maintains consistency across all projects.

### 4. **Security-First Approach**
Built-in GitHub security setup and branch protection - security is not an afterthought.

### 5. **Developer Experience Excellence**
From interactive prompts to comprehensive error handling, every interaction is designed for developer productivity.

## 🚀 Quick Start

### Install
```bash
pnpm add -D @kitiumai/config
```

### Interactive Setup (Recommended)
```bash
npx kitiumai-config
```
*Follow the guided prompts for your perfect setup*

### One-Command Auto Setup (Zero Touch)
```bash
npx kitiumai-config --auto
```
*Automatically detects and configures everything, including GitHub security!*

### Preview Changes
```bash
npx kitiumai-config --auto --dry-run
```

### Force Override Existing Files
```bash
npx kitiumai-config --auto --force
```

## 📖 CLI Reference

### Command Syntax
```bash
kitiumai-config [options] [target-dir]
```

### Core Options

| Option | Description |
|--------|-------------|
| `--auto` | Non-interactive mode with intelligent defaults |
| `--dry-run` | Preview changes without applying them |
| `--force` | Override existing files without prompting |
| `--public` | Configure for public package publishing |
| `--ui` | Include UI tooling (Playwright, Storybook) |
| `--granular` | Enable granular file selection mode |
| `--help, -h` | Show help message |

### Test Framework Options

| Option | Description |
|--------|-------------|
| `--vitest` | Use Vitest for testing (default) |
| `--jest` | Use Jest for testing |
| `--mocha` | Use Mocha for testing |
| `--jasmine` | Use Jasmine for testing |
| `--ava` | Use AVA for testing |
| `--tape` | Use Tape for testing |

## 🎯 Auto Mode Features

When using `--auto` or `--force` flags, the setup automatically:

### Core Configuration
- **TypeScript**: Strict configuration with modern settings
- **ESLint**: Comprehensive linting with security rules
- **Prettier**: Consistent code formatting

### Testing & Quality
- **Vitest**: Fast, modern test runner (default)
- **Coverage**: Built-in coverage reporting
- **Linting**: Pre-commit hooks with lint-staged

### CI/CD Pipeline
- **GitHub Actions**: Complete CI/CD workflows
- **Matrix builds**: Multi-Node.js version testing
- **Security scanning**: Automated vulnerability checks
- **Release automation**: Semantic versioning

### Security & Compliance
- **GitHub Security**: Automatic security settings configuration
- **Branch Protection**: Main branch protection rules
- **Dependabot**: Automated dependency updates
- **Secret scanning**: Gitleaks integration

### Git & Development Workflow
- **Git Hooks**: Husky with pre-commit linting
- **GitIgnore**: Comprehensive Node.js exclusions
- **Commit Messages**: Conventional commit enforcement
- **Code Quality**: Automated formatting and linting

## 🔧 Configuration Files API

### TypeScript Configuration
```json
{
  "extends": "@kitiumai/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### ESLint Configuration
```javascript
import config from '@kitiumai/config/eslint.config.base.js';

export default [
  ...config,
  // Your custom rules
];
```

### Prettier Configuration
```javascript
module.exports = require('@kitiumai/config/prettier.config.cjs');
```

### Testing Configuration
```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import baseConfig from '@kitiumai/config/vitest.config.base.js';

export default defineConfig({
  ...baseConfig,
  // Your custom config
});
```

## 📚 Exported APIs

### CLI Classes (Programmatic Usage)

#### `ConfigDetector`
Auto-detects project configuration needs.

```typescript
import { ConfigDetector } from '@kitiumai/config';

const detector = new ConfigDetector('/path/to/project');
const result = await detector.detect();
// Returns: { type: 'library', hasGit: true, suggestedGroups: [...] }
```

#### `ConfigPrompter`
Interactive configuration prompts.

```typescript
import { ConfigPrompter } from '@kitiumai/config';

const prompter = new ConfigPrompter(detectionResult);
const choices = await prompter.prompt();
// Returns user configuration choices
```

#### `ConfigGenerator`
Generates configuration files.

```typescript
import { ConfigGenerator } from '@kitiumai/config';

const generator = new ConfigGenerator('/path/to/project');
await generator.generate(choices, false); // false = not dry-run
```

### Configuration Groups

```typescript
import { ConfigGroup, configGroupMap } from '@kitiumai/config';

console.log(configGroupMap[ConfigGroup.Core]);
// ['tsconfig', 'prettier', 'eslint']
```

### TypeScript Types

```typescript
import type {
  PackageType,
  ConfigGroup,
  ConfigFile,
  DetectionResult,
  SetupChoices,
  CliOptions,
  SetupResult
} from '@kitiumai/config';
```

## 🎨 Configuration Categories

### Core Development Tools
- **TypeScript**: Strict, modern configuration
- **ESLint**: Comprehensive rules with security plugins
- **Prettier**: Opinionated formatting standards

### Testing Frameworks
- **Vitest**: Modern, fast test runner (recommended)
- **Jest**: Popular framework with full feature set
- **Playwright**: End-to-end testing for web apps
- **Mocha/Chai**: Flexible testing framework
- **Jasmine**: BDD testing framework
- **AVA**: Concurrent test runner
- **Tape**: Minimalist test framework

### Documentation & UI
- **TypeDoc**: API documentation generation
- **Storybook**: Component development environment

### Release Management
- **CommitLint**: Conventional commit enforcement
- **Semantic Release**: Automated versioning
- **Changesets**: Manual versioning control

### Security & Compliance
- **ESLint Security**: Security-focused linting rules
- **Gitleaks**: Secret scanning configuration
- **Dependabot**: Automated dependency updates
- **GitHub Security**: Repository security settings

### CI/CD & Automation
- **GitHub Actions**: Complete CI/CD pipelines
- **Git Hooks**: Pre-commit quality checks
- **Lint-staged**: Selective linting on changed files

### Governance & Collaboration
- **CODEOWNERS**: Code ownership definitions
- **PR Templates**: Standardized pull request format
- **Issue Templates**: Structured issue reporting

## 🔒 Security Integration

### Automatic GitHub Security Setup
When using `--auto` mode in a Git repository:

1. **Repository Analysis**: Detects GitHub remote URL
2. **Security Configuration**: Runs `setup-github-security` script
3. **Branch Protection**: Applies `secure:main` protection rules
4. **Error Handling**: Graceful fallback if scripts unavailable

### Manual Security Setup
```bash
# Setup GitHub security manually
pnpm exec setup-github-security --repo owner/repo

# Secure main branch
pnpm -w run secure:main --repo owner/repo
```

## 🏗️ Architecture

### Registry-Driven Design
```typescript
// Configuration registry enables easy extension
export const CONFIG_REGISTRY: ConfigMetadata[] = [
  {
    id: ConfigFile.TypeScript,
    displayName: 'TypeScript Config',
    description: 'tsconfig.json with strict mode',
    group: ConfigGroup.Core,
    template: '...',
    dependencies: [],
    conflicts: [],
  },
  // Add new configs here - no code changes needed!
];
```

### Smart File Operations
- **Conflict Detection**: Warns about existing files
- **Intelligent Merging**: Safely updates package.json
- **Dry-run Support**: Preview all changes
- **Rollback Safety**: Non-destructive by default

### Cross-Platform Compatibility
- **Windows Support**: PowerShell and cmd compatibility
- **macOS/Linux**: Native shell support
- **Git Integration**: Works with any Git setup
- **Package Managers**: pnpm, yarn, npm detection

## 📈 Advanced Usage Examples

### Custom Project Setup
```bash
# Library with security and CI
npx kitiumai-config --auto --public

# React app with full UI testing
npx kitiumai-config --auto --ui

# Minimal setup for prototyping
npx kitiumai-config --granular  # Select only what you need
```

### Programmatic Usage
```typescript
import {
  ConfigDetector,
  ConfigGenerator,
  ConfigGroup
} from '@kitiumai/config';

async function setupProject(projectPath: string) {
  const detector = new ConfigDetector(projectPath);
  const detection = await detector.detect();

  const generator = new ConfigGenerator(projectPath);
  await generator.generate({
    packageType: detection.type,
    configGroups: [ConfigGroup.Core, ConfigGroup.Testing],
    overrideExisting: false,
    setupGitHooks: detection.hasGit,
    skipValidation: false,
    dryRun: false,
    publicPackage: false,
    enableUiConfigs: false,
    testFramework: 'vitest'
  }, false);
}
```

### CI/CD Integration
```yaml
# .github/workflows/setup.yml
name: Setup
on: [push]

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm add -D @kitiumai/config
      - run: pnpm exec kitiumai-config --auto --force
```

## 🤝 Contributing

### Development Setup
```bash
git clone https://github.com/kitium-ai/config.git
cd config
pnpm install
pnpm run build
```

### Adding New Configurations
1. Add config metadata to `CONFIG_REGISTRY`
2. Create template file
3. Update exports in `package.json`
4. Test with CLI

### Testing
```bash
# Run tests
pnpm test

# Run CLI in development
pnpm run dev -- --help
```

## 📄 License

MIT © [KitiumAI](https://github.com/kitium-ai)

## 🙏 Acknowledgments

Built with ❤️ for the developer community. Special thanks to the teams behind TypeScript, ESLint, Prettier, and all the amazing open-source tools this package integrates.
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
- **Git** - **NEW!** .gitignore with comprehensive Node.js defaults (included in `--auto` mode)
- **Git Hooks** - **NEW!** Lint-Staged, Husky with automated setup and installation (included in `--auto` mode)
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

## Automated Git Setup

The CLI now includes **automated Git configuration** in `--auto` mode:

### .gitignore Generation
- **Comprehensive defaults** for Node.js projects
- Covers: dependencies, build outputs, test coverage, environment files, IDE files, OS files
- Includes: TypeScript build info, cache directories, logs, and temporary files
- **Auto-included** in `--auto` mode for git repositories

### Husky Automated Setup
- **Automatic installation**: CLI will install husky package if not present
- **Hook configuration**: Creates `.husky/pre-commit` hook with lint-staged integration
- **Git config**: Automatically sets `core.hooksPath` to `.husky`
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Zero manual steps**: No need to run `npx husky install` or configure manually

**What gets created:**
```
.husky/
├── _/
│   └── husky.sh          # Helper script (auto-generated)
└── pre-commit            # Pre-commit hook running lint-staged
.gitignore                # Comprehensive Node.js gitignore
lint-staged.config.cjs    # Lint-staged configuration
```

### Notes

- The tool respects existing files by default (won't overwrite unless `--force` is used)
- **Husky is now automatically setup** - no manual installation required!
- Package manager auto-detected (pnpm, yarn, or npm)
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
