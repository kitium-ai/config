import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

/**
 * File operation result
 */
export interface FileOperationResult {
  filePath: string;
  action: 'created' | 'modified' | 'skipped';
  reason?: string;
}

/**
 * File writer options
 */
export interface FileWriterOptions {
  overrideExisting: boolean;
  dryRun: boolean;
}

/**
 * Utility class for file operations
 * Reduces code duplication across generator functions
 */
export class FileOperations {
  private targetDir: string;

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = targetDir;
  }

  /**
   * Ensure directory exists, creating it if necessary
   */
  ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Write a file with proper directory creation and conflict handling
   */
  writeFile(
    relativePath: string,
    content: string,
    options: FileWriterOptions
  ): FileOperationResult {
    const filePath = join(this.targetDir, relativePath);
    const exists = existsSync(filePath);

    // Check if file exists and should be skipped
    if (exists && !options.overrideExisting) {
      return {
        filePath: relativePath,
        action: 'skipped',
        reason: 'File already exists and override is disabled',
      };
    }

    // Dry run mode - don't actually write
    if (options.dryRun) {
      return {
        filePath: relativePath,
        action: exists ? 'modified' : 'created',
        reason: 'Dry run - no changes made',
      };
    }

    // Ensure parent directory exists
    this.ensureDir(dirname(filePath));

    // Write the file
    writeFileSync(filePath, content, 'utf-8');

    return {
      filePath: relativePath,
      action: exists ? 'modified' : 'created',
    };
  }

  /**
   * Read a file safely
   */
  readFile(relativePath: string): string | null {
    const filePath = join(this.targetDir, relativePath);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath, 'utf-8');
  }

  /**
   * Check if file exists
   */
  fileExists(relativePath: string): boolean {
    const filePath = join(this.targetDir, relativePath);
    return existsSync(filePath);
  }

  /**
   * Read and parse JSON file
   */
  readJsonFile<T = any>(relativePath: string): T | null {
    const content = this.readFile(relativePath);
    if (!content) {
      return null;
    }
    try {
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Write JSON file with formatting
   */
  writeJsonFile(
    relativePath: string,
    data: any,
    options: FileWriterOptions
  ): FileOperationResult {
    const content = `${JSON.stringify(data, null, 2)}\n`;
    return this.writeFile(relativePath, content, options);
  }

  /**
   * Update package.json with merge logic
   */
  updatePackageJson(
    updates: Partial<PackageJson>,
    options: FileWriterOptions
  ): FileOperationResult {
    const packageJson = this.readJsonFile<PackageJson>('package.json');
    if (!packageJson) {
      return {
        filePath: 'package.json',
        action: 'skipped',
        reason: 'package.json not found',
      };
    }

    // Merge updates
    const merged = this.mergePackageJson(packageJson, updates);

    // Check if there are actual changes
    if (JSON.stringify(packageJson) === JSON.stringify(merged)) {
      return {
        filePath: 'package.json',
        action: 'skipped',
        reason: 'No changes needed',
      };
    }

    return this.writeJsonFile('package.json', merged, options);
  }

  /**
   * Merge package.json updates intelligently
   */
  private mergePackageJson(
    original: PackageJson,
    updates: Partial<PackageJson>
  ): PackageJson {
    const merged = { ...original };

    // Merge scripts
    if (updates.scripts) {
      merged.scripts = {
        ...original.scripts,
        ...updates.scripts,
      };
    }

    // Merge dependencies
    if (updates.dependencies) {
      merged.dependencies = {
        ...original.dependencies,
        ...updates.dependencies,
      };
    }

    // Merge devDependencies
    if (updates.devDependencies) {
      merged.devDependencies = {
        ...original.devDependencies,
        ...updates.devDependencies,
      };
    }

    // Merge publishConfig
    if (updates.publishConfig) {
      merged.publishConfig = {
        ...original.publishConfig,
        ...updates.publishConfig,
      };
    }

    // Merge files array (deduplicate)
    if (updates.files) {
      const existingFiles = original.files || [];
      const newFiles = updates.files;
      merged.files = Array.from(new Set([...existingFiles, ...newFiles]));
    }

    // Simple field merges
    if (updates.license) merged.license = updates.license;
    if (updates.private !== undefined) merged.private = updates.private;

    return merged;
  }

  /**
   * Get target directory
   */
  getTargetDir(): string {
    return this.targetDir;
  }
}

/**
 * Package.json interface
 */
export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  license?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  publishConfig?: {
    access?: string;
    registry?: string;
  };
  files?: string[];
  [key: string]: any;
}

/**
 * Batch write multiple files
 */
export function batchWriteFiles(
  fileOps: FileOperations,
  files: Array<{ path: string; content: string }>,
  options: FileWriterOptions
): FileOperationResult[] {
  return files.map((file) => fileOps.writeFile(file.path, file.content, options));
}
