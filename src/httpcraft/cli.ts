/**
 * HTTPCraft CLI execution wrapper
 */

import { logger } from '../utils/logger.js';
import { executeCommand, type ProcessResult } from '../utils/process.js';
import { ConfigDiscovery, type HttpCraftConfig } from './config.js';
import type { AsyncResult } from '../types/index.js';

export interface HttpCraftResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly duration: number;
  readonly success: boolean;
}

export interface HttpCraftOptions {
  readonly cwd?: string;
  readonly timeout?: number;
  readonly env?: Record<string, string>;
}

export class HttpCraftCli {
  private readonly configDiscovery: ConfigDiscovery;
  private config?: HttpCraftConfig;

  constructor() {
    this.configDiscovery = new ConfigDiscovery();
  }

  /**
   * Execute HTTPCraft command with the given arguments
   */
  public async execute(
    args: readonly string[],
    options: HttpCraftOptions = {}
  ): AsyncResult<HttpCraftResult> {
    logger.debug('Executing HTTPCraft command', {
      args: args.join(' '),
      options,
    });

    // Ensure we have HTTPCraft configuration
    if (!this.config) {
      const configResult = await this.configDiscovery.getConfig();
      if (!configResult.success) {
        return {
          success: false,
          error: new Error(`Failed to discover HTTPCraft: ${configResult.error?.message}`),
        };
      }
      this.config = configResult.data;
    }

    const processResult = await executeCommand(this.config.executablePath, args, {
      cwd: options.cwd ?? process.cwd(),
      timeout: options.timeout ?? 30000,
      env: options.env,
    });

    if (!processResult.success) {
      return {
        success: false,
        error: processResult.error,
      };
    }

    const result: HttpCraftResult = {
      stdout: processResult.data.stdout,
      stderr: processResult.data.stderr,
      exitCode: processResult.data.exitCode,
      duration: processResult.data.duration,
      success: processResult.data.exitCode === 0,
    };

    logger.debug('HTTPCraft command completed', {
      exitCode: result.exitCode,
      duration: result.duration,
      success: result.success,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length,
    });

    return { success: true, data: result };
  }

  /**
   * Get HTTPCraft version
   */
  public async getVersion(): AsyncResult<string> {
    logger.debug('Getting HTTPCraft version');

    const result = await this.execute(['--version']);
    if (!result.success) {
      return {
        success: false,
        error: new Error(`Failed to get HTTPCraft version: ${result.error?.message}`),
      };
    }

    const version = result.data.stdout.trim();
    logger.info('HTTPCraft version retrieved', { version });

    return { success: true, data: version };
  }

  /**
   * Check if HTTPCraft is available and working
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const versionResult = await this.getVersion();
      return versionResult.success;
    } catch (error) {
      logger.warn('HTTPCraft availability check failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Execute HTTPCraft with JSON output parsing
   */
  public async executeWithJsonOutput<T = unknown>(
    args: readonly string[],
    options: HttpCraftOptions = {}
  ): AsyncResult<T> {
    const result = await this.execute(args, options);

    if (!result.success) {
      return result;
    }

    if (result.data.exitCode !== 0) {
      return {
        success: false,
        error: new Error(`HTTPCraft command failed: ${result.data.stderr || result.data.stdout}`),
      };
    }

    try {
      const parsedData = JSON.parse(result.data.stdout) as T;
      return { success: true, data: parsedData };
    } catch (parseError) {
      logger.error('Failed to parse HTTPCraft JSON output', {
        stdout: result.data.stdout,
        stderr: result.data.stderr,
      });

      return {
        success: false,
        error: new Error(`Failed to parse HTTPCraft JSON output: ${(parseError as Error).message}`),
      };
    }
  }

  /**
   * Execute HTTPCraft with plain text output parsing (newline-separated entries)
   */
  public async executeWithTextOutput(
    args: readonly string[],
    options: HttpCraftOptions = {}
  ): AsyncResult<string[]> {
    const result = await this.execute(args, options);

    if (!result.success) {
      return result;
    }

    if (result.data.exitCode !== 0) {
      return {
        success: false,
        error: new Error(`HTTPCraft command failed: ${result.data.stderr || result.data.stdout}`),
      };
    }

    // Parse newline-separated output
    const lines = result.data.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    logger.debug('Parsed HTTPCraft text output', {
      lineCount: lines.length,
      lines: lines.slice(0, 5), // Log first 5 entries for debugging
    });

    return { success: true, data: lines };
  }

  /**
   * Get current HTTPCraft configuration
   */
  public async getConfig(): AsyncResult<HttpCraftConfig> {
    return this.configDiscovery.getConfig();
  }

  /**
   * Clear cached configuration (useful for testing)
   */
  public clearCache(): void {
    this.config = undefined;
    this.configDiscovery.clearCache();
  }
}
