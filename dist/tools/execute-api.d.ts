/**
 * Execute API Tool
 * Executes configured HTTPCraft API endpoints
 */
import { BaseTool, type ToolResult, type ToolExecutionContext } from './base.js';
import { type ExecuteApiParams } from '../schemas/tools.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';
export declare class ExecuteApiTool extends BaseTool {
    readonly name = "httpcraft_execute_api";
    readonly description = "Execute a configured API endpoint using HTTPCraft with profiles and environments";
    readonly inputSchema: import("zod").ZodObject<{
        api: import("zod").ZodString;
        endpoint: import("zod").ZodString;
        profile: import("zod").ZodString;
        environment: import("zod").ZodOptional<import("zod").ZodString>;
        variables: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
        configPath: import("zod").ZodOptional<import("zod").ZodString>;
        timeout: import("zod").ZodOptional<import("zod").ZodNumber>;
    }, "strip", import("zod").ZodTypeAny, {
        api: string;
        endpoint: string;
        profile: string;
        timeout?: number | undefined;
        environment?: string | undefined;
        variables?: Record<string, any> | undefined;
        configPath?: string | undefined;
    }, {
        api: string;
        endpoint: string;
        profile: string;
        timeout?: number | undefined;
        environment?: string | undefined;
        variables?: Record<string, any> | undefined;
        configPath?: string | undefined;
    }>;
    constructor(httpcraft: HttpCraftCli);
    protected executeInternal(params: ExecuteApiParams, context: ToolExecutionContext): Promise<ToolResult>;
    /**
     * Build HTTPCraft command arguments for API execution
     */
    private buildCommandArgs;
    /**
     * Parse and format the response using the enhanced parser
     */
    private parseAndFormatResponse;
}
//# sourceMappingURL=execute-api.d.ts.map