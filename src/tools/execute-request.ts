/**
 * Execute Request Tool
 * Executes standalone HTTP requests using HTTPCraft
 */

import { BaseTool, type ToolExecutionContext } from './base.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ExecuteRequestSchema, type ExecuteRequestParams } from '../schemas/tools.js';
import {
  formatHttpResponse,
  formatHttpCraftError,
  extractHttpCraftError,
} from '../utils/response.js';
import { logger } from '../utils/logger.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpCraftExecuteResult = any;
export class ExecuteRequestTool extends BaseTool {
  public readonly name = 'httpcraft_execute_request';
  public readonly description = `Execute a standalone HTTP request using HTTPCraft with full control over method, URL, headers, and body.

Use this tool for ad-hoc HTTP requests, debugging, testing one-off endpoints, or when you don't have pre-configured API definitions. This provides direct control over all request parameters while still benefiting from HTTPCraft's response parsing and error handling.

Common use cases:
- Testing new API endpoints before adding them to configuration
- Making one-off requests with custom headers or authentication
- Debugging API responses with full request control
- Testing external APIs without creating formal configurations
- Quick API exploration and validation

Features:
- Full HTTP method support (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Custom headers and request body
- Optional profile integration for authentication and default settings
- Variable substitution for dynamic request parameters
- Redirect handling with configurable limits
- Response parsing with timing and metadata

For established APIs with repeated usage, prefer httpcraft_execute_api which provides better configuration management, authentication flows, and variable resolution.`;
  public readonly inputSchema = ExecuteRequestSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: ExecuteRequestParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Executing HTTP request', {
      method: params.method,
      url: params.url,
      profile: params.profile,
      hasBody: !!params.body,
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
   * Build HTTPCraft command arguments for standalone request execution
   */
  private buildCommandArgs(params: ExecuteRequestParams): string[] {
    const args: string[] = ['request'];

    // HTTP method
    args.push('--method', params.method);

    // URL
    args.push(params.url);

    // Headers (if specified)
    if (params.headers && Object.keys(params.headers).length > 0) {
      for (const [key, value] of Object.entries(params.headers)) {
        args.push('--header', `${key}: ${value}`);
      }
    }

    // Body (if specified)
    if (params.body) {
      args.push('--data', params.body);
    }

    // Profile (if specified)
    if (params.profile) {
      args.push('--profile', params.profile);
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

    // Follow redirects (if specified)
    if (params.followRedirects === false) {
      args.push('--no-follow-redirects');
    }

    // Max redirects (if specified)
    if (params.maxRedirects !== undefined) {
      args.push('--max-redirects', String(params.maxRedirects));
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

    logger.debug('HTTP request completed successfully', {
      statusCode: response.statusCode,
      responseSize: JSON.stringify(response.data).length,
      requestId: context.requestId,
    });

    return formatHttpResponse(response);
  }
}
