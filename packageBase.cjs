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
    "publish:setup": "node -e \"const fs=require('fs');const path=require('path');const os=require('os');const token=process.env.NPM_TOKEN;if(!token){console.error('Error: NPM_TOKEN environment variable not set');process.exit(1);}const isWindows=os.platform()==='win32';const homeNpmrc=path.join(os.homedir(),isWindows?'.npmrc':'.npmrc');let content='';if(fs.existsSync(homeNpmrc)){content=fs.readFileSync(homeNpmrc,'utf8');}const lines=content.split('\\n').filter(l=>!l.includes('//registry.npmjs.org/:_authToken'));lines.push('//registry.npmjs.org/:_authToken='+token);fs.writeFileSync(homeNpmrc,lines.join('\\n')+'\\n');console.log('✓ Updated user-level .npmrc with authentication');\"",
    "publish:check": "npm whoami --registry https://registry.npmjs.org || (echo 'Error: Not logged in to npm. Set NPM_TOKEN or run: npm login' && exit 1)",
    "publish:package": "pnpm run publish:setup && pnpm publish --access public --no-git-checks --registry https://registry.npmjs.org",
    "publish:dry-run": "pnpm run publish:setup && pnpm publish --access public --no-git-checks --dry-run --registry https://registry.npmjs.org",
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
