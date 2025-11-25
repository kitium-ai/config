import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { ConfigFile, ConfigGroup, DetectionResult, PackageType } from './types.js';

/**
 * Detects package type and existing configuration
 */
export class ConfigDetector {
  private readonly targetDir: string;

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = resolve(targetDir);
  }

  /**
   * Perform full detection
   */
  async detect(): Promise<DetectionResult> {
    const packageJson = this.loadPackageJson();
    const type = this.detectPackageType(packageJson);
    const hasGit = this.checkGitDir();
    const hasExistingConfigs = this.detectExistingConfigs();
    const suggestedGroups = this.suggestConfigGroups(type);
    const packageName = packageJson?.['name'] || 'unknown';
    const isMonorepo = this.checkMonorepo(packageJson);

    return {
      type,
      hasGit,
      hasExistingConfigs,
      suggestedGroups,
      packageName,
      isMonorepo,
    };
  }

  /**
   * Load package.json from target directory
   */
  private loadPackageJson(): Record<string, any> | null {
    const packageJsonPath = join(this.targetDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      return JSON.parse(content) as Record<string, any>;
    } catch {
      return null;
    }
  }

  /**
   * Detect package type from package.json
   */
  private detectPackageType(packageJson: Record<string, any> | null): PackageType {
    if (!packageJson) {
      return PackageType.Unknown;
    }

    // Check for workspaces (monorepo root)
    const workspaces = packageJson['workspaces'];
    const pnpm = packageJson['pnpm'] as Record<string, any>;
    if (workspaces || (pnpm && pnpm['workspaces'])) {
      return PackageType.MonorepoRoot;
    }

    // Check for Next.js
    const deps = {
      ...(packageJson['dependencies'] as Record<string, any>),
      ...(packageJson['devDependencies'] as Record<string, any>),
    };

    if (deps['next']) {
      return PackageType.NextApp;
    }

    // Check for private app flag
    if (packageJson['private'] === true) {
      return PackageType.App;
    }

    // Check for bin field (CLI tool)
    if (packageJson['bin']) {
      return PackageType.CliTool;
    }

    // Check for main/exports (library)
    if (packageJson['main'] || packageJson['exports'] || packageJson['types']) {
      return PackageType.Library;
    }

    // Check for React dependency (likely app/UI)
    if (deps['react'] || deps['react-dom']) {
      return PackageType.App;
    }

    // Default to library if published
    if (!packageJson['private']) {
      return PackageType.Library;
    }

    return PackageType.Unknown;
  }

  /**
   * Check if .git directory exists
   */
  private checkGitDir(): boolean {
    return existsSync(join(this.targetDir, '.git'));
  }

  /**
   * Detect existing configuration files
   */
  private detectExistingConfigs(): Record<string, boolean> {
    const configs: Record<string, boolean> = {};

    const configMappings: Record<ConfigFile, string[]> = {
      [ConfigFile.TypeScript]: ['tsconfig.json'],
      [ConfigFile.Prettier]: ['prettier.config.cjs', '.prettierrc', '.prettierrc.json'],
      [ConfigFile.ESLint]: ['eslint.config.js', 'eslint.config.mjs', '.eslintrc', '.eslintrc.json'],
      [ConfigFile.Jest]: ['jest.config.js', 'jest.config.cjs', 'jest.config.ts'],
      [ConfigFile.Vitest]: ['vitest.config.ts', 'vitest.config.js'],
      [ConfigFile.Playwright]: ['playwright.config.ts', 'playwright.config.js'],
      [ConfigFile.TypeDoc]: ['typedoc.json', 'typedoc.config.js'],
      [ConfigFile.Storybook]: ['.storybook/main.ts', '.storybook/main.js', '.storybook/main.cjs'],
      [ConfigFile.CommitLint]: ['commitlint.config.js', 'commitlint.config.cjs'],
      [ConfigFile.SemanticRelease]: ['release.config.js', 'release.config.cjs'],
      [ConfigFile.Changesets]: ['.changeset/config.json'],
      [ConfigFile.ESLintSecurity]: [], // Detected via eslint config
      [ConfigFile.Gitleaks]: ['.gitleaks.toml', 'gitleaks.toml'],
      [ConfigFile.LintStaged]: ['lint-staged.config.js', 'lint-staged.config.cjs', '.lintstagedrc'],
      [ConfigFile.Husky]: ['.husky'],
      [ConfigFile.EditorConfig]: ['.editorconfig'],
    };

    for (const [configType, filePaths] of Object.entries(configMappings)) {
      configs[configType] = filePaths.some((filePath) =>
        existsSync(join(this.targetDir, filePath))
      );
    }

    return configs;
  }

  /**
   * Check if this is a monorepo
   */
  private checkMonorepo(packageJson: Record<string, any> | null): boolean {
    if (!packageJson) {
      return false;
    }

    const workspaces = packageJson['workspaces'];
    const pnpm = packageJson['pnpm'] as Record<string, any>;
    return !!(workspaces || (pnpm && pnpm['workspaces']));
  }

  /**
   * Suggest configuration groups based on package type
   */
  private suggestConfigGroups(type: PackageType): ConfigGroup[] {
    const suggestions: Record<PackageType, ConfigGroup[]> = {
      [PackageType.Library]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Docs,
        ConfigGroup.Editor,
      ],
      [PackageType.App]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.GitHooks,
        ConfigGroup.Editor,
      ],
      [PackageType.NextApp]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Docs,
        ConfigGroup.GitHooks,
        ConfigGroup.Editor,
      ],
      [PackageType.CliTool]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.GitHooks,
        ConfigGroup.Editor,
      ],
      [PackageType.MonorepoRoot]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Release,
        ConfigGroup.GitHooks,
        ConfigGroup.Editor,
      ],
      [PackageType.Unknown]: [ConfigGroup.Core, ConfigGroup.Editor],
    };

    return suggestions[type] || [ConfigGroup.Core];
  }
}
