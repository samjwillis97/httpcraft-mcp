/**
 * HTTPCraft CLI execution wrapper
 */

import { logger } from '../utils/logger.js';
import { executeCommand } from '../utils/process.js';
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
   * List all available APIs using the new HTTPCraft list command
   */
  public async listApis(configPath?: string): AsyncResult<ApiListItem[]> {
    logger.debug('Listing APIs using HTTPCraft list command', { configPath });

    const args = ['list', 'apis', '--json'];
    if (configPath) {
      args.push('--config', configPath);
    }

    const result = await this.executeWithJsonOutput<ApiListItem[]>(args);
    if (!result.success) {
      return result;
    }

    // Return the full API objects with descriptions
    return { success: true, data: result.data };
  }

  /**
   * List all endpoints for a specific API using the new HTTPCraft list command
   */
  public async listEndpoints(api: string, configPath?: string): AsyncResult<EndpointListItem[]> {
    logger.debug('Listing endpoints using HTTPCraft list command', { api, configPath });

    const args = ['list', 'endpoints', api, '--json'];
    if (configPath) {
      args.push('--config', configPath);
    }

    const result = await this.executeWithJsonOutput<EndpointListItem[]>(args);
    if (!result.success) {
      return result;
    }

    // Return the full endpoint objects with descriptions
    return { success: true, data: result.data };
  }

  /**
   * List all available profiles using the new HTTPCraft list command
   */
  public async listProfiles(configPath?: string): AsyncResult<ProfileListItem[]> {
    logger.debug('Listing profiles using HTTPCraft list command', { configPath });

    const args = ['list', 'profiles', '--json'];
    if (configPath) {
      args.push('--config', configPath);
    }

    const result = await this.executeWithJsonOutput<ProfileListItem[]>(args);
    if (!result.success) {
      return result;
    }

    // Return the full profile objects with descriptions
    return { success: true, data: result.data };
  }

  /**
   * List all available variables using the new HTTPCraft list command
   */
  public async listVariables(
    configPath?: string,
    profiles?: string[],
    api?: string,
    endpoint?: string
  ): AsyncResult<VariableListItem[]> {
    logger.debug('Listing variables using HTTPCraft list command', {
      configPath,
      profiles,
      api,
      endpoint,
    });

    const args = ['list', 'variables', '--json'];
    if (configPath) {
      args.push('--config', configPath);
    }
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        args.push('--profile', profile);
      });
    }
    if (api) {
      args.push('--api', api);
    }
    if (endpoint) {
      args.push('--endpoint', endpoint);
    }

    const result = await this.executeWithJsonOutput<VariableListItem[]>(args);
    if (!result.success) {
      return result;
    }

    // Return the full variable objects with sources and active status
    return { success: true, data: result.data };
  }

  /**
   * Describe an API using the new HTTPCraft describe command
   */
  public async describeApi(name: string, configPath?: string): AsyncResult<ApiDescription> {
    logger.debug('Describing API using HTTPCraft describe command', { name, configPath });

    const args = ['describe', 'api', name, '--json'];
    if (configPath) {
      args.push('--config', configPath);
    }

    return this.executeWithJsonOutput<ApiDescription>(args);
  }

  /**
   * Describe an endpoint using the new HTTPCraft describe command
   */
  public async describeEndpoint(
    api: string,
    endpoint: string,
    configPath?: string
  ): AsyncResult<EndpointDescription> {
    logger.debug('Describing endpoint using HTTPCraft describe command', {
      api,
      endpoint,
      configPath,
    });

    const args = ['describe', 'endpoint', api, endpoint, '--json'];
    if (configPath) {
      args.push('--config', configPath);
    }

    return this.executeWithJsonOutput<EndpointDescription>(args);
  }

  /**
   * Describe a profile using the new HTTPCraft describe command
   */
  public async describeProfile(name: string, configPath?: string): AsyncResult<ProfileDescription> {
    logger.debug('Describing profile using HTTPCraft describe command', { name, configPath });

    const args = ['describe', 'profile', name, '--json'];
    if (configPath) {
      args.push('--config', configPath);
    }

    return this.executeWithJsonOutput<ProfileDescription>(args);
  }

  /**
   * Clear cached configuration (useful for testing)
   */
  public clearCache(): void {
    this.config = undefined;
    this.configDiscovery.clearCache();
  }
}

// Type definitions for describe command responses
export interface ApiDescription {
  name: string;
  base_url?: string;
  description?: string;
  endpoints: Record<string, any>;
  variables?: Record<string, any>;
}

export interface EndpointDescription {
  name: string;
  api: string;
  method: string;
  path: string;
  description?: string;
  parameters?: Record<string, any>;
  headers?: Record<string, any>;
  body?: any;
}

export interface ProfileDescription {
  name: string;
  description?: string;
  variables?: Record<string, any>;
  timeout?: number;
  retries?: number;
}

// Type definitions for list command responses
export interface ApiListItem {
  name: string;
  description: string;
  baseUrl: string;
  endpoints: number;
}

export interface EndpointListItem {
  api: string;
  name: string;
  method: string;
  path: string;
  description: string;
}

export interface ProfileListItem {
  name: string;
  description: string;
  isDefault: boolean;
  variables: number;
}

export interface VariableListItem {
  name: string;
  value: string;
  source: string;
  scope?: string;
  active?: boolean;
}
