/**
 * Opinionated lint-staged preset for KitiumAI repositories.
 * Expose commands via env vars to accommodate non-pnpm consumers.
 */

const eslintCmd = process.env.LINT_STAGED_ESLINT ?? 'pnpm eslint';
const prettierCmd = process.env.LINT_STAGED_PRETTIER ?? 'pnpm prettier';

module.exports = {
  '*.{js,jsx,ts,tsx,mjs,cjs}': [
    `${eslintCmd} --max-warnings=0`,
    `${prettierCmd} --check`,
  ],
  '*.{json,jsonc,md,mdx,yaml,yml,graphql}': [`${prettierCmd} --check`],
  '*.{css,scss,less}': [`${prettierCmd} --check`],
  '*.{ts,tsx}': ['pnpm test -- --runInBand --findRelatedTests'],
};

