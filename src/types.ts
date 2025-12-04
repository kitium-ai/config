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
  Ci = 'ci',
  Governance = 'governance',
  GitHooks = 'git-hooks',
  Editor = 'editor',
  Git = 'git',
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
  Vitest = 'vitest',
  Jest = 'jest',
  Mocha = 'mocha',
  Jasmine = 'jasmine',
  Ava = 'ava',
  Tape = 'tape',
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
  SecurityWorkflow = 'security-workflow',
  Dependabot = 'dependabot',
  Npmrc = 'npmrc',

  // CI/CD
  GithubCi = 'github-ci',
  GithubRelease = 'github-release',
  GithubTagRelease = 'github-tag-release',

  // Governance
  Codeowners = 'codeowners',
  PullRequestTemplate = 'pull-request-template',
  IssueTemplateBug = 'issue-template-bug',
  IssueTemplateFeature = 'issue-template-feature',

  // Git Hooks
  LintStaged = 'lint-staged',
  Husky = 'husky',

  // Editor
  EditorConfig = 'editorconfig',

  // Git
  Gitignore = 'gitignore',
}

/**
 * Configuration group mapping
 */
export const configGroupMap: Record<ConfigGroup, ConfigFile[]> = {
  [ConfigGroup.Core]: [ConfigFile.TypeScript, ConfigFile.Prettier, ConfigFile.ESLint],
  [ConfigGroup.Testing]: [ConfigFile.Vitest, ConfigFile.Jest, ConfigFile.Mocha, ConfigFile.Jasmine, ConfigFile.Ava, ConfigFile.Tape, ConfigFile.Playwright],
  [ConfigGroup.Docs]: [ConfigFile.TypeDoc, ConfigFile.Storybook],
  [ConfigGroup.Release]: [ConfigFile.CommitLint, ConfigFile.SemanticRelease, ConfigFile.Changesets],
  [ConfigGroup.Security]: [
    ConfigFile.ESLintSecurity,
    ConfigFile.Gitleaks,
    ConfigFile.SecurityWorkflow,
    ConfigFile.Dependabot,
    ConfigFile.Npmrc,
  ],
  [ConfigGroup.Ci]: [ConfigFile.GithubCi, ConfigFile.GithubRelease, ConfigFile.GithubTagRelease],
  [ConfigGroup.Governance]: [
    ConfigFile.Codeowners,
    ConfigFile.PullRequestTemplate,
    ConfigFile.IssueTemplateBug,
    ConfigFile.IssueTemplateFeature,
  ],
  [ConfigGroup.GitHooks]: [ConfigFile.LintStaged, ConfigFile.Husky],
  [ConfigGroup.Editor]: [ConfigFile.EditorConfig],
  [ConfigGroup.Git]: [ConfigFile.Gitignore],
};

/**
 * Test framework enum
 */
export enum TestFramework {
  Vitest = 'vitest',
  Jest = 'jest',
  Mocha = 'mocha',
  Jasmine = 'jasmine',
  Ava = 'ava',
  Tape = 'tape',
  None = 'none',
}

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
  detectedTestFrameworks: TestFramework[];
}

/**
 * User setup choices
 */
export interface SetupChoices {
  packageType: PackageType;
  configGroups: ConfigGroup[];
  /** Optional: Specific config files to include/exclude (granular control) */
  selectedConfigFiles?: ConfigFile[];
  /** Selection mode: 'group' (select by groups) or 'granular' (select individual files) */
  selectionMode?: 'group' | 'granular';
  overrideExisting: boolean;
  setupGitHooks: boolean;
  skipValidation: boolean;
  dryRun: boolean;
  publicPackage: boolean;
  enableUiConfigs: boolean;
  testFramework: TestFramework;
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
  ui: boolean;
  testFramework: TestFramework;
  /** Enable granular file selection mode */
  granular?: boolean;
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
