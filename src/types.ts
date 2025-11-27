/**
 * Package type enum for categorization
 */
export enum PackageType {
  Library = 'library',
  App = 'app',
  NextApp = 'nextjs',
  CliTool = 'cli',
  MonorepoRoot = 'monorepo-root',
  Unknown = 'unknown',
}

/**
 * Configuration group enum
 */
export enum ConfigGroup {
  Core = 'core',
  Testing = 'testing',
  Docs = 'docs',
  Release = 'release',
  Security = 'security',
  GitHooks = 'git-hooks',
  Editor = 'editor',
}

/**
 * Individual config file types
 */
export enum ConfigFile {
  // Core
  TypeScript = 'tsconfig',
  Prettier = 'prettier',
  ESLint = 'eslint',

  // Testing
  Jest = 'jest',
  Vitest = 'vitest',
  Playwright = 'playwright',

  // Docs
  TypeDoc = 'typedoc',
  Storybook = 'storybook',

  // Release
  CommitLint = 'commitlint',
  SemanticRelease = 'semantic-release',
  Changesets = 'changesets',

  // Security
  ESLintSecurity = 'eslint-security',
  Gitleaks = 'gitleaks',

  // Git Hooks
  LintStaged = 'lint-staged',
  Husky = 'husky',

  // Editor
  EditorConfig = 'editorconfig',
}

/**
 * Configuration group mapping
 */
export const configGroupMap: Record<ConfigGroup, ConfigFile[]> = {
  [ConfigGroup.Core]: [ConfigFile.TypeScript, ConfigFile.Prettier, ConfigFile.ESLint],
  [ConfigGroup.Testing]: [ConfigFile.Jest, ConfigFile.Vitest, ConfigFile.Playwright],
  [ConfigGroup.Docs]: [ConfigFile.TypeDoc, ConfigFile.Storybook],
  [ConfigGroup.Release]: [ConfigFile.CommitLint, ConfigFile.SemanticRelease, ConfigFile.Changesets],
  [ConfigGroup.Security]: [ConfigFile.ESLintSecurity, ConfigFile.Gitleaks],
  [ConfigGroup.GitHooks]: [ConfigFile.LintStaged, ConfigFile.Husky],
  [ConfigGroup.Editor]: [ConfigFile.EditorConfig],
};

/**
 * Detected package context
 */
export interface DetectionResult {
  type: PackageType;
  hasGit: boolean;
  hasExistingConfigs: {
    [ConfigFile: string]: boolean;
  };
  suggestedGroups: ConfigGroup[];
  packageName: string;
  isMonorepo: boolean;
}

/**
 * User setup choices
 */
export interface SetupChoices {
  packageType: PackageType;
  configGroups: ConfigGroup[];
  overrideExisting: boolean;
  setupGitHooks: boolean;
  skipValidation: boolean;
  dryRun: boolean;
  publicPackage: boolean;
}

/**
 * CLI options
 */
export interface CliOptions {
  targetDir: string;
  auto: boolean;
  dryRun: boolean;
  force: boolean;
  publicPackage: boolean;
}

/**
 * Setup result
 */
export interface SetupResult {
  success: boolean;
  filesCreated: string[];
  filesModified: string[];
  warnings: string[];
  errors: string[];
  summary: string;
}
