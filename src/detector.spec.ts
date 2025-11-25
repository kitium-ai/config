import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigDetector } from './detector.js';
import { PackageType, ConfigFile, ConfigGroup } from './types.js';

describe('ConfigDetector', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(process.cwd(), 'test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detect', () => {
    it('should detect a library package', async () => {
      const packageJson = {
        name: '@test/lib',
        main: 'dist/index.js',
        exports: { '.': './dist/index.js' },
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.type).toBe(PackageType.Library);
      expect(result.packageName).toBe('@test/lib');
    });

    it('should detect a Next.js app', async () => {
      const packageJson = {
        name: 'my-app',
        private: true,
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
        },
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.type).toBe(PackageType.NextApp);
    });

    it('should detect a CLI tool', async () => {
      const packageJson = {
        name: 'my-cli',
        bin: { 'my-cli': './dist/cli.js' },
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.type).toBe(PackageType.CliTool);
    });

    it('should detect a private app', async () => {
      const packageJson = {
        name: 'internal-app',
        private: true,
        dependencies: {
          react: '^18.0.0',
        },
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.type).toBe(PackageType.App);
    });

    it('should detect a monorepo root', async () => {
      const packageJson = {
        name: 'monorepo',
        workspaces: ['packages/*'],
      };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.type).toBe(PackageType.MonorepoRoot);
      expect(result.isMonorepo).toBe(true);
    });

    it('should detect existing config files', async () => {
      const packageJson = { name: 'test-pkg' };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      // Create some config files
      writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
      writeFileSync(join(tempDir, '.prettierrc'), '{}');

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.hasExistingConfigs[ConfigFile.TypeScript]).toBe(true);
      expect(result.hasExistingConfigs[ConfigFile.Prettier]).toBe(true);
      expect(result.hasExistingConfigs[ConfigFile.Jest]).toBe(false);
    });

    it('should detect git directory', async () => {
      const packageJson = { name: 'test-pkg' };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson));

      const gitDir = join(tempDir, '.git');
      const fs = await import('fs').then((m) => m);
      fs.mkdirSync(gitDir);

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.hasGit).toBe(true);
    });

    it('should suggest config groups based on package type', async () => {
      const libraryJson = { name: 'lib', main: 'index.js' };
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(libraryJson));

      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.suggestedGroups).toContain(ConfigGroup.Core);
      expect(result.suggestedGroups).toContain(ConfigGroup.Testing);
    });

    it('should return unknown type for missing package.json', async () => {
      const detector = new ConfigDetector(tempDir);
      const result = await detector.detect();

      expect(result.type).toBe(PackageType.Unknown);
    });
  });
});
