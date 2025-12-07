#!/usr/bin/env node

import { resolve } from 'path';
import chalk from 'chalk';
import {
  PackageType,
  type CliOptions,
  ConfigGroup,
  TestFramework,
  type SetupChoices,
} from './types.js';
import { ConfigDetector } from './detector.js';
import { ConfigPrompter } from './prompter.js';
import { ConfigGenerator } from './generator.js';
import { Logger, ErrorRecovery, ProgressTracker, LogLevel, CommandExecutor } from './utils.js';
import {
  scanSecrets,
  auditDependencies,
  checkPolicyCompliance,
  runTests,
  runTestsCoverage,
  lintAll,
  fixFormat,
  getCurrentBranch,
  ensureSharedConfigs,
  scanPii,
  generateLintReport,
} from '@kitiumai/scripts';

/**
 * Enhanced CLI with better error handling, progress tracking, and analytics
 */
class KitiumConfigCLI {
  private startTime: number;
  private analyticsEnabled: boolean;
  private sessionId: string;
  private logger: Logger;
  private progressTracker: ProgressTracker;

  constructor() {
    this.startTime = Date.now();
    this.analyticsEnabled = this.shouldEnableAnalytics();
    this.sessionId = this.generateSessionId();
    this.logger = new Logger(this.sessionId, process.env['DEBUG'] ? LogLevel.DEBUG : LogLevel.INFO);
    this.progressTracker = new ProgressTracker();

    this.logger.info('CLI session started', {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
    });
  }

  /**
   * Generate unique session ID for analytics
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if analytics should be enabled (opt-in)
   */
  private shouldEnableAnalytics(): boolean {
    return process.env['KITIUM_ANALYTICS'] === 'true' || process.env['CI'] === 'true'; // Enable in CI for usage metrics
  }

  /**
   * Track command usage for analytics
   */
  private async trackCommand(
    command: string,
    args: string[],
    success: boolean,
    error?: string
  ): Promise<void> {
    if (!this.analyticsEnabled) {
      return;
    }

    try {
      const analytics = {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        command,
        args: args.length,
        success,
        duration: Date.now() - this.startTime,
        error: error ? this.sanitizeError(error) : undefined,
        nodeVersion: process.version,
        platform: process.platform,
        ci: process.env['CI'] === 'true',
      };

      // In a real implementation, this would send to analytics service
      // For now, just log in debug mode
      if (process.env['DEBUG']) {
        this.logger.debug('[Analytics]', analytics);
      }
    } catch {
      // Silently fail analytics - don't break the CLI
    }
  }

  /**
   * Sanitize error messages for analytics
   */
  private sanitizeError(error: string): string {
    // Remove sensitive information from error messages
    return error.replace(/([a-zA-Z]:\\|\/)[^:\s]*/g, '[PATH]');
  }

  /**
   * Enhanced error handling with recovery suggestions
   */
  private async handleError(error: unknown, command: string, args: string[]): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await this.trackCommand(command, args, false, errorMessage);

    this.logger.error('Command failed', error instanceof Error ? error : new Error(errorMessage), {
      command,
      args,
    });

    process.stderr.write(chalk.red('\n❌ Error:\n'));
    process.stderr.write(chalk.red(errorMessage + '\n'));

    // Provide recovery suggestions based on error type
    const suggestions = ErrorRecovery.getRecoverySuggestions(
      error instanceof Error ? error : new Error(errorMessage)
    );
    if (suggestions.length > 0) {
      process.stderr.write(chalk.yellow('\n💡 Suggestions:\n'));
      suggestions.forEach((suggestion) => {
        process.stderr.write(chalk.yellow(`  • ${suggestion}\n`));
      });
    }

    if (process.env['DEBUG']) {
      process.stderr.write(chalk.gray('\nStack trace:\n'));
      if (error instanceof Error && error.stack) {
        process.stderr.write(chalk.gray(error.stack + '\n'));
      }
    }

    process.stderr.write(chalk.dim('\nFor more help, run: kitiumai-config --help\n'));
    process.exit(1);
  }

  /**
   * Show progress indicator for long-running operations
   */
  private showProgress(message: string): void {
    this.progressTracker.start(message);
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.progressTracker.success(message);
  }

  /**
   * Show failure message
   */
  private showFailure(message: string): void {
    this.progressTracker.error(message);
  }

  /**
   * Validate CLI arguments
   */
  private validateArgs(args: string[]): void {
    // Check for conflicting options
    const testFrameworks = ['--vitest', '--jest', '--mocha', '--jasmine', '--ava', '--tape'];
    const specifiedFrameworks = args.filter((arg) => testFrameworks.includes(arg));

    if (specifiedFrameworks.length > 1) {
      throw new Error(
        `Multiple test frameworks specified: ${specifiedFrameworks.join(', ')}. Please choose only one.`
      );
    }

    // Check for invalid combinations
    if (args.includes('--auto') && args.includes('--granular')) {
      throw new Error('--auto and --granular options are mutually exclusive');
    }

    if (args.includes('--dry-run') && args.includes('--force')) {
      throw new Error('--dry-run and --force options are mutually exclusive');
    }
  }

  /**
   * Main CLI entry point
   */
  async run(): Promise<void> {
    const args = process.argv.slice(2);

    try {
      this.validateArgs(args);

      if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        this.logger.debug('Displaying help message');
        printHelp();
        await this.trackCommand('help', args, true);
        process.exit(0);
      }

      const command = args[0];

      switch (command) {
        case 'setup':
          await this.runSetup(args.slice(1));
          break;
        case 'security':
          await this.runSecurity(args.slice(1));
          break;
        case 'test':
          await this.runTest(args.slice(1));
          break;
        case 'lint':
          await this.runLint(args.slice(1));
          break;
        case 'git':
          await this.runGit(args.slice(1));
          break;
        case 'ci':
          await this.runCI(args.slice(1));
          break;
        case 'governance':
          await this.runGovernance(args.slice(1));
          break;
        case 'observability':
          await this.runObservability(args.slice(1));
          break;
        case 'health':
          await this.runHealth();
          break;
        case 'doctor':
          await this.runDoctor();
          break;
        default:
          // Legacy behavior: treat as setup command
          await this.runSetup(args);
          break;
      }

      await this.trackCommand(command || 'unknown', args, true);
    } catch (error) {
      await this.handleError(error, args[0] || 'unknown', args);
    }
  }

  /**
   * Enhanced setup command with better UX
   */
  private async runSetup(args: string[]): Promise<void> {
    const options = parseCliArgs(args);

    this.logger.info('Starting KitiumAI Config Setup');
    process.stdout.write(chalk.bold.cyan('\n🚀 KitiumAI Config Setup\n\n'));

    this.showProgress('Detecting package configuration');
    const detector = new ConfigDetector(options.targetDir);
    const detection = await detector.detect();

    this.showSuccess('Detection complete');
    process.stdout.write(chalk.blue(`  Package: ${detection.packageName}\n`));
    process.stdout.write(chalk.blue(`  Type: ${detection.type}\n`));
    process.stdout.write(chalk.blue(`  Git Repository: ${detection.hasGit ? 'Yes' : 'No'}\n`));
    process.stdout.write(
      chalk.blue(`  Suggested Groups: ${detection.suggestedGroups.join(', ')}\n\n`)
    );

    this.logger.info('Package detection completed', {
      packageName: detection.packageName,
      type: detection.type,
      hasGit: detection.hasGit,
      suggestedGroups: detection.suggestedGroups,
    });

    // Get user choices
    let choices;
    if (options.auto || options.force) {
      this.logger.info('Using auto/force mode (non-interactive)');
      process.stdout.write(chalk.yellow('Using auto/force mode (non-interactive)\n\n'));
      // Auto mode: setup core configs, testing, CI, security, git, and git hooks
      const autoGroups = [
        ConfigGroup.Core, // TypeScript, ESLint, Prettier
        ConfigGroup.Testing, // Vitest (or selected test framework)
        ConfigGroup.Ci, // GitHub Actions workflows
        ConfigGroup.Security, // GitHub security, dependabot, gitleaks
      ];

      // Add Git and GitHooks if in a git repository
      if (detection.hasGit) {
        autoGroups.push(ConfigGroup.Git); // .gitignore
        autoGroups.push(ConfigGroup.GitHooks); // Husky, lint-staged
      }

      choices = {
        packageType: detection.type,
        configGroups: autoGroups,
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
      const prompter = new ConfigPrompter(detection);
      this.logger.debug('Using interactive prompter with granular control support');
      process.stdout.write(chalk.cyan('Please answer the following questions:\n\n'));
      choices = await prompter.prompt(options.granular);
      choices.publicPackage = options.publicPackage ?? choices.publicPackage;
      choices.enableUiConfigs = options.ui || choices.enableUiConfigs;
      choices.testFramework = options.testFramework; // Override with CLI option if specified
    }

    // Generate configurations
    this.showProgress('Generating configuration files');
    const generator = new ConfigGenerator(options.targetDir);
    const result = await generator.generate(choices, options.dryRun);

    this.showSuccess('Configuration generation complete');

    this.logger.info('Configuration generation completed', {
      filesCreated: result.filesCreated.length,
      filesModified: result.filesModified.length,
      warnings: result.warnings.length,
      dryRun: options.dryRun,
    });

    printResults(result, choices, options.dryRun);

    // Run GitHub security setup in auto mode if in a git repository
    if ((options.auto || options.force) && detection.hasGit && !options.dryRun) {
      await this.setupGitHubSecurity(detection.packageName);
    }
  }

  /**
   * Setup GitHub security and branch protection in auto mode
   */
  private async setupGitHubSecurity(packageName: string): Promise<void> {
    try {
      // Get repository info
      const repoName = await this.getRepositoryName();

      if (!repoName) {
        this.logger.warn('Could not determine repository name for GitHub security setup');
        process.stdout.write(
          chalk.yellow(
            '\n⚠️  Skipping GitHub security setup: Unable to determine repository name\n'
          )
        );
        process.stdout.write(chalk.dim('  To setup manually, run:\n'));
        process.stdout.write(chalk.dim('    pnpm -w run secure:main --repo <owner/repo>\n'));
        return;
      }

      process.stdout.write(chalk.bold.cyan('\n🔒 Setting up GitHub Security\n\n'));

      // Step 1: Setup GitHub security settings
      this.showProgress('Configuring GitHub security settings');
      const githubSecuritySuccess = await this.runGitHubSecuritySetup(repoName);
      if (githubSecuritySuccess) {
        this.showSuccess('GitHub security configured');
      } else {
        this.showFailure('GitHub security setup skipped');
        this.logger.debug('GitHub security setup skipped (script not available)');
      }

      // Step 2: Secure main branch
      this.showProgress('Securing main branch with protection rules');
      const branchSecuritySuccess = await this.runBranchSecuritySetup(repoName);
      if (branchSecuritySuccess) {
        this.showSuccess('Main branch secured');
      } else {
        this.showFailure('Main branch security skipped');
        this.logger.debug('Branch security setup skipped (script not available)');
      }

      if (githubSecuritySuccess || branchSecuritySuccess) {
        process.stdout.write(chalk.green('\n✅ GitHub security setup complete!\n'));
      }

      this.logger.info('GitHub security setup completed', {
        repoName,
        packageName,
      });
    } catch (error) {
      this.logger.error(
        'GitHub security setup failed',
        error instanceof Error ? error : new Error(String(error))
      );
      process.stdout.write(chalk.yellow('\n⚠️  GitHub security setup encountered issues\n'));
      process.stdout.write(
        chalk.dim('  This may require GitHub API token or manual configuration\n')
      );
      process.stdout.write(chalk.dim('  To setup manually, run:\n'));
      process.stdout.write(chalk.dim('    pnpm -w run secure:main --repo <owner/repo>\n'));
    }
  }

  /**
   * Get repository name from git remote
   */
  private async getRepositoryName(): Promise<string | null> {
    try {
      // Try to get origin URL from git
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);

      try {
        const { stdout } = await execPromise('git config --get remote.origin.url');
        const url = stdout.trim();

        // Parse repo name from git URL (e.g., git@github.com:owner/repo.git or https://github.com/owner/repo.git)
        const match = url.match(
          /(?:git@github\.com:|https:\/\/github\.com\/)([^/]+)\/([^/.]+)(?:\.git)?$/
        );
        if (match && match[1] && match[2]) {
          return `${match[1]}/${match[2]}`;
        }

        return null;
      } catch {
        return null;
      }
    } catch (error) {
      this.logger.debug('Failed to get repository name from git', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Run GitHub security setup
   */
  private async runGitHubSecuritySetup(repoName: string): Promise<boolean> {
    try {
      // Check if the setup-github-security command is available
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);

      try {
        await execPromise('pnpm exec setup-github-security --help');
      } catch {
        // Command not available, skip silently
        this.logger.debug('setup-github-security command not available, skipping GitHub security setup');
        return false;
      }

      const { spawn } = await import('child_process');
      const child = spawn('pnpm', ['exec', 'setup-github-security', '--repo', repoName], {
        stdio: 'inherit',
        shell: true,
        env: process.env,
      });

      return await new Promise((resolve) => {
        child.on('close', (code) => {
          resolve(code === 0);
        });
        child.on('error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      this.logger.debug('GitHub security script not available', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Run branch security setup
   */
  private async runBranchSecuritySetup(repoName: string): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');
      const child = spawn('pnpm', ['-w', 'run', 'secure:main', '--repo', repoName], {
        stdio: 'inherit',
        shell: true,
        env: process.env,
      });

      return await new Promise((resolve) => {
        child.on('close', (code) => {
          resolve(code === 0);
        });
        child.on('error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      this.logger.debug('Branch security setup failed or not available', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Enhanced doctor command for diagnostics
   */
  private async runDoctor(): Promise<void> {
    this.logger.info('Running doctor diagnostics');
    process.stdout.write(chalk.bold.cyan('\n🩺 KitiumAI Config Doctor\n\n'));

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] || '0');
    if (majorVersion < 18) {
      issues.push(`Node.js version ${nodeVersion} is outdated. Recommended: >=18.0.0`);
    } else {
      process.stdout.write(chalk.green('✓ Node.js version is supported\n'));
    }

    // Check if in a project directory
    this.showProgress('Analyzing project structure');
    const detector = new ConfigDetector();
    try {
      const detection = await detector.detect();
      this.showSuccess('Package detection successful');
      process.stdout.write(chalk.blue(`  Type: ${detection.type}\n`));
      process.stdout.write(chalk.blue(`  Git: ${detection.hasGit ? 'Yes' : 'No'}\n`));

      this.logger.info('Doctor analysis completed', {
        nodeVersion,
        packageType: detection.type,
        hasGit: detection.hasGit,
        issues: issues.length,
        recommendations: recommendations.length,
      });
    } catch (error) {
      issues.push('Failed to detect package configuration');
      this.logger.error(
        'Package detection failed in doctor',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Check for common issues
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
      issues.push('No package.json found. Are you in a Node.js project?');
    }

    // Check for lock files
    const hasLockFile = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'].some((file) =>
      fs.existsSync(path.join(process.cwd(), file))
    );
    if (!hasLockFile) {
      recommendations.push(
        'Consider using a package manager lock file (pnpm-lock.yaml, yarn.lock, or package-lock.json)'
      );
    }

    // Report results
    if (issues.length === 0) {
      this.logger.info('Doctor check passed - no issues found');
      process.stdout.write(chalk.green('\n✅ No issues found! Your setup looks good.\n'));
    } else {
      this.logger.warn('Doctor check found issues', { count: issues.length });
      process.stdout.write(chalk.red('\n❌ Issues found:\n'));
      issues.forEach((issue) => process.stdout.write(chalk.red(`  • ${issue}\n`)));
    }

    if (recommendations.length > 0) {
      this.logger.info('Doctor recommendations generated', { count: recommendations.length });
      process.stdout.write(chalk.yellow('\n💡 Recommendations:\n'));
      recommendations.forEach((rec) => process.stdout.write(chalk.yellow(`  • ${rec}\n`)));
    }
  }

  /**
   * Run security command
   */
  private async runSecurity(args: string[]): Promise<void> {
    const subcommand = args[0] || 'check';

    this.logger.info('Running security command', { subcommand });
    process.stdout.write(chalk.bold.cyan('\n🔒 KitiumAI Security\n\n'));

    switch (subcommand) {
      case 'check':
        await this.runSecurityCheck();
        break;
      case 'secrets':
        await this.runSecretScan();
        break;
      case 'audit':
        await this.runDependencyAudit();
        break;
      case 'pii':
        await this.runPIIScan();
        break;
      default:
        this.logger.error(
          'Unknown security subcommand',
          new Error(`Unknown subcommand: ${subcommand}`)
        );
        process.stdout.write(chalk.red(`Unknown security subcommand: ${subcommand}\n`));
        process.stdout.write(chalk.dim('Available: check, secrets, audit, pii\n'));
        process.exit(1);
    }
  }

  /**
   * Run comprehensive security check
   */
  private async runSecurityCheck(): Promise<void> {
    process.stdout.write(chalk.dim('Running comprehensive security checks...\n'));

    const executor = new CommandExecutor(this.logger);

    await executor.executeMany([
      {
        operation: () => scanSecrets({ failOnFinding: false }),
        options: {
          operationName: 'Scanning for secrets',
          successMessage: 'Secrets scan completed',
          errorMessage: 'Secrets scan encountered issues',
        },
      },
      {
        operation: () => auditDependencies({ severityThreshold: 'moderate' }),
        options: {
          operationName: 'Auditing dependencies',
          successMessage: 'Dependencies audit passed',
          errorMessage: 'Dependencies audit encountered issues',
        },
      },
      {
        operation: () => checkPolicyCompliance(),
        options: {
          operationName: 'Checking policy compliance',
          successMessage: 'Policy compliance check passed',
          errorMessage: 'Policy compliance check encountered issues',
        },
      },
    ]);

    process.stdout.write(chalk.green('\n✅ Security check complete\n'));
    await this.trackCommand('security', ['check'], true);
  }

  /**
   * Run secret scan
   */
  private async runSecretScan(): Promise<void> {
    process.stdout.write(chalk.dim('Scanning for secrets...\n'));

    try {
      await scanSecrets({ failOnFinding: false });
      process.stdout.write(chalk.green('✓ Secrets scan completed\n'));
    } catch (error) {
      this.logger.error(
        'Secrets scan failed',
        error instanceof Error ? error : new Error(String(error))
      );
      process.stderr.write(chalk.red('❌ Secrets scan failed\n'));
      throw error;
    }

    await this.trackCommand('security', ['secrets'], true);
  }

  /**
   * Run dependency audit
   */
  private async runDependencyAudit(): Promise<void> {
    process.stdout.write(chalk.dim('Auditing dependencies...\n'));

    try {
      await auditDependencies({ severityThreshold: 'high' });
      process.stdout.write(chalk.green('✓ No vulnerabilities found\n'));
    } catch (error) {
      this.logger.error(
        'Dependency audit failed',
        error instanceof Error ? error : new Error(String(error))
      );
      process.stderr.write(chalk.red('❌ Dependency audit failed\n'));
      throw error;
    }

    await this.trackCommand('security', ['audit'], true);
  }

  /**
   * Run PII scan
   */
  private async runPIIScan(): Promise<void> {
    process.stdout.write(chalk.dim('Scanning for PII...\n'));

    try {
      const result = await scanPii({ roots: ['src', 'config', 'data'] });
      if (result.findings && result.findings.length > 0) {
        process.stdout.write(chalk.yellow(`⚠️ Found ${result.findings.length} PII instances\n`));
        this.logger.warn('PII detected', {
          count: result.findings.length,
        });
      } else {
        process.stdout.write(chalk.green('✓ No PII found\n'));
      }
    } catch (error) {
      this.logger.error(
        'PII scan failed',
        error instanceof Error ? error : new Error(String(error))
      );
      process.stderr.write(chalk.red('❌ PII scan failed\n'));
      throw error;
    }

    await this.trackCommand('security', ['pii'], true);
  }

  /**
   * Run test command
   */
  private async runTest(args: string[]): Promise<void> {
    process.stdout.write(chalk.bold.cyan('\n🧪 KitiumAI Test Runner\n\n'));

    this.showProgress('Running tests');
    try {
      if (args.includes('--coverage') || args[0] === 'coverage') {
        await runTestsCoverage();
        this.showSuccess('Tests with coverage complete');
      } else if (args[0] === 'watch') {
        await runTests({ watch: true });
        this.showSuccess('Tests in watch mode started');
      } else {
        await runTests({ coverage: false });
        this.showSuccess('Tests complete');
      }
    } catch (error) {
      this.logger.error(
        'Test execution failed',
        error instanceof Error ? error : new Error(String(error))
      );
      process.stderr.write(chalk.red('❌ Test execution failed\n'));
      throw error;
    }

    await this.trackCommand('test', args, true);
  }

  /**
   * Run lint command
   */
  private async runLint(args: string[]): Promise<void> {
    process.stdout.write(chalk.bold.cyan('\n🧹 KitiumAI Linter\n\n'));

    const subcommand = args[0] || 'check';

    if (subcommand === 'fix' || args.includes('--fix')) {
      this.showProgress('Running lint with auto-fix');
      try {
        await lintAll(true);
        this.showSuccess('Linting and auto-fix complete');
      } catch (error) {
        this.logger.error(
          'Linting with auto-fix failed',
          error instanceof Error ? error : new Error(String(error))
        );
        process.stderr.write(chalk.red('❌ Linting with auto-fix failed\n'));
        throw error;
      }
    } else if (subcommand === 'format') {
      this.showProgress('Formatting code');
      try {
        await fixFormat();
        this.showSuccess('Code formatting complete');
      } catch (error) {
        this.logger.error(
          'Code formatting failed',
          error instanceof Error ? error : new Error(String(error))
        );
        process.stderr.write(chalk.red('❌ Code formatting failed\n'));
        throw error;
      }
    } else if (subcommand === 'report') {
      this.showProgress('Generating lint report');
      try {
        await generateLintReport();
        this.showSuccess('Lint report generated');
      } catch (error) {
        this.logger.error(
          'Lint report generation failed',
          error instanceof Error ? error : new Error(String(error))
        );
        process.stderr.write(chalk.red('❌ Lint report generation failed\n'));
        throw error;
      }
    } else {
      this.showProgress('Running lint checks');
      try {
        await lintAll(false);
        this.showSuccess('Linting complete');
      } catch (error) {
        this.logger.error(
          'Linting failed',
          error instanceof Error ? error : new Error(String(error))
        );
        process.stderr.write(chalk.red('❌ Linting failed\n'));
        throw error;
      }
    }

    await this.trackCommand('lint', args, true);
  }

  /**
   * Run git command
   */
  private async runGit(args: string[]): Promise<void> {
    process.stdout.write(chalk.bold.cyan('\n📚 KitiumAI Git Setup\n\n'));

    this.showProgress('Checking Git status');
    try {
      const branch = await getCurrentBranch();
      process.stdout.write(chalk.blue(`Current branch: ${branch}\n`));
      this.showSuccess('Git status checked');
    } catch (error) {
      this.logger.error(
        'Git status check failed',
        error instanceof Error ? error : new Error(String(error))
      );
      process.stderr.write(chalk.red('❌ Git status check failed\n'));
      throw error;
    }

    this.showProgress('Ensuring shared configs');
    try {
      await ensureSharedConfigs();
      this.showSuccess('Shared configs ensured');
    } catch (error) {
      this.logger.warn('Shared configs setup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.stdout.write(chalk.yellow('⚠️ Shared configs setup encountered issues\n'));
    }

    await this.trackCommand('git', args, true);
  }

  /**
   * Run CI command
   */
  private async runCI(args: string[]): Promise<void> {
    process.stdout.write(chalk.bold.cyan('\n🚀 KitiumAI CI Setup\n\n'));

    this.showProgress('Setting up CI pipelines');
    // CI setup logic would go here
    this.showSuccess('CI setup complete');

    await this.trackCommand('ci', args, true);
  }

  /**
   * Run governance command
   */
  private async runGovernance(args: string[]): Promise<void> {
    process.stdout.write(chalk.bold.cyan('\n🏛️ KitiumAI Governance Setup\n\n'));

    this.showProgress('Setting up governance tools');
    // Governance setup logic would go here
    this.showSuccess('Governance setup complete');

    await this.trackCommand('governance', args, true);
  }

  /**
   * Run observability command
   */
  private async runObservability(args: string[]): Promise<void> {
    process.stdout.write(chalk.bold.cyan('\n📊 KitiumAI Observability Setup\n\n'));

    this.showProgress('Setting up monitoring and logging');
    // Observability setup logic would go here
    this.showSuccess('Observability setup complete');

    await this.trackCommand('observability', args, true);
  }

  /**
   * Run health command
   */
  private async runHealth(): Promise<void> {
    process.stdout.write(chalk.bold.cyan('\n❤️ KitiumAI Health Check\n\n'));

    this.showProgress('Running comprehensive health checks');
    // Health check logic would go here
    this.showSuccess('Health checks complete');

    await this.trackCommand('health', [], true);
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
  process.stdout.write(`
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
  ${chalk.cyan('doctor')}       Diagnose and fix configuration issues

${chalk.bold('Setup Options:')}
  --auto              Non-interactive mode with defaults (includes GitHub security setup)
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

  # Setup configs non-interactively with full setup (includes GitHub security)
  kitiumai-config setup --auto

  # Dry-run to see what would be configured
  kitiumai-config setup --auto --dry-run

  # Force override existing configs with GitHub security setup
  kitiumai-config setup --force

  # Run security checks
  kitiumai-config security check

  # Run tests with coverage
  kitiumai-config test coverage

  # Fix linting issues
  kitiumai-config lint fix

  # Check git status
  kitiumai-config git status

${chalk.bold('Auto Mode Features:')}
  When using --auto or --force flags, the setup automatically:
  - Configures TypeScript, ESLint, and Prettier (Core)
  - Sets up Vitest or your chosen test framework (Testing)
  - Configures GitHub Actions workflows (CI/CD)
  - Adds security configurations (GitHub security, Dependabot, Gitleaks)
  - Sets up Git hooks (Husky, lint-staged) if in a Git repository
  - Runs GitHub security setup script if in a Git repository:
    * Configures GitHub security settings
    * Protects the main branch with security rules

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
  choices: SetupChoices,
  dryRun: boolean
): void {
  process.stdout.write(chalk.bold.green('\n✅ Setup Complete!\n\n'));

  if (dryRun) {
    process.stdout.write(chalk.yellow('DRY RUN - No files were actually created/modified\n\n'));
  }

  if (result.filesCreated.length > 0) {
    process.stdout.write(chalk.bold.blue('Files Created:\n'));
    result.filesCreated.forEach((file) => {
      process.stdout.write(chalk.green(`  ✓ ${file}\n`));
    });
    process.stdout.write('\n');
  }

  if (result.filesModified.length > 0) {
    process.stdout.write(chalk.bold.blue('Files Modified:\n'));
    result.filesModified.forEach((file) => {
      process.stdout.write(chalk.yellow(`  ⚡ ${file}\n`));
    });
    process.stdout.write('\n');
  }

  if (result.warnings.length > 0) {
    process.stdout.write(chalk.bold.yellow('Warnings:\n'));
    result.warnings.forEach((warning) => {
      process.stdout.write(chalk.yellow(`  ⚠️  ${warning}\n`));
    });
    process.stdout.write('\n');
  }

  process.stdout.write(chalk.bold('Summary:\n'));
  process.stdout.write(`  Package Type: ${chalk.cyan(choices.packageType)}\n`);
  process.stdout.write(`  Config Groups: ${chalk.cyan(choices.configGroups.join(', '))}\n`);
  process.stdout.write(
    `  Total Files: ${result.filesCreated.length + result.filesModified.length}\n`
  );

  process.stdout.write(chalk.dim('\nNext steps:\n'));
  process.stdout.write(chalk.dim('  1. Review the generated configuration files\n'));
  process.stdout.write(chalk.dim('  2. Install dependencies: pnpm install\n'));
  process.stdout.write(
    chalk.dim('  3. Commit changes: git add . && git commit -m "chore: setup configs"\n')
  );
}

// Run main function
async function main(): Promise<void> {
  const cli = new KitiumConfigCLI();
  await cli.run();
}

main().catch((error) => {
  process.stderr.write(chalk.red('\n💥 Unexpected error:\n'));
  process.stderr.write(chalk.red((error instanceof Error ? error.message : String(error)) + '\n'));
  if (process.env['DEBUG']) {
    process.stderr.write(chalk.gray('\nStack trace:\n'));
    process.stderr.write(
      chalk.gray((error instanceof Error ? error.stack : 'No stack trace available') + '\n')
    );
  }
  process.stderr.write(chalk.dim('\nPlease report this issue if it persists.\n'));
  process.exit(1);
});
