import enquirer from 'enquirer';
import { ConfigGroup, DetectionResult, PackageType, SetupChoices } from './types.js';

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
    const useJest = await this.promptTestRunner(configGroups);
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
      useJest,
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

  private async promptTestRunner(configGroups: ConfigGroup[]): Promise<boolean> {
    if (!configGroups.includes(ConfigGroup.Testing)) {
      return false;
    }

    const response = await enquirer.prompt<{ runner: 'vitest' | 'jest' }>({
      type: 'select',
      name: 'runner',
      message: 'Choose your primary test runner',
      initial: 0,
      choices: [
        { name: 'vitest', message: 'Vitest (recommended and default)' } as any,
        { name: 'jest', message: 'Jest (opt-in)' } as any,
      ] as any,
    });

    return response.runner === 'jest';
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
