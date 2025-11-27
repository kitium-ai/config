# Configuration Evaluation and Rollout Guidance

## Implemented
- Added GitHub Actions blueprints for CI (lint, tests, shared-config validation) and Security (dependency audit, secret scanning) using the new `@kitiumai/scripts` utilities.
- Added governance scaffolding (CODEOWNERS, PR/issue templates) and safety baselines (`.npmrc`, Dependabot) to align new and existing repos with the recommended posture.

## Current strengths
- **Unified setup CLI**: The published `kitiumai-config` CLI already auto-detects project type, proposes configuration groups (core, testing, docs, release, security, git hooks, editor), and generates the matching files while respecting existing configs or allowing overrides. This provides a strong baseline for consistent scaffolding across repositories.
- **Comprehensive base presets**: The package exports TypeScript, Prettier, ESLint (including security), Jest/Vitest/Playwright, Storybook, Typedoc, semantic-release, Changesets, lint-staged, commitlint, gitleaks, and EditorConfig presets, giving teams a curated set of defaults to adopt quickly.
- **Package template**: The scaffolded `package.template.json` encodes default module type, engine constraints, publishing scripts, and standard tooling scripts, which reduces drift across services and libraries.
- **Strict TypeScript posture**: The base `tsconfig` enforces strictness flags (e.g., `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) and modern module settings, keeping compiler settings aligned with big-tech-grade quality bars.
- **Scripts package integration**: The config package already depends on `@kitiumai/scripts` and exposes the CLI through `exports`, which positions it to share helper commands once the new API is released.

## Gaps versus large-scale product org expectations
- **Pipeline-as-code baselines**: There is no shared CI/CD template (e.g., GitHub Actions/Buildkite) that wires linting, tests, type checks, coverage gates, package publishing, secret scanning, or SBOM generation by default. Mature orgs ship reusable workflow templates to guarantee identical gates across repos.
- **Security hardening beyond linting**: While ESLint security rules and gitleaks are included, there is no baseline for dependency auditing (e.g., `npm audit`/`pnpm audit`, OSV scanning), vulnerability management policies, or artifact signing (Provenance/SLSA) in release flows.
- **Governance artifacts**: Repos are not automatically provisioned with `CODEOWNERS`, PR/issue templates, or release checklists that encode ownership and review policy—common controls in big product companies.
- **Monorepo conventions**: There is no guidance or preset for workspace/root configurations (e.g., shared `pnpm-workspace.yaml`, `nx.json`, root-level `changeset`/`semantic-release` wiring, and consistent path aliases) to keep multi-package repos aligned.
- **Docs and design systems at scale**: Storybook and Typedoc presets exist, but there is no shared pattern for publishing docs (static site pipeline) or for enforcing accessibility and visual regression checks in CI.
- **Observability and quality bars**: No default hooks for code coverage thresholds, test flakiness handling, or lint/test caching strategies that larger orgs enforce to keep signal high and pipelines fast.
- **Scripts package forward plan**: Because `@kitiumai/scripts` has an unreleased new API, there is no documented migration path or version guard to ensure config consumers opt into the new commands safely.

## Recommendations for all new and existing repos
1. **Ship CI/CD blueprints**
   - Add reusable workflow templates (e.g., `.github/workflows/*.yml` or pipeline snippets) that run lint, typecheck, unit/integration/e2e tests, coverage upload, gitleaks, dependency audits, and build/publish. Expose them via the CLI so setup can drop in opinionated pipelines by project type.
2. **Standardize security posture**
   - Add baseline scripts/CI steps for dependency scanning (npm/audit-ci/OSV-Scanner), license compliance checks, SBOM export (e.g., `cyclonedx-bom`), and signed releases (SLSA/provenance where possible). Integrate these into the release group to mirror big-tech supply-chain practices.
   - Provide a hardened `.npmrc` template (registry pinning, `engine-strict=true`, auth helper) and recommend enabling 2FA/publish tokens in release docs.
3. **Governance templates**
   - Ship `CODEOWNERS`, PR/issue templates, and a default `.github/CODE_OF_CONDUCT.md`/`SECURITY.md` linkage. The CLI should offer to add these so every repo starts with clear ownership and review expectations.
4. **Monorepo-first presets**
   - Add workspace root configs (pnpm-workspace, shared lint/test scripts, path alias examples) and guidance for repo-level release coordination (root Changesets/semantic-release) to reduce drift in multi-package environments.
5. **Documentation delivery**
   - Provide a docs publishing template (e.g., Storybook build + Chromatic/Playwright visual regression, Typedoc -> static site) and wire accessibility checks into the UI pipeline.
6. **Quality and velocity guardrails**
   - Encode coverage thresholds in Jest/Vitest bases, enable retry/flaky-test quarantining in Playwright, and recommend cacheable tasks (via Nx/Turbo or GitHub Actions cache) to keep pipelines fast while preserving strictness.
7. **Scripts package alignment**
   - When releasing the new `@kitiumai/scripts` API, publish a migration note and versioned peer requirement in this config package. Ensure the setup CLI pins or checks for the compatible scripts version so repos don’t receive breaking changes implicitly.

## Rollout approach
- **Default-on via CLI**: Extend the interactive and `--auto` flows so new repositories receive the CI/security/governance templates by default, with opt-outs for legacy projects.
- **Backfill existing repos**: Provide a `--migrate` mode that compares current configs against the standard set and stages patches (with optional `--dry-run`) to retrofit older repos without manual copy-paste.
- **Versioned profiles**: Offer “standard” and “hardened” profiles to let teams adopt stricter security gates gradually while keeping defaults aligned with enterprise expectations.
