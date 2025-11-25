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

# Preview changes without applying
npx kitiumai-config --dry-run
```

The CLI tool will:
- 🔍 Detect your package type (Library, App, Next.js, CLI, Monorepo)
- 📋 Suggest appropriate configuration groups
- ❓ Prompt you for configuration choices
- 📝 Generate all necessary config files
- ⚠️  Warn about existing files (with option to override)

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
- `--help, -h` - Show help message

### Examples

```bash
# Interactive setup in current directory
kitiumai-config

# Setup in specific directory
kitiumai-config /path/to/repo

# Non-interactive with defaults
kitiumai-config --auto

# Preview changes without applying
kitiumai-config --dry-run

# Force override existing files
kitiumai-config --force
```

### Configuration Groups

The tool supports the following configuration groups:

- **Core** - TypeScript, ESLint, Prettier
- **Testing** - Jest, Vitest, Playwright
- **Docs** - TypeDoc, Storybook
- **Release** - CommitLint, Semantic Release, Changesets
- **Security** - ESLint Security, Gitleaks
- **Git Hooks** - Lint-Staged, Husky (requires manual setup)
- **Editor** - EditorConfig

### What Gets Generated

The tool creates configuration files that extend the base configs from `@kitiumai/config`:

- `tsconfig.json` - Extends `@kitiumai/config/tsconfig.base.json`
- `.prettierrc.cjs` - Requires `@kitiumai/config/prettier.config.cjs`
- `eslint.config.js` - Imports `@kitiumai/config/eslint.config.base.js`
- `vitest.config.ts` - Extends `@kitiumai/config/vitest.config.base.js`
- And more based on your selections...

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
      "outDir": "./dist"
    },
    "include": ["src"]
  }
  ```

## Formatting

- `@kitiumai/config/prettier.config.cjs`: Shared Prettier opinions (mirrors the rules enforced by ESLint's `prettier/prettier`). Import or reference this from package-level Prettier configs to avoid drift.

## Testing

- `@kitiumai/config/jest.config.base.js`: Shared Jest defaults (uses `ts-jest`; install `jest` and `ts-jest` in consumers).
- `@kitiumai/config/vitest.config.base.js`: Vitest base with Node env and coverage reporters (install `vitest` in consumers).
- `@kitiumai/config/playwright.config.base.js`: Playwright base with retries, tracing, and multi-browser projects (install `@playwright/test` in consumers).

## Security & compliance

- `@kitiumai/config/eslint.config.security.js`: Extends the base ESLint config with `eslint-plugin-security` rules for Node/TS services.
- `@kitiumai/config/gitleaks.toml`: Hardened secret-scanning baseline (extend in repo root or CI workflows).

## Package scaffolding

- `@kitiumai/config/package.template.json`: Copy/merge when creating new packages to inherit common metadata (license, engines, publishConfig, scripts, toolchain pins).
- `@kitiumai/config/packageBase.cjs`: Exported JS object for scaffolding scripts; merge and override per-package fields.
- Validate existing manifests with `pnpm run validate:package-manifests` (checks for license, engines.node, type, and publishConfig for public scoped packages).

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
