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
    const overrideExisting = await this.promptOverride();
    const setupGitHooks = await this.promptGitHooks();

    return {
      packageType,
      configGroups,
      overrideExisting,
      setupGitHooks,
      skipValidation: false,
      dryRun: false,
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
            message: '🧪 Testing (Jest, Vitest, Playwright)',
            enabled: suggested.includes(ConfigGroup.Testing),
          } as any,
          {
            name: ConfigGroup.Docs,
            message: '📚 Documentation (TypeDoc, Storybook)',
            enabled: suggested.includes(ConfigGroup.Docs),
          } as any,
          {
            name: ConfigGroup.Release,
            message: '🚀 Release (CommitLint, Semantic Release, Changesets)',
            enabled: suggested.includes(ConfigGroup.Release),
          } as any,
          {
            name: ConfigGroup.Security,
            message: '🔒 Security (ESLint Security, Gitleaks)',
            enabled: false,
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
   * Get suggested groups based on package type
   */
  private getSuggestedGroups(type: PackageType): ConfigGroup[] {
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
