/**
 * Base Tool Class Tests
 * Comprehensive tests for the BaseTool abstract class
 */

import { z } from 'zod';
import { BaseTool, ToolExecutionContext } from '../../src/tools/base.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { HttpCraftCli } from '../../src/httpcraft/cli.js';

// Mock implementation for testing
class TestTool extends BaseTool {
  readonly name = 'test_tool';
  readonly description = 'A test tool for unit testing';
  readonly inputSchema = z.object({
    required_field: z.string().describe('A required string field'),
    optional_field: z.string().optional().describe('An optional string field'),
    number_field: z.number().describe('A number field'),
    boolean_field: z.boolean().describe('A boolean field'),
  });

  protected async executeInternal(
    params: z.infer<typeof this.inputSchema>,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    // Simulate different behaviors based on input
    if (params.required_field === 'error') {
      throw new Error('Test error');
    }

    if (params.required_field === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.formatSuccess({
      received: params,
      timestamp: context.timestamp.toISOString(),
      requestId: context.requestId,
    });
  }
}

describe('BaseTool', () => {
  let mockHttpCraft: jest.Mocked<HttpCraftCli>;
  let tool: TestTool;

  beforeEach(() => {
    mockHttpCraft = {
      executeApi: jest.fn(),
      executeRequest: jest.fn(),
      executeChain: jest.fn(),
      listApis: jest.fn(),
      listEndpoints: jest.fn(),
      listProfiles: jest.fn(),
    } as any;

    tool = new TestTool(mockHttpCraft);
  });

  describe('constructor', () => {
    it('should initialize with HttpCraftCli instance', () => {
      expect(tool['httpcraft']).toBe(mockHttpCraft);
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const definition = tool.getToolDefinition();

      expect(definition).toEqual({
        name: 'test_tool',
        description: 'A test tool for unit testing',
        inputSchema: {
          type: 'object',
          properties: {
            required_field: {
              type: 'string',
              description: 'A required string field',
            },
            number_field: {
              type: 'number',
              description: 'A number field',
            },
            boolean_field: {
              type: 'boolean',
              description: 'A boolean field',
            },
          },
          required: ['required_field', 'number_field', 'boolean_field'],
        },
      });
    });
  });

  describe('execute', () => {
    const validParams = {
      required_field: 'test',
      number_field: 42,
      boolean_field: true,
    };

    it('should execute successfully with valid parameters', async () => {
      const context: ToolExecutionContext = {
        requestId: 'test-123',
        timestamp: new Date('2023-01-01T00:00:00Z'),
      };

      const result = await tool.execute(validParams, context);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                received: validParams,
                timestamp: '2023-01-01T00:00:00.000Z',
                requestId: 'test-123',
              },
              null,
              2
            ),
            mimeType: 'application/json',
          },
        ],
        isError: false,
      });
    });

    it('should create default context if none provided', async () => {
      const result = await tool.execute(validParams);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.received).toEqual(validParams);
      expect(parsedContent.timestamp).toBeDefined();
      expect(parsedContent.requestId).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      const invalidParams = {
        required_field: 'test',
        // missing number_field and boolean_field
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.message).toContain('Parameter validation failed');
      expect(parsedContent.message).toContain('number_field: Required');
      expect(parsedContent.message).toContain('boolean_field: Required');
    });

    it('should handle execution errors gracefully', async () => {
      const errorParams = {
        required_field: 'error',
        number_field: 42,
        boolean_field: true,
      };

      const result = await tool.execute(errorParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.message).toBe('Test error');
      expect(parsedContent.timestamp).toBeDefined();
    });

    it('should handle optional parameters correctly', async () => {
      const paramsWithOptional = {
        required_field: 'test',
        optional_field: 'optional_value',
        number_field: 42,
        boolean_field: true,
      };

      const result = await tool.execute(paramsWithOptional);

      expect(result.isError).toBe(false);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.received.optional_field).toBe('optional_value');
    });

    it('should handle non-Error exceptions', async () => {
      // Mock executeInternal to throw a non-Error
      const originalExecuteInternal = tool['executeInternal'];
      tool['executeInternal'] = jest.fn().mockRejectedValue('String error');

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toBe('String error');

      // Restore original method
      tool['executeInternal'] = originalExecuteInternal;
    });
  });

  describe('validateInput', () => {
    it('should validate correct input', () => {
      const validInput = {
        required_field: 'test',
        number_field: 42,
        boolean_field: true,
      };

      const result = tool['validateInput'](validInput);
      expect(result).toEqual(validInput);
    });

    it('should throw error for invalid input', () => {
      const invalidInput = {
        required_field: 123, // should be string
        number_field: 'not a number',
        boolean_field: 'not a boolean',
      };

      expect(() => tool['validateInput'](invalidInput)).toThrow('Parameter validation failed');
    });

    it('should handle missing required fields', () => {
      const incompleteInput = {
        required_field: 'test',
        // missing number_field and boolean_field
      };

      expect(() => tool['validateInput'](incompleteInput)).toThrow('Parameter validation failed');
    });

    it('should handle non-ZodError exceptions', () => {
      // Mock the schema parse method to throw a non-ZodError
      const originalParse = tool.inputSchema.parse;
      tool.inputSchema.parse = jest.fn().mockImplementation(() => {
        throw new Error('Non-Zod error');
      });

      expect(() => tool['validateInput']({})).toThrow('Non-Zod error');

      // Restore original method
      tool.inputSchema.parse = originalParse;
    });
  });

  describe('formatSuccess', () => {
    it('should format object data as JSON', () => {
      const data = { key: 'value', number: 42 };
      const result = tool['formatSuccess'](data);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
            mimeType: 'application/json',
          },
        ],
        isError: false,
      });
    });

    it('should format string data as-is', () => {
      const data = 'simple string';
      const result = tool['formatSuccess'](data);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simple string',
            mimeType: 'application/json',
          },
        ],
        isError: false,
      });
    });

    it('should accept custom mime type', () => {
      const data = 'plain text';
      const result = tool['formatSuccess'](data, 'text/plain');

      expect(result.content[0].mimeType).toBe('text/plain');
    });
  });

  describe('formatError', () => {
    it('should format Error objects', () => {
      const error = new Error('Test error message');
      const result = tool['formatError'](error);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.message).toBe('Test error message');
      expect(parsedContent.timestamp).toBeDefined();
    });

    it('should format non-Error values', () => {
      const error = 'String error';
      const result = tool['formatError'](error);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toBe('String error');
    });

    it('should handle null and undefined errors', () => {
      const nullResult = tool['formatError'](null);
      const undefinedResult = tool['formatError'](undefined);

      expect(nullResult.isError).toBe(true);
      expect(undefinedResult.isError).toBe(true);

      const nullContent = JSON.parse(nullResult.content[0].text!);
      const undefinedContent = JSON.parse(undefinedResult.content[0].text!);

      expect(nullContent.message).toBe('null');
      expect(undefinedContent.message).toBe('undefined');
    });
  });

  describe('zodToJsonSchema', () => {
    it('should convert ZodObject to JSON Schema', () => {
      const schema = z.object({
        stringField: z.string().describe('A string field'),
        numberField: z.number().describe('A number field'),
        booleanField: z.boolean().describe('A boolean field'),
        optionalField: z.string().optional().describe('An optional field'),
      });

      const tool = new (class extends BaseTool {
        readonly name = 'test';
        readonly description = 'test';
        readonly inputSchema = schema;
        protected async executeInternal(): Promise<CallToolResult> {
          return this.formatSuccess({});
        }
      })(mockHttpCraft);

      const result = tool['zodToJsonSchema'](schema);

      expect(result).toEqual({
        type: 'object',
        properties: {
          stringField: {
            type: 'string',
            description: 'A string field',
          },
          numberField: {
            type: 'number',
            description: 'A number field',
          },
          booleanField: {
            type: 'boolean',
            description: 'A boolean field',
          },
        },
        required: ['stringField', 'numberField', 'booleanField'],
      });
    });

    it('should handle non-ZodObject schemas', () => {
      const schema = z.string();

      const tool = new (class extends BaseTool {
        readonly name = 'test';
        readonly description = 'test';
        readonly inputSchema = schema;
        protected async executeInternal(): Promise<CallToolResult> {
          return this.formatSuccess({});
        }
      })(mockHttpCraft);

      const result = tool['zodToJsonSchema'](schema);

      expect(result).toEqual({ type: 'object' });
    });
  });
});
