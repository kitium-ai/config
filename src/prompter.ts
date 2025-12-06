import enquirer from 'enquirer';
import chalk from 'chalk';
import {
  ConfigGroup,
  DetectionResult,
  PackageType,
  SetupChoices,
  TestFramework,
  ConfigFile,
} from './types.js';
import { getConfigsByGroup, getAvailableConfigs, type TemplateContext } from './config-registry.js';
import { getSuggestedConfigGroups } from './config-suggestions.js';

interface EnquirerChoice {
  name: string;
  message?: string;
  value?: unknown;
  hint?: string;
  role?: string;
  enabled?: boolean;
  disabled?: boolean | string;
}

/**
 * Type for enquirer select choice
 */
interface SelectChoice<T extends string> {
  name: T;
  message: string;
  hint?: string;
}

/**
 * Type for enquirer multiselect choice
 */
interface MultiSelectChoice<T extends string> extends SelectChoice<T> {
  enabled?: boolean;
}

type ChoiceList = Array<string | EnquirerChoice>;

type MultiSelectPromptOptions<T extends string> = {
  type: 'multiselect';
  name: string;
  message: string;
  choices: ChoiceList;
  result?(value: string[]): T[] | Promise<T[]>;
};

const toChoiceList = <T extends string>(
  choices: Array<SelectChoice<T> | MultiSelectChoice<T>>
): ChoiceList => {
  return choices.map((choice) => {
    const base: EnquirerChoice = {
      name: choice.name,
      message: choice.message,
    };

    if (choice.hint !== undefined) {
      base.hint = choice.hint;
    }

    if ('enabled' in choice && choice.enabled !== undefined) {
      base.enabled = choice.enabled;
    }

    return base;
  });
};

type PromptInput = Parameters<typeof enquirer.prompt>[0];

/**
 * Enhanced ConfigPrompter with granular file selection support
 */
export class ConfigPrompter {
  private detection: DetectionResult;

  constructor(detection: DetectionResult) {
    this.detection = detection;
  }

  /**
   * Run interactive prompts to get user choices
   */
  async prompt(granularMode: boolean = false): Promise<SetupChoices> {
    const packageType = await this.promptPackageType();

    // Ask if user wants granular control (unless forced by CLI)
    const selectionMode = granularMode ? 'granular' : await this.promptSelectionMode();

    let configGroups: ConfigGroup[] = [];
    let selectedConfigFiles: ConfigFile[] | undefined;

    if (selectionMode === 'granular') {
      // Granular mode: select individual files
      selectedConfigFiles = await this.promptGranularFileSelection(packageType);
      // Derive groups from selected files for backward compatibility
      configGroups = this.deriveGroupsFromFiles(selectedConfigFiles);
    } else {
      // Group mode: select by groups (backward compatible)
      configGroups = await this.promptConfigGroups(packageType);
    }

    const enableUiConfigs = await this.promptUiConfigs(configGroups);
    const testFramework = await this.promptTestRunner(configGroups);
    const overrideExisting = await this.promptOverride();
    const setupGitHooks = await this.promptGitHooks();
    const publicPackage = await this.promptPublic(packageType);

    return {
      packageType,
      configGroups,
      selectedConfigFiles,
      selectionMode,
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
   * Prompt for selection mode
   */
  private async promptSelectionMode(): Promise<'group' | 'granular'> {
    const choices: SelectChoice<'group' | 'granular'>[] = [
      {
        name: 'group',
        message: '📦 By Groups (Quick - recommended for most users)',
        hint: 'Select entire config groups at once',
      },
      {
        name: 'granular',
        message: '🎯 Individual Files (Advanced - granular control)',
        hint: 'Choose specific config files one by one',
      },
    ];

    const modeQuestion = {
      type: 'select',
      name: 'mode',
      message: 'How would you like to select configurations?',
      choices: toChoiceList(choices),
      initial: 'group',
    } as unknown as PromptInput;

    const response = await enquirer.prompt<{ mode: 'group' | 'granular' }>(modeQuestion);

    return response.mode;
  }

  /**
   * Prompt for granular file selection
   */
  private async promptGranularFileSelection(packageType: PackageType): Promise<ConfigFile[]> {
    console.log(chalk.cyan('\n🎯 Granular Configuration Selection\n'));
    console.log(chalk.dim('Select individual config files you want to generate.\n'));

    // Create a template context for filtering
    const tempContext: TemplateContext = {
      packageName: this.detection.packageName,
      testFramework: TestFramework.Vitest, // Default, will be asked later
      enableUiConfigs: false, // Will be asked later
      publicPackage: packageType === PackageType.Library,
      hasGit: this.detection.hasGit,
      year: new Date().getFullYear(),
    };

    // Get available configs
    const availableConfigs = getAvailableConfigs(tempContext);

    // Group configs by category for better UX
    const configsByGroup = this.groupConfigsByCategory(availableConfigs);

    const selectedFiles: ConfigFile[] = [];

    // Prompt for each group
    for (const [group, configs] of configsByGroup) {
      if (configs.length === 0) {
        continue;
      }

      console.log(chalk.bold.blue(`\n${this.getGroupDisplayName(group)}:`));

      const choices: MultiSelectChoice<ConfigFile>[] = configs.map((config) => ({
        name: config.id,
        message: config.displayName,
        hint: config.description,
        enabled: config.defaultEnabled ?? false,
      }));

      const question: MultiSelectPromptOptions<ConfigFile> = {
        type: 'multiselect',
        name: 'files',
        message: `Select ${this.getGroupDisplayName(group)} configurations:`,
        choices: toChoiceList(choices),
        result(names: string[]) {
          return names as ConfigFile[];
        },
      };

      const promptQuestion = question as unknown as PromptInput;
      const response = await enquirer.prompt<{ files: ConfigFile[] }>(promptQuestion);

      selectedFiles.push(...response.files);
    }

    if (selectedFiles.length === 0) {
      console.log(
        chalk.yellow('\n⚠️  No configurations selected. Adding core configs by default.\n')
      );
      selectedFiles.push(ConfigFile.TypeScript, ConfigFile.Prettier, ConfigFile.ESLint);
    }

    return selectedFiles;
  }

  /**
   * Group configs by category for display
   */
  private groupConfigsByCategory(
    configs: import('./config-registry.js').ConfigMetadata[]
  ): Map<ConfigGroup, import('./config-registry.js').ConfigMetadata[]> {
    const grouped = new Map<ConfigGroup, import('./config-registry.js').ConfigMetadata[]>();

    for (const config of configs) {
      if (!grouped.has(config.group)) {
        grouped.set(config.group, []);
      }
      grouped.get(config.group)!.push(config);
    }

    // Sort groups in priority order
    const groupOrder = [
      ConfigGroup.Core,
      ConfigGroup.Testing,
      ConfigGroup.Docs,
      ConfigGroup.Release,
      ConfigGroup.Security,
      ConfigGroup.Ci,
      ConfigGroup.Governance,
      ConfigGroup.Git,
      ConfigGroup.GitHooks,
      ConfigGroup.Editor,
    ];

    const sorted = new Map<ConfigGroup, import('./config-registry.js').ConfigMetadata[]>();
    for (const group of groupOrder) {
      if (grouped.has(group)) {
        sorted.set(group, grouped.get(group)!);
      }
    }

    return sorted;
  }

  /**
   * Get display name for config group
   */
  private getGroupDisplayName(group: ConfigGroup): string {
    const names: Record<ConfigGroup, string> = {
      [ConfigGroup.Core]: '🎯 Core Configs',
      [ConfigGroup.Testing]: '🧪 Testing Configs',
      [ConfigGroup.Docs]: '📚 Documentation Configs',
      [ConfigGroup.Release]: '🚀 Release Configs',
      [ConfigGroup.Security]: '🔒 Security Configs',
      [ConfigGroup.Ci]: '🏗️  CI/CD Configs',
      [ConfigGroup.Governance]: '👥 Governance Configs',
      [ConfigGroup.GitHooks]: '🪝 Git Hooks',
      [ConfigGroup.Editor]: '✏️ Editor Configs',
      [ConfigGroup.Git]: '📂 Git Configs',
    };
    return names[group] || group;
  }

  /**
   * Derive config groups from selected files (for backward compatibility)
   */
  private deriveGroupsFromFiles(files: ConfigFile[]): ConfigGroup[] {
    const groups = new Set<ConfigGroup>();
    for (const group of Object.values(ConfigGroup)) {
      const configs = getConfigsByGroup(group);
      if (configs.some((config) => files.includes(config.id))) {
        groups.add(group);
      }
    }
    return Array.from(groups);
  }

  /**
   * Prompt for package type
   */
  private async promptPackageType(): Promise<PackageType> {
    const detected = this.detection.type;

    const choices: SelectChoice<PackageType>[] = [
      {
        name: PackageType.Library,
        message: '📦 Library (exports for others)',
        hint: detected === PackageType.Library ? '(detected)' : '',
      },
      {
        name: PackageType.App,
        message: '🎨 Application (private/internal)',
        hint: detected === PackageType.App ? '(detected)' : '',
      },
      {
        name: PackageType.NextApp,
        message: '▲ Next.js App',
        hint: detected === PackageType.NextApp ? '(detected)' : '',
      },
      {
        name: PackageType.CliTool,
        message: '⚙️ CLI Tool (command-line)',
        hint: detected === PackageType.CliTool ? '(detected)' : '',
      },
      {
        name: PackageType.MonorepoRoot,
        message: '📂 Monorepo Root',
        hint: detected === PackageType.MonorepoRoot ? '(detected)' : '',
      },
      {
        name: PackageType.Unknown,
        message: '❓ Not sure',
      },
    ];

    const typeQuestion = {
      type: 'select',
      name: 'type',
      message: 'What is your package type?',
      choices: toChoiceList(choices),
      initial: detected,
    } as unknown as PromptInput;

    const response = await enquirer.prompt<{ type: PackageType }>(typeQuestion);

    return response.type;
  }

  /**
   * Prompt for configuration groups (group mode)
   */
  private async promptConfigGroups(packageType: PackageType): Promise<ConfigGroup[]> {
    const suggested = this.getSuggestedGroups(packageType);

    const choices: MultiSelectChoice<ConfigGroup>[] = [
      {
        name: ConfigGroup.Core,
        message: '🎯 Core (TypeScript, ESLint, Prettier)',
        enabled: suggested.includes(ConfigGroup.Core),
      },
      {
        name: ConfigGroup.Testing,
        message: '🧪 Testing (Vitest by default, Playwright optional)',
        enabled: suggested.includes(ConfigGroup.Testing),
      },
      {
        name: ConfigGroup.Docs,
        message: '📚 Documentation (TypeDoc, Storybook optional)',
        enabled: suggested.includes(ConfigGroup.Docs),
      },
      {
        name: ConfigGroup.Release,
        message: '🚀 Release (CommitLint, Semantic Release, Changesets)',
        enabled: suggested.includes(ConfigGroup.Release),
      },
      {
        name: ConfigGroup.Security,
        message: '🔒 Security (ESLint security, gitleaks, audits)',
        enabled: suggested.includes(ConfigGroup.Security),
      },
      {
        name: ConfigGroup.Ci,
        message: '🏗️  CI/CD (GitHub Actions workflows)',
        enabled: suggested.includes(ConfigGroup.Ci),
      },
      {
        name: ConfigGroup.Governance,
        message: '👥 Governance (CODEOWNERS, PR/issue templates)',
        enabled: suggested.includes(ConfigGroup.Governance),
      },
      {
        name: ConfigGroup.GitHooks,
        message: '🪝 Git Hooks (Husky, Lint-Staged)',
        enabled: suggested.includes(ConfigGroup.GitHooks),
      },
      {
        name: ConfigGroup.Editor,
        message: '✏️ Editor (EditorConfig)',
        enabled: suggested.includes(ConfigGroup.Editor),
      },
    ];

    const groupQuestion = {
      type: 'multiselect',
      name: 'groups',
      message: 'Which configuration groups would you like to set up?',
      choices: toChoiceList(choices),
    } as unknown as PromptInput;

    const response = await enquirer.prompt<{ groups: ConfigGroup[] }>(groupQuestion);

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
    const existingFrameworks = detectedFrameworks.filter((f) => f !== TestFramework.None);

    // If only one framework detected, use it
    if (existingFrameworks.length === 1) {
      console.log(chalk.dim(`✓ Detected existing ${existingFrameworks[0]} setup`));
      return existingFrameworks[0]!;
    }

    // If multiple frameworks detected, let user choose
    if (existingFrameworks.length > 1) {
      console.log(
        chalk.yellow(`⚠️  Multiple test frameworks detected: ${existingFrameworks.join(', ')}`)
      );
      console.log(chalk.dim('You can choose to keep one or migrate to another.'));
    }

    // Build choices based on detected frameworks and recommendations
    const choices = this.buildTestFrameworkChoices(detectedFrameworks);

    const runnerQuestion = {
      type: 'select',
      name: 'runner',
      message:
        existingFrameworks.length > 0
          ? 'Choose your primary test runner (existing frameworks detected)'
          : 'Choose your test runner',
      initial: this.getRecommendedTestRunnerIndex(detectedFrameworks, choices),
      choices: toChoiceList(choices),
    } as unknown as PromptInput;

    const response = await enquirer.prompt<{ runner: TestFramework }>(runnerQuestion);

    return response.runner;
  }

  /**
   * Build test framework choices based on detection
   */
  private buildTestFrameworkChoices(
    detectedFrameworks: TestFramework[]
  ): SelectChoice<TestFramework>[] {
    const choices: SelectChoice<TestFramework>[] = [];

    // Always include Vitest as primary recommendation
    choices.push({
      name: TestFramework.Vitest,
      message: detectedFrameworks.includes(TestFramework.Vitest)
        ? 'Vitest (detected, recommended)'
        : 'Vitest (modern, fast, recommended)',
    });

    // Include Jest if detected or as alternative
    choices.push({
      name: TestFramework.Jest,
      message: detectedFrameworks.includes(TestFramework.Jest)
        ? 'Jest (detected, mature)'
        : 'Jest (mature, feature-rich)',
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
  private getRecommendedTestRunnerIndex(
    detectedFrameworks: TestFramework[],
    choices: SelectChoice<TestFramework>[]
  ): number {
    // Prefer existing Vitest setup
    if (detectedFrameworks.includes(TestFramework.Vitest)) {
      return choices.findIndex((c) => c.name === TestFramework.Vitest);
    }

    // Prefer existing Jest setup
    if (detectedFrameworks.includes(TestFramework.Jest)) {
      return choices.findIndex((c) => c.name === TestFramework.Jest);
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
    return getSuggestedConfigGroups(type);
  }
}
