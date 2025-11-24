/**
 * Storybook preset for React + Vite projects.
 * Extend this file from `apps/*/.storybook/main.ts` via:
 * `const base = require('@kitiumai/config/storybook.main.base.cjs');`
 */

const config = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  features: {
    storyStoreV7: true,
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
};

module.exports = config;

