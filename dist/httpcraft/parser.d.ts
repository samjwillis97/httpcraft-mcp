/**
 * HTTPCraft response parsing utilities
 */
import type { AsyncResult } from '../types/index.js';
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
export declare class ResponseParser {
    /**
     * Parse HTTPCraft command output
     */
    parseOutput(stdout: string, stderr: string, command: string): AsyncResult<HttpCraftOutput>;
    /**
     * Parse HTTP response from HTTPCraft output
     */
    private parseResponse;
    /**
     * Attempt to parse output as JSON
     */
    private tryParseAsJson;
    /**
     * Parse output as raw text
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