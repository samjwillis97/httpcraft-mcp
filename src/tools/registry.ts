/**
 * Tool Registry
 * Manages registration and discovery of HTTPCraft MCP tools
 */

import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { BaseTool, ToolExecutionContext } from './base.js';
import { logger } from '../utils/logger.js';

export class ToolRegistry {
  private readonly tools = new Map<string, BaseTool>();

  /**
   * Register a tool with the registry
   */
  public register(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }

    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool from the registry
   */
  public unregister(toolName: string): boolean {
    const success = this.tools.delete(toolName);
    if (success) {
      logger.debug(`Unregistered tool: ${toolName}`);
    }
    return success;
  }

  /**
   * Get a tool by name
   */
  public getTool(toolName: string): BaseTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all registered tools
   */
  public getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool definitions for MCP protocol
   */
  public getToolDefinitions(): Tool[] {
    return this.getAllTools().map(tool => tool.getToolDefinition());
  }

  /**
   * Execute a tool by name
   */
  public async executeTool(
    toolName: string,
    params: unknown,
    context?: ToolExecutionContext
  ): Promise<CallToolResult> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return tool.execute(params, context);
  }

  /**
   * Check if a tool is registered
   */
  public hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get the number of registered tools
   */
  public getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Clear all registered tools
   */
  public clear(): void {
    const toolNames = Array.from(this.tools.keys());
    this.tools.clear();
    logger.debug(`Cleared all tools`, { toolNames });
  }

  /**
   * Get tool names
   */
  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Global registry instance
export const toolRegistry = new ToolRegistry();
