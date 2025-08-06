/**
 * Base Tool Class
 * Provides common functionality for all HTTPCraft MCP tools
 */
import { z } from 'zod';
import { logger } from '../utils/logger.js';
export class BaseTool {
    httpcraft;
    constructor(httpcraft) {
        this.httpcraft = httpcraft;
    }
    /**
     * Get the MCP tool definition
     */
    getToolDefinition() {
        return {
            name: this.name,
            description: this.description,
            inputSchema: this.zodToJsonSchema(this.inputSchema),
        };
    }
    /**
     * Execute the tool with validated parameters
     */
    async execute(params, context = { timestamp: new Date() }) {
        const startTime = Date.now();
        try {
            logger.debug(`Executing tool: ${this.name}`, {
                params,
                requestId: context.requestId
            });
            // Validate input parameters
            const validatedParams = this.validateInput(params);
            // Execute the tool logic
            const result = await this.executeInternal(validatedParams, context);
            const duration = Date.now() - startTime;
            logger.debug(`Tool execution completed: ${this.name}`, {
                duration,
                requestId: context.requestId
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Tool execution failed: ${this.name}`, {
                error: error instanceof Error ? error.message : String(error),
                duration,
                requestId: context.requestId
            }, error instanceof Error ? error : undefined);
            return this.formatError(error);
        }
    }
    /**
     * Validate input parameters using Zod schema
     */
    validateInput(params) {
        try {
            return this.inputSchema.parse(params);
        }
        catch (error) {
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
    formatSuccess(data, mimeType = 'application/json') {
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        return {
            content: [
                {
                    type: 'text',
                    text,
                    mimeType,
                },
            ],
            isError: false,
        };
    }
    /**
     * Format error response
     */
    formatError(error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: true,
                        message,
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                    mimeType: 'application/json',
                },
            ],
            isError: true,
        };
    }
    /**
     * Convert Zod schema to JSON Schema
     */
    zodToJsonSchema(schema) {
        // Simple conversion for basic types
        // In a production implementation, you might want to use a library like zod-to-json-schema
        if (schema instanceof z.ZodObject) {
            const shape = schema.shape;
            const properties = {};
            const required = [];
            for (const [key, value] of Object.entries(shape)) {
                if (value instanceof z.ZodString) {
                    properties[key] = { type: 'string' };
                    if (value._def.description) {
                        properties[key].description = value._def.description;
                    }
                }
                else if (value instanceof z.ZodNumber) {
                    properties[key] = { type: 'number' };
                    if (value._def.description) {
                        properties[key].description = value._def.description;
                    }
                }
                else if (value instanceof z.ZodBoolean) {
                    properties[key] = { type: 'boolean' };
                    if (value._def.description) {
                        properties[key].description = value._def.description;
                    }
                }
                else if (value instanceof z.ZodOptional) {
                    // Handle optional fields
                    continue;
                }
                else {
                    properties[key] = { type: 'object' };
                }
                // Check if field is required
                if (!(value instanceof z.ZodOptional)) {
                    required.push(key);
                }
            }
            return {
                type: 'object',
                properties,
                required,
            };
        }
        return { type: 'object' };
    }
}
//# sourceMappingURL=base.js.map