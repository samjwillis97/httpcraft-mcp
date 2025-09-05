/**
 * Base Tool Class
 * Provides common functionality for all HTTPCraft MCP tools
 */

import { z } from 'zod';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';

export interface ToolExecutionContext {
  requestId?: string;
  timestamp: Date;
  timeout?: number;
}

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract readonly inputSchema: z.ZodSchema<any>;

  protected readonly httpcraft: HttpCraftCli;

  constructor(httpcraft: HttpCraftCli) {
    this.httpcraft = httpcraft;
  }

  /**
   * Get the MCP tool definition
   */
  public getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.zodToJsonSchema(this.inputSchema),
    };
  }

  /**
   * Execute the tool with validated parameters
   */
  public async execute(
    params: unknown,
    context: ToolExecutionContext = { timestamp: new Date() }
  ): Promise<CallToolResult> {
    const startTime = Date.now();

    try {
      logger.debug(`Executing tool: ${this.name}`, {
        params,
        requestId: context.requestId,
      });

      // Validate input parameters
      const validatedParams = this.validateInput(params);

      // Execute the tool logic
      const result = await this.executeInternal(validatedParams, context);

      const duration = Date.now() - startTime;
      logger.debug(`Tool execution completed: ${this.name}`, {
        duration,
        requestId: context.requestId,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        `Tool execution failed: ${this.name}`,
        {
          error: error instanceof Error ? error.message : String(error),
          duration,
          requestId: context.requestId,
        },
        error instanceof Error ? error : undefined
      );

      return this.formatError(error);
    }
  }

  /**
   * Internal execution method to be implemented by subclasses
   */
  protected abstract executeInternal(
    params: z.infer<typeof this.inputSchema>,
    context: ToolExecutionContext
  ): Promise<CallToolResult>;

  /**
   * Validate input parameters using Zod schema
   */
  protected validateInput(params: unknown): z.infer<typeof this.inputSchema> {
    try {
      return this.inputSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new Error(`Parameter validation failed: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Format successful response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected formatSuccess(data: any, mimeType?: string): CallToolResult {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const inferredMimeType =
      mimeType || (typeof data === 'string' ? 'application/json' : 'application/json');

    return {
      content: [
        {
          type: 'text',
          text,
          mimeType: inferredMimeType,
        },
      ],
      isError: false,
    };
  }

  /**
   * Format error response
   */
  protected formatError(error: unknown): CallToolResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              message,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
          mimeType: 'application/json',
        },
      ],
      isError: true,
    };
  }

  /**
   * Convert Zod schema to JSON Schema using proper zod-to-json-schema library
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private zodToJsonSchema(schema: z.ZodSchema<any>): any {
    return zodToJsonSchema(schema, {
      name: undefined, // Don't add a $schema reference
      target: 'openApi3', // Use OpenAPI 3.0 compatible output
      strictUnions: true, // Be strict about union types
      errorMessages: true, // Include error messages in schema
      $refStrategy: 'none', // Don't use $ref references for cleaner output
    });
  }
}
