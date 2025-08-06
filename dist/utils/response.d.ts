/**
 * Response Formatting Utilities
 * Standardized response formatting for HTTPCraft MCP tools
 */
import type { ToolResult } from '../tools/base.js';
import type { HttpCraftResponse, ChainResponse, DiscoveryResponse } from '../schemas/tools.js';
/**
 * Format a successful HTTP response
 */
export declare function formatHttpResponse(response: HttpCraftResponse): ToolResult;
/**
 * Format a chain execution response
 */
export declare function formatChainResponse(response: ChainResponse): ToolResult;
/**
 * Format a discovery response (APIs, endpoints, profiles, etc.)
 */
export declare function formatDiscoveryResponse(response: DiscoveryResponse): ToolResult;
/**
 * Format an error response with context
 */
export declare function formatErrorResponse(error: Error | string, context?: {
    tool?: string;
    operation?: string;
    params?: any;
}): ToolResult;
/**
 * Format a simple text response
 */
export declare function formatTextResponse(text: string, isError?: boolean): ToolResult;
/**
 * Format structured data response
 */
export declare function formatDataResponse(data: any, isError?: boolean): ToolResult;
/**
 * Format validation error response
 */
export declare function formatValidationError(errors: string[]): ToolResult;
/**
 * Format HTTPCraft CLI error response
 */
export declare function formatHttpCraftError(stderr: string, exitCode: number, command?: string[]): ToolResult;
/**
 * Helper to extract meaningful error message from HTTPCraft output
 */
export declare function extractHttpCraftError(stderr: string): string;
//# sourceMappingURL=response.d.ts.map