/**
 * Base Tool Class
 * Provides common functionality for all HTTPCraft MCP tools
 */
import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';
export interface ToolResult {
    content: Array<{
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: string;
        mimeType?: string;
    }>;
    isError?: boolean;
}
export interface ToolExecutionContext {
    requestId?: string;
    timestamp: Date;
    timeout?: number;
}
export declare abstract class BaseTool {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly inputSchema: z.ZodSchema<any>;
    protected readonly httpcraft: HttpCraftCli;
    constructor(httpcraft: HttpCraftCli);
    /**
     * Get the MCP tool definition
     */
    getToolDefinition(): Tool;
    /**
     * Execute the tool with validated parameters
     */
    execute(params: unknown, context?: ToolExecutionContext): Promise<ToolResult>;
    /**
     * Internal execution method to be implemented by subclasses
     */
    protected abstract executeInternal(params: z.infer<typeof this.inputSchema>, context: ToolExecutionContext): Promise<ToolResult>;
    /**
     * Validate input parameters using Zod schema
     */
    protected validateInput(params: unknown): z.infer<typeof this.inputSchema>;
    /**
     * Format successful response
     */
    protected formatSuccess(data: any, mimeType?: string): ToolResult;
    /**
     * Format error response
     */
    protected formatError(error: unknown): ToolResult;
    /**
     * Convert Zod schema to JSON Schema
     */
    private zodToJsonSchema;
}
//# sourceMappingURL=base.d.ts.map