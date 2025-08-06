/**
 * Execute Request Tool
 * Executes standalone HTTP requests using HTTPCraft
 */
import { BaseTool, type ToolResult, type ToolExecutionContext } from './base.js';
import { type ExecuteRequestParams } from '../schemas/tools.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';
export declare class ExecuteRequestTool extends BaseTool {
    readonly name = "httpcraft_execute_request";
    readonly description = "Execute a standalone HTTP request using HTTPCraft with full control over method, URL, headers, and body";
    readonly inputSchema: import("zod").ZodObject<{
        method: import("zod").ZodEnum<["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]>;
        url: import("zod").ZodString;
        headers: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>>;
        body: import("zod").ZodOptional<import("zod").ZodString>;
        profile: import("zod").ZodOptional<import("zod").ZodString>;
        variables: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
        configPath: import("zod").ZodOptional<import("zod").ZodString>;
        timeout: import("zod").ZodOptional<import("zod").ZodNumber>;
        followRedirects: import("zod").ZodOptional<import("zod").ZodBoolean>;
        maxRedirects: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, "strip", import("zod").ZodTypeAny, {
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
        url: string;
        timeout?: number | undefined;
        profile?: string | undefined;
        variables?: Record<string, any> | undefined;
        configPath?: string | undefined;
        headers?: Record<string, string> | undefined;
        body?: string | undefined;
        followRedirects?: boolean | undefined;
        maxRedirects?: number | undefined;
    }, {
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
        url: string;
        timeout?: number | undefined;
        profile?: string | undefined;
        variables?: Record<string, any> | undefined;
        configPath?: string | undefined;
        headers?: Record<string, string> | undefined;
        body?: string | undefined;
        followRedirects?: boolean | undefined;
        maxRedirects?: number | undefined;
    }>;
    constructor(httpcraft: HttpCraftCli);
    protected executeInternal(params: ExecuteRequestParams, context: ToolExecutionContext): Promise<ToolResult>;
    /**
     * Build HTTPCraft command arguments for standalone request execution
     */
    private buildCommandArgs;
    /**
     * Parse and format the response using the enhanced parser
     */
    private parseAndFormatResponse;
}
//# sourceMappingURL=execute-request.d.ts.map