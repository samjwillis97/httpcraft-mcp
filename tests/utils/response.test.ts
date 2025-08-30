/**
 * Response Utilities Tests
 * Comprehensive tests for response formatting functions
 */

import {
  formatHttpResponse,
  formatChainResponse,
  formatDiscoveryResponse,
  formatErrorResponse,
  formatTextResponse,
  formatDataResponse,
  formatValidationError,
  formatHttpCraftError,
  extractHttpCraftError,
} from '../../src/utils/response.js';
import { HttpCraftResponse, ChainResponse, DiscoveryResponse } from '../../src/schemas/tools.js';

describe('Response Utilities', () => {
  describe('formatHttpResponse', () => {
    it('should format successful HTTP response', () => {
      const response: HttpCraftResponse = {
        success: true,
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        data: { message: 'success', id: 123 },
        timing: { total: 250, dns: 50 },
      };

      const result = formatHttpResponse(response);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent).toEqual({
        success: true,
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        data: { message: 'success', id: 123 },
        timing: { total: 250, dns: 50 },
      });
    });

    it('should format failed HTTP response', () => {
      const response: HttpCraftResponse = {
        success: false,
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        data: { error: 'Not found' },
        timing: { total: 100 },
        error: 'Resource not found',
      };

      const result = formatHttpResponse(response);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(false);
      expect(parsedContent.statusCode).toBe(404);
    });

    it('should handle response with minimal data', () => {
      const response: HttpCraftResponse = {
        success: true,
        timing: { total: 0 },
      };

      const result = formatHttpResponse(response);

      expect(result.isError).toBe(false);
      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.timing).toEqual({ total: 0 });
    });
  });

  describe('formatChainResponse', () => {
    it('should format successful chain response', () => {
      const response: ChainResponse = {
        success: true,
        steps: [
          {
            name: 'auth',
            success: true,
            response: {
              success: true,
              statusCode: 200,
              timing: { total: 100 },
            },
          },
          {
            name: 'fetch-data',
            success: true,
            response: {
              success: true,
              statusCode: 200,
              timing: { total: 150 },
            },
          },
        ],
        totalDuration: 250,
      };

      const result = formatChainResponse(response);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.totalSteps).toBe(2);
      expect(parsedContent.successfulSteps).toBe(2);
      expect(parsedContent.totalDuration).toBe(250);
      expect(parsedContent.steps).toHaveLength(2);
    });

    it('should format failed chain response', () => {
      const response: ChainResponse = {
        success: false,
        steps: [
          {
            name: 'auth',
            success: true,
            response: {
              success: true,
              statusCode: 200,
              timing: { total: 100 },
            },
          },
          {
            name: 'fetch-data',
            success: false,
            error: 'API rate limit exceeded',
          },
        ],
        failedStep: 1,
        totalDuration: 150,
      };

      const result = formatChainResponse(response);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(false);
      expect(parsedContent.failedStep).toBe(1);
      expect(parsedContent.successfulSteps).toBe(1);
      expect(parsedContent.steps[1].error).toBe('API rate limit exceeded');
    });

    it('should handle empty chain response', () => {
      const response: ChainResponse = {
        success: true,
        steps: [],
        totalDuration: 0,
      };

      const result = formatChainResponse(response);

      expect(result.isError).toBe(false);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.totalSteps).toBe(0);
      expect(parsedContent.successfulSteps).toBe(0);
    });
  });

  describe('formatDiscoveryResponse', () => {
    it('should format successful discovery response', () => {
      const response: DiscoveryResponse = {
        success: true,
        data: {
          apis: ['github', 'slack', 'stripe'],
          count: 3,
        },
      };

      const result = formatDiscoveryResponse(response);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.data.apis).toEqual(['github', 'slack', 'stripe']);
    });

    it('should format failed discovery response', () => {
      const response: DiscoveryResponse = {
        success: false,
        error: 'Configuration file not found',
      };

      const result = formatDiscoveryResponse(response);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(false);
      expect(parsedContent.error).toBe('Configuration file not found');
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error with Error object', () => {
      const error = new Error('Something went wrong');
      const context = {
        tool: 'execute-api',
        operation: 'fetch-users',
        params: { api: 'github', endpoint: 'users' },
      };

      const result = formatErrorResponse(error, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.message).toBe('Something went wrong');
      expect(parsedContent.context).toEqual(context);
      expect(parsedContent.timestamp).toBeDefined();
    });

    it('should format error with string message', () => {
      const result = formatErrorResponse('Simple error message');

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toBe('Simple error message');
      expect(parsedContent.context).toBeUndefined();
    });

    it('should format error without context', () => {
      const error = new Error('No context error');

      const result = formatErrorResponse(error);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toBe('No context error');
      expect(parsedContent.context).toBeUndefined();
    });
  });

  describe('formatTextResponse', () => {
    it('should format success text response', () => {
      const result = formatTextResponse('Operation completed successfully');

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Operation completed successfully');
      expect(result.content[0].mimeType).toBeUndefined();
    });

    it('should format error text response', () => {
      const result = formatTextResponse('Operation failed', true);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Operation failed');
    });

    it('should handle empty text', () => {
      const result = formatTextResponse('');

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('');
    });
  });

  describe('formatDataResponse', () => {
    it('should format object data as JSON', () => {
      const data = { users: [{ id: 1, name: 'John' }], total: 1 };

      const result = formatDataResponse(data);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');
      expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it('should format string data as plain text', () => {
      const data = 'Plain text response';

      const result = formatDataResponse(data);

      expect(result.isError).toBe(false);
      expect(result.content[0].mimeType).toBe('text/plain');
      expect(result.content[0].text).toBe('Plain text response');
    });

    it('should format array data as JSON', () => {
      const data = [1, 2, 3, 4, 5];

      const result = formatDataResponse(data);

      expect(result.isError).toBe(false);
      expect(result.content[0].mimeType).toBe('application/json');
      expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it('should handle error flag', () => {
      const data = { error: 'Something failed' };

      const result = formatDataResponse(data, true);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it('should handle null and undefined data', () => {
      const nullResult = formatDataResponse(null);
      const undefinedResult = formatDataResponse(undefined);

      expect(nullResult.content[0].text).toBe('null');
      expect(undefinedResult.content[0].text).toBe(undefined);
    });
  });

  describe('formatValidationError', () => {
    it('should format validation errors', () => {
      const errors = [
        'api: Required field missing',
        'endpoint: Must be a string',
        'profile: Invalid value provided',
      ];

      const result = formatValidationError(errors);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.type).toBe('ValidationError');
      expect(parsedContent.message).toBe('Parameter validation failed');
      expect(parsedContent.details).toEqual(errors);
      expect(parsedContent.timestamp).toBeDefined();
    });

    it('should handle empty errors array', () => {
      const result = formatValidationError([]);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.details).toEqual([]);
    });

    it('should handle single error', () => {
      const result = formatValidationError(['Single validation error']);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.details).toEqual(['Single validation error']);
    });
  });

  describe('formatHttpCraftError', () => {
    it('should format HTTPCraft error with full details', () => {
      const errorMessage = 'HTTPCraft command failed';
      const stderr = 'API "unknown-api" not found in configuration';
      const exitCode = 1;
      const command = ['api', 'exec', 'unknown-api', 'users'];

      const result = formatHttpCraftError(errorMessage, exitCode, stderr, command);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.type).toBe('HttpCraftError');
      expect(parsedContent.message).toBe('HTTPCraft command failed');
      expect(parsedContent.stderr).toBe(stderr);
      expect(parsedContent.exitCode).toBe(exitCode);
      expect(parsedContent.command).toEqual(command);
      expect(parsedContent.timestamp).toBeDefined();
    });

    it('should format HTTPCraft error without command', () => {
      const errorMessage = 'Connection timeout';
      const stderr = 'Connection timeout';
      const exitCode = 124;

      const result = formatHttpCraftError(errorMessage, exitCode, stderr);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.stderr).toBe(stderr);
      expect(parsedContent.exitCode).toBe(exitCode);
      expect(parsedContent.command).toBeUndefined();
    });

    it('should handle empty stderr', () => {
      const result = formatHttpCraftError('Empty error', 1, '');

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.stderr).toBe('');
      expect(parsedContent.exitCode).toBe(1);
    });
  });

  describe('extractHttpCraftError', () => {
    it('should extract error using various patterns', () => {
      const testCases = [
        { input: 'Error: Connection refused', expected: 'Connection refused' },
        { input: 'error: invalid URL format', expected: 'invalid URL format' },
        { input: 'failed: authentication required', expected: 'authentication required' },
        { input: 'httpcraft: command not found', expected: 'httpcraft' },
      ];

      for (const testCase of testCases) {
        const result = extractHttpCraftError(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should return full stderr if no pattern matches', () => {
      const stderr = 'Some unexpected error format';
      const result = extractHttpCraftError(stderr);

      expect(result).toBe('Some unexpected error format');
    });

    it('should handle empty stderr', () => {
      const result = extractHttpCraftError('');

      expect(result).toBe('Unknown HTTPCraft error');
    });

    it('should handle whitespace-only stderr', () => {
      const result = extractHttpCraftError('   \n\t  ');

      expect(result).toBe('Unknown HTTPCraft error');
    });

    it('should trim extracted error messages', () => {
      const stderr = 'Error:   Connection failed with extra spaces   ';
      const result = extractHttpCraftError(stderr);

      expect(result).toBe('Connection failed with extra spaces');
    });

    it('should handle multi-line stderr', () => {
      const stderr = `Some context line
Error: The actual error message
Additional details`;
      const result = extractHttpCraftError(stderr);

      expect(result).toBe('The actual error message');
    });
  });
});
