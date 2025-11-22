/**
 * Shared Jest base config.
 * Consumers should install their own Jest and ts-jest dependencies.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.(spec|test).[tj]s?(x)'],
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest'
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', '!**/node_modules/**'],
  setupFilesAfterEnv: [],
  verbose: false
};
