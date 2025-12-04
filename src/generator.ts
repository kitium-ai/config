import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ConfigFile, ConfigGroup, SetupChoices, configGroupMap, TestFramework } from './types.js';

interface ConfigTemplate {
  filename: string;
  content: string;
  needsExtends?: boolean;
  isJson?: boolean;
}

/**
 * Generates configuration files
 */
export class ConfigGenerator {
  private readonly targetDir: string;
  private readonly filesCreated: string[] = [];
  private readonly filesModified: string[] = [];
  private readonly warnings: string[] = [];
  private readonly templateScripts: Record<string, string>;
  private readonly scriptsPackageVersion?: string;

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = targetDir;
    this.templateScripts = this.loadTemplateScripts();
    const version = this.loadScriptsPackageVersion();
    if (version !== undefined) {
      this.scriptsPackageVersion = version;
    }
  }

  /**
   * Generate configuration files based on user choices
   */
  async generate(
    choices: SetupChoices,
    dryRun: boolean = false
  ): Promise<{
    filesCreated: string[];
    filesModified: string[];
    warnings: string[];
  }> {
    const configFiles = this.getConfigFilesToGenerate(choices);

    for (const configFile of configFiles) {
      const template = this.getTemplate(configFile, choices);
      if (template) {
        const filePath = join(this.targetDir, template.filename);
        const exists = existsSync(filePath);

        if (exists && !choices.overrideExisting) {
          this.warnings.push(`Skipped existing file: ${template.filename}`);
          continue;
        }

        if (!dryRun) {
          this.ensureDir(dirname(filePath));
          writeFileSync(filePath, template.content, 'utf-8');
        }

        if (exists) {
          this.filesModified.push(template.filename);
        } else {
          this.filesCreated.push(template.filename);
        }
      }
    }

    this.syncPackageScripts(dryRun);
    this.syncToolkitDependencies(dryRun);
    this.applyPublicPackageConfig(choices, dryRun);

    return {
      filesCreated: this.filesCreated,
      filesModified: this.filesModified,
      warnings: this.warnings,
    };
  }

  /**
   * Get list of config files to generate
   */
  private getConfigFilesToGenerate(choices: SetupChoices): ConfigFile[] {
    const files: ConfigFile[] = [];

    for (const group of choices.configGroups) {
      const groupFiles = configGroupMap[group];
      if (groupFiles) {
        let filteredFiles = [...groupFiles];

        if (group === ConfigGroup.Testing) {
          // Filter out all test frameworks initially
          filteredFiles = filteredFiles.filter((file) =>
            file !== ConfigFile.Jest &&
            file !== ConfigFile.Vitest &&
            file !== ConfigFile.Mocha &&
            file !== ConfigFile.Jasmine &&
            file !== ConfigFile.Ava &&
            file !== ConfigFile.Tape
          );

          // Add back the selected test framework
          switch (choices.testFramework) {
            case TestFramework.Jest:
              filteredFiles.push(ConfigFile.Jest);
              break;
            case TestFramework.Vitest:
              filteredFiles.push(ConfigFile.Vitest);
              break;
            case TestFramework.Mocha:
              filteredFiles.push(ConfigFile.Mocha);
              break;
            case TestFramework.Jasmine:
              filteredFiles.push(ConfigFile.Jasmine);
              break;
            case TestFramework.Ava:
              filteredFiles.push(ConfigFile.Ava);
              break;
            case TestFramework.Tape:
              filteredFiles.push(ConfigFile.Tape);
              break;
            default:
              // Default to Vitest
              filteredFiles.push(ConfigFile.Vitest);
          }

          if (!choices.enableUiConfigs) {
            filteredFiles = filteredFiles.filter((file) => file !== ConfigFile.Playwright);
          }
        }

        if (group === ConfigGroup.Docs && !choices.enableUiConfigs) {
          filteredFiles = filteredFiles.filter((file) => file !== ConfigFile.Storybook);
        }

        // Filter out Husky if git hooks setup is not requested
        filteredFiles =
          group === ConfigGroup.GitHooks && !choices.setupGitHooks
            ? filteredFiles.filter((file) => file !== ConfigFile.Husky)
            : filteredFiles;

        files.push(...filteredFiles);
      }
    }

    return Array.from(new Set(files)); // Remove duplicates
  }

  /**
   * Get template for a config file
   */
  private getTemplate(configFile: ConfigFile, _choices: SetupChoices): ConfigTemplate | null {
    switch (configFile) {
      case ConfigFile.TypeScript:
        return this.getTsConfigTemplate();
      case ConfigFile.Prettier:
        return this.getPrettierTemplate();
      case ConfigFile.ESLint:
        return this.getEslintTemplate();
      case ConfigFile.Jest:
        return this.getJestTemplate();
      case ConfigFile.Vitest:
        return this.getVitestTemplate();
      case ConfigFile.Playwright:
        return this.getPlaywrightTemplate();
      case ConfigFile.TypeDoc:
        return this.getTypedocTemplate();
      case ConfigFile.Storybook:
        return this.getStorybookTemplate();
      case ConfigFile.CommitLint:
        return this.getCommitlintTemplate();
      case ConfigFile.SemanticRelease:
        return this.getSemanticReleaseTemplate();
      case ConfigFile.Changesets:
        return this.getChangesetsTemplate();
      case ConfigFile.ESLintSecurity:
        return this.getEslintSecurityTemplate();
      case ConfigFile.Gitleaks:
        return this.getGitleaksTemplate();
      case ConfigFile.SecurityWorkflow:
        return this.getSecurityWorkflowTemplate();
      case ConfigFile.Dependabot:
        return this.getDependabotTemplate();
      case ConfigFile.Npmrc:
        return this.getNpmrcTemplate();
      case ConfigFile.GithubCi:
        return this.getGithubCiTemplate();
      case ConfigFile.GithubRelease:
        return this.getGithubReleaseTemplate();
      case ConfigFile.GithubTagRelease:
        return this.getGithubTagReleaseTemplate();
      case ConfigFile.Codeowners:
        return this.getCodeownersTemplate();
      case ConfigFile.PullRequestTemplate:
        return this.getPullRequestTemplate();
      case ConfigFile.IssueTemplateBug:
        return this.getIssueTemplateBug();
      case ConfigFile.IssueTemplateFeature:
        return this.getIssueTemplateFeature();
      case ConfigFile.LintStaged:
        return this.getLintStagedTemplate();
      case ConfigFile.Husky:
        return null; // Handled separately
      case ConfigFile.EditorConfig:
        return this.getEditorconfigTemplate();
      default:
        return null;
    }
  }

  private loadTemplateScripts(): Record<string, string> {
    try {
      const templatePath = join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        'package.template.json'
      );
      if (!existsSync(templatePath)) {
        this.warnings.push('package.template.json not found; skipping script sync');
        return {};
      }
      const templateContent = readFileSync(templatePath, 'utf-8');
      const templateJson = JSON.parse(templateContent) as { scripts?: Record<string, string> };
      return templateJson.scripts ?? {};
    } catch (error) {
      if (error instanceof Error) {
        this.warnings.push(`Failed to read package template scripts: ${error.message}`);
      } else {
        this.warnings.push('Failed to read package template scripts');
      }
      return {};
    }
  }

  private loadScriptsPackageVersion(): string | undefined {
    try {
      const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
      const content = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content) as { dependencies?: Record<string, string> };
      return packageJson.dependencies?.['@kitiumai/scripts'];
    } catch (error) {
      if (error instanceof Error) {
        this.warnings.push(`Failed to read scripts package version: ${error.message}`);
      }
      return undefined;
    }
  }

  private syncPackageScripts(dryRun: boolean): void {
    if (Object.keys(this.templateScripts).length === 0) {
      return;
    }

    const packageJsonPath = join(this.targetDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      this.warnings.push('package.json not found; skipping script sync');
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        scripts?: Record<string, string>;
      };
      const scripts = packageJson.scripts ?? {};
      const missingScripts = Object.entries(this.templateScripts).filter(
        ([name]) => !scripts[name]
      );

      if (missingScripts.length === 0) {
        return;
      }

      if (dryRun) {
        this.warnings.push(
          `Dry-run: would add package scripts ${missingScripts.map(([name]) => name).join(', ')}`
        );
        return;
      }

      packageJson.scripts = { ...scripts };
      for (const [name, value] of missingScripts) {
        packageJson.scripts[name] = value;
      }

      writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf-8');

      if (!this.filesModified.includes('package.json')) {
        this.filesModified.push('package.json');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.warnings.push(`Failed to update package.json scripts: ${error.message}`);
      } else {
        this.warnings.push('Failed to update package.json scripts');
      }
    }
  }

  private syncToolkitDependencies(dryRun: boolean): void {
    if (!this.scriptsPackageVersion) {
      return;
    }

    const packageJsonPath = join(this.targetDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      this.warnings.push('package.json not found; skipping toolkit dependency sync');
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        devDependencies?: Record<string, string>;
      };

      const devDependencies = packageJson.devDependencies ?? {};
      if (devDependencies['@kitiumai/scripts']) {
        return;
      }

      if (dryRun) {
        this.warnings.push('Dry-run: would add @kitiumai/scripts to devDependencies');
        return;
      }

      packageJson.devDependencies = {
        ...devDependencies,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '@kitiumai/scripts': this.scriptsPackageVersion,
      };

      writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf-8');
      if (!this.filesModified.includes('package.json')) {
        this.filesModified.push('package.json');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.warnings.push(`Failed to sync toolkit dependencies: ${error.message}`);
      }
    }
  }

  /**
   * Apply public package settings (package.json + governance files)
   */
  private applyPublicPackageConfig(choices: SetupChoices, dryRun: boolean): void {
    if (!choices.publicPackage) {
      return;
    }

    this.ensureGovernanceFiles(choices, dryRun);

    const packageJsonPath = join(this.targetDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      this.warnings.push('package.json not found; skipping public package config');
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        license?: string;
        publishConfig?: { access?: string; registry?: string };
        files?: string[];
      };

      let changed = false;

      if (!packageJson.license) {
        packageJson.license = 'MIT';
        changed = true;
      }

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
        packageJson.files = [...files, ...missingFiles];
        changed = true;
      }

      const publishConfig = packageJson.publishConfig ?? {};
      if (publishConfig.access !== 'public') {
        publishConfig.access = 'public';
        changed = true;
      }
      if (!publishConfig.registry) {
        publishConfig.registry = 'https://registry.npmjs.org/';
        changed = true;
      }
      packageJson.publishConfig = publishConfig;

      if (!changed) {
        return;
      }

      if (dryRun) {
        this.warnings.push('Dry-run: would update package.json for public publish settings');
        return;
      }

      writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf-8');
      if (!this.filesModified.includes('package.json')) {
        this.filesModified.push('package.json');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.warnings.push(`Failed to update package.json for public config: ${error.message}`);
      } else {
        this.warnings.push('Failed to update package.json for public config');
      }
    }
  }

  private ensureGovernanceFiles(choices: SetupChoices, dryRun: boolean): void {
    const files = [
      {
        name: 'LICENSE',
        content: `MIT License

Copyright (c) ${new Date().getFullYear()} KitiumAI

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

  private writeGovernanceFile(
    filename: string,
    content: string,
    choices: SetupChoices,
    dryRun: boolean
  ): void {
    const filePath = join(this.targetDir, filename);
    const exists = existsSync(filePath);

    if (exists && !choices.overrideExisting) {
      this.warnings.push(`Skipped existing ${filename}`);
      return;
    }

    if (!dryRun) {
      this.ensureDir(dirname(filePath));
      writeFileSync(filePath, content, 'utf-8');
    }

    if (exists) {
      if (!this.filesModified.includes(filename)) {
        this.filesModified.push(filename);
      }
    } else {
      this.filesCreated.push(filename);
    }
  }

  private getTsConfigTemplate(): ConfigTemplate {
    return {
      filename: 'tsconfig.json',
      content: JSON.stringify(
        {
          extends: '@kitiumai/config/tsconfig.base.json',
          compilerOptions: {
            baseUrl: '.',
            outDir: './dist',
          },
          include: ['src'],
        },
        null,
        2
      ),
      isJson: true,
    };
  }

  private getPrettierTemplate(): ConfigTemplate {
    return {
      filename: '.prettierrc.cjs',
      content: `module.exports = require('@kitiumai/config/prettier.config.cjs');\n`,
    };
  }

  private getEslintTemplate(): ConfigTemplate {
    const content = `import baseConfig from '@kitiumai/config/eslint.config.base.js';

export default [
  ...baseConfig,
  // Add your custom rules here
];\n`;

    return {
      filename: 'eslint.config.js',
      content,
    };
  }

  private getEslintSecurityTemplate(): ConfigTemplate {
    const content = `import securityConfig from '@kitiumai/config/eslint.config.security.js';

export default [
  ...securityConfig,
  // Add your custom rules here
];\n`;

    return {
      filename: 'eslint.config.security.js',
      content,
    };
  }

  private getJestTemplate(): ConfigTemplate {
    return {
      filename: 'jest.config.cjs',
      content: `const config = require('@kitiumai/config/jest.config.base.cjs');

module.exports = {
  ...config,
  // Override with your custom settings
};\n`,
    };
  }

  private getVitestTemplate(): ConfigTemplate {
    const content = `import baseConfig from '@kitiumai/config/vitest.config.base.js';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...baseConfig,
  // Add your custom config here
});\n`;

    return {
      filename: 'vitest.config.ts',
      content,
    };
  }

  private getPlaywrightTemplate(): ConfigTemplate {
    const content = `import baseConfig from '@kitiumai/config/playwright.config.base.js';

export default baseConfig;\n`;

    return {
      filename: 'playwright.config.ts',
      content,
    };
  }

  private getTypedocTemplate(): ConfigTemplate {
    return {
      filename: 'typedoc.json',
      content: JSON.stringify(
        {
          extends: ['@kitiumai/config/typedoc.config.base.cjs'],
          out: 'docs/api',
          exclude: ['**/*.spec.ts', '**/*.test.ts'],
        },
        null,
        2
      ),
      isJson: true,
    };
  }

  private getStorybookTemplate(): ConfigTemplate {
    return {
      filename: '.storybook/main.cjs',
      content: `const config = require('@kitiumai/config/storybook.main.base.cjs');

module.exports = {
  ...config,
  // Override with your custom settings
};\n`,
    };
  }

  private getCommitlintTemplate(): ConfigTemplate {
    return {
      filename: 'commitlint.config.cjs',
      content: `module.exports = require('@kitiumai/config/commitlint.config.cjs');\n`,
    };
  }

  private getSemanticReleaseTemplate(): ConfigTemplate {
    return {
      filename: 'release.config.cjs',
      content: `const config = require('@kitiumai/config/semantic-release.config.base.cjs');

module.exports = {
  ...config,
  // Override with your custom settings
};\n`,
    };
  }

  private getChangesetsTemplate(): ConfigTemplate {
    return {
      filename: '.changeset/config.json',
      content: JSON.stringify(
        {
          $schema: 'https://docs.bump.sh/schemas/changesets/config.json',
          changelog: ['@changesets/changelog-github', { repo: 'org/repo' }],
          commit: false,
          fixed: [],
          linked: [],
          access: 'restricted',
          baseBranch: 'main',
          updateInternalDependencies: 'patch',
          ignore: [],
        },
        null,
        2
      ),
      isJson: true,
    };
  }

  private getGitleaksTemplate(): ConfigTemplate {
    return {
      filename: '.gitleaks.toml',
      content: `extends = ["@kitiumai/config/gitleaks.toml"]\n`,
    };
  }

  private getSecurityWorkflowTemplate(): ConfigTemplate {
    const content =
      `name: Security\n\n` +
      `on:\n` +
      `  schedule:\n` +
      `    - cron: '0 6 * * 1'\n` +
      `  pull_request:\n` +
      `    paths:\n` +
      `      - 'pnpm-lock.yaml'\n` +
      `      - 'package.json'\n` +
      `      - '.gitleaks*'\n` +
      `  workflow_dispatch:\n\n` +
      `permissions:\n` +
      `  contents: read\n` +
      `  security-events: write\n\n` +
      `jobs:\n` +
      `  audit:\n` +
      `    runs-on: ubuntu-latest\n` +
      `    steps:\n` +
      `      - uses: actions/checkout@v4\n` +
      `      - uses: pnpm/action-setup@v4\n` +
      `        with:\n` +
      `          version: 9\n` +
      `      - uses: actions/setup-node@v4\n` +
      `        with:\n` +
      `          node-version: 18\n` +
      `          cache: pnpm\n` +
      `      - name: Install dependencies\n` +
      `        run: pnpm install --frozen-lockfile\n` +
      `      - name: Dependency audit (via @kitiumai/scripts)\n` +
      `        run: >\n` +
      `          pnpm exec node --input-type=module -e "import { auditDependencies } from '@kitiumai/scripts/security';\n` +
      `            const summary = await auditDependencies({ severityThreshold: 'moderate' });\n` +
      `            console.log(JSON.stringify(summary, null, 2));\n` +
      `            const blocking = (summary.severityCounts?.critical || 0) + (summary.severityCounts?.high || 0) + (summary.severityCounts?.moderate || 0);\n` +
      `            if (blocking > 0) { process.exit(1); }"\n` +
      `  secrets:\n` +
      `    runs-on: ubuntu-latest\n` +
      `    steps:\n` +
      `      - uses: actions/checkout@v4\n` +
      `      - uses: pnpm/action-setup@v4\n` +
      `        with:\n` +
      `          version: 9\n` +
      `      - uses: actions/setup-node@v4\n` +
      `        with:\n` +
      `          node-version: 18\n` +
      `          cache: pnpm\n` +
      `      - name: Install dependencies\n` +
      `        run: pnpm install --frozen-lockfile\n` +
      `      - name: Secret scan (gitleaks via @kitiumai/scripts)\n` +
      `        run: >\n` +
      `          pnpm exec node --input-type=module -e "import { scanSecrets } from '@kitiumai/scripts/security';\n` +
      `            const result = await scanSecrets({ configPath: '.gitleaks.toml', failOnFinding: true });\n` +
      `            if (result.findings?.length) { console.error(JSON.stringify(result.findings, null, 2)); process.exit(1); }"\n`;

    return {
      filename: '.github/workflows/security.yml',
      content,
    };
  }

  private getDependabotTemplate(): ConfigTemplate {
    const content =
      `version: 2\n` +
      `updates:\n` +
      `  - package-ecosystem: "npm"\n` +
      `    directory: "/"\n` +
      `    schedule:\n` +
      `      interval: "weekly"\n` +
      `    versioning-strategy: increase\n` +
      `    open-pull-requests-limit: 10\n`;

    return {
      filename: '.github/dependabot.yml',
      content,
    };
  }

  private getNpmrcTemplate(): ConfigTemplate {
    const content =
      `registry=https://registry.npmjs.org/\n` +
      `engine-strict=true\n` +
      `strict-ssl=true\n` +
      `save-exact=false\n`;

    return {
      filename: '.npmrc',
      content,
    };
  }

  private getGithubCiTemplate(): ConfigTemplate {
    const content =
      `name: CI\n\n` +
      `on:\n` +
      `  push:\n` +
      `    branches: [main, master]\n` +
      `  pull_request:\n\n` +
      `permissions:\n` +
      `  contents: read\n\n` +
      `jobs:\n` +
      `  verify:\n` +
      `    runs-on: ubuntu-latest\n` +
      `    steps:\n` +
      `      - uses: actions/checkout@v4\n` +
      `      - uses: pnpm/action-setup@v4\n` +
      `        with:\n` +
      `          version: 9\n` +
      `      - uses: actions/setup-node@v4\n` +
      `        with:\n` +
      `          node-version: 18\n` +
      `          cache: pnpm\n` +
      `      - name: Install dependencies\n` +
      `        run: pnpm install --frozen-lockfile\n` +
      `      - name: Verify shared configs\n` +
      `        run: >\n` +
      `          pnpm exec node --input-type=module -e "import { ensureSharedConfigs } from '@kitiumai/scripts/dx';\n` +
      `            const results = await ensureSharedConfigs({ requireTsconfig: true, requireEslint: true });\n` +
      `            const issues = results.flatMap((entry) => entry.issues || []);\n` +
      `            if (issues.length) { console.error(issues.join('\\n')); process.exit(1); }\n` +
      `            console.log('Shared configs verified');"\n` +
      `      - name: Lint (via @kitiumai/scripts)\n` +
      `        run: pnpm exec node --input-type=module -e "import { lintAll } from '@kitiumai/scripts/lint'; await lintAll(false);"\n` +
      `      - name: Tests with coverage\n` +
      `        run: pnpm exec node --input-type=module -e "import { runTestsCoverage } from '@kitiumai/scripts/test'; await runTestsCoverage();"\n` +
      `      - name: Type check\n` +
      `        run: pnpm exec tsc -b --noEmit\n`;

    return {
      filename: '.github/workflows/ci.yml',
      content,
    };
  }

  private getGithubReleaseTemplate(): ConfigTemplate {
    const content =
      `name: Release\n\n` +
      `on:\n` +
      `  push:\n` +
      `    tags:\n` +
      `      - 'v*'\n` +
      `  workflow_dispatch:\n` +
      `    inputs:\n` +
      `      tag:\n` +
      `        description: 'Tag to release (e.g., v1.0.0)'\n` +
      `        required: true\n` +
      `        type: string\n\n` +
      `permissions:\n` +
      `  contents: write\n` +
      `  id-token: write\n\n` +
      `jobs:\n` +
      `  release:\n` +
      `    name: "Release"\n` +
      `    runs-on: ubuntu-latest\n` +
      `    container:\n` +
      `      image: docker.io/ashishyd/kitiumai-dev:latest\n\n` +
      `    steps:\n` +
      `      - name: Checkout\n` +
      `        uses: actions/checkout@v4\n` +
      `        with:\n` +
      `          fetch-depth: 0\n` +
      `          token: \${{ secrets.GITHUB_TOKEN }}\n\n` +
      `      - name: Setup Git\n` +
      `        run: |\n` +
      `          git config --global user.name "github-actions[bot]"\n` +
      `          git config --global user.email "github-actions[bot]@users.noreply.github.com"\n` +
      `          git config --global --add safe.directory \$GITHUB_WORKSPACE\n\n` +
      `      - name: Environment health check\n` +
      `        run: |\n` +
      `          echo "📋 Environment diagnostics:"\n` +
      `          echo "Node: \$(node --version)"\n` +
      `          echo "NPM: \$(npm --version)"\n` +
      `          echo "Git: \$(git --version)"\n` +
      `          echo "Working directory: \$(pwd)"\n` +
      `          echo "User: \$(whoami)"\n\n` +
      `      - name: Ensure pnpm available (corepack fallback)\n` +
      `        run: |\n` +
      `          if ! command -v pnpm >/dev/null 2>&1; then\n` +
      `            echo "ℹ️ pnpm not found, enabling via corepack"\n` +
      `            corepack enable\n` +
      `            corepack prepare pnpm@8 -o /usr/local/bin/pnpm\n` +
      `          fi\n\n` +
      `      - name: Get tag name\n` +
      `        id: tag\n` +
      `        run: |\n` +
      `          if [ "\${{ github.event_name }}" = "push" ]; then\n` +
      `            TAG_NAME="\${GITHUB_REF#refs/tags/}"\n` +
      `          else\n` +
      `            TAG_NAME="\${{ inputs.tag }}"\n` +
      `          fi\n` +
      `          echo "tag=\${TAG_NAME}" >> "\$GITHUB_OUTPUT"\n` +
      `          echo "Processing tag: \$TAG_NAME"\n\n` +
      `      - name: Extract version from tag\n` +
      `        id: version\n` +
      `        run: |\n` +
      `          VERSION=\$(echo "\${{ steps.tag.outputs.tag }}" | sed 's/^v//')\n` +
      `          echo "version=\${VERSION}" >> "\$GITHUB_OUTPUT"\n` +
      `          echo "Extracted version: \$VERSION"\n\n` +
      `      - name: Install dependencies\n` +
      `        run: pnpm install --frozen-lockfile --prefer-offline --ignore-scripts\n\n` +
      `      - name: Build package\n` +
      `        run: |\n` +
      `          pnpm run build\n\n` +
      `      - name: Run tests\n` +
      `        run: |\n` +
      `          pnpm run test\n\n` +
      `      - name: Run linting\n` +
      `        run: |\n` +
      `          pnpm run lint\n\n` +
      `      - name: Security checks\n` +
      `        run: |\n` +
      `          pnpm exec kitiumai-config security check || echo "⚠️ Security check failed, continuing..."\n\n` +
      `      - name: Update package version\n` +
      `        run: |\n` +
      `          CURRENT_VERSION=\$(node -p "require('./package.json').version")\n` +
      `          TARGET_VERSION="\${{ steps.version.outputs.version }}"\n\n` +
      `          if [ "\$CURRENT_VERSION" = "\$TARGET_VERSION" ]; then\n` +
      `            echo "ℹ️ Version already set to \$TARGET_VERSION, skipping npm version"\n` +
      `          else\n` +
      `            echo "📦 Updating package.json version from \$CURRENT_VERSION to \$TARGET_VERSION"\n` +
      `            npm version "\$TARGET_VERSION" --no-git-tag-version\n` +
      `          fi\n\n` +
      `      - name: Configure npm for trusted publishing\n` +
      `        env:\n` +
      `          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}\n` +
      `        run: |\n` +
      `          if [ -z "\$NPM_TOKEN" ]; then\n` +
      `            echo "❌ NPM_TOKEN is required for publishing"\n` +
      `            exit 1\n` +
      `          fi\n\n` +
      `          echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc\n` +
      `          npm config set provenance true\n` +
      `          echo "✅ npm configured for trusted publishing"\n\n` +
      `      - name: Check if version already published\n` +
      `        id: version_check\n` +
      `        run: |\n` +
      `          VERSION="\${{ steps.version.outputs.version }}"\n` +
      `          PACKAGE_NAME="@kitiumai/config"\n\n` +
      `          if npm view "\${PACKAGE_NAME}@\${VERSION}" version 2>/dev/null; then\n` +
      `            echo "already_published=true" >> "\$GITHUB_OUTPUT"\n` +
      `            echo "⏭️  Version \${VERSION} already published to npm, skipping publish step"\n` +
      `          else\n` +
      `            echo "already_published=false" >> "\$GITHUB_OUTPUT"\n` +
      `            echo "📦 Version \${VERSION} not found on npm, proceeding with publish"\n` +
      `          fi\n\n` +
      `      - name: Publish to NPM\n` +
      `        if: steps.version_check.outputs.already_published != 'true'\n` +
      `        env:\n` +
      `          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}\n` +
      `        run: |\n` +
      `          npm publish --access public --provenance\n\n` +
      `      - name: Generate SBOM\n` +
      `        continue-on-error: true\n` +
      `        run: |\n` +
      `          pnpm exec kitiumai-config observability setup || echo "⚠️ Observability setup failed"\n` +
      `          echo '{"bomFormat":"CycloneDX","specVersion":"1.5","version":1,"metadata":{"component":{"name":"@kitiumai/config","version":"\${{ steps.version.outputs.version }}"}}}' > sbom.json\n\n` +
      `      - name: Create GitHub Release\n` +
      `        id: create_release\n` +
      `        uses: actions/create-release@v1\n` +
      `        env:\n` +
      `          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\n` +
      `        with:\n` +
      `          tag_name: \${{ steps.tag.outputs.tag }}\n` +
      `          release_name: "@kitiumai/config \${{ steps.version.outputs.version }}"\n` +
      `          body: |\n` +
      `            ## 🚀 Release @kitiumai/config@\${{ steps.version.outputs.version }}\n\n` +
      `            ### What's New\n` +
      `            - Shared configuration presets for TypeScript, ESLint, Prettier, and Vitest\n` +
      `            - Enhanced CLI tool with security, testing, and governance features\n` +
      `            - Comprehensive CI/CD workflow templates\n` +
      `            - Integrated with @kitiumai/scripts for advanced automation\n\n` +
      `            ### Installation\n` +
      `            \`\`\`bash\n` +
      `            npm install @kitiumai/config@\${{ steps.version.outputs.version }}\n` +
      `            # or\n` +
      `            pnpm add @kitiumai/config@\${{ steps.version.outputs.version }}\n` +
      `            \`\`\`\n\n` +
      `            ### Usage\n` +
      `            \`\`\`bash\n` +
      `            npx @kitiumai/config setup --auto\n` +
      `            \`\`\`\n\n` +
      `            ### Documentation\n` +
      `            📖 [API Reference](https://github.com/kitiumai/config/blob/main/README.md)\n` +
      `            🏠 [Package README](https://github.com/kitiumai/config/blob/main/README.md)\n\n` +
      `            ### Security\n` +
      `            🔒 [SBOM](https://github.com/kitiumai/config/releases/download/\${{ steps.tag.outputs.tag }}/sbom.json)\n` +
      `          draft: false\n` +
      `          prerelease: false\n\n` +
      `      - name: Upload SBOM to release\n` +
      `        continue-on-error: true\n` +
      `        uses: actions/upload-release-asset@v1\n` +
      `        env:\n` +
      `          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\n` +
      `        with:\n` +
      `          upload_url: \${{ steps.create_release.outputs.upload_url }}\n` +
      `          asset_path: sbom.json\n` +
      `          asset_name: sbom.json\n` +
      `          asset_content_type: application/json\n\n` +
      `      - name: Notify on success\n` +
      `        if: success()\n` +
      `        run: |\n` +
      `          echo "✅ Successfully released @kitiumai/config@\${{ steps.version.outputs.version }}"\n` +
      `          echo "📦 Published to NPM: https://www.npmjs.com/package/@kitiumai/config/v/\${{ steps.version.outputs.version }}"\n` +
      `          echo "🏷️  GitHub Release: https://github.com/kitiumai/config/releases/tag/\${{ steps.tag.outputs.tag }}"\n\n` +
      `      - name: Notify on failure\n` +
      `        if: failure()\n` +
      `        run: |\n` +
      `          echo "❌ Failed to release @kitiumai/config@\${{ steps.version.outputs.version }}"\n` +
      `          echo "Please check the workflow logs for details"`;

    return {
      filename: `.github/workflows/release-${this.getPackageName()}.yml`,
      content,
    };
  }

  private getGithubTagReleaseTemplate(): ConfigTemplate {
    const content =
      `name: Tag Release\n\n` +
      `on:\n` +
      `  workflow_dispatch:\n` +
      `    inputs:\n` +
      `      version:\n` +
      `        description: 'Version to tag (e.g., 1.0.0, 1.1.0, 2.0.0)'\n` +
      `        required: true\n` +
      `        type: string\n` +
      `      release_type:\n` +
      `        description: 'Release type'\n` +
      `        required: true\n` +
      `        default: 'patch'\n` +
      `        type: choice\n` +
      `        options:\n` +
      `          - patch\n` +
      `          - minor\n` +
      `          - major\n\n` +
      `permissions:\n` +
      `  contents: write\n\n` +
      `jobs:\n` +
      `  tag-release:\n` +
      `    name: "Create Release Tag"\n` +
      `    runs-on: ubuntu-latest\n` +
      `    container:\n` +
      `      image: docker.io/ashishyd/kitiumai-dev:latest\n\n` +
      `    steps:\n` +
      `      - name: Checkout\n` +
      `        uses: actions/checkout@v4\n` +
      `        with:\n` +
      `          fetch-depth: 0\n` +
      `          token: \${{ secrets.GITHUB_TOKEN }}\n\n` +
      `      - name: Setup Git\n` +
      `        run: |\n` +
      `          git config --global user.name "github-actions[bot]"\n` +
      `          git config --global user.email "github-actions[bot]@users.noreply.github.com"\n` +
      `          git config --global --add safe.directory \$GITHUB_WORKSPACE\n\n` +
      `      - name: Environment health check\n` +
      `        run: |\n` +
      `          echo "📋 Environment diagnostics:"\n` +
      `          echo "Node: \$(node --version)"\n` +
      `          echo "NPM: \$(npm --version)"\n` +
      `          echo "Git: \$(git --version)"\n` +
      `          echo "Working directory: \$(pwd)"\n` +
      `          echo "User: \$(whoami)"\n\n` +
      `      - name: Ensure pnpm available (corepack fallback)\n` +
      `        run: |\n` +
      `          if ! command -v pnpm >/dev/null 2>&1; then\n` +
      `            echo "ℹ️ pnpm not found, enabling via corepack"\n` +
      `            corepack enable\n` +
      `            corepack prepare pnpm@8 -o /usr/local/bin/pnpm\n` +
      `          fi\n\n` +
      `      - name: Validate version format\n` +
      `        run: |\n` +
      `          VERSION="\${{ inputs.version }}"\n` +
      `          if [[ ! \$VERSION =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then\n` +
      `            echo "❌ Invalid version format: \$VERSION"\n` +
      `            echo "Version must be in format: x.y.z (e.g., 1.0.0, 2.1.3)"\n` +
      `            exit 1\n` +
      `          fi\n` +
      `          echo "✅ Valid version format: \$VERSION"\n\n` +
      `      - name: Check if tag already exists\n` +
      `        id: check_tag\n` +
      `        run: |\n` +
      `          TAG="v\${{ inputs.version }}"\n` +
      `          if git tag -l | grep -q "^\$TAG\$"; then\n` +
      `            echo "❌ Tag \$TAG already exists"\n` +
      `            echo "exists=true" >> "\$GITHUB_OUTPUT"\n` +
      `            exit 1\n` +
      `          else\n` +
      `            echo "✅ Tag \$TAG is available"\n` +
      `            echo "exists=false" >> "\$GITHUB_OUTPUT"\n` +
      `          fi\n\n` +
      `      - name: Install dependencies\n` +
      `        run: pnpm install --frozen-lockfile --prefer-offline --ignore-scripts\n\n` +
      `      - name: Build and test package\n` +
      `        run: |\n` +
      `          echo "🔨 Building package..."\n` +
      `          pnpm run build\n\n` +
      `          echo "🧪 Running tests..."\n` +
      `          pnpm run test\n\n` +
      `          echo "🔍 Running linting..."\n` +
      `          pnpm run lint\n\n` +
      `      - name: Update package.json version\n` +
      `        run: |\n` +
      `          CURRENT_VERSION=\$(node -p "require('./package.json').version")\n` +
      `          TARGET_VERSION="\${{ inputs.version }}"\n\n` +
      `          if [ "\$CURRENT_VERSION" = "\$TARGET_VERSION" ]; then\n` +
      `            echo "ℹ️ Version already set to \$TARGET_VERSION, skipping npm version"\n` +
      `          else\n` +
      `            echo "📦 Updating package.json version from \$CURRENT_VERSION to \$TARGET_VERSION"\n` +
      `            npm version "\$TARGET_VERSION" --no-git-tag-version\n` +
      `          fi\n\n` +
      `      - name: Commit version bump\n` +
      `        run: |\n` +
      `          if git diff --quiet "package.json"; then\n` +
      `            echo "ℹ️ No changes to commit"\n` +
      `          else\n` +
      `            git add "package.json"\n` +
      `            git commit -m "chore: bump @kitiumai/config to v\${{ inputs.version }}"\n` +
      `            git push origin main\n` +
      `          fi\n\n` +
      `      - name: Create and push tag\n` +
      `        run: |\n` +
      `          TAG="v\${{ inputs.version }}"\n` +
      `          echo "🏷️  Creating tag: \$TAG"\n` +
      `          git tag "\$TAG"\n` +
      `          git push origin "\$TAG"\n\n` +
      `      - name: Verify tag creation\n` +
      `        run: |\n` +
      `          TAG="v\${{ inputs.version }}"\n` +
      `          echo "✅ Tag created successfully: \$TAG"\n` +
      `          echo "🔗 Tag URL: https://github.com/kitiumai/config/releases/tag/\$TAG"\n` +
      `          echo ""\n` +
      `          echo "The release workflow will now be triggered automatically."\n` +
      `          echo "Monitor the 'Release @kitiumai/config' workflow for the publishing status."`;

    return {
      filename: `.github/workflows/tag-release-${this.getPackageName()}.yml`,
      content,
    };
  }

  private getCodeownersTemplate(): ConfigTemplate {
    const content =
      `# Default ownership rules\n` +
      `* @kitium-ai/maintainers\n` +
      `.github/ @kitium-ai/security\n`;

    return {
      filename: '.github/CODEOWNERS',
      content,
    };
  }

  private getPullRequestTemplate(): ConfigTemplate {
    const content =
      `## Summary\n` +
      `- [ ] Ready for review\n` +
      `- [ ] Includes tests\n` +
      `- [ ] Documentation updated\n\n` +
      `## Changes\n` +
      `- Describe the key changes\n\n` +
      `## Testing\n` +
      `- [ ] pnpm test\n` +
      `- [ ] pnpm lint\n` +
      `- [ ] pnpm run security:secrets\n`;

    return {
      filename: '.github/pull_request_template.md',
      content,
    };
  }

  private getIssueTemplateBug(): ConfigTemplate {
    const content =
      `---\n` +
      `name: "Bug report"\n` +
      `about: Report a bug or regression\n` +
      `title: "[Bug] "\n` +
      `labels: bug\n` +
      `---\n\n` +
      `## Expected behavior\n\n` +
      `## Current behavior\n\n` +
      `## Steps to reproduce\n\n` +
      `## Environment\n` +
      `- OS:\n` +
      `- Node version:\n` +
      `- Package version:\n`;

    return {
      filename: '.github/ISSUE_TEMPLATE/bug_report.md',
      content,
    };
  }

  private getIssueTemplateFeature(): ConfigTemplate {
    const content =
      `---\n` +
      `name: "Feature request"\n` +
      `about: Suggest a new feature or improvement\n` +
      `title: "[Feature] "\n` +
      `labels: enhancement\n` +
      `---\n\n` +
      `## Problem to solve\n\n` +
      `## Proposed solution\n\n` +
      `## Alternatives considered\n` +
      `- \n\n` +
      `## Additional context\n`;

    return {
      filename: '.github/ISSUE_TEMPLATE/feature_request.md',
      content,
    };
  }

  private getLintStagedTemplate(): ConfigTemplate {
    return {
      filename: 'lint-staged.config.cjs',
      content: `module.exports = require('@kitiumai/config/lint-staged.config.cjs');\n`,
    };
  }

  private getEditorconfigTemplate(): ConfigTemplate {
    return {
      filename: '.editorconfig',
      content: `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_size = 2
indent_style = space

[Makefile]
indent_style = tab
\n`,
    };
  }

  /**
   * Get package name from package.json (extracts the last part after /)
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

  /**
   * Ensure directory exists
   */
  private ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
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
}
