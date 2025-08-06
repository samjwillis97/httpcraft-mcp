/**
 * Response Formatting Utilities
 * Standardized response formatting for HTTPCraft MCP tools
 */

import type { ToolResult } from '../tools/base.js';
import type { HttpCraftResponse, ChainResponse, DiscoveryResponse } from '../schemas/tools.js';

/**
 * Format a successful HTTP response
 */
export function formatHttpResponse(response: HttpCraftResponse): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: response.success,
          statusCode: response.statusCode,
          headers: response.headers,
          data: response.data,
          timing: response.timing,
        }, null, 2),
        mimeType: 'application/json',
      },
    ],
    isError: !response.success,
  };
}

/**
 * Format a chain execution response
 */
export function formatChainResponse(response: ChainResponse): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: response.success,
          totalSteps: response.steps.length,
          successfulSteps: response.steps.filter(s => s.success).length,
          failedStep: response.failedStep,
          totalDuration: response.totalDuration,
          steps: response.steps.map(step => ({
            name: step.name,
            success: step.success,
            statusCode: step.response?.statusCode,
            error: step.error,
          })),
        }, null, 2),
        mimeType: 'application/json',
      },
    ],
    isError: !response.success,
  };
}

/**
 * Format a discovery response (APIs, endpoints, profiles, etc.)
 */
export function formatDiscoveryResponse(response: DiscoveryResponse): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: response.success,
          data: response.data,
          error: response.error,
        }, null, 2),
        mimeType: 'application/json',
      },
    ],
    isError: !response.success,
  };
}

/**
 * Format an error response with context
 */
export function formatErrorResponse(
  error: Error | string,
  context?: {
    tool?: string;
    operation?: string;
    params?: any;
  }
): ToolResult {
  const message = error instanceof Error ? error.message : error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: true,
          message,
          context,
          timestamp: new Date().toISOString(),
        }, null, 2),
        mimeType: 'application/json',
      },
    ],
    isError: true,
  };
}

/**
 * Format a simple text response
 */
export function formatTextResponse(text: string, isError = false): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
    isError,
  };
}

/**
 * Format structured data response
 */
export function formatDataResponse(data: any, isError = false): ToolResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  return {
    content: [
      {
        type: 'text',
        text,
        mimeType: typeof data === 'string' ? 'text/plain' : 'application/json',
      },
    ],
    isError,
  };
}

/**
 * Format validation error response
 */
export function formatValidationError(errors: string[]): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: true,
          type: 'ValidationError',
          message: 'Parameter validation failed',
          details: errors,
          timestamp: new Date().toISOString(),
        }, null, 2),
        mimeType: 'application/json',
      },
    ],
    isError: true,
  };
}

/**
 * Format HTTPCraft CLI error response
 */
export function formatHttpCraftError(
  stderr: string,
  exitCode: number,
  command?: string[]
): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: true,
          type: 'HttpCraftError',
          message: 'HTTPCraft command failed',
          stderr,
          exitCode,
          command,
          timestamp: new Date().toISOString(),
        }, null, 2),
        mimeType: 'application/json',
      },
    ],
    isError: true,
  };
}

/**
 * Helper to extract meaningful error message from HTTPCraft output
 */
export function extractHttpCraftError(stderr: string): string {
  // Common HTTPCraft error patterns
  const patterns = [
    /Error: (.+)/,
    /error: (.+)/i,
    /failed: (.+)/i,
    /(.+): command not found/,
  ];

  for (const pattern of patterns) {
    const match = stderr.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback to full stderr if no pattern matches
  return stderr.trim() || 'Unknown HTTPCraft error';
}