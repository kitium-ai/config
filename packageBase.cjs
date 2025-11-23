/**
 * Common package.json shape for KitiumAI packages.
 * Intended for use in scaffolding scripts (merge and override per-package fields).
 */
const base = {
  version: "0.1.0",
  type: "module",
  main: "dist/index.js",
  types: "dist/index.d.ts",
  files: ["dist"],
  license: "MIT",
  engines: {
    node: ">=18.0.0"
  },
  publishConfig: {
    access: "public"
  },
  scripts: {
    build: "tsc -b",
    typecheck: "tsc -b --noEmit",
    lint: "eslint .",
    "lint:fix": "eslint . --fix",
    test: "vitest run",
    "test:watch": "vitest watch",
    format: "prettier --check .",
    "format:fix": "prettier --write .",
    changeset: "changeset",
    version: "changeset version",
    "publish:set-token": "set-npm-token",
    "publish:setup": "set-npm-token",
    "publish:check": "npm whoami --registry https://registry.npmjs.org || npm login --registry https://registry.npmjs.org",
    "publish:login": "npm login --registry https://registry.npmjs.org",
    "publish:package": "pnpm run publish:check && pnpm publish --access public --no-git-checks --registry https://registry.npmjs.org",
    "publish:package:token": "pnpm run publish:setup && pnpm publish --access public --no-git-checks --registry https://registry.npmjs.org",
    "publish:package:otp": "pnpm run publish:check && pnpm publish --access public --no-git-checks --registry https://registry.npmjs.org --otp",
    "publish:dry-run": "pnpm publish --access public --no-git-checks --dry-run --registry https://registry.npmjs.org",
    "publish:dry-run:token": "pnpm run publish:setup && pnpm publish --access public --no-git-checks --dry-run --registry https://registry.npmjs.org",
    release: "pnpm version && pnpm install --lockfile-only"
  },
  devDependencies: {
    typescript: "^5.3.0",
    eslint: "^8.0.0",
    prettier: "^3.0.0",
    vitest: "^1.0.0",
    "@changesets/cli": "^2.27.1"
  }
};

module.exports = base;
