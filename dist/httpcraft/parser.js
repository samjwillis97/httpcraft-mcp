/**
 * HTTPCraft response parsing utilities
 */
import { logger } from '../utils/logger.js';
export class ResponseParser {
    /**
     * Parse HTTPCraft command output
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
     * Parse HTTP response from HTTPCraft output
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
     * Attempt to parse output as JSON
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
     * Parse output as raw text
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