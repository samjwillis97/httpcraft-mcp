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
  public readonly description =
    'Execute a configured API endpoint using HTTPCraft with profiles and environments';
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

    // Build HTTPCraft command arguments
    const args = this.buildCommandArgs(params);

    // Execute HTTPCraft command
    const result = await this.httpcraft.execute(args, {
      timeout: params.timeout || context.timeout || 30000,
    });

    if (!result.success) {
      logger.error('HTTPCraft CLI execution failed', {
        error: result.error?.message,
        requestId: context.requestId,
      });

      return formatHttpCraftError(result.error?.message || 'Unknown error', -1, undefined, args);
    }

    const httpcraftResult = result.data;

    // Handle HTTPCraft command failure
    if (!httpcraftResult.success) {
      const errorMessage = extractHttpCraftError(httpcraftResult.stderr);
      logger.error('HTTPCraft command failed', {
        exitCode: httpcraftResult.exitCode,
        stderr: httpcraftResult.stderr,
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
   * Build HTTPCraft command arguments for API execution
   */
  private buildCommandArgs(params: ExecuteApiParams): string[] {
    const args: string[] = ['api', 'exec'];

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

    const parseResult = await parser.parseHttpCraftOutput(httpcraftResult.stdout);

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

    // Validate the parsed response
    const validation = parser.validateResponse(response);
    if (!validation.valid) {
      logger.warn('HTTPCraft response validation failed', {
        errors: validation.errors,
        requestId: context.requestId,
      });
    }

    logger.debug('API execution completed successfully', {
      statusCode: response.statusCode,
      responseSize: JSON.stringify(response.data).length,
      requestId: context.requestId,
    });

    return formatHttpResponse(response);
  }
}
