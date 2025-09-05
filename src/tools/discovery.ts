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
  public readonly description = `List all available APIs from HTTPCraft configuration.

Discover the APIs configured in your HTTPCraft setup. This is typically the first step in exploring available functionality and understanding what endpoints you can test.

Returns:
- API names and descriptions
- Base URLs for each API
- Number of available endpoints per API
- Configuration metadata

Use this tool to:
- Discover available APIs before making requests
- Understand the scope of configured services
- Get an overview of your HTTPCraft setup
- Find the correct API name for httpcraft_execute_api calls

Follow up with httpcraft_list_endpoints to see available endpoints for a specific API.`;
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
  public readonly description = `List all endpoints for a specific API.

Discover the available endpoints within a specific API configuration. This shows you what operations you can perform on a given service.

Returns:
- Endpoint names and descriptions
- HTTP methods (GET, POST, PUT, DELETE, etc.)
- URL paths for each endpoint
- Brief description of endpoint functionality

Use this tool to:
- Explore available operations for a specific API
- Find the correct endpoint name for httpcraft_execute_api calls
- Understand the structure of an API service
- Plan your API testing strategy

Typically used after httpcraft_list_apis to drill down into a specific service. Follow up with httpcraft_describe_endpoint for detailed endpoint requirements.`;
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
  public readonly description = `List all available profiles from HTTPCraft configuration.

Profiles are environment-specific configurations that contain authentication credentials, base URLs, timeouts, default headers, and other settings. They enable the same API configuration to work across multiple environments (dev, staging, production).

Returns:
- Profile names and descriptions
- Which profile is set as default
- Number of configured variables per profile
- Environment-specific metadata

Use this tool to:
- Discover available execution environments
- Find the correct profile name for API calls
- Understand your deployment configuration
- Choose appropriate authentication contexts

Profiles typically include:
- Authentication tokens, API keys, or OAuth credentials
- Environment-specific base URLs
- Timeout and retry configurations
- Default headers and request settings
- Custom variables for environment-specific values

Essential for httpcraft_execute_api calls where you must specify which profile (environment) to use for execution.`;
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
  public readonly description = `Get detailed information about a specific API configuration.

Provides comprehensive details about an API including its configuration, available endpoints, base URLs, authentication requirements, and defined variables. Essential for understanding how to properly use an API.

Returns:
- Complete API configuration details
- Base URL and authentication settings
- All available endpoints with descriptions
- API-level variables and their usage
- Configuration metadata and documentation

Use this tool to:
- Understand the complete structure of an API
- Learn authentication requirements and setup
- See all available endpoints at once
- Understand API-level variables and configuration
- Get context before making API calls

Provides the foundation knowledge needed for effective API testing and helps you understand the relationships between endpoints within a service.`;
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
  public readonly description = `Get detailed information about a specific endpoint within an API.

Provides comprehensive details about a specific endpoint including parameters, headers, request body format, response format, and any endpoint-specific configuration. Critical for understanding how to properly call an endpoint.

Returns:
- HTTP method and complete URL path
- Required and optional parameters (path, query, body)
- Expected request headers and authentication
- Request body format and schema
- Response format and status codes
- Endpoint-specific variables and configuration

Use this tool to:
- Understand exact parameter requirements before making calls
- Learn the proper request format and headers
- See expected response structure
- Debug endpoint-specific issues
- Validate your request parameters

Essential step before calling httpcraft_execute_api to ensure you provide the correct parameters and understand the expected response format.`;
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
  public readonly description = `Get detailed information about a specific profile configuration.

Profiles define environment-specific settings including authentication credentials, base URLs, timeouts, default headers, and custom variables. Understanding profile configuration is essential for proper API execution.

Returns:
- Complete profile configuration details
- Authentication settings and credentials (masked for security)
- Timeout and retry configurations
- Default headers and request settings
- Profile-specific variables and their values
- Environment-specific base URLs and endpoints

Use this tool to:
- Understand authentication requirements for a profile
- See timeout and retry settings
- Verify profile-specific variables are configured correctly
- Debug profile-related execution issues
- Plan appropriate profile usage for different environments

Security note: Sensitive values like passwords and API keys are masked in the output for security. Use this tool to verify configuration structure without exposing credentials.

Essential for understanding how different environments (dev, staging, prod) are configured and what authentication context will be used for API calls.`;
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
  public readonly description = `List all available variables from profiles, APIs, endpoints, and global sources.

Variables are dynamic values that can be injected into API requests, enabling parameterized testing and environment-specific configuration. They can be defined at multiple levels with inheritance and override capabilities.

Variable sources (in priority order):
1. Command-line overrides (--var key=value)
2. Endpoint-specific variables
3. API-level variables  
4. Profile variables
5. Global/environment variables

Returns:
- Variable names and current values
- Source location (profile, API, endpoint, global)
- Scope information (where the variable applies)
- Active status (whether the variable is currently in effect)

Use this tool to:
- Discover available variables for parameterizing requests
- Understand variable inheritance and overrides
- Debug variable resolution issues
- Plan dynamic request scenarios

Common variable use cases:
- User IDs, resource IDs for dynamic endpoints
- Authentication tokens and API keys
- Environment-specific URLs and configuration
- Test data values for different scenarios
- Feature flags and conditional logic

Filter options allow you to see variables specific to particular profiles, APIs, or endpoints for focused exploration.`;
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
