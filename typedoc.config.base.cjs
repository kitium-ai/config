/**
 * TypeDoc base configuration for KitiumAI packages.
 * Consumers can import this file and merge overrides using `typedoc --options`.
 */
const config = {
  entryPoints: ['src/index.ts'],
  tsconfig: 'tsconfig.json',
  out: 'docs/api',
  plugin: ['typedoc-plugin-markdown'],
  excludePrivate: true,
  excludeProtected: true,
  excludeInternal: true,
  cleanOutputDir: true,
  treatWarningsAsErrors: true,
  hideBreadcrumbs: true,
  hideGenerator: true,
};

module.exports = config;

