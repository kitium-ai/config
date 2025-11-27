import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigGenerator } from './generator.js';
import { ConfigGroup, PackageType, SetupChoices } from './types.js';

describe('ConfigGenerator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(process.cwd(), 'test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generate', () => {
    it('should generate core config files', async () => {
      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Core],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      await generator.generate(choices, false);

      expect(existsSync(join(tempDir, 'tsconfig.json'))).toBe(true);
      expect(existsSync(join(tempDir, '.prettierrc.cjs'))).toBe(true);
      expect(existsSync(join(tempDir, 'eslint.config.js'))).toBe(true);
    });

    it('should generate testing config files', async () => {
      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Testing],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      await generator.generate(choices, false);

      expect(existsSync(join(tempDir, 'vitest.config.ts'))).toBe(true);
      expect(existsSync(join(tempDir, 'jest.config.cjs'))).toBe(false);
    });

    it('should generate jest config when useJest is true', async () => {
      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Testing],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: true,
      };

      const generator = new ConfigGenerator(tempDir);
      await generator.generate(choices, false);

      expect(existsSync(join(tempDir, 'jest.config.cjs'))).toBe(true);
      expect(existsSync(join(tempDir, 'vitest.config.ts'))).toBe(false);
    });

    it('should not override existing files by default', async () => {
      // Create existing file
      const existingFile = join(tempDir, 'tsconfig.json');
      writeFileSync(existingFile, '{"existing": true}');

      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Core],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      const result = await generator.generate(choices, false);

      const content = readFileSync(existingFile, 'utf-8');
      expect(content).toContain('existing');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should override existing files when specified', async () => {
      // Create existing file
      const existingFile = join(tempDir, 'tsconfig.json');
      writeFileSync(existingFile, '{"existing": true}');

      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Core],
        overrideExisting: true,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      const result = await generator.generate(choices, false);

      const content = readFileSync(existingFile, 'utf-8');
      expect(content).not.toContain('existing');
      expect(result.filesModified).toContain('tsconfig.json');
    });

    it('should support dry-run mode', async () => {
      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Core],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: true,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      await generator.generate(choices, true);

      // In dry-run, files should be listed but not created
      expect(existsSync(join(tempDir, 'tsconfig.json'))).toBe(false);
    });

    it('should generate editor config file', async () => {
      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Editor],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      await generator.generate(choices, false);

      expect(existsSync(join(tempDir, '.editorconfig'))).toBe(true);
      const content = readFileSync(join(tempDir, '.editorconfig'), 'utf-8');
      expect(content).toContain('root = true');
    });

    it('should generate multiple config groups', async () => {
      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Core, ConfigGroup.Testing, ConfigGroup.Editor],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      const result = await generator.generate(choices, false);

      expect(result.filesCreated.length).toBeGreaterThanOrEqual(5);
    });

    it('should scaffold ci, security, and governance assets', async () => {
      const choices: SetupChoices = {
        packageType: PackageType.Library,
        configGroups: [ConfigGroup.Security, ConfigGroup.Ci, ConfigGroup.Governance],
        overrideExisting: false,
        setupGitHooks: false,
        skipValidation: false,
        dryRun: false,
        publicPackage: false,
        enableUiConfigs: false,
        useJest: false,
      };

      const generator = new ConfigGenerator(tempDir);
      await generator.generate(choices, false);

      expect(existsSync(join(tempDir, '.github/workflows/ci.yml'))).toBe(true);
      expect(existsSync(join(tempDir, '.github/workflows/security.yml'))).toBe(true);
      expect(existsSync(join(tempDir, '.github/CODEOWNERS'))).toBe(true);
      expect(existsSync(join(tempDir, '.npmrc'))).toBe(true);
    });
  });
});
