/**
 * Discovery Tools
 * Tools for discovering HTTPCraft configuration (APIs, endpoints, profiles)
 */

import { BaseTool, type ToolExecutionContext } from './base.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  ListApisSchema,
  ListEndpointsSchema,
  ListProfilesSchema,
  type ListApisParams,
  type ListEndpointsParams,
  type ListProfilesParams,
} from '../schemas/tools.js';
import { logger } from '../utils/logger.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';

/**
 * List APIs Tool
 * Lists all available APIs from HTTPCraft configuration
 */
export class ListApisTool extends BaseTool {
  public readonly name = 'httpcraft_list_apis';
  public readonly description = 'List all available APIs from HTTPCraft configuration';
  public readonly inputSchema = ListApisSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: ListApisParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Listing available APIs', {
      configPath: params.configPath,
      requestId: context.requestId,
    });

    // Build HTTPCraft command arguments
    const args = this.buildListApisArgs(params);

    // Execute HTTPCraft command
    const result = await this.httpcraft.executeWithTextOutput(args, {
      timeout: context.timeout || 30000,
    });

    if (!result.success) {
      logger.error('Failed to list APIs', {
        error: result.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(new Error(`Failed to list APIs: ${result.error?.message}`));
    }

    logger.debug('Successfully listed APIs', {
      apiCount: result.data.length,
      requestId: context.requestId,
    });

    return this.formatSuccess({
      success: true,
      apis: result.data,
      timestamp: new Date().toISOString(),
    });
  }

  private buildListApisArgs(params: ListApisParams): string[] {
    const args: string[] = ['--get-api-names'];

    // Config path (if specified)
    if (params.configPath) {
      args.push('--config', params.configPath);
    }

    return args;
  }
}

/**
 * List Endpoints Tool
 * Lists all endpoints for a specific API
 */
export class ListEndpointsTool extends BaseTool {
  public readonly name = 'httpcraft_list_endpoints';
  public readonly description = 'List all endpoints for a specific API';
  public readonly inputSchema = ListEndpointsSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: ListEndpointsParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Listing endpoints for API', {
      api: params.api,
      configPath: params.configPath,
      requestId: context.requestId,
    });

    // Build HTTPCraft command arguments
    const args = this.buildListEndpointsArgs(params);

    // Execute HTTPCraft command
    const result = await this.httpcraft.executeWithTextOutput(args, {
      timeout: context.timeout || 30000,
    });

    if (!result.success) {
      logger.error('Failed to list endpoints', {
        api: params.api,
        error: result.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(`Failed to list endpoints for API "${params.api}": ${result.error?.message}`)
      );
    }

    logger.debug('Successfully listed endpoints', {
      api: params.api,
      endpointCount: result.data.length,
      requestId: context.requestId,
    });

    return this.formatSuccess({
      success: true,
      api: params.api,
      endpoints: result.data,
      timestamp: new Date().toISOString(),
    });
  }

  private buildListEndpointsArgs(params: ListEndpointsParams): string[] {
    const args: string[] = ['--get-endpoint-names'];

    // API name
    args.push(params.api);

    // Config path (if specified)
    if (params.configPath) {
      args.push('--config', params.configPath);
    }

    return args;
  }
}

/**
 * List Profiles Tool
 * Lists all available profiles from HTTPCraft configuration
 */
export class ListProfilesTool extends BaseTool {
  public readonly name = 'httpcraft_list_profiles';
  public readonly description = 'List all available profiles from HTTPCraft configuration';
  public readonly inputSchema = ListProfilesSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: ListProfilesParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Listing available profiles', {
      configPath: params.configPath,
      requestId: context.requestId,
    });

    // Build HTTPCraft command arguments
    const args = this.buildListProfilesArgs(params);

    // Execute HTTPCraft command
    const result = await this.httpcraft.executeWithTextOutput(args, {
      timeout: context.timeout || 30000,
    });

    if (!result.success) {
      logger.error('Failed to list profiles', {
        error: result.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(new Error(`Failed to list profiles: ${result.error?.message}`));
    }

    logger.debug('Successfully listed profiles', {
      profileCount: result.data.length,
      requestId: context.requestId,
    });

    return this.formatSuccess({
      success: true,
      profiles: result.data,
      timestamp: new Date().toISOString(),
    });
  }

  private buildListProfilesArgs(params: ListProfilesParams): string[] {
    const args: string[] = ['--get-profile-names'];

    // Config path (if specified)
    if (params.configPath) {
      args.push('--config', params.configPath);
    }

    return args;
  }
}
