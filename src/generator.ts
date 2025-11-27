import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ConfigFile, ConfigGroup, SetupChoices, configGroupMap } from './types.js';

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

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = targetDir;
    this.templateScripts = this.loadTemplateScripts();
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
        // Filter out Husky if git hooks setup is not requested
        const filteredFiles = group === ConfigGroup.GitHooks && !choices.setupGitHooks
          ? groupFiles.filter((file) => file !== ConfigFile.Husky)
          : groupFiles;
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
