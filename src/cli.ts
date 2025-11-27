#!/usr/bin/env node

import { resolve } from 'path';
import chalk from 'chalk';
import { ConfigDetector } from './detector.js';
import { ConfigPrompter } from './prompter.js';
import { ConfigGenerator } from './generator.js';
import type { CliOptions } from './types.js';
import { PackageType } from './types.js';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const options = parseCliArgs(args);

    console.log(chalk.bold.cyan('\n🚀 KitiumAI Config Setup\n'));

    // Detect current configuration
    console.log(chalk.dim('Detecting package configuration...'));
    const detector = new ConfigDetector(options.targetDir);
    const detection = await detector.detect();

    console.log(chalk.green('✓ Detection complete\n'));
    console.log(chalk.blue(`  Package: ${detection.packageName}`));
    console.log(chalk.blue(`  Type: ${detection.type}`));
    console.log(chalk.blue(`  Git Repository: ${detection.hasGit ? 'Yes' : 'No'}`));
    console.log(chalk.blue(`  Suggested Groups: ${detection.suggestedGroups.join(', ')}\n`));

    // Get user choices
    let choices;
    if (options.auto || options.force) {
      console.log(chalk.yellow('Using auto/force mode (non-interactive)\n'));
      choices = {
        packageType: detection.type,
        configGroups: detection.suggestedGroups,
        overrideExisting: options.force,
        setupGitHooks: detection.hasGit,
        skipValidation: false,
        dryRun: options.dryRun,
        publicPackage:
          options.publicPackage ?? detection.type === PackageType.Library,
      };
    } else {
      const prompter = new ConfigPrompter(detection);
      console.log(chalk.cyan('Please answer the following questions:\n'));
      choices = await prompter.prompt();
      choices.publicPackage = options.publicPackage ?? choices.publicPackage;
    }

    // Generate configurations
    console.log(chalk.dim('\nGenerating configuration files...'));
    const generator = new ConfigGenerator(options.targetDir);
    const generateResult = await generator.generate(choices, options.dryRun);

    // Print results
    printResults(generateResult, choices, options.dryRun);

    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Error during setup:'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
      if (process.env['DEBUG']) {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red(String(error)));
    }
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    targetDir: process.cwd(),
    auto: false,
    dryRun: false,
    force: false,
    publicPackage: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) {
      continue;
    }

    if (arg === '--auto') {
      options.auto = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--public') {
      options.publicPackage = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.targetDir = resolve(arg);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
${chalk.bold.cyan('KitiumAI Config Setup')}

${chalk.bold('Usage:')}
  kitiumai-config [options] [target-dir]

${chalk.bold('Options:')}
  --auto              Non-interactive mode with defaults
  --dry-run          Show what would be changed without making changes
  --force            Override existing files without prompting
  --public           Mark package as public (adds publish config, governance files)
  --help, -h         Show this help message

${chalk.bold('Examples:')}
  # Interactive setup in current directory
  kitiumai-config

  # Setup in specific directory
  kitiumai-config /path/to/repo

  # Non-interactive with defaults
  kitiumai-config --auto

  # Preview changes without applying
  kitiumai-config --dry-run

${chalk.bold('Environment Variables:')}
  DEBUG              Show detailed error messages
  `);
}

/**
 * Print setup results
 */
function printResults(
  result: ReturnType<InstanceType<typeof ConfigGenerator>['generate']> extends Promise<infer T>
    ? T
    : never,
  choices: any,
  dryRun: boolean
): void {
  console.log(chalk.bold.green('\n✅ Setup Complete!\n'));

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - No files were actually created/modified\n'));
  }

  if (result.filesCreated.length > 0) {
    console.log(chalk.bold.blue('Files Created:'));
    result.filesCreated.forEach((file) => {
      console.log(chalk.green(`  ✓ ${file}`));
    });
    console.log();
  }

  if (result.filesModified.length > 0) {
    console.log(chalk.bold.blue('Files Modified:'));
    result.filesModified.forEach((file) => {
      console.log(chalk.yellow(`  ⚡ ${file}`));
    });
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log(chalk.bold.yellow('Warnings:'));
    result.warnings.forEach((warning) => {
      console.log(chalk.yellow(`  ⚠️  ${warning}`));
    });
    console.log();
  }

  console.log(chalk.bold('Summary:'));
  console.log(`  Package Type: ${chalk.cyan(choices.packageType)}`);
  console.log(`  Config Groups: ${chalk.cyan(choices.configGroups.join(', '))}`);
  console.log(`  Total Files: ${result.filesCreated.length + result.filesModified.length}`);

  console.log(chalk.dim('\nNext steps:'));
  console.log(chalk.dim('  1. Review the generated configuration files'));
  console.log(chalk.dim('  2. Install dependencies: pnpm install'));
  console.log(chalk.dim('  3. Commit changes: git add . && git commit -m "chore: setup configs"'));
}

// Run main function
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
