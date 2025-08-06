/**
 * HTTPCraft response parsing utilities
 */
import { z } from 'zod';
import { logger } from '../utils/logger.js';
// Schema for validating HTTPCraft JSON output
const HttpCraftJsonOutputSchema = z.object({
    status: z.number().optional(),
    statusCode: z.number().optional(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    data: z.any().optional(),
    response: z.any().optional(),
    duration: z.number().optional(),
    totalTime: z.number().optional(),
    timing: z.object({
        dns: z.number().optional(),
        connect: z.number().optional(),
        ssl: z.number().optional(),
        send: z.number().optional(),
        wait: z.number().optional(),
        receive: z.number().optional(),
    }).optional(),
});
export class ResponseParser {
    defaultOptions = {
        maxResponseSize: 10 * 1024 * 1024, // 10MB
        validateJson: true,
        preserveRawOutput: false,
    };
    /**
     * Parse HTTPCraft command output (legacy method for backward compatibility)
     */
    parseOutput(stdout, stderr, command) {
        logger.debug('Parsing HTTPCraft output', {
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
            command,
        });
        const metadata = {
            timestamp: new Date().toISOString(),
            command,
        };
        // If there's stderr content, treat it as an error
        if (stderr.trim()) {
            logger.warn('HTTPCraft command produced stderr output', { stderr });
            return {
                success: true,
                data: {
                    error: stderr.trim(),
                    metadata,
                },
            };
        }
        // If stdout is empty, return minimal response
        if (!stdout.trim()) {
            logger.warn('HTTPCraft command produced no output');
            return {
                success: true,
                data: {
                    error: 'No output from HTTPCraft command',
                    metadata,
                },
            };
        }
        // Try to parse the response
        const responseResult = this.parseResponse(stdout);
        if (!responseResult.success) {
            return {
                success: false,
                error: responseResult.error,
            };
        }
        return {
            success: true,
            data: {
                response: responseResult.data,
                metadata,
            },
        };
    }
    /**
     * Parse HTTPCraft CLI output into structured response (new method)
     */
    parseHttpCraftOutput(stdout, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        // Check response size limit
        if (stdout.length > opts.maxResponseSize) {
            logger.warn('HTTPCraft output exceeds size limit', {
                outputSize: stdout.length,
                maxSize: opts.maxResponseSize,
            });
            return {
                success: false,
                error: new Error(`Response size (${stdout.length} bytes) exceeds limit (${opts.maxResponseSize} bytes)`),
            };
        }
        // Try JSON parsing first
        const jsonResult = this.parseJsonOutput(stdout, opts.validateJson);
        if (jsonResult.success) {
            return { success: true, data: jsonResult.data };
        }
        // Fallback to text parsing
        const textResult = this.parseTextOutput(stdout);
        return { success: true, data: textResult };
    }
    /**
     * Parse HTTPCraft JSON output
     */
    parseJsonOutput(stdout, validate) {
        try {
            const jsonOutput = JSON.parse(stdout);
            // Validate JSON structure if requested
            if (validate) {
                const validationResult = HttpCraftJsonOutputSchema.safeParse(jsonOutput);
                if (!validationResult.success) {
                    logger.debug('HTTPCraft JSON output validation failed', {
                        errors: validationResult.error.errors,
                    });
                    return {
                        success: false,
                        error: new Error('Invalid HTTPCraft JSON structure'),
                    };
                }
            }
            const parsed = jsonOutput;
            const response = {
                success: true,
                statusCode: parsed.status || parsed.statusCode,
                headers: this.normalizeHeaders(parsed.headers || {}),
                data: this.extractResponseData(parsed),
                timing: {
                    total: parsed.duration || parsed.totalTime || 0,
                    dns: parsed.timing?.dns,
                    connect: parsed.timing?.connect,
                    ssl: parsed.timing?.ssl,
                    send: parsed.timing?.send,
                    wait: parsed.timing?.wait,
                    receive: parsed.timing?.receive,
                },
            };
            return { success: true, data: response };
        }
        catch (parseError) {
            logger.debug('Failed to parse HTTPCraft JSON output', {
                error: parseError.message,
            });
            return {
                success: false,
                error: new Error(`JSON parsing failed: ${parseError.message}`),
            };
        }
    }
    /**
     * Parse HTTPCraft text output as fallback
     */
    parseTextOutput(stdout) {
        const lines = stdout.split('\n').filter(line => line.trim());
        // Extract status code
        const statusCode = this.extractStatusCode(stdout);
        // Extract headers
        const headers = this.extractHeaders(stdout);
        // Extract response data
        const data = this.extractDataFromText(stdout, lines);
        return {
            success: true,
            statusCode,
            headers,
            data,
            timing: {
                total: 0, // Cannot extract timing from text output
            },
        };
    }
    /**
     * Extract status code from text output
     */
    extractStatusCode(output) {
        const patterns = [
            /Status:\s*(\d+)/i,
            /HTTP\/\d+\.\d+\s+(\d+)/,
            /Response\s+(\d+)/i,
            /(\d{3})\s+\w+/,
        ];
        for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) {
                const statusCode = parseInt(match[1], 10);
                if (statusCode >= 100 && statusCode < 600) {
                    return statusCode;
                }
            }
        }
        return undefined;
    }
    /**
     * Extract headers from text output
     */
    extractHeaders(output) {
        const headers = {};
        const headerRegex = /^([a-zA-Z-]+):\s*(.+)$/gm;
        let match;
        while ((match = headerRegex.exec(output)) !== null) {
            const key = match[1].trim();
            const value = match[2].trim();
            // Skip lines that don't look like HTTP headers
            if (key.includes(' ') || key.length > 50) {
                continue;
            }
            headers[key] = value;
        }
        return this.normalizeHeaders(headers);
    }
    /**
     * Extract response data from text output
     */
    extractDataFromText(output, lines) {
        // Try to find JSON in the output
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    return JSON.parse(trimmed);
                }
                catch {
                    // Continue searching
                }
            }
        }
        // Try to find JSON block in the output
        const jsonBlockMatch = output.match(/\{[\s\S]*\}/);
        if (jsonBlockMatch) {
            try {
                return JSON.parse(jsonBlockMatch[0]);
            }
            catch {
                // Fall through to return raw text
            }
        }
        // If no JSON found, return the entire output
        return output;
    }
    /**
     * Extract response data from JSON output
     */
    extractResponseData(parsed) {
        // Priority: body > data > response
        return parsed.body ?? parsed.data ?? parsed.response;
    }
    /**
     * Normalize header names to lowercase
     */
    normalizeHeaders(headers) {
        const normalized = {};
        for (const [key, value] of Object.entries(headers)) {
            normalized[key.toLowerCase()] = value;
        }
        return normalized;
    }
    /**
     * Extract error information from HTTPCraft stderr
     */
    parseError(stderr) {
        const errorPatterns = [
            /Error:\s*(.+)/,
            /error:\s*(.+)/i,
            /failed:\s*(.+)/i,
            /(.+):\s*command not found/,
            /(.+):\s*no such file or directory/i,
            /timeout:\s*(.+)/i,
            /connection\s+(.+)/i,
        ];
        for (const pattern of errorPatterns) {
            const match = stderr.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        // Return first non-empty line if no pattern matches
        const lines = stderr.split('\n').filter(line => line.trim());
        return lines[0]?.trim() || 'Unknown HTTPCraft error';
    }
    /**
     * Validate that the parsed response is reasonable
     */
    validateResponse(response) {
        const errors = [];
        // Check status code
        if (response.statusCode !== undefined) {
            if (response.statusCode < 100 || response.statusCode >= 600) {
                errors.push(`Invalid status code: ${response.statusCode}`);
            }
        }
        // Check headers
        if (response.headers) {
            for (const [key, value] of Object.entries(response.headers)) {
                if (typeof key !== 'string' || typeof value !== 'string') {
                    errors.push(`Invalid header: ${key} = ${value}`);
                }
            }
        }
        // Check timing
        if (response.timing) {
            if (response.timing.total < 0) {
                errors.push(`Invalid total timing: ${response.timing.total}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Parse HTTP response from HTTPCraft output (legacy method)
     */
    parseResponse(output) {
        try {
            // First, try to parse as JSON (for structured HTTPCraft output)
            const jsonResult = this.tryParseAsJson(output);
            if (jsonResult.success) {
                return jsonResult;
            }
            // If not JSON, treat as raw text response
            return this.parseAsRawText(output);
        }
        catch (error) {
            logger.error('Failed to parse HTTPCraft response', {}, error);
            return {
                success: false,
                error: new Error(`Response parsing failed: ${error.message}`),
            };
        }
    }
    /**
     * Attempt to parse output as JSON (legacy method)
     */
    tryParseAsJson(output) {
        try {
            const data = JSON.parse(output);
            logger.debug('Successfully parsed HTTPCraft output as JSON');
            return {
                success: true,
                data: {
                    raw: output,
                    data,
                    isJson: true,
                    contentType: 'application/json',
                    size: output.length,
                },
            };
        }
        catch {
            // Not valid JSON, which is fine
            return {
                success: false,
                error: new Error('Not valid JSON'),
            };
        }
    }
    /**
     * Parse output as raw text (legacy method)
     */
    parseAsRawText(output) {
        // Try to extract HTTP-like information from the output
        const lines = output.split('\n');
        let statusCode;
        let headers;
        let contentType;
        // Look for HTTP status line
        const statusMatch = lines[0]?.match(/HTTP\/[\d.]+\s+(\d+)/);
        if (statusMatch) {
            statusCode = parseInt(statusMatch[1], 10);
        }
        // Look for headers section
        const headerLines = lines.slice(1).filter(line => line.includes(':') && !line.startsWith(' '));
        if (headerLines.length > 0) {
            headers = {};
            for (const line of headerLines) {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    headers[key.trim().toLowerCase()] = value;
                    if (key.trim().toLowerCase() === 'content-type') {
                        contentType = value.split(';')[0]?.trim();
                    }
                }
            }
        }
        logger.debug('Parsed HTTPCraft output as raw text', {
            statusCode,
            contentType,
            headerCount: headers ? Object.keys(headers).length : 0,
        });
        return {
            success: true,
            data: {
                raw: output,
                data: output, // For raw text, data is the same as raw
                statusCode,
                headers,
                contentType: contentType ?? 'text/plain',
                isJson: false,
                size: output.length,
            },
        };
    }
    /**
     * Extract JSON data from parsed response if available
     */
    extractJsonData(response) {
        if (!response.isJson || !response.data) {
            return null;
        }
        try {
            return response.data;
        }
        catch {
            logger.warn('Failed to extract JSON data from response');
            return null;
        }
    }
    /**
     * Check if response indicates success
     */
    isSuccessResponse(response) {
        if (response.statusCode) {
            return response.statusCode >= 200 && response.statusCode < 300;
        }
        // If no status code, assume success if we have data
        return !!response.data;
    }
}
//# sourceMappingURL=parser.js.map