/**
 * Tool Registry
 * Manages registration and discovery of HTTPCraft MCP tools
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { BaseTool, ToolResult, ToolExecutionContext } from './base.js';
export declare class ToolRegistry {
    private readonly tools;
    /**
     * Register a tool with the registry
     */
    register(tool: BaseTool): void;
    /**
     * Unregister a tool from the registry
     */
    unregister(toolName: string): boolean;
    /**
     * Get a tool by name
     */
    getTool(toolName: string): BaseTool | undefined;
    /**
     * Get all registered tools
     */
    getAllTools(): BaseTool[];
    /**
     * Get tool definitions for MCP protocol
     */
    getToolDefinitions(): Tool[];
    /**
     * Execute a tool by name
     */
    executeTool(toolName: string, params: unknown, context?: ToolExecutionContext): Promise<ToolResult>;
    /**
     * Check if a tool is registered
     */
    hasTool(toolName: string): boolean;
    /**
     * Get the number of registered tools
     */
    getToolCount(): number;
    /**
     * Clear all registered tools
     */
    clear(): void;
    /**
     * Get tool names
     */
    getToolNames(): string[];
}
export declare const toolRegistry: ToolRegistry;
//# sourceMappingURL=registry.d.ts.map