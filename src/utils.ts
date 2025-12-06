/**
 * Enhanced logging and error handling utilities for KitiumAI Config CLI
 */

import chalk from 'chalk';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  command?: string | undefined;
  sessionId?: string | undefined;
  error?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Enhanced logger with file output and structured logging
 */
export class Logger {
  private logLevel: LogLevel;
  private logFile?: string;
  private sessionId: string;

  constructor(sessionId: string, logLevel: LogLevel = LogLevel.INFO) {
    this.sessionId = sessionId;
    this.logLevel = logLevel;
    this.initializeLogFile();
  }

  private initializeLogFile(): void {
    try {
      const logDir = join(homedir(), '.kitiumai', 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      this.logFile = join(logDir, `config-cli-${new Date().toISOString().split('T')[0]}.log`);
    } catch {
      // Silently fail if we can't create log directory
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.logFile) {
      return;
    }

    try {
      const logStream = createWriteStream(this.logFile, { flags: 'a' });
      logStream.write(JSON.stringify(entry) + '\n');
      logStream.end();
    } catch {
      // Silently fail if we can't write to log file
    }
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
      metadata,
    };

    this.writeToFile(entry);

    // Console output for development
    if (process.env['DEBUG'] || level >= LogLevel.WARN) {
      const levelName = LogLevel[level];
      const coloredMessage = this.colorizeMessage(level, message);
      console.error(`[${levelName}] ${coloredMessage}`);
    }
  }

  private colorizeMessage(level: LogLevel, message: string): string {
    switch (level) {
      case LogLevel.DEBUG:
        return chalk.gray(message);
      case LogLevel.INFO:
        return chalk.blue(message);
      case LogLevel.WARN:
        return chalk.yellow(message);
      case LogLevel.ERROR:
        return chalk.red(message);
      default:
        return message;
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      sessionId: this.sessionId,
      error: error?.message,
      metadata: {
        ...metadata,
        stack: error?.stack,
      },
    };

    this.writeToFile(entry);

    const coloredMessage = chalk.red(message);
    console.error(`[ERROR] ${coloredMessage}`);
    if (error && process.env['DEBUG']) {
      console.error(chalk.gray(error.stack));
    }
  }
}

/**
 * Enhanced error recovery suggestions
 */
export class ErrorRecovery {
  static getRecoverySuggestions(error: Error): string[] {
    const message = error.message.toLowerCase();

    if (message.includes('eacces') || message.includes('eperm')) {
      return [
        'Try running with elevated permissions: sudo npx kitiumai-config <command>',
        'Check file permissions in the target directory',
        'Ensure you have write access to the target directory',
      ];
    }

    if (message.includes('enotfound') || message.includes('econnrefused')) {
      return [
        'Check your internet connection',
        'Verify package registry availability',
        'Try again in a few minutes',
      ];
    }

    if (message.includes('package.json')) {
      return [
        "Ensure you're in a Node.js project directory",
        'Run: npm init or pnpm init to create a package.json',
        'Check if package.json exists and is valid JSON',
      ];
    }

    if (message.includes('git')) {
      return [
        'Initialize git repository: git init',
        'Check git installation: git --version',
        'Ensure you have git permissions in the directory',
      ];
    }

    if (message.includes('cannot find module') || message.includes('module not found')) {
      return [
        'Install dependencies: pnpm install',
        'Check if the package is listed in dependencies',
        'Try clearing node_modules: rm -rf node_modules && pnpm install',
      ];
    }

    return [
      'Check the error message above for specific guidance',
      'Run with DEBUG=1 for more detailed error information',
      'Check the troubleshooting section in the README',
    ];
  }
}

/**
 * Progress tracking for long-running operations
 */
export class ProgressTracker {
  private startTime: number;
  private lastMessage = '';
  private spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;
  private spinnerInterval?: NodeJS.Timeout | undefined;

  constructor() {
    this.startTime = Date.now();
  }

  start(message: string): void {
    if (process.env['CI'] || !process.stdout.isTTY) {
      console.log(chalk.cyan(`⏳ ${message}...`));
      return;
    }

    this.lastMessage = message;
    this.spinnerInterval = setInterval(() => {
      const spinner = this.spinnerChars[this.spinnerIndex % this.spinnerChars.length];
      process.stdout.write(`\r${chalk.cyan(spinner)} ${message}...`);
      this.spinnerIndex++;
    }, 100);
  }

  update(message: string): void {
    if (process.env['CI'] || !process.stdout.isTTY) {
      return;
    }

    this.lastMessage = message;
    const spinner = this.spinnerChars[this.spinnerIndex % this.spinnerChars.length];
    process.stdout.write(`\r${chalk.cyan(spinner)} ${message}...`);
  }

  stop(success: boolean = true): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }

    if (process.env['CI'] || !process.stdout.isTTY) {
      return;
    }

    const duration = Date.now() - this.startTime;
    const icon = success ? chalk.green('✓') : chalk.red('✗');
    process.stdout.write(`\r${icon} ${this.lastMessage} (${duration}ms)\n`);
  }

  success(message: string): void {
    this.stop(true);
    console.log(chalk.green(`✅ ${message}`));
  }

  error(message: string): void {
    this.stop(false);
    console.log(chalk.red(`❌ ${message}`));
  }
}

/**
 * Command execution result
 */
export interface CommandResult<T = void> {
  success: boolean;
  result?: T;
  error?: Error;
}

/**
 * Options for command execution
 */
export interface CommandExecutionOptions {
  operationName: string;
  successMessage: string;
  errorMessage: string;
  throwOnError?: boolean;
}

/**
 * Utility class for executing commands with consistent error handling
 * Reduces try-catch duplication across CLI commands
 */
export class CommandExecutor {
  constructor(private logger: Logger) {}

  /**
   * Execute a command with standard error handling and logging
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: CommandExecutionOptions
  ): Promise<CommandResult<T>> {
    try {
      this.logger.info(options.operationName);
      const result = await operation();
      process.stdout.write(chalk.green(`✓ ${options.successMessage}\n`));
      return { success: true, result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`${options.operationName} failed`, {
        error: err.message,
      });
      process.stdout.write(chalk.yellow(`⚠️ ${options.errorMessage}\n`));

      if (options.throwOnError) {
        throw err;
      }

      return { success: false, error: err };
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeMany(
    commands: Array<{ operation: () => Promise<unknown>; options: CommandExecutionOptions }>
  ): Promise<CommandResult<unknown>[]> {
    const results: CommandResult<unknown>[] = [];

    for (const cmd of commands) {
      const result = await this.execute(cmd.operation, cmd.options);
      results.push(result);
    }

    return results;
  }
}
