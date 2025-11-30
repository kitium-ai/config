# Changelog

## 2.0.0

### Changed

- Added sideEffect false in package.json

## 2.0.0

### Added

- CI, security, and governance scaffolding surfaced through the CLI (GitHub Actions workflows, Dependabot, npmrc hardening, CODEOWNERS, PR/issue templates).
- Automatic sync of shared lint/test/security scripts and `@kitiumai/scripts` devDependency into generated `package.json` files to avoid per-repo drift.
- CLI flags for `--ui` (to gate Playwright/Storybook scaffolding in non-interactive runs) and `--jest` (to opt into Jest instead of the default Vitest setup).

### Changed

- Vitest is now the default testing configuration, with Jest generated only when explicitly requested.
- Updated `@kitiumai/scripts` to version 1.0.0 to align config scaffolding with the latest shared tooling release.

### Documentation

- Expanded README with CLI examples, flags (including `--public`), config group coverage, Node API usage, and repository structure guidance.

## 0.1.4

### Added

- **Interactive CLI tool for config migration/setup** - New `kitiumai-config` command-line tool that helps set up and migrate configuration files in consumer repositories
  - Automatic package type detection (Library, App, Next.js, CLI, Monorepo)
  - Interactive prompts for configuration group selection
  - Smart suggestions based on detected package type
  - Support for dry-run mode to preview changes
  - Auto mode for non-interactive setup
  - Force mode to override existing files
  - Comprehensive file generation for all supported config types
  - Safety features: warns about existing files, supports override confirmation

### Features

- CLI tool detects existing configurations and suggests appropriate setup
- Generates config files that properly extend base configs from `@kitiumai/config`
- Supports all configuration groups: Core, Testing, Docs, Release, Security, Git Hooks, Editor
- Interactive and non-interactive modes for different use cases
- Detailed output showing created/modified files and warnings

### Usage

```bash
# Install
pnpm add -D @kitiumai/config

# Run interactive setup
npx kitiumai-config

# Non-interactive mode
npx kitiumai-config --auto

# Preview changes
npx kitiumai-config --dry-run
```

## 0.1.3

- fix added for base config and package type module

## 0.1.1

- Added security-focused ESLint preset and Gitleaks baseline config.
- Added git workflow helpers (commitlint, lint-staged, EditorConfig).
- Added documentation and UI presets (Typedoc, Storybook).
- Added release automation templates (semantic-release + Changesets).

## 0.1.0

- Initial publishable config package.
- Added strict TypeScript base config (`tsconfig.base.json`).
- Added shared Prettier settings (`prettier.config.cjs`).
- Added testing presets for Jest (`jest.config.base.js`), Vitest (`vitest.config.base.js`), and Playwright (`playwright.config.base.js`).
