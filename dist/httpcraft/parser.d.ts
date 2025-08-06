/**
 * HTTPCraft response parsing utilities
 */
import type { AsyncResult } from '../types/index.js';
import type { HttpCraftResponse } from '../schemas/tools.js';
export interface ParsedResponse {
    readonly raw: string;
    readonly data?: unknown;
    readonly contentType?: string;
    readonly statusCode?: number;
    readonly headers?: Record<string, string>;
    readonly isJson: boolean;
    readonly size: number;
}
export interface HttpCraftOutput {
    readonly response?: ParsedResponse;
    readonly error?: string;
    readonly metadata: {
        readonly duration?: number;
        readonly timestamp: string;
        readonly command: string;
    };
}
export interface ParseOptions {
    maxResponseSize?: number;
    validateJson?: boolean;
    preserveRawOutput?: boolean;
}
export declare class ResponseParser {
    private readonly defaultOptions;
    /**
     * Parse HTTPCraft command output (legacy method for backward compatibility)
     */
    parseOutput(stdout: string, stderr: string, command: string): AsyncResult<HttpCraftOutput>;
    /**
     * Parse HTTPCraft CLI output into structured response (new method)
     */
    parseHttpCraftOutput(stdout: string, options?: ParseOptions): AsyncResult<HttpCraftResponse>;
    /**
     * Parse HTTPCraft JSON output
     */
    private parseJsonOutput;
    /**
     * Parse HTTPCraft text output as fallback
     */
    private parseTextOutput;
    /**
     * Extract status code from text output
     */
    private extractStatusCode;
    /**
     * Extract headers from text output
     */
    private extractHeaders;
    /**
     * Extract response data from text output
     */
    private extractDataFromText;
    /**
     * Extract response data from JSON output
     */
    private extractResponseData;
    /**
     * Normalize header names to lowercase
     */
    private normalizeHeaders;
    /**
     * Extract error information from HTTPCraft stderr
     */
    parseError(stderr: string): string;
    /**
     * Validate that the parsed response is reasonable
     */
    validateResponse(response: HttpCraftResponse): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Parse HTTP response from HTTPCraft output (legacy method)
     */
    private parseResponse;
    /**
     * Attempt to parse output as JSON (legacy method)
     */
    private tryParseAsJson;
    /**
     * Parse output as raw text (legacy method)
     */
    private parseAsRawText;
    /**
     * Extract JSON data from parsed response if available
     */
    extractJsonData<T = unknown>(response: ParsedResponse): T | null;
    /**
     * Check if response indicates success
     */
    isSuccessResponse(response: ParsedResponse): boolean;
}
//# sourceMappingURL=parser.d.ts.map