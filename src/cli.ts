#!/usr/bin/env node

import { resolve } from 'path';
import chalk from 'chalk';
import { PackageType, type CliOptions, ConfigGroup, TestFramework } from './types.js';
import { ConfigDetector } from './detector.js';
import { ConfigPrompter } from './prompter.js';
import { ConfigPrompterRefactored } from './prompter-refactored.js';
import { ConfigGenerator } from './generator.js';
import { ConfigGeneratorRefactored } from './generator-refactored.js';
import {
  scanSecrets,
  auditDependencies,
  checkPolicyCompliance,
  runTests,
  runTestsCoverage,
  lintAll,
  fixFormat,
  getCurrentBranch,
  isWorkingDirectoryClean,
  getStatus,
  validateCommits,
  ensureSharedConfigs,
  checkCodeownersCoverage,
  bootstrapStructuredLogging,
  scanPii,
  generateLintReport,
  log,
} from '@kitiumai/scripts';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      printHelp();
      process.exit(0);
    }

    const command = args[0];

    switch (command) {
      case 'setup':
        await runSetup(args.slice(1));
        break;
      case 'security':
        await runSecurity(args.slice(1));
        break;
      case 'test':
        await runTest(args.slice(1));
        break;
      case 'lint':
        await runLint(args.slice(1));
        break;
      case 'git':
        await runGit(args.slice(1));
        break;
      case 'ci':
        await runCI(args.slice(1));
        break;
      case 'governance':
        await runGovernance(args.slice(1));
        break;
      case 'observability':
        await runObservability(args.slice(1));
        break;
      case 'health':
        await runHealth();
        break;
      default:
        // Legacy behavior: treat as setup command
        await runSetup(args);
        break;
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'));
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
 * Run setup command (original functionality)
 */
async function runSetup(args: string[]): Promise<void> {
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
    // Auto mode: only setup lint, prettier, vitest, and pipelines
    choices = {
      packageType: detection.type,
      configGroups: [ConfigGroup.Core, ConfigGroup.Testing, ConfigGroup.Ci], // Core (lint/prettier), Testing (vitest only), CI (pipelines)
      selectionMode: 'group' as const,
      overrideExisting: options.force,
      setupGitHooks: detection.hasGit,
      skipValidation: false,
      dryRun: options.dryRun,
      publicPackage: options.publicPackage ?? detection.type === PackageType.Library,
      enableUiConfigs: false, // No UI configs (no Playwright) in auto mode
      testFramework: options.testFramework, // Use specified test framework, defaults to Vitest
    };
  } else {
    // Use refactored prompter with granular control support
    const useRefactored = process.env['USE_REFACTORED'] !== 'false';

    if (useRefactored) {
      const prompter = new ConfigPrompterRefactored(detection);
      console.log(chalk.cyan('Please answer the following questions:\n'));
      choices = await prompter.prompt(options.granular);
    } else {
      const prompter = new ConfigPrompter(detection);
      console.log(chalk.cyan('Please answer the following questions:\n'));
      choices = await prompter.prompt();
      choices.selectionMode = 'group';
    }

    choices.publicPackage = options.publicPackage ?? choices.publicPackage;
    choices.enableUiConfigs = options.ui || choices.enableUiConfigs;
    choices.testFramework = options.testFramework; // Override with CLI option if specified
  }

  // Generate configurations
  console.log(chalk.dim('\nGenerating configuration files...'));
  const useRefactored = process.env['USE_REFACTORED'] !== 'false';
  const generateResult = useRefactored
    ? await new ConfigGeneratorRefactored(options.targetDir).generate(choices, options.dryRun)
    : await new ConfigGenerator(options.targetDir).generate(choices, options.dryRun);

  // Print results
  printResults(generateResult, choices, options.dryRun);
}

/**
 * Run security command
 */
async function runSecurity(args: string[]): Promise<void> {
  const subcommand = args[0] || 'check';

  console.log(chalk.bold.cyan('\n🔒 KitiumAI Security\n'));

  switch (subcommand) {
    case 'check':
      await runSecurityCheck();
      break;
    case 'secrets':
      await runSecretScan();
      break;
    case 'audit':
      await runDependencyAudit();
      break;
    case 'pii':
      await runPIIScan();
      break;
    default:
      console.log(chalk.red(`Unknown security subcommand: ${subcommand}`));
      console.log(chalk.dim('Available: check, secrets, audit, pii'));
      process.exit(1);
  }
}

/**
 * Run security check
 */
async function runSecurityCheck(): Promise<void> {
  console.log(chalk.dim('Running comprehensive security checks...'));

  try {
    log('info', 'Scanning for secrets...');
    await scanSecrets({ failOnFinding: false });

    log('info', 'Auditing dependencies...');
    await auditDependencies({ severityThreshold: 'moderate' });

    log('info', 'Checking policy compliance...');
    await checkPolicyCompliance();

    log('info', 'Scanning for PII...');
    await scanPii({ roots: ['src', 'config'] });

    console.log(chalk.green('✓ Security checks completed'));
  } catch (error) {
    console.log(chalk.red('✗ Security issues found'));
    throw error;
  }
}

/**
 * Run secret scan
 */
async function runSecretScan(): Promise<void> {
  console.log(chalk.dim('Scanning for secrets...'));

  try {
    await scanSecrets({ failOnFinding: true });
    console.log(chalk.green('✓ No secrets found'));
  } catch (error) {
    console.log(chalk.red('✗ Secrets detected'));
    throw error;
  }
}

/**
 * Run dependency audit
 */
async function runDependencyAudit(): Promise<void> {
  console.log(chalk.dim('Auditing dependencies...'));

  try {
    await auditDependencies({ severityThreshold: 'high' });
    console.log(chalk.green('✓ No vulnerabilities found'));
  } catch (error) {
    console.log(chalk.red('✗ Vulnerabilities detected'));
    throw error;
  }
}

/**
 * Run PII scan
 */
async function runPIIScan(): Promise<void> {
  console.log(chalk.dim('Scanning for personally identifiable information...'));

  try {
    const result = await scanPii({ roots: ['src', 'config', 'data'] });
    if (result.findings && result.findings.length > 0) {
      console.log(chalk.red(`✗ Found ${result.findings.length} PII instances`));
      throw new Error('PII detected in codebase');
    }
    console.log(chalk.green('✓ No PII found'));
  } catch (error) {
    throw error;
  }
}

/**
 * Run test command
 */
async function runTest(args: string[]): Promise<void> {
  const subcommand = args[0] || 'run';

  console.log(chalk.bold.cyan('\n🧪 KitiumAI Testing\n'));

  switch (subcommand) {
    case 'run':
      await runTests({ coverage: false });
      break;
    case 'coverage':
      await runTestsCoverage();
      break;
    case 'watch':
      await runTests({ watch: true });
      break;
    default:
      console.log(chalk.red(`Unknown test subcommand: ${subcommand}`));
      console.log(chalk.dim('Available: run, coverage, watch'));
      process.exit(1);
  }
}

/**
 * Run lint command
 */
async function runLint(args: string[]): Promise<void> {
  const subcommand = args[0] || 'check';

  console.log(chalk.bold.cyan('\n🔍 KitiumAI Linting\n'));

  switch (subcommand) {
    case 'check':
      await lintAll(false);
      break;
    case 'fix':
      await lintAll(true);
      break;
    case 'format':
      await fixFormat();
      break;
    case 'report':
      await generateLintReport();
      break;
    default:
      console.log(chalk.red(`Unknown lint subcommand: ${subcommand}`));
      console.log(chalk.dim('Available: check, fix, format, report'));
      process.exit(1);
  }
}

/**
 * Run git command
 */
async function runGit(args: string[]): Promise<void> {
  const subcommand = args[0] || 'status';

  console.log(chalk.bold.cyan('\n📋 KitiumAI Git Operations\n'));

  switch (subcommand) {
    case 'status':
      const status = await getStatus();
      console.log(status.stdout);
      break;
    case 'branch':
      const branch = await getCurrentBranch();
      console.log(`Current branch: ${branch}`);
      break;
    case 'clean':
      const isClean = await isWorkingDirectoryClean();
      console.log(`Working directory is ${isClean ? 'clean' : 'dirty'}`);
      break;
    case 'validate':
      await validateCommits();
      console.log(chalk.green('✓ Commits are valid'));
      break;
    default:
      console.log(chalk.red(`Unknown git subcommand: ${subcommand}`));
      console.log(chalk.dim('Available: status, branch, clean, validate'));
      process.exit(1);
  }
}

/**
 * Run CI command
 */
async function runCI(args: string[]): Promise<void> {
  const subcommand = args[0] || 'check';

  console.log(chalk.bold.cyan('\n🔄 KitiumAI CI/CD\n'));

  switch (subcommand) {
    case 'check':
      await runCICheck();
      break;
    case 'setup':
      await runCISetup();
      break;
    case 'health':
      await runCIHealth();
      break;
    default:
      console.log(chalk.red(`Unknown CI subcommand: ${subcommand}`));
      console.log(chalk.dim('Available: check, setup, health'));
      process.exit(1);
  }
}

/**
 * Run CI check
 */
async function runCICheck(): Promise<void> {
  console.log(chalk.dim('Running CI checks...'));

  try {
    await lintAll(false);
    await runTests({ coverage: true });
    await scanSecrets({ failOnFinding: true });
    await auditDependencies({ severityThreshold: 'moderate' });

    console.log(chalk.green('✓ All CI checks passed'));
  } catch (error) {
    console.log(chalk.red('✗ CI checks failed'));
    throw error;
  }
}

/**
 * Run CI setup
 */
async function runCISetup(): Promise<void> {
  console.log(chalk.dim('Setting up CI/CD configurations...'));

  // This would generate CI workflow files
  // For now, just show what would be done
  console.log(chalk.blue('Would generate:'));
  console.log(chalk.dim('  - .github/workflows/ci.yml'));
  console.log(chalk.dim('  - .github/workflows/release.yml'));
  console.log(chalk.dim('  - .github/workflows/security.yml'));
  console.log(chalk.green('✓ CI setup template shown (implementation pending)'));
}

/**
 * Run CI health check
 */
async function runCIHealth(): Promise<void> {
  console.log(chalk.dim('Checking CI health...'));

  try {
    // Basic health check - check if we're in a git repo and working directory is clean
    const isClean = await isWorkingDirectoryClean();
    if (!isClean) {
      console.log(chalk.red('✗ Working directory is not clean'));
      throw new Error('Working directory not clean');
    }
    console.log(chalk.green('✓ CI health check passed'));
  } catch (error) {
    console.log(chalk.red('✗ CI health check failed'));
    throw error;
  }
}

/**
 * Run governance command
 */
async function runGovernance(args: string[]): Promise<void> {
  const subcommand = args[0] || 'check';

  console.log(chalk.bold.cyan('\n📜 KitiumAI Governance\n'));

  switch (subcommand) {
    case 'check':
      await runGovernanceCheck();
      break;
    case 'setup':
      await runGovernanceSetup();
      break;
    default:
      console.log(chalk.red(`Unknown governance subcommand: ${subcommand}`));
      console.log(chalk.dim('Available: check, setup'));
      process.exit(1);
  }
}

/**
 * Run governance check
 */
async function runGovernanceCheck(): Promise<void> {
  console.log(chalk.dim('Running governance checks...'));

  try {
    await ensureSharedConfigs();
    await checkCodeownersCoverage();
    await validateCommits();

    console.log(chalk.green('✓ Governance checks passed'));
  } catch (error) {
    console.log(chalk.red('✗ Governance checks failed'));
    throw error;
  }
}

/**
 * Run governance setup
 */
async function runGovernanceSetup(): Promise<void> {
  console.log(chalk.dim('Setting up governance configurations...'));

  // This would generate governance files
  // For now, just show what would be done
  console.log(chalk.blue('Would generate:'));
  console.log(chalk.dim('  - CODEOWNERS'));
  console.log(chalk.dim('  - .github/PULL_REQUEST_TEMPLATE.md'));
  console.log(chalk.dim('  - .github/ISSUE_TEMPLATE/*.md'));
  console.log(chalk.dim('  - GOVERNANCE.md'));
  console.log(chalk.green('✓ Governance setup template shown (implementation pending)'));
}

/**
 * Run observability command
 */
async function runObservability(args: string[]): Promise<void> {
  const subcommand = args[0] || 'setup';

  console.log(chalk.bold.cyan('\n📊 KitiumAI Observability\n'));

  switch (subcommand) {
    case 'setup':
      await bootstrapStructuredLogging({
        serviceName: 'kitiumai-config',
        includeExample: true,
      });
      console.log(chalk.green('✓ Observability setup completed'));
      break;
    default:
      console.log(chalk.red(`Unknown observability subcommand: ${subcommand}`));
      console.log(chalk.dim('Available: setup'));
      process.exit(1);
  }
}

/**
 * Run health command
 */
async function runHealth(): Promise<void> {
  console.log(chalk.bold.cyan('\n❤️  KitiumAI Health Check\n'));

  try {
    const isClean = await isWorkingDirectoryClean();
    console.log(`${isClean ? '✅' : '❌'} Git working directory: ${isClean ? 'clean' : 'dirty'}`);

    // Add more health checks here
    console.log('✅ Health check completed');
  } catch (error) {
    console.log('❌ Health check failed');
    throw error;
  }
}

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    targetDir: process.cwd(),
    auto: false,
    dryRun: false,
    force: false,
    publicPackage: false,
    ui: false,
    testFramework: TestFramework.Vitest, // Default to Vitest
    granular: false,
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
    } else if (arg === '--ui') {
      options.ui = true;
    } else if (arg === '--granular') {
      options.granular = true;
    } else if (arg === '--jest') {
      options.testFramework = TestFramework.Jest;
    } else if (arg === '--vitest') {
      options.testFramework = TestFramework.Vitest;
    } else if (arg === '--mocha') {
      options.testFramework = TestFramework.Mocha;
    } else if (arg === '--jasmine') {
      options.testFramework = TestFramework.Jasmine;
    } else if (arg === '--ava') {
      options.testFramework = TestFramework.Ava;
    } else if (arg === '--tape') {
      options.testFramework = TestFramework.Tape;
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
${chalk.bold.cyan('KitiumAI Config CLI')}

${chalk.bold('Usage:')}
  kitiumai-config <command> [options] [target-dir]

${chalk.bold('Commands:')}
  ${chalk.cyan('setup')}        Setup configuration files (default)
  ${chalk.cyan('security')}     Security scanning and compliance
  ${chalk.cyan('test')}         Run tests with various options
  ${chalk.cyan('lint')}         Code linting and formatting
  ${chalk.cyan('git')}          Git operations and validation
  ${chalk.cyan('ci')}           CI/CD setup and health checks
  ${chalk.cyan('governance')}   Governance and compliance checks
  ${chalk.cyan('observability')} Setup logging and monitoring
  ${chalk.cyan('health')}       Health checks for the project

${chalk.bold('Setup Options:')}
  --auto              Non-interactive mode with defaults
  --dry-run          Show what would be changed without making changes
  --force            Override existing files without prompting
  --public           Mark package as public (adds publish config, governance files)
  --ui               Include UI tooling (Playwright e2e, Storybook docs) in auto/force mode
  --granular         Enable granular file selection mode (choose individual config files)
  --vitest           Use Vitest for testing (default)
  --jest             Use Jest for testing
  --mocha            Use Mocha for testing
  --jasmine          Use Jasmine for testing
  --ava              Use AVA for testing
  --tape             Use Tape for testing
  --help, -h         Show this help message

${chalk.bold('Security Subcommands:')}
  check              Run all security checks
  secrets            Scan for secrets only
  audit              Audit dependencies only
  pii                Scan for PII only

${chalk.bold('Test Subcommands:')}
  run                Run tests
  coverage           Run tests with coverage
  watch              Run tests in watch mode

${chalk.bold('Lint Subcommands:')}
  check              Check code quality
  fix                Fix linting issues
  format             Format code
  report             Generate lint report

${chalk.bold('Git Subcommands:')}
  status             Show git status
  branch             Show current branch
  clean              Check if working directory is clean
  validate           Validate commit messages

${chalk.bold('CI Subcommands:')}
  check              Run CI checks
  setup              Setup CI/CD configurations
  health             Check CI health

${chalk.bold('Governance Subcommands:')}
  check              Run governance checks
  setup              Setup governance configurations

${chalk.bold('Examples:')}
  # Setup configs interactively
  kitiumai-config

  # Setup configs non-interactively
  kitiumai-config setup --auto

  # Run security checks
  kitiumai-config security check

  # Run tests with coverage
  kitiumai-config test coverage

  # Fix linting issues
  kitiumai-config lint fix

  # Check git status
  kitiumai-config git status

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
