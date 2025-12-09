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
  CodeqlConfig = 'codeql-config',
  DependencyReviewConfig = 'dependency-review-config',
  Npmrc = 'npmrc',

  // CI/CD
  GithubCi = 'github-ci',
  GithubSharedWorkflow = 'github-shared-workflow',
  GithubRelease = 'github-release',
  GithubTagRelease = 'github-tag-release',
  GithubLabelPr = 'github-label-pr',
  GithubDependencyReview = 'github-dependency-review',
  GithubWeeklyMaintenance = 'github-weekly-maintenance',

  // Governance
  Codeowners = 'codeowners',
  PullRequestTemplate = 'pull-request-template',
  IssueTemplateBug = 'issue-template-bug',
  IssueTemplateFeature = 'issue-template-feature',
  IssueTemplateDocs = 'issue-template-docs',
  IssueTemplateSecurity = 'issue-template-security',
  Funding = 'funding',
  LabelerConfig = 'labeler-config',
  PrSizeLabeler = 'pr-size-labeler',

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
  [ConfigGroup.Testing]: [
    ConfigFile.Vitest,
    ConfigFile.Jest,
    ConfigFile.Mocha,
    ConfigFile.Jasmine,
    ConfigFile.Ava,
    ConfigFile.Tape,
    ConfigFile.Playwright,
  ],
  [ConfigGroup.Docs]: [ConfigFile.TypeDoc, ConfigFile.Storybook],
  [ConfigGroup.Release]: [ConfigFile.CommitLint, ConfigFile.SemanticRelease, ConfigFile.Changesets],
  [ConfigGroup.Security]: [
    ConfigFile.ESLintSecurity,
    ConfigFile.Gitleaks,
    ConfigFile.SecurityWorkflow,
    ConfigFile.Dependabot,
    ConfigFile.CodeqlConfig,
    ConfigFile.DependencyReviewConfig,
    ConfigFile.Npmrc,
  ],
  [ConfigGroup.Ci]: [
    ConfigFile.GithubSharedWorkflow,
    ConfigFile.GithubCi,
    ConfigFile.GithubRelease,
    ConfigFile.GithubTagRelease,
    ConfigFile.GithubLabelPr,
    ConfigFile.GithubDependencyReview,
    ConfigFile.GithubWeeklyMaintenance,
  ],
  [ConfigGroup.Governance]: [
    ConfigFile.Codeowners,
    ConfigFile.Funding,
    ConfigFile.PullRequestTemplate,
    ConfigFile.IssueTemplateBug,
    ConfigFile.IssueTemplateFeature,
    ConfigFile.IssueTemplateDocs,
    ConfigFile.IssueTemplateSecurity,
    ConfigFile.LabelerConfig,
    ConfigFile.PrSizeLabeler,
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
  selectedConfigFiles?: ConfigFile[] | undefined;
  /** Selection mode: 'group' (select by groups) or 'granular' (select individual files) */
  selectionMode?: 'group' | 'granular' | undefined;
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
