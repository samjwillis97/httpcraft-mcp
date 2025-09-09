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
   * Convert Zod schema to JSON Schema Draft 2020-12 compatible format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private zodToJsonSchema(schema: z.ZodSchema<any>): any {
    const jsonSchema = zodToJsonSchema(schema, {
      name: undefined, // Don't add a $schema reference
      target: 'jsonSchema7', // Use JSON Schema Draft 7 for maximum compatibility
      strictUnions: false, // Be less strict about union types for compatibility
      errorMessages: false, // Don't include custom error messages
      $refStrategy: 'none', // Don't use $ref references
      removeAdditionalStrategy: 'passthrough', // Allow additional properties
      definitionPath: 'definitions', // Use standard definitions path
    });

    // Clean up problematic patterns that aren't compatible with MCP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanSchema = this.cleanJsonSchema(jsonSchema as any);

    // Remove $schema property if it exists (not needed for MCP)
    if (cleanSchema && typeof cleanSchema === 'object' && cleanSchema.$schema) {
      delete cleanSchema.$schema;
    }

    return cleanSchema;
  }

  /**
   * Clean JSON Schema to ensure MCP compatibility
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cleanJsonSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    // Handle anyOf with "not": {} pattern (common with optional schemas)
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanedAnyOf = schema.anyOf.filter((item: any) => {
        // Remove the problematic "not": {} pattern
        return !(item.not && Object.keys(item.not).length === 0);
      });

      // If we only have one option left, unwrap it
      if (cleanedAnyOf.length === 1) {
        return this.cleanJsonSchema(cleanedAnyOf[0]);
      } else if (cleanedAnyOf.length > 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema.anyOf = cleanedAnyOf.map((item: any) => this.cleanJsonSchema(item));
      } else {
        // If all options were removed, return a permissive object schema
        return { type: 'object', additionalProperties: true };
      }
    }

    // Recursively clean nested schemas
    for (const [key, value] of Object.entries(schema)) {
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          schema[key] = value.map((item: any) => this.cleanJsonSchema(item));
        } else {
          schema[key] = this.cleanJsonSchema(value);
        }
      }
    }
    // Ensure object schemas have the type property
    if (schema.properties && !schema.type) {
      schema.type = 'object';
    }

    return schema;
  }
}
