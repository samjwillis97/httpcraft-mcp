/**
 * HTTPCraft Configuration Discovery
 * Utilities for discovering and parsing HTTPCraft configuration files
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { logger } from '../utils/logger.js';
import type { AsyncResult, Result } from '../types/index.js';

export interface HttpCraftConfigApi {
  readonly name: string;
  readonly baseUrl?: string;
  readonly endpoints: Record<string, HttpCraftConfigEndpoint>;
}

export interface HttpCraftConfigEndpoint {
  readonly path: string;
  readonly method: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
  readonly description?: string;
}

export interface HttpCraftConfigProfile {
  readonly name: string;
  readonly timeout?: number;
  readonly retries?: number;
  readonly headers?: Record<string, string>;
  readonly authentication?: Record<string, unknown>;
}

export interface HttpCraftConfigChain {
  readonly name: string;
  readonly steps: HttpCraftConfigChainStep[];
  readonly description?: string;
}

export interface HttpCraftConfigChainStep {
  readonly name: string;
  readonly api: string;
  readonly endpoint: string;
  readonly variables?: Record<string, string>;
}

export interface ParsedHttpCraftConfig {
  readonly apis: Record<string, HttpCraftConfigApi>;
  readonly profiles: Record<string, HttpCraftConfigProfile>;
  readonly chains?: Record<string, HttpCraftConfigChain>;
}

export class ConfigDiscoveryService {
  private configCache = new Map<string, ParsedHttpCraftConfig>();
  private cacheTimestamps = new Map<string, number>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Parse HTTPCraft configuration from file
   */
  public async parseConfigFile(configPath: string): AsyncResult<ParsedHttpCraftConfig> {
    try {
      logger.debug('Parsing HTTPCraft configuration file', { configPath });

      // Check cache first
      const cached = this.getCachedConfig(configPath);
      if (cached) {
        logger.debug('Using cached configuration', { configPath });
        return { success: true, data: cached };
      }

      // Read and parse the configuration file
      const configContent = await readFile(resolve(configPath), 'utf-8');
      const rawConfig = this.parseConfigContent(configContent, configPath);

      if (!rawConfig.success) {
        return rawConfig;
      }

      const parsedConfig = this.normalizeConfig(rawConfig.data);

      // Cache the result
      this.setCachedConfig(configPath, parsedConfig);

      logger.debug('Successfully parsed HTTPCraft configuration', {
        configPath,
        apiCount: Object.keys(parsedConfig.apis).length,
        profileCount: Object.keys(parsedConfig.profiles).length,
        chainCount: parsedConfig.chains ? Object.keys(parsedConfig.chains).length : 0,
      });

      return { success: true, data: parsedConfig };
    } catch (error) {
      logger.error('Failed to parse HTTPCraft configuration', {
        configPath,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: new Error(
          `Failed to parse config file "${configPath}": ${(error as Error).message}`
        ),
      };
    }
  }

  /**
   * Get list of APIs from configuration
   */
  public async getApis(configPath?: string): AsyncResult<string[]> {
    const configResult = await this.parseConfigFile(configPath || this.getDefaultConfigPath());

    if (!configResult.success) {
      return configResult;
    }

    const apiNames = Object.keys(configResult.data.apis);
    return { success: true, data: apiNames };
  }

  /**
   * Get list of endpoints for a specific API
   */
  public async getEndpoints(apiName: string, configPath?: string): AsyncResult<string[]> {
    const configResult = await this.parseConfigFile(configPath || this.getDefaultConfigPath());

    if (!configResult.success) {
      return configResult;
    }

    const api = configResult.data.apis[apiName];
    if (!api) {
      return {
        success: false,
        error: new Error(`API "${apiName}" not found in configuration`),
      };
    }

    const endpointNames = Object.keys(api.endpoints);
    return { success: true, data: endpointNames };
  }

  /**
   * Get list of profiles from configuration
   */
  public async getProfiles(configPath?: string): AsyncResult<string[]> {
    const configResult = await this.parseConfigFile(configPath || this.getDefaultConfigPath());

    if (!configResult.success) {
      return configResult;
    }

    const profileNames = Object.keys(configResult.data.profiles);
    return { success: true, data: profileNames };
  }

  /**
   * Clear configuration cache
   */
  public clearCache(): void {
    this.configCache.clear();
    this.cacheTimestamps.clear();
    logger.debug('Configuration cache cleared');
  }

  /**
   * Clear cache for specific configuration file
   */
  public clearCacheForFile(configPath: string): void {
    this.configCache.delete(configPath);
    this.cacheTimestamps.delete(configPath);
    logger.debug('Configuration cache cleared for file', { configPath });
  }

  private parseConfigContent(content: string, configPath: string): Result<unknown, Error> {
    try {
      // Try YAML first
      if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        return { success: true, data: parseYaml(content) };
      }

      // Try JSON
      if (configPath.endsWith('.json')) {
        return { success: true, data: JSON.parse(content) };
      }

      // Auto-detect based on content
      try {
        return { success: true, data: parseYaml(content) };
      } catch {
        return { success: true, data: JSON.parse(content) };
      }
    } catch (error) {
      return {
        success: false,
        error: new Error(`Failed to parse configuration content: ${(error as Error).message}`),
      };
    }
  }

  private normalizeConfig(rawConfig: unknown): ParsedHttpCraftConfig {
    const apis: Record<string, HttpCraftConfigApi> = {};
    const profiles: Record<string, HttpCraftConfigProfile> = {};
    const chains: Record<string, HttpCraftConfigChain> = {};

    // Type guard for config object
    if (!rawConfig || typeof rawConfig !== 'object') {
      return { apis, profiles, chains };
    }

    const config = rawConfig as Record<string, unknown>;

    // Normalize APIs
    if (config.apis && typeof config.apis === 'object' && config.apis !== null) {
      const apisConfig = config.apis as Record<string, unknown>;
      for (const [name, apiConfig] of Object.entries(apisConfig)) {
        if (typeof apiConfig === 'object' && apiConfig !== null) {
          apis[name] = this.normalizeApi(name, apiConfig as Record<string, unknown>);
        }
      }
    }

    // Normalize Profiles
    if (config.profiles && typeof config.profiles === 'object' && config.profiles !== null) {
      const profilesConfig = config.profiles as Record<string, unknown>;
      for (const [name, profileConfig] of Object.entries(profilesConfig)) {
        if (typeof profileConfig === 'object' && profileConfig !== null) {
          profiles[name] = this.normalizeProfile(name, profileConfig as Record<string, unknown>);
        }
      }
    }

    // Normalize Chains (optional)
    if (config.chains && typeof config.chains === 'object' && config.chains !== null) {
      const chainsConfig = config.chains as Record<string, unknown>;
      for (const [name, chainConfig] of Object.entries(chainsConfig)) {
        if (typeof chainConfig === 'object' && chainConfig !== null) {
          chains[name] = this.normalizeChain(name, chainConfig as Record<string, unknown>);
        }
      }
    }

    return { apis, profiles, chains };
  }

  private normalizeApi(name: string, apiConfig: Record<string, unknown>): HttpCraftConfigApi {
    const endpoints: Record<string, HttpCraftConfigEndpoint> = {};

    if (
      apiConfig.endpoints &&
      typeof apiConfig.endpoints === 'object' &&
      apiConfig.endpoints !== null
    ) {
      const endpointsConfig = apiConfig.endpoints as Record<string, unknown>;
      for (const [endpointName, endpointConfig] of Object.entries(endpointsConfig)) {
        if (typeof endpointConfig === 'object' && endpointConfig !== null) {
          endpoints[endpointName] = this.normalizeEndpoint(
            endpointConfig as Record<string, unknown>
          );
        }
      }
    }

    return {
      name,
      baseUrl:
        typeof apiConfig.baseUrl === 'string'
          ? apiConfig.baseUrl
          : typeof apiConfig.base_url === 'string'
            ? apiConfig.base_url
            : undefined,
      endpoints,
    };
  }

  private normalizeEndpoint(endpointConfig: Record<string, unknown>): HttpCraftConfigEndpoint {
    return {
      path: typeof endpointConfig.path === 'string' ? endpointConfig.path : '/',
      method:
        typeof endpointConfig.method === 'string' ? endpointConfig.method.toUpperCase() : 'GET',
      headers:
        typeof endpointConfig.headers === 'object' && endpointConfig.headers !== null
          ? (endpointConfig.headers as Record<string, string>)
          : undefined,
      body: typeof endpointConfig.body === 'string' ? endpointConfig.body : undefined,
      description:
        typeof endpointConfig.description === 'string' ? endpointConfig.description : undefined,
    };
  }

  private normalizeProfile(
    name: string,
    profileConfig: Record<string, unknown>
  ): HttpCraftConfigProfile {
    return {
      name,
      timeout: typeof profileConfig.timeout === 'number' ? profileConfig.timeout : undefined,
      retries: typeof profileConfig.retries === 'number' ? profileConfig.retries : undefined,
      headers:
        typeof profileConfig.headers === 'object' && profileConfig.headers !== null
          ? (profileConfig.headers as Record<string, string>)
          : undefined,
      authentication: (typeof profileConfig.authentication === 'object' &&
      profileConfig.authentication !== null
        ? profileConfig.authentication
        : profileConfig.auth) as Record<string, unknown> | undefined,
    };
  }

  private normalizeChain(name: string, chainConfig: Record<string, unknown>): HttpCraftConfigChain {
    const steps: HttpCraftConfigChainStep[] = [];

    if (Array.isArray(chainConfig.steps)) {
      steps.push(
        ...chainConfig.steps.map((step: unknown) => {
          const stepObj =
            typeof step === 'object' && step !== null ? (step as Record<string, unknown>) : {};
          return {
            name: typeof stepObj.name === 'string' ? stepObj.name : `step-${steps.length}`,
            api: typeof stepObj.api === 'string' ? stepObj.api : '',
            endpoint: typeof stepObj.endpoint === 'string' ? stepObj.endpoint : '',
            variables:
              typeof stepObj.variables === 'object' && stepObj.variables !== null
                ? (stepObj.variables as Record<string, string>)
                : undefined,
          };
        })
      );
    }

    return {
      name,
      steps,
      description:
        typeof chainConfig.description === 'string' ? chainConfig.description : undefined,
    };
  }

  private getCachedConfig(configPath: string): ParsedHttpCraftConfig | null {
    const cached = this.configCache.get(configPath);
    const timestamp = this.cacheTimestamps.get(configPath);

    if (cached && timestamp && Date.now() - timestamp < this.cacheTimeout) {
      return cached;
    }

    // Remove expired cache
    if (cached) {
      this.configCache.delete(configPath);
      this.cacheTimestamps.delete(configPath);
    }

    return null;
  }

  private setCachedConfig(configPath: string, config: ParsedHttpCraftConfig): void {
    this.configCache.set(configPath, config);
    this.cacheTimestamps.set(configPath, Date.now());
  }

  private getDefaultConfigPath(): string {
    // HTTPCraft default configuration paths
    return process.env.HTTPCRAFT_CONFIG || './httpcraft.yaml';
  }
}

// Global instance
export const configDiscovery = new ConfigDiscoveryService();
