import enquirer from 'enquirer';
import chalk from 'chalk';
import { ConfigGroup, DetectionResult, PackageType, SetupChoices, TestFramework } from './types.js';

/**
 * Interactive prompter for setup choices
 */
export class ConfigPrompter {
  private detection: DetectionResult;

  constructor(detection: DetectionResult) {
    this.detection = detection;
  }

  /**
   * Run interactive prompts to get user choices
   */
  async prompt(): Promise<SetupChoices> {
    const packageType = await this.promptPackageType();
    const configGroups = await this.promptConfigGroups(packageType);
    const enableUiConfigs = await this.promptUiConfigs(configGroups);
    const testFramework = await this.promptTestRunner(configGroups);
    const overrideExisting = await this.promptOverride();
    const setupGitHooks = await this.promptGitHooks();
    const publicPackage = await this.promptPublic(packageType);

    return {
      packageType,
      configGroups,
      overrideExisting,
      setupGitHooks,
      skipValidation: false,
      dryRun: false,
      publicPackage,
      enableUiConfigs,
      testFramework,
    };
  }

  /**
   * Prompt for package type
   */
  private async promptPackageType(): Promise<PackageType> {
    const detected = this.detection.type;

    const response = await enquirer.prompt<{ type: PackageType }>([
      {
        type: 'select',
        name: 'type',
        message: 'What is your package type?',
        choices: [
          {
            name: PackageType.Library,
            message: '📦 Library (exports for others)',
            hint: detected === PackageType.Library ? '(detected)' : '',
          } as any,
          {
            name: PackageType.App,
            message: '🎨 Application (private/internal)',
            hint: detected === PackageType.App ? '(detected)' : '',
          } as any,
          {
            name: PackageType.NextApp,
            message: '▲ Next.js App',
            hint: detected === PackageType.NextApp ? '(detected)' : '',
          } as any,
          {
            name: PackageType.CliTool,
            message: '⚙️ CLI Tool (command-line)',
            hint: detected === PackageType.CliTool ? '(detected)' : '',
          } as any,
          {
            name: PackageType.MonorepoRoot,
            message: '📂 Monorepo Root',
            hint: detected === PackageType.MonorepoRoot ? '(detected)' : '',
          } as any,
          {
            name: PackageType.Unknown,
            message: '❓ Not sure',
          } as any,
        ] as any,
        initial: detected,
      } as any,
    ]);

    return response.type;
  }

  /**
   * Prompt for configuration groups
   */
  private async promptConfigGroups(packageType: PackageType): Promise<ConfigGroup[]> {
    const suggested = this.getSuggestedGroups(packageType);

    const response = await enquirer.prompt<{ groups: ConfigGroup[] }>([
      {
        type: 'multiselect',
        name: 'groups',
        message: 'Which configuration groups would you like to set up?',
        choices: [
          {
            name: ConfigGroup.Core,
            message: '🎯 Core (TypeScript, ESLint, Prettier)',
            enabled: suggested.includes(ConfigGroup.Core),
          } as any,
          {
            name: ConfigGroup.Testing,
            message: '🧪 Testing (Vitest by default, Playwright optional)',
            enabled: suggested.includes(ConfigGroup.Testing),
          } as any,
          {
            name: ConfigGroup.Docs,
            message: '📚 Documentation (TypeDoc, Storybook optional)',
            enabled: suggested.includes(ConfigGroup.Docs),
          } as any,
          {
            name: ConfigGroup.Release,
            message: '🚀 Release (CommitLint, Semantic Release, Changesets)',
            enabled: suggested.includes(ConfigGroup.Release),
          } as any,
          {
            name: ConfigGroup.Security,
            message: '🔒 Security (ESLint security, gitleaks, audits)',
            enabled: suggested.includes(ConfigGroup.Security),
          } as any,
          {
            name: ConfigGroup.Ci,
            message: '🏗️  CI/CD (GitHub Actions workflows)',
            enabled: suggested.includes(ConfigGroup.Ci),
          } as any,
          {
            name: ConfigGroup.Governance,
            message: '👥 Governance (CODEOWNERS, PR/issue templates)',
            enabled: suggested.includes(ConfigGroup.Governance),
          } as any,
          {
            name: ConfigGroup.GitHooks,
            message: '🪝 Git Hooks (Husky, Lint-Staged)',
            enabled: suggested.includes(ConfigGroup.GitHooks),
          } as any,
          {
            name: ConfigGroup.Editor,
            message: '✏️ Editor (EditorConfig)',
            enabled: suggested.includes(ConfigGroup.Editor),
          } as any,
        ] as any,
      } as any,
    ]);

    return response.groups;
  }

  private async promptUiConfigs(configGroups: ConfigGroup[]): Promise<boolean> {
    const needsUiQuestion =
      configGroups.includes(ConfigGroup.Testing) || configGroups.includes(ConfigGroup.Docs);

    if (!needsUiQuestion) {
      return false;
    }

    const response = await enquirer.prompt<{ enableUi: boolean }>({
      type: 'confirm',
      name: 'enableUi',
      message: 'Include UI tooling (Playwright e2e, Storybook docs)?',
      initial: false,
    });

    return response.enableUi;
  }

  private async promptTestRunner(configGroups: ConfigGroup[]): Promise<TestFramework> {
    if (!configGroups.includes(ConfigGroup.Testing)) {
      return TestFramework.None;
    }

    const detectedFrameworks = this.detection.detectedTestFrameworks;
    const existingFrameworks = detectedFrameworks.filter(f => f !== TestFramework.None);

    // If only one framework detected, use it
    if (existingFrameworks.length === 1) {
      console.log(chalk.dim(`✓ Detected existing ${existingFrameworks[0]} setup`));
      return existingFrameworks[0]!;
    }

    // If multiple frameworks detected, let user choose
    if (existingFrameworks.length > 1) {
      console.log(chalk.yellow(`⚠️  Multiple test frameworks detected: ${existingFrameworks.join(', ')}`));
      console.log(chalk.dim('You can choose to keep one or migrate to another.'));
    }

    // Build choices based on detected frameworks and recommendations
    const choices = this.buildTestFrameworkChoices(detectedFrameworks);

    const response = await enquirer.prompt<{ runner: string }>({
      type: 'select',
      name: 'runner',
      message: existingFrameworks.length > 0
        ? 'Choose your primary test runner (existing frameworks detected)'
        : 'Choose your test runner',
      initial: this.getRecommendedTestRunnerIndex(detectedFrameworks, choices),
      choices: choices as any,
    });

    return response.runner as TestFramework;
  }

  /**
   * Build test framework choices based on detection
   */
  private buildTestFrameworkChoices(detectedFrameworks: TestFramework[]): Array<{ name: TestFramework; message: string }> {
    const choices: Array<{ name: TestFramework; message: string }> = [];

    // Always include Vitest as primary recommendation
    choices.push({
      name: TestFramework.Vitest,
      message: detectedFrameworks.includes(TestFramework.Vitest)
        ? 'Vitest (detected, recommended)'
        : 'Vitest (modern, fast, recommended)'
    });

    // Include Jest if detected or as alternative
    choices.push({
      name: TestFramework.Jest,
      message: detectedFrameworks.includes(TestFramework.Jest)
        ? 'Jest (detected, mature)'
        : 'Jest (mature, feature-rich)'
    });

    // Add other detected frameworks
    if (detectedFrameworks.includes(TestFramework.Mocha)) {
      choices.push({ name: TestFramework.Mocha, message: 'Mocha (detected, flexible)' });
    }
    if (detectedFrameworks.includes(TestFramework.Jasmine)) {
      choices.push({ name: TestFramework.Jasmine, message: 'Jasmine (detected, BDD)' });
    }
    if (detectedFrameworks.includes(TestFramework.Ava)) {
      choices.push({ name: TestFramework.Ava, message: 'AVA (detected, concurrent)' });
    }
    if (detectedFrameworks.includes(TestFramework.Tape)) {
      choices.push({ name: TestFramework.Tape, message: 'Tape (detected, minimal)' });
    }

    return choices;
  }

  /**
   * Get recommended test runner index based on detection
   */
  private getRecommendedTestRunnerIndex(detectedFrameworks: TestFramework[], choices: Array<{ name: TestFramework; message: string }>): number {
    // Prefer existing Vitest setup
    if (detectedFrameworks.includes(TestFramework.Vitest)) {
      return choices.findIndex(c => c.name === TestFramework.Vitest);
    }

    // Prefer existing Jest setup
    if (detectedFrameworks.includes(TestFramework.Jest)) {
      return choices.findIndex(c => c.name === TestFramework.Jest);
    }

    // Default to Vitest (first choice)
    return 0;
  }

  /**
   * Prompt for override existing configs
   */
  private async promptOverride(): Promise<boolean> {
    const hasExisting = Object.values(this.detection.hasExistingConfigs).some((v) => v);

    if (!hasExisting) {
      return true;
    }

    const response = await enquirer.prompt<{ override: boolean }>({
      type: 'confirm',
      name: 'override',
      message: 'Some config files already exist. Override them?',
      initial: false,
    });

    return response.override;
  }

  /**
   * Prompt for git hooks setup
   */
  private async promptGitHooks(): Promise<boolean> {
    if (!this.detection.hasGit) {
      return false;
    }

    const response = await enquirer.prompt<{ setupHooks: boolean }>({
      type: 'confirm',
      name: 'setupHooks',
      message: 'Set up Git hooks (husky + lint-staged)?',
      initial: true,
    });

    return response.setupHooks;
  }

  /**
   * Prompt for public package settings
   */
  private async promptPublic(packageType: PackageType): Promise<boolean> {
    const initial = packageType === PackageType.Library || packageType === PackageType.CliTool;

    const response = await enquirer.prompt<{ isPublic: boolean }>({
      type: 'confirm',
      name: 'isPublic',
      message: 'Is this package intended to be published publicly (npm)?',
      initial,
    });

    return response.isPublic;
  }

  /**
   * Get suggested groups based on package type
   */
  private getSuggestedGroups(type: PackageType): ConfigGroup[] {
    const suggestions: Record<PackageType, ConfigGroup[]> = {
      [PackageType.Library]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Docs,
        ConfigGroup.Security,
        ConfigGroup.Ci,
        ConfigGroup.Governance,
        ConfigGroup.Editor,
      ],
      [PackageType.App]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Security,
        ConfigGroup.Ci,
        ConfigGroup.GitHooks,
        ConfigGroup.Governance,
        ConfigGroup.Editor,
      ],
      [PackageType.NextApp]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Docs,
        ConfigGroup.Security,
        ConfigGroup.Ci,
        ConfigGroup.GitHooks,
        ConfigGroup.Governance,
        ConfigGroup.Editor,
      ],
      [PackageType.CliTool]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Security,
        ConfigGroup.Ci,
        ConfigGroup.GitHooks,
        ConfigGroup.Governance,
        ConfigGroup.Editor,
      ],
      [PackageType.MonorepoRoot]: [
        ConfigGroup.Core,
        ConfigGroup.Testing,
        ConfigGroup.Release,
        ConfigGroup.Security,
        ConfigGroup.Ci,
        ConfigGroup.Governance,
        ConfigGroup.GitHooks,
        ConfigGroup.Editor,
      ],
      [PackageType.Unknown]: [ConfigGroup.Core, ConfigGroup.Security, ConfigGroup.Editor],
    };

    return suggestions[type] || [ConfigGroup.Core];
  }
}
