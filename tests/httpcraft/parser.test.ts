/**
 * Response Parser Tests
 * Comprehensive tests for the ResponseParser class
 */

import {
  ResponseParser,
  ParsedResponse,
  HttpCraftOutput,
  ParseOptions,
} from '../../src/httpcraft/parser.js';
import { HttpCraftResponse } from '../../src/schemas/tools.js';

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('ResponseParser', () => {
  let parser: ResponseParser;

  beforeEach(() => {
    parser = new ResponseParser();
    jest.clearAllMocks();
  });

  describe('parseHttpCraftOutput', () => {
    // Tests for HTTPCraft API response format
    describe('HTTPCraft API response format', () => {
      it('should parse successful API response', () => {
        const apiOutput = JSON.stringify({
          status: 'success',
          meta: {
            version: 6,
            schemaReference: '#/definitions/healthInsurancePolicyV6',
            type: 'single',
          },
          data: {
            effectiveDate: '2025-09-04',
            policyHolderId: 'nib:65931864',
            healthPolicyId: 'nib:1226030U',
          },
        });

        const result = parser.parseHttpCraftOutput(apiOutput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            success: true,
            statusCode: undefined,
            headers: {},
            data: {
              effectiveDate: '2025-09-04',
              policyHolderId: 'nib:65931864',
              healthPolicyId: 'nib:1226030U',
            },
            timing: {
              total: 0,
            },
            statusText: undefined,
            isBinary: false,
            contentType: 'application/json',
            contentLength: undefined,
            meta: {
              version: 6,
              schemaReference: '#/definitions/healthInsurancePolicyV6',
              type: 'single',
            },
            error: undefined,
          });
        }
      });

      it('should parse failed API response', () => {
        const apiOutput = JSON.stringify({
          status: 'error',
          error: 'API endpoint not found',
          meta: {
            version: 6,
            type: 'error',
          },
        });

        const result = parser.parseHttpCraftOutput(apiOutput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.success).toBe(false);
          expect(result.data.error).toBe('API endpoint not found');
          expect(result.data.statusCode).toBeUndefined();
          expect(result.data.headers).toEqual({});
          expect(result.data.contentType).toBe('application/json');
          expect(result.data.meta).toEqual({
            version: 6,
            type: 'error',
          });
        }
      });

      it('should handle API response with minimal data', () => {
        const apiOutput = JSON.stringify({
          status: 'success',
          data: null,
        });

        const result = parser.parseHttpCraftOutput(apiOutput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.success).toBe(true);
          expect(result.data.data).toBeNull();
          expect(result.data.contentType).toBe('application/json');
          expect(result.data.meta).toBeUndefined();
        }
      });

      it('should handle API response with complex nested data', () => {
        const complexData = {
          users: [
            { id: 1, name: 'John', profile: { age: 30, preferences: { theme: 'dark' } } },
            { id: 2, name: 'Jane', profile: { age: 25, preferences: { theme: 'light' } } },
          ],
          pagination: { page: 1, total: 100, hasMore: true },
        };

        const apiOutput = JSON.stringify({
          status: 'success',
          meta: { version: 1, type: 'list' },
          data: complexData,
        });

        const result = parser.parseHttpCraftOutput(apiOutput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.success).toBe(true);
          expect(result.data.data).toEqual(complexData);
          expect(result.data.meta).toEqual({ version: 1, type: 'list' });
        }
      });
    });

    // Tests for HTTP response format (existing functionality)
    describe('HTTP response format', () => {
      it('should parse valid JSON output successfully', async () => {
        const jsonOutput = JSON.stringify({
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: { message: 'success', data: [1, 2, 3] },
          duration: 250,
        });

        const result = parser.parseHttpCraftOutput(jsonOutput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            success: true,
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            data: { message: 'success', data: [1, 2, 3] },
            timing: {
              total: 250,
              dns: undefined,
              connect: undefined,
              ssl: undefined,
              send: undefined,
              wait: undefined,
              receive: undefined,
            },
            statusText: undefined,
            isBinary: undefined,
            contentType: undefined,
            contentLength: undefined,
          });
        }
      });

      it('should handle different JSON field names for status', async () => {
        const testCases = [
          { status: 404 },
          { statusCode: 404 },
          { status: 200, statusCode: 201 }, // status takes precedence
        ];

        for (const testCase of testCases) {
          const jsonOutput = JSON.stringify(testCase);
          const result = parser.parseHttpCraftOutput(jsonOutput);

          expect(result.success).toBe(true);
          if (result.success) {
            const expectedStatus = testCase.status ?? testCase.statusCode;
            expect(result.data.statusCode).toBe(expectedStatus);
          }
        }
      });

      it('should handle different JSON field names for response data', async () => {
        const testCases = [
          { body: { type: 'body' } },
          { data: { type: 'data' } },
          { response: { type: 'response' } },
          { body: { type: 'body' }, data: { type: 'data' } }, // body takes precedence
        ];

        for (const testCase of testCases) {
          const jsonOutput = JSON.stringify(testCase);
          const result = parser.parseHttpCraftOutput(jsonOutput);

          expect(result.success).toBe(true);
          if (result.success) {
            const expectedData = testCase.body ?? testCase.data ?? testCase.response;
            expect(result.data.data).toEqual(expectedData);
          }
        }
      });

      it('should handle timing data correctly', async () => {
        const jsonOutput = JSON.stringify({
          statusCode: 200,
          duration: 1000,
          timing: {
            dns: 50,
            connect: 100,
            ssl: 150,
            send: 10,
            wait: 500,
            receive: 200,
          },
        });

        const result = parser.parseHttpCraftOutput(jsonOutput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.timing).toEqual({
            total: 1000,
            dns: 50,
            connect: 100,
            ssl: 150,
            send: 10,
            wait: 500,
            receive: 200,
          });
        }
      });

      it('should normalize headers to lowercase', async () => {
        const jsonOutput = JSON.stringify({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'value',
            AUTHORIZATION: 'Bearer token',
          },
        });

        const result = parser.parseHttpCraftOutput(jsonOutput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.headers).toEqual({
            'content-type': 'application/json',
            'x-custom-header': 'value',
            authorization: 'Bearer token',
          });
        }
      });
    });

    // Tests for format detection and edge cases
    describe('format detection and edge cases', () => {
      it('should correctly identify API vs HTTP response formats', () => {
        const apiFormat = JSON.stringify({ status: 'success', data: {} });
        const httpFormat = JSON.stringify({ statusCode: 200, body: {} });

        const apiResult = parser.parseHttpCraftOutput(apiFormat);
        const httpResult = parser.parseHttpCraftOutput(httpFormat);

        expect(apiResult.success).toBe(true);
        expect(httpResult.success).toBe(true);

        if (apiResult.success && httpResult.success) {
          // API format should have JSON content type and no status code
          expect(apiResult.data.contentType).toBe('application/json');
          expect(apiResult.data.statusCode).toBeUndefined();

          // HTTP format should have status code and may not have specific content type
          expect(httpResult.data.statusCode).toBe(200);
        }
      });

      it('should handle mixed format characteristics gracefully', () => {
        // Edge case: response with both string status and numeric statusCode
        const mixedFormat = JSON.stringify({
          status: 'success', // This makes it API format
          statusCode: 200, // This would be HTTP format
          data: { message: 'test' },
        });

        const result = parser.parseHttpCraftOutput(mixedFormat);

        expect(result.success).toBe(true);
        if (result.success) {
          // Should be treated as API format due to string status
          expect(result.data.success).toBe(true);
          expect(result.data.contentType).toBe('application/json');
          expect(result.data.statusCode).toBeUndefined(); // API format doesn't have HTTP status
        }
      });
    });

    it('should fallback to text parsing for invalid JSON', async () => {
      const textOutput = 'HTTP/1.1 200 OK\nContent-Type: text/plain\n\nHello World';

      const result = parser.parseHttpCraftOutput(textOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.statusCode).toBe(200);
        expect(result.data.headers).toEqual({ 'content-type': 'text/plain' });
        expect(result.data.success).toBe(true);
      }
    });

    it('should handle response size limits', async () => {
      const largeOutput = 'x'.repeat(1000);
      const options: ParseOptions = { maxResponseSize: 500 };

      const result = parser.parseHttpCraftOutput(largeOutput, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.message).toContain(
          'Response size (1000 bytes) exceeds limit (500 bytes)'
        );
      }
    });

    it('should handle JSON validation when enabled', async () => {
      const httpResponse = JSON.stringify({ statusCode: 200, body: 'test' });
      const apiResponse = JSON.stringify({ status: 'success', data: 'test' });
      const options: ParseOptions = { validateJson: true };

      const httpResult = parser.parseHttpCraftOutput(httpResponse, options);
      const apiResult = parser.parseHttpCraftOutput(apiResponse, options);

      // Both should succeed as they match their respective schemas
      expect(httpResult.success).toBe(true);
      expect(apiResult.success).toBe(true);
    });

    it('should handle empty JSON output for both formats', async () => {
      const emptyHttp = parser.parseHttpCraftOutput('{}');
      const emptyApi = JSON.stringify({ status: 'success' });
      const apiResult = parser.parseHttpCraftOutput(emptyApi);

      expect(emptyHttp.success).toBe(true);
      expect(apiResult.success).toBe(true);

      if (emptyHttp.success) {
        expect(emptyHttp.data.statusCode).toBeUndefined();
        expect(emptyHttp.data.headers).toEqual({});
        expect(emptyHttp.data.data).toBeUndefined();
      }

      if (apiResult.success) {
        expect(apiResult.data.success).toBe(true);
        expect(apiResult.data.statusCode).toBeUndefined();
        expect(apiResult.data.contentType).toBe('application/json');
      }
    });
  });

  describe('parseOutput (legacy method)', () => {
    it('should parse successful HTTPCraft output', async () => {
      const stdout = JSON.stringify({ status: 200, body: { message: 'success' } });
      const stderr = '';
      const command = 'httpcraft api exec test';

      const result = await parser.parseOutput(stdout, stderr, command);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.response).toBeDefined();
        expect(result.data.metadata.command).toBe(command);
        expect(result.data.metadata.timestamp).toBeDefined();
        expect(result.data.error).toBeUndefined();
      }
    });

    it('should handle stderr as error', async () => {
      const stdout = '';
      const stderr = 'API not found';
      const command = 'httpcraft api exec missing';

      const result = await parser.parseOutput(stdout, stderr, command);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBe('API not found');
        expect(result.data.response).toBeUndefined();
      }
    });

    it('should handle empty output', async () => {
      const result = await parser.parseOutput('', '', 'httpcraft --version');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBe('No output from HTTPCraft command');
      }
    });
  });

  describe('parseError', () => {
    it('should extract error messages using various patterns', () => {
      const testCases = [
        { input: 'Error: Connection refused', expected: 'Connection refused' },
        { input: 'error: invalid URL format', expected: 'invalid URL format' },
        { input: 'failed: authentication required', expected: 'authentication required' },
        { input: 'httpcraft: command not found', expected: 'httpcraft' },
        { input: 'config.yaml: no such file or directory', expected: 'config.yaml' },
        { input: 'timeout: request took too long', expected: 'request took too long' },
        { input: 'connection failed to establish', expected: 'failed to establish' },
      ];

      for (const testCase of testCases) {
        const result = parser.parseError(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should return first line for unmatched errors', () => {
      const stderr = 'Some unexpected error\nSecond line\nThird line';
      const result = parser.parseError(stderr);

      expect(result).toBe('Some unexpected error');
    });

    it('should return default message for empty stderr', () => {
      const result = parser.parseError('');

      expect(result).toBe('Unknown HTTPCraft error');
    });
  });

  describe('validateResponse', () => {
    it('should validate correct HTTP response', () => {
      const response: HttpCraftResponse = {
        success: true,
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        data: { message: 'success' },
        timing: { total: 250 },
      };

      const result = parser.validateResponse(response);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct API response', () => {
      const response: HttpCraftResponse = {
        success: true,
        statusCode: undefined, // API responses don't have HTTP status codes
        headers: {},
        data: { policyId: 'test' },
        timing: { total: 0 },
        contentType: 'application/json',
        meta: {
          version: 6,
          type: 'single',
          schemaReference: '#/definitions/policy',
        },
      };

      const result = parser.validateResponse(response);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid status codes', () => {
      const testCases = [50, 700, -1, 999];

      for (const statusCode of testCases) {
        const response: HttpCraftResponse = {
          success: true,
          statusCode,
          headers: {},
          data: {},
          timing: { total: 0 },
        };

        const result = parser.validateResponse(response);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Invalid status code: ${statusCode}`);
      }
    });

    it('should detect invalid headers', () => {
      const response: HttpCraftResponse = {
        success: true,
        headers: { validHeader: 'value', [123 as any]: 'invalid key' },
        data: {},
        timing: { total: 0 },
      };

      const result = parser.validateResponse(response);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid header'))).toBe(true);
    });

    it('should detect invalid timing', () => {
      const response: HttpCraftResponse = {
        success: true,
        headers: {},
        data: {},
        timing: { total: -100 },
      };

      const result = parser.validateResponse(response);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid total timing: -100');
    });
  });

  describe('text parsing methods', () => {
    it('should extract status code from various text formats', () => {
      const testCases = [
        { input: 'Status: 404', expected: 404 },
        { input: 'HTTP/1.1 200 OK', expected: 200 },
        { input: 'Response 201 Created', expected: 201 },
        { input: '500 Internal Server Error', expected: 500 },
        { input: 'No status code here', expected: undefined },
      ];

      for (const testCase of testCases) {
        const result = parser['extractStatusCode'](testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should extract headers from text output', () => {
      const textOutput = `HTTP/1.1 200 OK
Content-Type: application/json
X-Custom-Header: custom-value
Authorization: Bearer token123
Invalid Line Without Colon
Very-Long-Header-Name-That-Should-Be-Rejected-Because-It-Is-Too-Long: value

Body content starts here`;

      const result = parser['extractHeaders'](textOutput);

      expect(result).toEqual({
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
        authorization: 'Bearer token123',
      });
    });

    it('should extract JSON data from text output', () => {
      const testCases = [
        {
          input: 'Some text\n{"key": "value"}\nMore text',
          expected: { key: 'value' },
        },
        {
          input: 'Array: [1, 2, 3]',
          expected: [1, 2, 3],
        },
        {
          input: 'No JSON here',
          expected: 'No JSON here',
        },
      ];

      for (const testCase of testCases) {
        const lines = testCase.input.split('\n');
        const result = parser['extractDataFromText'](testCase.input, lines);
        expect(result).toEqual(testCase.expected);
      }
    });
  });

  describe('legacy methods', () => {
    it('should extract JSON data from parsed response', () => {
      const response: ParsedResponse = {
        raw: '{"test": true}',
        data: { test: true },
        isJson: true,
        size: 13,
      };

      const result = parser.extractJsonData(response);

      expect(result).toEqual({ test: true });
    });

    it('should return null for non-JSON response', () => {
      const response: ParsedResponse = {
        raw: 'plain text',
        data: 'plain text',
        isJson: false,
        size: 10,
      };

      const result = parser.extractJsonData(response);

      expect(result).toBeNull();
    });

    it('should determine if response indicates success', () => {
      const testCases = [
        { statusCode: 200, data: {}, expected: true },
        { statusCode: 404, data: {}, expected: false },
        { statusCode: undefined, data: { result: 'success' }, expected: true },
        { statusCode: undefined, data: null, expected: false },
      ];

      for (const testCase of testCases) {
        const response: ParsedResponse = {
          raw: '',
          statusCode: testCase.statusCode,
          data: testCase.data,
          isJson: true,
          size: 0,
        };

        const result = parser.isSuccessResponse(response);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should parse JSON output correctly (legacy method)', async () => {
      const jsonOutput = '{"message": "test", "code": 200}';

      const result = await parser['tryParseAsJson'](jsonOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isJson).toBe(true);
        expect(result.data.data).toEqual({ message: 'test', code: 200 });
        expect(result.data.contentType).toBe('application/json');
      }
    });

    it('should parse raw text output correctly (legacy method)', async () => {
      const textOutput = `HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11

Hello World`;

      const result = await parser['parseAsRawText'](textOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.statusCode).toBe(200);
        expect(result.data.headers?.['content-type']).toBe('text/plain');
        expect(result.data.isJson).toBe(false);
        expect(result.data.contentType).toBe('text/plain');
        expect(result.data.data).toBe(textOutput);
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{"incomplete": json';

      const result = parser.parseHttpCraftOutput(malformedJson);

      expect(result.success).toBe(true); // Falls back to text parsing
      if (result.success) {
        expect(result.data.data).toBe(malformedJson);
      }
    });

    // it('should handle very large JSON objects', () => {
    //   const largeObject = { data: 'x'.repeat(1000000) };
    //   const jsonOutput = JSON.stringify(largeObject);
    //
    //   const result = parser.parseHttpCraftOutput(jsonOutput, { maxResponseSize: 2000000 });
    //
    //   expect(result.success).toBe(true);
    //   if (result.success) {
    //     expect(result.data.data).toEqual(largeObject);
    //   }
    // });

    it('should handle special characters in headers', () => {
      const jsonOutput = JSON.stringify({
        statusCode: 200,
        headers: {
          'X-Special-Chars': 'value with émojis 🚀 and ñ',
          'X-Unicode': 'こんにちは',
        },
      });

      const result = parser.parseHttpCraftOutput(jsonOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.headers).toEqual({
          'x-special-chars': 'value with émojis 🚀 and ñ',
          'x-unicode': 'こんにちは',
        });
      }
    });

    it('should handle null and undefined values in JSON', () => {
      const jsonInput = {
        statusCode: null,
        headers: undefined,
        data: null,
      };
      const jsonOutput = JSON.stringify(jsonInput);

      const result = parser.parseHttpCraftOutput(jsonOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.statusCode).toBeUndefined(); // null -> undefined conversion
        expect(result.data.headers).toEqual({});
        expect(result.data.data).toBeNull(); // should preserve null for data
      }
    });
    it('should handle binary data in text output', () => {
      const binaryOutput = Buffer.from([0x00, 0x01, 0x02, 0xff]).toString();

      const result = parser.parseHttpCraftOutput(binaryOutput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toBe(binaryOutput);
      }
    });
  });
});
