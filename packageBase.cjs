/**
 * Common package.json shape for KitiumAI packages.
 * Intended for use in scaffolding scripts (merge and override per-package fields).
 */
const base = {
  version: '0.1.0',
  type: 'module',
  main: 'dist/index.js',
  types: 'dist/index.d.ts',
  files: ['dist'],
  license: 'MIT',
  engines: {
    node: '>=18.0.0',
  },
  publishConfig: {
    access: 'public',
  },
  scripts: {
    build: 'tsc -b',
    typecheck: 'tsc -b --noEmit',
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
    'lint:all':
      'node --input-type=module -e "import { lintAll } from \'@kitiumai/scripts/lint\'; await lintAll(false);"',
    test: 'vitest run',
    'test:watch': 'vitest watch',
    'test:coverage':
      'node --input-type=module -e "import { runTestsCoverage } from \'@kitiumai/scripts/test\'; await runTestsCoverage();"',
    format: 'prettier --check .',
    'format:fix': 'prettier --write .',
    'security:audit':
      "node --input-type=module -e \"import { auditDependencies } from '@kitiumai/scripts/security'; const summary = await auditDependencies({ severityThreshold: 'moderate' }); if ((summary.severityCounts?.critical || 0) + (summary.severityCounts?.high || 0) + (summary.severityCounts?.moderate || 0) > 0) { console.log(JSON.stringify(summary, null, 2)); process.exit(1); } console.log('No blocking vulnerabilities');\"",
    'security:secrets':
      "node --input-type=module -e \"import { scanSecrets } from '@kitiumai/scripts/security'; const result = await scanSecrets({ configPath: '.gitleaks.toml', failOnFinding: true }); if (result.findings?.length) { console.error(JSON.stringify(result.findings, null, 2)); process.exit(1); } console.log('No secrets detected');\"",
    'ci:verify': 'pnpm run lint:all && pnpm run test:coverage && pnpm run typecheck',
    changeset: 'changeset',
    version: 'changeset version',
    'publish:set-token': 'set-npm-token',
    'publish:setup': 'set-npm-token',
    'publish:check':
      'npm whoami --registry https://registry.npmjs.org || npm login --registry https://registry.npmjs.org',
    'publish:login': 'npm login --registry https://registry.npmjs.org',
    'publish:package':
      'pnpm run publish:check && pnpm publish --access public --no-git-checks --registry https://registry.npmjs.org',
    'publish:package:token':
      'pnpm run publish:setup && pnpm publish --access public --no-git-checks --registry https://registry.npmjs.org',
    'publish:package:otp':
      'pnpm run publish:check && pnpm publish --access public --no-git-checks --registry https://registry.npmjs.org --otp',
    'publish:dry-run':
      'pnpm publish --access public --no-git-checks --dry-run --registry https://registry.npmjs.org',
    'publish:dry-run:token':
      'pnpm run publish:setup && pnpm publish --access public --no-git-checks --dry-run --registry https://registry.npmjs.org',
    release: 'pnpm version && pnpm install --lockfile-only',
  },
  devDependencies: {
    typescript: '^5.3.0',
    '@kitiumai/scripts': '^1.0.0',
    eslint: '^8.0.0',
    prettier: '^3.0.0',
    vitest: '^2.0.0',
    '@changesets/cli': '^2.27.1',
  },
};

module.exports = base;
