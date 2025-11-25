import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
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

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = targetDir;
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
