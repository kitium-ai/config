# KitiumAI Shared Configs

Central place for settings that should be reused across packages and apps.

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

## Package scaffolding

- `@kitiumai/config/package.template.json`: Copy/merge when creating new packages to inherit common metadata (license, engines, publishConfig, scripts, toolchain pins).
- `@kitiumai/config/packageBase.cjs`: Exported JS object for scaffolding scripts; merge and override per-package fields.
- Validate existing manifests with `pnpm run validate:package-manifests` (checks for license, engines.node, type, and publishConfig for public scoped packages).

## Future candidates

- ESLint shareable config once package-level linting is in place.
- Base tsconfig variants (app vs. library) if we need different emit strategies.
