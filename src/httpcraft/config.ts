/**
 * HTTPCraft configuration discovery and management
 */

import { homedir } from 'os';
import { join } from 'path';
import { access, constants } from 'fs/promises';

import { logger } from '../utils/logger.js';
import { checkExecutableExists, findExecutableInPath } from '../utils/process.js';
import type { AsyncResult } from '../types/index.js';

export interface HttpCraftConfig {
  readonly executablePath: string;
  readonly configPaths: readonly string[];
  readonly version?: string;
}

export class ConfigDiscovery {
  private cachedConfig?: HttpCraftConfig;

  /**
   * Discover HTTPCraft executable following the priority order:
   * 1. HTTPCRAFT_PATH environment variable
   * 2. System PATH lookup
   * 3. Common installation locations
   */
  public async discoverExecutable(): AsyncResult<string> {
    logger.debug('Starting HTTPCraft executable discovery');

    // 1. Check environment variable
    const envPath = process.env.HTTPCRAFT_PATH;
    if (envPath) {
      logger.debug('Checking HTTPCRAFT_PATH environment variable', { path: envPath });
      if (await checkExecutableExists(envPath)) {
        logger.info('Found HTTPCraft via HTTPCRAFT_PATH', { path: envPath });
        return { success: true, data: envPath };
      } else {
        logger.warn('HTTPCRAFT_PATH points to non-existent or non-executable file', {
          path: envPath,
        });
      }
    }

    // 2. Check system PATH
    logger.debug('Searching for HTTPCraft in system PATH');
    const pathResult = await findExecutableInPath('httpcraft');
    if (pathResult) {
      logger.info('Found HTTPCraft in system PATH', { path: pathResult });
      return { success: true, data: pathResult };
    }

    // 3. Check common installation locations
    const commonPaths = [
      '/usr/local/bin/httpcraft',
      '/opt/homebrew/bin/httpcraft',
      '/usr/bin/httpcraft',
      join(homedir(), '.local/bin/httpcraft'),
      join(homedir(), 'bin/httpcraft'),
    ];

    logger.debug('Checking common installation locations', { paths: commonPaths });

    for (const path of commonPaths) {
      if (await checkExecutableExists(path)) {
        logger.info('Found HTTPCraft in common location', { path });
        return { success: true, data: path };
      }
    }

    logger.error('HTTPCraft executable not found in any location');
    return {
      success: false,
      error: new Error(
        'HTTPCraft executable not found. Please install HTTPCraft or set HTTPCRAFT_PATH environment variable.'
      ),
    };
  }

  /**
   * Discover HTTPCraft configuration files in common locations
   */
  public async discoverConfigPaths(): AsyncResult<readonly string[]> {
    const configPaths: string[] = [];

    const commonConfigPaths = [
      // Current working directory
      join(process.cwd(), 'httpcraft.yaml'),
      join(process.cwd(), 'httpcraft.yml'),
      join(process.cwd(), '.httpcraft.yaml'),
      join(process.cwd(), '.httpcraft.yml'),

      // Home directory
      join(homedir(), '.httpcraft/config.yaml'),
      join(homedir(), '.httpcraft/config.yml'),
      join(homedir(), '.httpcraft.yaml'),
      join(homedir(), '.httpcraft.yml'),

      // XDG config directory
      join(homedir(), '.config/httpcraft/config.yaml'),
      join(homedir(), '.config/httpcraft/config.yml'),
    ];

    logger.debug('Searching for HTTPCraft configuration files', { paths: commonConfigPaths });

    for (const path of commonConfigPaths) {
      try {
        await access(path, constants.F_OK | constants.R_OK);
        configPaths.push(path);
        logger.debug('Found configuration file', { path });
      } catch {
        // File doesn't exist or isn't readable, continue
      }
    }

    logger.info('HTTPCraft configuration discovery complete', {
      foundConfigs: configPaths.length,
      paths: configPaths,
    });

    return { success: true, data: configPaths };
  }

  /**
   * Get full HTTPCraft configuration
   */
  public async getConfig(): AsyncResult<HttpCraftConfig> {
    if (this.cachedConfig) {
      logger.debug('Using cached HTTPCraft configuration');
      return { success: true, data: this.cachedConfig };
    }

    logger.info('Discovering HTTPCraft configuration');

    const executableResult = await this.discoverExecutable();
    if (!executableResult.success) {
      return executableResult;
    }

    const configPathsResult = await this.discoverConfigPaths();
    if (!configPathsResult.success) {
      return configPathsResult;
    }

    const config: HttpCraftConfig = {
      executablePath: executableResult.data,
      configPaths: configPathsResult.data,
    };

    this.cachedConfig = config;
    logger.info('HTTPCraft configuration ready', {
      executablePath: config.executablePath,
      configCount: config.configPaths.length,
    });

    return { success: true, data: config };
  }

  /**
   * Clear cached configuration (useful for testing)
   */
  public clearCache(): void {
    this.cachedConfig = undefined;
    logger.debug('HTTPCraft configuration cache cleared');
  }
}