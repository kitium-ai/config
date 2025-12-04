/**
 * Semantic-release baseline used by KitiumAI packages.
 * Consumers should install semantic-release + listed plugins locally.
 */

module.exports = {
  branches: [
    'main',
    { name: 'next', prerelease: true },
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true },
  ],
  tagFormat: '${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        tarballDir: 'dist',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'pnpm-lock.yaml'],
        message: 'chore(release): ${nextRelease.version} [skip ci]',
      },
    ],
    '@semantic-release/github',
  ],
};
