/**
 * Execute API Tool
 * Executes configured HTTPCraft API endpoints
 */

import { BaseTool, type ToolExecutionContext } from './base.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ExecuteApiSchema, type ExecuteApiParams } from '../schemas/tools.js';
import {
  formatHttpResponse,
  formatHttpCraftError,
  extractHttpCraftError,
} from '../utils/response.js';
import { logger } from '../utils/logger.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpCraftExecuteResult = any;

export class ExecuteApiTool extends BaseTool {
  public readonly name = 'httpcraft_execute_api';
  public readonly description = `Execute a configured API endpoint using HTTPCraft with profiles and environments.

Use this tool for testing pre-configured API endpoints with built-in authentication, variable substitution, and environment-specific settings. This is the preferred method when you have HTTPCraft configuration files defining your APIs.

Typical workflow:
1. Use httpcraft_list_apis to discover available APIs
2. Use httpcraft_list_endpoints to see available endpoints for an API
3. Use httpcraft_describe_endpoint to understand endpoint requirements and parameters
4. Execute the endpoint with appropriate profile and variables

Key concepts:
- APIs: Pre-configured service definitions with base URLs, authentication, and endpoint definitions
- Endpoints: Specific API operations (GET /users, POST /orders, etc.) with defined parameters
- Profiles: Environment-specific configurations containing authentication credentials, base URLs, timeouts, and default headers
- Variables: Dynamic values that can be injected into requests (user IDs, tokens, etc.)
- Environments: Optional environment overrides for multi-stage deployments (dev, staging, prod)

Use this over httpcraft_execute_request when you have established API configurations and want to leverage HTTPCraft's advanced features like authentication flows, variable resolution, and configuration management.`;
  public readonly inputSchema = ExecuteApiSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: ExecuteApiParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Executing API endpoint', {
      api: params.api,
      endpoint: params.endpoint,
      profile: params.profile,
      requestId: context.requestId,
    });

    // Validate configuration before execution (only if available)
    try {
      const validationResult = await this.validateConfiguration(params, context);
      if (!validationResult.success) {
        return validationResult.error;
      }
    } catch (validationError) {
      // If validation fails due to missing methods or other issues,
      // log warning and continue without validation for backward compatibility
      logger.warn('Configuration validation failed, proceeding without validation', {
        error: (validationError as Error).message,
        requestId: context.requestId,
      });
    }

    // Build HTTPCraft command arguments
    const args = this.buildCommandArgs(params);

    // Execute HTTPCraft command
    const result = await this.httpcraft.execute(args, {
      timeout: params.timeout || context.timeout || 30000,
    });

    if (!result.success) {
      logger.error('HTTPCraft CLI execution failed', {
        error: result.error?.message || 'Process execution failed',
        requestId: context.requestId,
      });

      // Extract meaningful error message from the process execution error
      const errorMessage = result.error?.message || 'HTTPCraft execution failed';
      return formatHttpCraftError(errorMessage, -1, undefined, args);
    }

    const httpcraftResult = result.data;

    // Handle HTTPCraft command failure
    if (!httpcraftResult.success) {
      // Check both stderr and stdout for error messages
      const errorMessage =
        extractHttpCraftError(httpcraftResult.stderr) !== 'Unknown HTTPCraft error'
          ? extractHttpCraftError(httpcraftResult.stderr)
          : extractHttpCraftError(httpcraftResult.stdout);

      logger.error('HTTPCraft command failed', {
        exitCode: httpcraftResult.exitCode,
        stderr: httpcraftResult.stderr,
        stdout: httpcraftResult.stdout,
        requestId: context.requestId,
      });

      return formatHttpCraftError(
        errorMessage,
        httpcraftResult.exitCode,
        httpcraftResult.stderr,
        args
      );
    }

    // Parse and format the response
    try {
      return await this.parseAndFormatResponse(httpcraftResult, context);
    } catch (parseError) {
      logger.error('Failed to parse HTTPCraft output', {
        error: (parseError as Error).message,
        stdout: httpcraftResult.stdout,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(`Failed to parse HTTPCraft response: ${(parseError as Error).message}`)
      );
    }
  }

  /**
   * Validate configuration before execution using HTTPCraft describe commands
   */
  private async validateConfiguration(
    params: ExecuteApiParams,
    context: ToolExecutionContext
  ): Promise<{ success: true } | { success: false; error: CallToolResult }> {
    // Validate API exists and get description
    const apiResult = await this.httpcraft.describeApi(params.api, params.configPath);
    if (!apiResult.success) {
      logger.warn('Failed to validate API configuration', {
        api: params.api,
        error: apiResult.error?.message,
        requestId: context.requestId,
      });

      return {
        success: false,
        error: this.formatError(
          new Error(`API "${params.api}" not found or invalid: ${apiResult.error?.message}`)
        ),
      };
    }

    // Validate endpoint exists in the API
    const endpointResult = await this.httpcraft.describeEndpoint(
      params.api,
      params.endpoint,
      params.configPath
    );
    if (!endpointResult.success) {
      logger.warn('Failed to validate endpoint configuration', {
        api: params.api,
        endpoint: params.endpoint,
        error: endpointResult.error?.message,
        requestId: context.requestId,
      });

      return {
        success: false,
        error: this.formatError(
          new Error(
            `Endpoint "${params.endpoint}" not found in API "${params.api}": ${endpointResult.error?.message}`
          )
        ),
      };
    }

    // Validate profile exists
    const profileResult = await this.httpcraft.describeProfile(params.profile, params.configPath);
    if (!profileResult.success) {
      logger.warn('Failed to validate profile configuration', {
        profile: params.profile,
        error: profileResult.error?.message,
        requestId: context.requestId,
      });

      return {
        success: false,
        error: this.formatError(
          new Error(
            `Profile "${params.profile}" not found or invalid: ${profileResult.error?.message}`
          )
        ),
      };
    }

    logger.debug('Configuration validation successful', {
      api: params.api,
      endpoint: params.endpoint,
      profile: params.profile,
      requestId: context.requestId,
    });

    return { success: true };
  }

  /**
   * Build HTTPCraft command arguments for API execution
   */
  private buildCommandArgs(params: ExecuteApiParams): string[] {
    const args: string[] = [];

    // API and endpoint
    args.push(params.api, params.endpoint);
    // Profile
    args.push('--profile', params.profile);

    // Environment (if specified)
    if (params.environment) {
      args.push('--env', params.environment);
    }

    // Variables (if specified)
    if (params.variables && Object.keys(params.variables).length > 0) {
      for (const [key, value] of Object.entries(params.variables)) {
        args.push('--var', `${key}=${String(value)}`);
      }
    }

    // Config path (if specified)
    if (params.configPath) {
      args.push('--config', params.configPath);
    }

    // Request JSON output for easier parsing
    args.push('--json');

    return args;
  }

  /**
   * Parse and format the response using the enhanced parser
   */
  private async parseAndFormatResponse(
    httpcraftResult: HttpCraftExecuteResult,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    const { ResponseParser } = await import('../httpcraft/parser.js');
    const parser = new ResponseParser();

    const parseResult = parser.parseHttpCraftOutput(httpcraftResult.stdout);

    if (!parseResult.success) {
      logger.error('Failed to parse HTTPCraft output', {
        error: parseResult.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(`Failed to parse HTTPCraft response: ${parseResult.error?.message}`)
      );
    }

    const response = parseResult.data;

    logger.debug('API execution completed successfully', {
      success: response.success,
      statusCode: response.statusCode,
      requestId: context.requestId,
    });

    return formatHttpResponse(response);
  }
}
