/**
 * Execute Request Tool
 * Executes standalone HTTP requests using HTTPCraft
 */
import { BaseTool } from './base.js';
import { ExecuteRequestSchema } from '../schemas/tools.js';
import { formatHttpResponse, formatHttpCraftError, extractHttpCraftError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
export class ExecuteRequestTool extends BaseTool {
    name = 'httpcraft_execute_request';
    description = 'Execute a standalone HTTP request using HTTPCraft with full control over method, URL, headers, and body';
    inputSchema = ExecuteRequestSchema;
    constructor(httpcraft) {
        super(httpcraft);
    }
    async executeInternal(params, context) {
        logger.debug('Executing HTTP request', {
            method: params.method,
            url: params.url,
            profile: params.profile,
            hasBody: !!params.body,
            requestId: context.requestId,
        });
        // Build HTTPCraft command arguments
        const args = this.buildCommandArgs(params);
        // Execute HTTPCraft command
        const result = await this.httpcraft.execute(args, {
            timeout: params.timeout || context.timeout || 30000,
        });
        if (!result.success) {
            logger.error('HTTPCraft CLI execution failed', {
                error: result.error?.message,
                requestId: context.requestId,
            });
            return formatHttpCraftError(result.error?.message || 'Unknown error', -1, args);
        }
        const httpcraftResult = result.data;
        // Handle HTTPCraft command failure
        if (!httpcraftResult.success) {
            const errorMessage = extractHttpCraftError(httpcraftResult.stderr);
            logger.error('HTTPCraft command failed', {
                exitCode: httpcraftResult.exitCode,
                stderr: httpcraftResult.stderr,
                requestId: context.requestId,
            });
            return formatHttpCraftError(httpcraftResult.stderr, httpcraftResult.exitCode, args);
        }
        // Parse and format the response
        try {
            return await this.parseAndFormatResponse(httpcraftResult, context);
        }
        catch (parseError) {
            logger.error('Failed to parse HTTPCraft output', {
                error: parseError.message,
                stdout: httpcraftResult.stdout,
                requestId: context.requestId,
            });
            return this.formatError(new Error(`Failed to parse HTTPCraft response: ${parseError.message}`));
        }
    }
    /**
     * Build HTTPCraft command arguments for standalone request execution
     */
    buildCommandArgs(params) {
        const args = ['request'];
        // HTTP method
        args.push('--method', params.method);
        // URL
        args.push(params.url);
        // Headers (if specified)
        if (params.headers && Object.keys(params.headers).length > 0) {
            for (const [key, value] of Object.entries(params.headers)) {
                args.push('--header', `${key}: ${value}`);
            }
        }
        // Body (if specified)
        if (params.body) {
            args.push('--data', params.body);
        }
        // Profile (if specified)
        if (params.profile) {
            args.push('--profile', params.profile);
        }
        // Variables (if specified)
        if (params.variables && Object.keys(params.variables).length > 0) {
            for (const [key, value] of Object.entries(params.variables)) {
                args.push('--var', `${key}=${String(value)}`);
            }
        }
        // Config path (if specified)
        if (params.configPath) {
            args.push('--config', params.configPath);
        }
        // Follow redirects (if specified)
        if (params.followRedirects === false) {
            args.push('--no-follow-redirects');
        }
        // Max redirects (if specified)
        if (params.maxRedirects !== undefined) {
            args.push('--max-redirects', String(params.maxRedirects));
        }
        // Request JSON output for easier parsing
        args.push('--json');
        return args;
    }
    /**
     * Parse and format the response using the enhanced parser
     */
    async parseAndFormatResponse(httpcraftResult, context) {
        const { ResponseParser } = await import('../httpcraft/parser.js');
        const parser = new ResponseParser();
        const parseResult = parser.parseHttpCraftOutput(httpcraftResult.stdout);
        if (!parseResult.success) {
            logger.error('Failed to parse HTTPCraft output', {
                error: parseResult.error?.message,
                requestId: context.requestId,
            });
            return this.formatError(new Error(`Failed to parse HTTPCraft response: ${parseResult.error?.message}`));
        }
        const response = parseResult.data;
        // Validate the parsed response
        const validation = parser.validateResponse(response);
        if (!validation.valid) {
            logger.warn('HTTPCraft response validation failed', {
                errors: validation.errors,
                requestId: context.requestId,
            });
        }
        logger.debug('HTTP request completed successfully', {
            statusCode: response.statusCode,
            responseSize: JSON.stringify(response.data).length,
            requestId: context.requestId,
        });
        return formatHttpResponse(response);
    }
}
//# sourceMappingURL=execute-request.js.map