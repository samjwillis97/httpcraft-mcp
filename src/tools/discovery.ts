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
  ListVariablesSchema,
  DescribeApiSchema,
  DescribeEndpointSchema,
  DescribeProfileSchema,
  type ListApisParams,
  type ListEndpointsParams,
  type ListProfilesParams,
  type ListVariablesParams,
  type DescribeApiParams,
  type DescribeEndpointParams,
  type DescribeProfileParams,
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

    // Use the new HTTPCraft list apis command
    const result = await this.httpcraft.listApis(params.configPath);

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

    // Use the new HTTPCraft list endpoints command
    const result = await this.httpcraft.listEndpoints(params.api, params.configPath);

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

    // Use the new HTTPCraft list profiles command
    const result = await this.httpcraft.listProfiles(params.configPath);

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
}

/**
 * Describe API Tool
 * Provides detailed information about a specific API
 */
export class DescribeApiTool extends BaseTool {
  public readonly name = 'httpcraft_describe_api';
  public readonly description = 'Get detailed information about a specific API';
  public readonly inputSchema = DescribeApiSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: DescribeApiParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Describing API', {
      name: params.name,
      configPath: params.configPath,
      requestId: context.requestId,
    });

    // Use the new HTTPCraft describe api command
    const result = await this.httpcraft.describeApi(params.name, params.configPath);

    if (!result.success) {
      logger.error('Failed to describe API', {
        name: params.name,
        error: result.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(`Failed to describe API "${params.name}": ${result.error?.message}`)
      );
    }

    logger.debug('Successfully described API', {
      name: params.name,
      requestId: context.requestId,
    });

    return this.formatSuccess({
      success: true,
      api: result.data,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Describe Endpoint Tool
 * Provides detailed information about a specific endpoint
 */
export class DescribeEndpointTool extends BaseTool {
  public readonly name = 'httpcraft_describe_endpoint';
  public readonly description = 'Get detailed information about a specific endpoint';
  public readonly inputSchema = DescribeEndpointSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: DescribeEndpointParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Describing endpoint', {
      api: params.api,
      endpoint: params.endpoint,
      configPath: params.configPath,
      requestId: context.requestId,
    });

    // Use the new HTTPCraft describe endpoint command
    const result = await this.httpcraft.describeEndpoint(
      params.api,
      params.endpoint,
      params.configPath
    );

    if (!result.success) {
      logger.error('Failed to describe endpoint', {
        api: params.api,
        endpoint: params.endpoint,
        error: result.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(
          `Failed to describe endpoint "${params.api}.${params.endpoint}": ${result.error?.message}`
        )
      );
    }

    logger.debug('Successfully described endpoint', {
      api: params.api,
      endpoint: params.endpoint,
      requestId: context.requestId,
    });

    return this.formatSuccess({
      success: true,
      endpoint: result.data,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Describe Profile Tool
 * Provides detailed information about a specific profile
 */
export class DescribeProfileTool extends BaseTool {
  public readonly name = 'httpcraft_describe_profile';
  public readonly description = 'Get detailed information about a specific profile';
  public readonly inputSchema = DescribeProfileSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: DescribeProfileParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Describing profile', {
      name: params.name,
      configPath: params.configPath,
      requestId: context.requestId,
    });

    // Use the new HTTPCraft describe profile command
    const result = await this.httpcraft.describeProfile(params.name, params.configPath);

    if (!result.success) {
      logger.error('Failed to describe profile', {
        name: params.name,
        error: result.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(`Failed to describe profile "${params.name}": ${result.error?.message}`)
      );
    }

    logger.debug('Successfully described profile', {
      name: params.name,
      requestId: context.requestId,
    });

    return this.formatSuccess({
      success: true,
      profile: result.data,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * List Variables Tool
 * Lists all available variables from different sources
 */
export class ListVariablesTool extends BaseTool {
  public readonly name = 'httpcraft_list_variables';
  public readonly description =
    'List all available variables from profiles, APIs, endpoints, and global sources';
  public readonly inputSchema = ListVariablesSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: ListVariablesParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Listing variables', {
      profiles: params.profiles,
      api: params.api,
      endpoint: params.endpoint,
      requestId: context.requestId,
    });

    const result = await this.httpcraft.listVariables(
      params.configPath,
      params.profiles,
      params.api,
      params.endpoint
    );

    if (!result.success) {
      logger.error('Failed to list variables', {
        error: result.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(new Error(`Failed to list variables: ${result.error?.message}`));
    }

    logger.debug('Successfully listed variables', {
      variableCount: result.data.length,
      requestId: context.requestId,
    });

    return this.formatSuccess({
      success: true,
      variables: result.data,
      timestamp: new Date().toISOString(),
    });
  }
}
