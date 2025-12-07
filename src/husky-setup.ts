import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Husky setup result
 */
export interface HuskySetupResult {
  success: boolean;
  filesCreated: string[];
  warnings: string[];
  installed: boolean;
}

/**
 * Setup Husky git hooks automatically
 */
export async function setupHusky(
  targetDir: string,
  dryRun: boolean = false
): Promise<HuskySetupResult> {
  const result: HuskySetupResult = {
    success: false,
    filesCreated: [],
    warnings: [],
    installed: false,
  };

  // Check if git repository exists
  const gitDir = join(targetDir, '.git');
  if (!existsSync(gitDir)) {
    result.warnings.push('Not a git repository - skipping Husky setup');
    return result;
  }

  try {
    // Install husky package if not already installed
    const huskyInstalled = await ensureHuskyInstalled(targetDir, dryRun);
    result.installed = huskyInstalled;

    if (dryRun) {
      result.warnings.push('Dry-run: would setup Husky git hooks');
      result.success = true;
      return result;
    }

    // Create .husky directory
    const huskyDir = join(targetDir, '.husky');
    if (!existsSync(huskyDir)) {
      mkdirSync(huskyDir, { recursive: true });
      result.filesCreated.push('.husky/');
    }

    // Create _/husky.sh helper script
    createHuskyHelper(huskyDir);
    result.filesCreated.push('.husky/_/husky.sh');

    // Create pre-commit hook (already handled by config registry)
    // But we need to make it executable
    const preCommitPath = join(huskyDir, 'pre-commit');
    if (existsSync(preCommitPath)) {
      try {
        chmodSync(preCommitPath, 0o755);
      } catch {
        // chmod might fail on Windows, that's okay
        result.warnings.push('Could not make pre-commit hook executable (this is fine on Windows)');
      }
    }

    // Initialize git hooks
    try {
      execSync('git config core.hooksPath .husky', {
        cwd: targetDir,
        stdio: 'pipe',
      });
    } catch {
      result.warnings.push('Could not configure git hooks path');
    }

    result.success = true;
    console.log(chalk.green('✓ Husky git hooks configured'));
  } catch (error) {
    result.warnings.push(
      `Husky setup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    result.success = false;
  }

  return result;
}

/**
 * Ensure Husky is installed in package.json dependencies
 */
async function ensureHuskyInstalled(targetDir: string, dryRun: boolean): Promise<boolean> {
  const packageJsonPath = join(targetDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      devDependencies?: Record<string, string>;
    };

    // Check if husky is already installed
    if (packageJson.devDependencies?.['husky']) {
      return true;
    }

    if (dryRun) {
      console.log(chalk.dim('Dry-run: would install husky package'));
      return false;
    }

    // Install husky
    console.log(chalk.dim('Installing husky...'));

    // Detect package manager
    const packageManager = detectPackageManager(targetDir);

    const installCommand =
      packageManager === 'pnpm'
        ? 'pnpm add -D husky --ignore-workspace'
        : packageManager === 'yarn'
          ? 'yarn add -D husky'
          : 'npm install --save-dev husky';

    execSync(installCommand, {
      cwd: targetDir,
      stdio: 'inherit',
    });

    console.log(chalk.green('✓ Husky installed'));
    return true;
  } catch (error) {
    console.log(
      chalk.yellow(
        `⚠️  Could not auto-install husky: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    console.log(chalk.dim('You can install it manually: pnpm add -D husky'));
    return false;
  }
}

/**
 * Detect package manager being used
 */
function detectPackageManager(targetDir: string): 'pnpm' | 'yarn' | 'npm' {
  if (existsSync(join(targetDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(targetDir, 'yarn.lock'))) {
    return 'yarn';
  }
  return 'npm';
}

/**
 * Create Husky helper script (_/husky.sh)
 */
function createHuskyHelper(huskyDir: string): void {
  const helperDir = join(huskyDir, '_');
  if (!existsSync(helperDir)) {
    mkdirSync(helperDir, { recursive: true });
  }

  const helperScript = `#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename -- "$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi

  readonly husky_skip_init=1
  export husky_skip_init
  sh -e "$0" "$@"
  exitCode="$?"

  if [ $exitCode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitCode (error)"
  fi

  if [ $exitCode = 127 ]; then
    echo "husky - command not found in PATH=$PATH"
  fi

  exit $exitCode
fi
`;

  const helperPath = join(helperDir, 'husky.sh');
  writeFileSync(helperPath, helperScript, { mode: 0o755 });
}
