import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ConfigFile, ConfigGroup, SetupChoices, configGroupMap } from './types.js';
import {
  getConfigById,
  getAvailableConfigs,
  resolveConfigPath,
  generateTemplateContent,
  type TemplateContext,
  type ConfigMetadata,
} from './config-registry.js';
import { FileOperations, type PackageJson } from './file-operations.js';
import { setupHusky } from './husky-setup.js';

const SCRIPTS_PACKAGE_NAME = '@kitiumai/scripts';

/**
 * Generation result
 */
export interface GenerationResult {
  filesCreated: string[];
  filesModified: string[];
  warnings: string[];
}

/**
 * Refactored ConfigGenerator using registry system
 * Eliminates 23+ template methods and massive switch statements
 */
export class ConfigGenerator {
  private readonly targetDir: string;
  private readonly fileOps: FileOperations;
  private readonly filesCreated: string[] = [];
  private readonly filesModified: string[] = [];
  private readonly warnings: string[] = [];
  private readonly templateScripts: Record<string, string>;
  private readonly scriptsPackageVersion?: string;

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = targetDir;
    this.fileOps = new FileOperations(targetDir);
    this.templateScripts = this.loadTemplateScripts();
    const version = this.loadScriptsPackageVersion();
    if (version !== undefined) {
      this.scriptsPackageVersion = version;
    }
  }

  /**
   * Generate configuration files based on user choices
   */
  async generate(choices: SetupChoices, dryRun: boolean = false): Promise<GenerationResult> {
    // Create template context
    const context = this.createTemplateContext(choices);

    // Get config files to generate
    const configFilesToGenerate = this.getConfigFilesToGenerate(choices, context);

    // Generate each config file
    for (const config of configFilesToGenerate) {
      this.generateConfigFile(config, context, choices, dryRun);
    }

    // Sync package.json changes
    this.syncPackageScripts(dryRun);
    this.syncToolkitDependencies(dryRun);
    this.applyPublicPackageConfig(choices, dryRun);

    // Setup Husky if git hooks are enabled
    await this.setupHuskyIfNeeded(configFilesToGenerate, dryRun);

    return {
      filesCreated: this.filesCreated,
      filesModified: this.filesModified,
      warnings: this.warnings,
    };
  }

  /**
   * Create template context from choices
   */
  private createTemplateContext(choices: SetupChoices): TemplateContext {
    const packageJson = this.fileOps.readJsonFile<PackageJson>('package.json');
    const packageName = packageJson?.name || 'unknown-package';

    // Extract last part after '/' for scoped packages
    const packageNameShort = packageName.split('/').pop() || 'unknown-package';

    return {
      packageName: packageNameShort,
      testFramework: choices.testFramework,
      enableUiConfigs: choices.enableUiConfigs,
      publicPackage: choices.publicPackage,
      hasGit: this.determineGitAvailability(choices),
      year: new Date().getFullYear(),
    };
  }

  /**
   * Derive whether git-related assets should be generated
   */
  private determineGitAvailability(choices: SetupChoices): boolean {
    if (choices.includePipelines) {
      return true;
    }

    if (choices.setupGitHooks) {
      return true;
    }

    if (this.fileOps.fileExists('.git')) {
      return true;
    }

    const gitRelatedGroups = new Set<ConfigGroup>([
      ConfigGroup.Ci,
      ConfigGroup.Security,
      ConfigGroup.Governance,
      ConfigGroup.GitHooks,
      ConfigGroup.Git,
    ]);

    if (choices.configGroups.some((group) => gitRelatedGroups.has(group))) {
      return true;
    }

    if (choices.selectionMode === 'granular' && choices.selectedConfigFiles) {
      const gitRelatedConfigs = new Set<ConfigFile>([
        ConfigFile.GithubCi,
        ConfigFile.GithubRelease,
        ConfigFile.GithubTagRelease,
        ConfigFile.SecurityWorkflow,
        ConfigFile.Dependabot,
        ConfigFile.Gitleaks,
        ConfigFile.Codeowners,
        ConfigFile.PullRequestTemplate,
        ConfigFile.IssueTemplateBug,
        ConfigFile.IssueTemplateFeature,
        ConfigFile.LintStaged,
        ConfigFile.Husky,
        ConfigFile.Gitignore,
      ]);
      if (choices.selectedConfigFiles.some((file) => gitRelatedConfigs.has(file))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get list of config files to generate
   * Supports both group-based and granular selection
   */
  private getConfigFilesToGenerate(
    choices: SetupChoices,
    context: TemplateContext
  ): ConfigMetadata[] {
    // If granular mode is enabled and specific files are selected
    if (choices.selectionMode === 'granular' && choices.selectedConfigFiles) {
      return this.getConfigsForGranularSelection(choices.selectedConfigFiles, context);
    }

    // Otherwise, use group-based selection (backward compatible)
    return this.getConfigsForGroupSelection(choices.configGroups, context);
  }

  /**
   * Get configs for granular file selection
   */
  private getConfigsForGranularSelection(
    selectedFiles: ConfigFile[],
    context: TemplateContext
  ): ConfigMetadata[] {
    const configs: ConfigMetadata[] = [];
    const resolvedFiles = new Set<ConfigFile>();

    for (const fileId of selectedFiles) {
      const config = getConfigById(fileId);
      if (!config) {
        this.warnings.push(`Unknown config file: ${fileId}`);
        continue;
      }

      // Check conditions
      if (config.condition && !config.condition(context)) {
        this.warnings.push(`Config ${config.displayName} cannot be generated (condition not met)`);
        continue;
      }

      // Check conflicts
      if (config.conflicts) {
        const hasConflict = config.conflicts.some((conflictId) =>
          selectedFiles.includes(conflictId)
        );
        if (hasConflict) {
          this.warnings.push(`Config ${config.displayName} conflicts with other selected configs`);
          continue;
        }
      }

      configs.push(config);
      resolvedFiles.add(fileId);

      // Add dependencies
      if (config.dependencies) {
        for (const depId of config.dependencies) {
          if (!resolvedFiles.has(depId)) {
            const depConfig = getConfigById(depId);
            if (depConfig) {
              configs.push(depConfig);
              resolvedFiles.add(depId);
            }
          }
        }
      }
    }

    return configs;
  }

  /**
   * Get configs for group-based selection (backward compatible)
   */
  private getConfigsForGroupSelection(
    groups: ConfigGroup[],
    context: TemplateContext
  ): ConfigMetadata[] {
    const files: ConfigFile[] = [];

    for (const group of groups) {
      const groupFiles = configGroupMap[group];
      if (!groupFiles) {
        continue;
      }

      files.push(...groupFiles);
    }

    // Remove duplicates
    const uniqueFiles = Array.from(new Set(files));

    // Get available configs filtered by context
    const availableConfigs = getAvailableConfigs(context);

    // Filter to only selected files
    return availableConfigs.filter((config) => uniqueFiles.includes(config.id));
  }

  /**
   * Generate a single config file
   */
  private generateConfigFile(
    config: ConfigMetadata,
    context: TemplateContext,
    choices: SetupChoices,
    dryRun: boolean
  ): void {
    // Skip Husky (handled separately)
    if (config.id === ConfigFile.Husky) {
      return;
    }

    // Resolve file path
    const filePath = resolveConfigPath(config, context);

    // Generate content
    const content = generateTemplateContent(config, context);

    const forceRefresh = Boolean(
      choices.forceRefreshConfigs && choices.forceRefreshConfigs.includes(config.id)
    );

    // Write file
    const result = this.fileOps.writeFile(filePath, content, {
      overrideExisting: choices.overrideExisting || forceRefresh,
      dryRun,
    });

    // Track results
    if (result.action === 'created') {
      this.filesCreated.push(result.filePath);
    } else if (result.action === 'modified') {
      this.filesModified.push(result.filePath);
    } else if (result.action === 'skipped') {
      this.warnings.push(result.reason || `Skipped: ${result.filePath}`);
    }
  }

  /**
   * Load template scripts from package.template.json
   */
  private loadTemplateScripts(): Record<string, string> {
    try {
      const templatePath = join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        'package.template.json'
      );
      const content = this.fileOps.readFile(templatePath);
      if (!content) {
        this.warnings.push('package.template.json not found; skipping script sync');
        return {};
      }
      const templateJson = JSON.parse(content) as { scripts?: Record<string, string> };
      return templateJson.scripts ?? {};
    } catch (error) {
      if (error instanceof Error) {
        this.warnings.push(`Failed to read package template scripts: ${error.message}`);
      }
      return {};
    }
  }

  /**
   * Load @kitiumai/scripts package version
   */
  private loadScriptsPackageVersion(): string | undefined {
    try {
      const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
      const content = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content) as { dependencies?: Record<string, string> };
      return packageJson.dependencies?.[SCRIPTS_PACKAGE_NAME];
    } catch (error) {
      if (error instanceof Error) {
        this.warnings.push(`Failed to read scripts package version: ${error.message}`);
      }
      return undefined;
    }
  }

  /**
   * Sync package scripts from template
   */
  private syncPackageScripts(dryRun: boolean): void {
    if (Object.keys(this.templateScripts).length === 0) {
      return;
    }

    const packageJson = this.fileOps.readJsonFile<PackageJson>('package.json');
    if (!packageJson) {
      this.warnings.push('package.json not found; skipping script sync');
      return;
    }

    const scripts = packageJson.scripts ?? {};
    const missingScripts = Object.entries(this.templateScripts).filter(([name]) => !scripts[name]);

    if (missingScripts.length === 0) {
      return;
    }

    if (dryRun) {
      this.warnings.push(
        `Dry-run: would add package scripts ${missingScripts.map(([name]) => name).join(', ')}`
      );
      return;
    }

    const scriptsToAdd: Record<string, string> = {};
    for (const [name, value] of missingScripts) {
      scriptsToAdd[name] = value;
    }

    const result = this.fileOps.updatePackageJson(
      { scripts: scriptsToAdd },
      { overrideExisting: true, dryRun }
    );

    if (result.action === 'modified' && !this.filesModified.includes('package.json')) {
      this.filesModified.push('package.json');
    }
  }

  /**
   * Sync @kitiumai/scripts dependency
   */
  private syncToolkitDependencies(dryRun: boolean): void {
    if (!this.scriptsPackageVersion) {
      return;
    }

    const packageJson = this.fileOps.readJsonFile<PackageJson>('package.json');
    if (!packageJson) {
      this.warnings.push('package.json not found; skipping toolkit dependency sync');
      return;
    }

    const devDependencies = packageJson.devDependencies ?? {};
    if (devDependencies[SCRIPTS_PACKAGE_NAME]) {
      return;
    }

    if (dryRun) {
      this.warnings.push(`Dry-run: would add ${SCRIPTS_PACKAGE_NAME} to devDependencies`);
      return;
    }

    const result = this.fileOps.updatePackageJson(
      {
        devDependencies: {
          [SCRIPTS_PACKAGE_NAME]: this.scriptsPackageVersion,
        },
      },
      { overrideExisting: true, dryRun }
    );

    if (result.action === 'modified' && !this.filesModified.includes('package.json')) {
      this.filesModified.push('package.json');
    }
  }

  /**
   * Apply public package configuration
   */
  private applyPublicPackageConfig(choices: SetupChoices, dryRun: boolean): void {
    if (!choices.publicPackage) {
      return;
    }

    // Ensure governance files
    this.ensureGovernanceFiles(choices, dryRun);

    const packageJson = this.fileOps.readJsonFile<PackageJson>('package.json');
    if (!packageJson) {
      this.warnings.push('package.json not found; skipping public package config');
      return;
    }

    const updates: Partial<PackageJson> = {};
    let hasChanges = false;

    // License
    if (!packageJson.license) {
      updates.license = 'MIT';
      hasChanges = true;
    }

    // Files array
    const requiredFiles = [
      'dist/**/*',
      'README.md',
      'LICENSE',
      'CODE_OF_CONDUCT.md',
      'CONTRIBUTING.md',
      'CHANGELOG.md',
    ];
    const files = packageJson.files ?? [];
    const missingFiles = requiredFiles.filter((f) => !files.includes(f));
    if (missingFiles.length > 0) {
      updates.files = [...files, ...missingFiles];
      hasChanges = true;
    }

    // Publish config
    const publishConfig = packageJson.publishConfig ?? {};
    if (publishConfig.access !== 'public' || !publishConfig.registry) {
      updates.publishConfig = {
        access: 'public',
        registry: publishConfig.registry || 'https://registry.npmjs.org/',
      };
      hasChanges = true;
    }

    if (!hasChanges) {
      return;
    }

    if (dryRun) {
      this.warnings.push('Dry-run: would update package.json for public publish settings');
      return;
    }

    const result = this.fileOps.updatePackageJson(updates, { overrideExisting: true, dryRun });

    if (result.action === 'modified' && !this.filesModified.includes('package.json')) {
      this.filesModified.push('package.json');
    }
  }

  /**
   * Ensure governance files for public packages
   */
  private ensureGovernanceFiles(choices: SetupChoices, dryRun: boolean): void {
    const year = new Date().getFullYear();
    const files = [
      {
        name: 'LICENSE',
        content: `MIT License

Copyright (c) ${year} KitiumAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
      },
      {
        name: 'CODE_OF_CONDUCT.md',
        content: `# Code of Conduct

We follow the Contributor Covenant to ensure a welcoming community.

## Our Pledge

We pledge to make participation in this project a harassment-free experience for everyone.

## Standards

- Be respectful and inclusive.
- Provide constructive feedback.
- Assume good intent and collaborate in good faith.

## Unacceptable Behavior

- Harassment or discrimination of any kind.
- Trolling, insulting/derogatory comments, or personal attacks.
- Publishing others' private information without permission.

## Reporting

Report unacceptable behavior to the maintainers at conduct@kitium.ai. All reports will be reviewed promptly and confidentially.

## Enforcement

Maintainers may take appropriate action, including warnings or removal from the project spaces.

## Attribution

Adapted from the Contributor Covenant, version 2.1.
`,
      },
      {
        name: 'CONTRIBUTING.md',
        content: `# Contributing

Thanks for helping improve this package!

## Getting started

1) Install dependencies: pnpm install
2) Build: pnpm run build
3) Type-check: pnpm run typecheck
4) Tests: pnpm test

## Standards

- Keep TypeScript strict and prefer explicit types.
- Run lint/format before opening a PR.
- Add or adjust tests when behavior changes.
- Update docs/CHANGELOG for user-facing changes.
`,
      },
    ];

    for (const file of files) {
      this.writeGovernanceFile(file.name, file.content, choices, dryRun);
    }
  }

  /**
   * Write a governance file
   */
  private writeGovernanceFile(
    filename: string,
    content: string,
    choices: SetupChoices,
    dryRun: boolean
  ): void {
    const result = this.fileOps.writeFile(filename, content, {
      overrideExisting: choices.overrideExisting,
      dryRun,
    });

    if (result.action === 'created') {
      this.filesCreated.push(result.filePath);
    } else if (result.action === 'modified') {
      if (!this.filesModified.includes(result.filePath)) {
        this.filesModified.push(result.filePath);
      }
    } else if (result.action === 'skipped') {
      this.warnings.push(result.reason || `Skipped: ${result.filePath}`);
    }
  }

  /**
   * Get files created
   */
  getFilesCreated(): string[] {
    return this.filesCreated;
  }

  /**
   * Get files modified
   */
  getFilesModified(): string[] {
    return this.filesModified;
  }

  /**
   * Get warnings
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Setup Husky if it was included in the generated configs
   */
  private async setupHuskyIfNeeded(configFiles: ConfigMetadata[], dryRun: boolean): Promise<void> {
    const hasHusky = configFiles.some((config) => config.id === ConfigFile.Husky);
    if (!hasHusky) {
      return;
    }

    const result = await setupHusky(this.targetDir, dryRun);

    // Add created files to our tracking
    for (const file of result.filesCreated) {
      if (!this.filesCreated.includes(file)) {
        this.filesCreated.push(file);
      }
    }

    // Add warnings
    for (const warning of result.warnings) {
      this.warnings.push(warning);
    }
  }
}
