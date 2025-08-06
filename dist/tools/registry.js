/**
 * Tool Registry
 * Manages registration and discovery of HTTPCraft MCP tools
 */
import { logger } from '../utils/logger.js';
export class ToolRegistry {
    tools = new Map();
    /**
     * Register a tool with the registry
     */
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool ${tool.name} is already registered`);
        }
        this.tools.set(tool.name, tool);
        logger.debug(`Registered tool: ${tool.name}`);
    }
    /**
     * Unregister a tool from the registry
     */
    unregister(toolName) {
        const success = this.tools.delete(toolName);
        if (success) {
            logger.debug(`Unregistered tool: ${toolName}`);
        }
        return success;
    }
    /**
     * Get a tool by name
     */
    getTool(toolName) {
        return this.tools.get(toolName);
    }
    /**
     * Get all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tool definitions for MCP protocol
     */
    getToolDefinitions() {
        return this.getAllTools().map(tool => tool.getToolDefinition());
    }
    /**
     * Execute a tool by name
     */
    async executeTool(toolName, params, context) {
        const tool = this.getTool(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }
        return tool.execute(params, context);
    }
    /**
     * Check if a tool is registered
     */
    hasTool(toolName) {
        return this.tools.has(toolName);
    }
    /**
     * Get the number of registered tools
     */
    getToolCount() {
        return this.tools.size;
    }
    /**
     * Clear all registered tools
     */
    clear() {
        const toolNames = Array.from(this.tools.keys());
        this.tools.clear();
        logger.debug(`Cleared all tools`, { toolNames });
    }
    /**
     * Get tool names
     */
    getToolNames() {
        return Array.from(this.tools.keys());
    }
}
// Global registry instance
export const toolRegistry = new ToolRegistry();
//# sourceMappingURL=registry.js.map