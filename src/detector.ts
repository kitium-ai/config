import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { ConfigFile, ConfigGroup, DetectionResult, PackageType, TestFramework } from './types.js';
import { getSuggestedConfigGroups } from './config-suggestions.js';
import type { PackageJson } from './file-operations.js';

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
    const detectedTestFrameworks = this.detectTestFrameworks(packageJson);

    return {
      type,
      hasGit,
      hasExistingConfigs,
      suggestedGroups,
      packageName,
      isMonorepo,
      detectedTestFrameworks,
    };
  }

  /**
   * Load package.json from target directory
   */
  private loadPackageJson(): PackageJson | null {
    const packageJsonPath = join(this.targetDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch {
      return null;
    }
  }

  /**
   * Detect existing test frameworks from dependencies and configs
   */
  private detectTestFrameworks(packageJson: PackageJson | null): TestFramework[] {
    if (!packageJson) {
      return [TestFramework.None];
    }

    const deps: Record<string, string> = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };

    const detected: TestFramework[] = [];
    const existingConfigs = this.detectExistingConfigs();

    // Check for Vitest
    if (deps['vitest'] || existingConfigs[ConfigFile.Vitest]) {
      detected.push(TestFramework.Vitest);
    }

    // Check for Jest
    if (deps['jest'] || existingConfigs[ConfigFile.Jest]) {
      detected.push(TestFramework.Jest);
    }

    // Check for Mocha
    if (deps['mocha']) {
      detected.push(TestFramework.Mocha);
    }

    // Check for Jasmine
    if (deps['jasmine'] || deps['@types/jasmine']) {
      detected.push(TestFramework.Jasmine);
    }

    // Check for AVA
    if (deps['ava']) {
      detected.push(TestFramework.Ava);
    }

    // Check for Tape
    if (deps['tape']) {
      detected.push(TestFramework.Tape);
    }

    // If no frameworks detected, suggest based on project type
    if (detected.length === 0) {
      const packageType = this.detectPackageType(packageJson);
      switch (packageType) {
        case PackageType.Library:
        case PackageType.CliTool:
          detected.push(TestFramework.Vitest); // Modern, fast for libraries
          break;
        case PackageType.App:
        case PackageType.NextApp:
          detected.push(TestFramework.Vitest); // Good for apps too
          break;
        default:
          detected.push(TestFramework.Vitest); // Default recommendation
      }
    }

    return detected;
  }

  /**
   * Detect package type from package.json
   */
  private detectPackageType(packageJson: PackageJson | null): PackageType {
    if (!packageJson) {
      return PackageType.Unknown;
    }

    // Check for workspaces (monorepo root)
    const workspaces = packageJson.workspaces;
    const pnpmWorkspaces = packageJson.pnpm?.workspaces;
    if (workspaces || pnpmWorkspaces) {
      return PackageType.MonorepoRoot;
    }

    // Check for Next.js
    const deps: Record<string, string> = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };

    if (deps['next']) {
      return PackageType.NextApp;
    }

    // Check for private app flag
    if (packageJson.private === true) {
      return PackageType.App;
    }

    // Check for bin field (CLI tool)
    if (packageJson.bin) {
      return PackageType.CliTool;
    }

    // Check for main/exports (library)
    if (packageJson.main || packageJson.exports || packageJson.types) {
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

    // Get package name for dynamic filenames
    const packageName = this.getPackageName();

    const configMappings: Record<ConfigFile, string[]> = {
      [ConfigFile.TypeScript]: ['tsconfig.json'],
      [ConfigFile.Prettier]: ['prettier.config.cjs', '.prettierrc', '.prettierrc.json'],
      [ConfigFile.ESLint]: ['eslint.config.js', 'eslint.config.mjs', '.eslintrc', '.eslintrc.json'],
      [ConfigFile.Jest]: ['jest.config.js', 'jest.config.cjs', 'jest.config.ts'],
      [ConfigFile.Vitest]: ['vitest.config.ts', 'vitest.config.js'],
      [ConfigFile.Mocha]: ['mocha.opts', '.mocharc.js', '.mocharc.json', '.mocharc.yml'],
      [ConfigFile.Jasmine]: ['jasmine.json', 'spec/support/jasmine.json'],
      [ConfigFile.Ava]: ['ava.config.js', 'ava.config.cjs', 'ava.config.mjs'],
      [ConfigFile.Tape]: [], // Tape typically doesn't use config files
      [ConfigFile.Playwright]: ['playwright.config.ts', 'playwright.config.js'],
      [ConfigFile.TypeDoc]: ['typedoc.json', 'typedoc.config.js'],
      [ConfigFile.Storybook]: ['.storybook/main.ts', '.storybook/main.js', '.storybook/main.cjs'],
      [ConfigFile.CommitLint]: ['commitlint.config.js', 'commitlint.config.cjs'],
      [ConfigFile.SemanticRelease]: ['release.config.js', 'release.config.cjs'],
      [ConfigFile.Changesets]: ['.changeset/config.json'],
      [ConfigFile.ESLintSecurity]: [], // Detected via eslint config
      [ConfigFile.Gitleaks]: ['.gitleaks.toml', 'gitleaks.toml'],
      [ConfigFile.SecurityWorkflow]: ['.github/workflows/security.yml'],
      [ConfigFile.Dependabot]: ['.github/dependabot.yml'],
      [ConfigFile.CodeqlConfig]: ['.github/codeql-config.yml'],
      [ConfigFile.DependencyReviewConfig]: ['.github/dependency-review-config.yml'],
      [ConfigFile.Npmrc]: ['.npmrc'],
      [ConfigFile.GithubSharedWorkflow]: ['.github/actions/kitium-shared-setup/action.yml'],
      [ConfigFile.GithubCi]: ['.github/workflows/ci.yml'],
      [ConfigFile.GithubRelease]: [`.github/workflows/release-${packageName}.yml`],
      [ConfigFile.GithubTagRelease]: [`.github/workflows/tag-release-${packageName}.yml`],
      [ConfigFile.GithubLabelPr]: ['.github/workflows/label-pr.yml'],
      [ConfigFile.GithubDependencyReview]: ['.github/workflows/dependency-review.yml'],
      [ConfigFile.GithubWeeklyMaintenance]: ['.github/workflows/weekly-maintenance.yml'],
      [ConfigFile.Codeowners]: ['.github/CODEOWNERS'],
      [ConfigFile.Funding]: ['.github/FUNDING.yml'],
      [ConfigFile.PullRequestTemplate]: [
        '.github/PULL_REQUEST_TEMPLATE.md',
        '.github/pull_request_template.md',
      ],
      [ConfigFile.IssueTemplateBug]: [
        '.github/ISSUE_TEMPLATES/bug_report.yml',
        '.github/ISSUE_TEMPLATE/bug_report.md',
      ],
      [ConfigFile.IssueTemplateFeature]: [
        '.github/ISSUE_TEMPLATES/feature_request.yml',
        '.github/ISSUE_TEMPLATE/feature_request.md',
      ],
      [ConfigFile.IssueTemplateDocs]: ['.github/ISSUE_TEMPLATES/documentation.yml'],
      [ConfigFile.IssueTemplateSecurity]: ['.github/ISSUE_TEMPLATES/security_report.yml'],
      [ConfigFile.LabelerConfig]: ['.github/labeler.yml'],
      [ConfigFile.PrSizeLabeler]: ['.github/pr-size-labeler.yml'],
      [ConfigFile.LintStaged]: ['lint-staged.config.js', 'lint-staged.config.cjs', '.lintstagedrc'],
      [ConfigFile.Husky]: ['.husky'],
      [ConfigFile.EditorConfig]: ['.editorconfig'],
      [ConfigFile.Gitignore]: ['.gitignore'],
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
  private checkMonorepo(packageJson: PackageJson | null): boolean {
    if (!packageJson) {
      return false;
    }

    const workspaces = packageJson.workspaces;
    const pnpmWorkspaces = packageJson.pnpm?.workspaces;
    return Boolean(workspaces || pnpmWorkspaces);
  }

  /**
   * Suggest configuration groups based on package type
   */
  private suggestConfigGroups(type: PackageType): ConfigGroup[] {
    return getSuggestedConfigGroups(type);
  }

  /**
   * Get the package name from package.json
   */
  private getPackageName(): string {
    try {
      const packageJsonPath = join(this.targetDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const fullName = packageJson['name'] || 'unknown-package';
      // Extract the last part after '/' or '@' for scoped packages
      const parts = fullName.split('/');
      return parts[parts.length - 1] || 'unknown-package';
    } catch {
      return 'unknown-package';
    }
  }
}
