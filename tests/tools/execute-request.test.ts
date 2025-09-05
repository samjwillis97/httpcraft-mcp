/**
 * Execute Request Tool Tests
 * Comprehensive tests for the ExecuteRequestTool class
 */

import { ExecuteRequestTool } from '../../src/tools/execute-request.js';
import { HttpCraftCli } from '../../src/httpcraft/cli.js';
import { ExecuteRequestParams } from '../../src/schemas/tools.js';
import { ToolExecutionContext } from '../../src/tools/base.js';
import { ResponseParser } from '../../src/httpcraft/parser.js';

// Mock dependencies
jest.mock('../../src/httpcraft/cli.js');
jest.mock('../../src/httpcraft/parser.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('ExecuteRequestTool', () => {
  let tool: ExecuteRequestTool;
  let mockHttpCraft: jest.Mocked<HttpCraftCli>;
  let mockParser: jest.Mocked<ResponseParser>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpCraft = {
      execute: jest.fn(),
      executeApi: jest.fn(),
      executeRequest: jest.fn(),
      executeChain: jest.fn(),
      listApis: jest.fn(),
      listEndpoints: jest.fn(),
      listProfiles: jest.fn(),
    } as any;

    mockParser = {
      parseHttpCraftOutput: jest.fn(),
      validateResponse: jest.fn(),
    } as any;

    // Mock the ResponseParser import
    (ResponseParser as jest.MockedClass<typeof ResponseParser>).mockImplementation(
      () => mockParser
    );

    tool = new ExecuteRequestTool(mockHttpCraft);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(tool.name).toBe('httpcraft_execute_request');
      expect(tool.description).toContain(
        'Execute a standalone HTTP request using HTTPCraft with full control over method, URL, headers, and body'
      );
      expect(tool.description).toContain('Use this tool for ad-hoc HTTP requests');
      expect(tool.description).toContain('Common use cases:');
      expect(tool.inputSchema).toBeDefined();
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const definition = tool.getToolDefinition();

      expect(definition.name).toBe('httpcraft_execute_request');
      expect(definition.description).toContain(
        'Execute a standalone HTTP request using HTTPCraft with full control over method, URL, headers, and body'
      );
      expect(definition.description).toContain('Use this tool for ad-hoc HTTP requests');
      expect(definition.inputSchema).toBeDefined();
      expect(definition.inputSchema.type).toBe('object');
    });
  });

  describe('execute', () => {
    const validParams: ExecuteRequestParams = {
      method: 'GET',
      url: 'https://api.example.com/users',
    };

    const mockSuccessResponse = {
      success: true,
      data: {
        success: true,
        exitCode: 0,
        stdout: JSON.stringify({
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          data: { users: [{ id: 1, name: 'John' }] },
          duration: 250,
        }),
        stderr: '',
      },
    };

    beforeEach(() => {
      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: {
          success: true,
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          data: { users: [{ id: 1, name: 'John' }] },
          timing: { total: 250 },
        },
      });

      mockParser.validateResponse.mockReturnValue({
        valid: true,
        errors: [],
      });
    });

    it('should execute GET request successfully', async () => {
      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');

      // Verify HTTPCraft was called with correct arguments
      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        ['request', '--method', 'GET', 'https://api.example.com/users', '--json'],
        { timeout: 30000 }
      );
    });

    it('should execute POST request with body and headers', async () => {
      const postParams: ExecuteRequestParams = {
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
        body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(postParams);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        [
          'request',
          '--method',
          'POST',
          'https://api.example.com/users',
          '--header',
          'Content-Type: application/json',
          '--header',
          'Authorization: Bearer token123',
          '--data',
          JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
          '--json',
        ],
        { timeout: 30000 }
      );
    });

    it('should handle optional parameters', async () => {
      const fullParams: ExecuteRequestParams = {
        method: 'PUT',
        url: 'https://api.example.com/users/123',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "Updated Name"}',
        profile: 'prod',
        variables: { userId: '123', version: '2' },
        configPath: '/custom/config.yaml',
        followRedirects: false,
        maxRedirects: 5,
        timeout: 45000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(fullParams);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        [
          'request',
          '--method',
          'PUT',
          'https://api.example.com/users/123',
          '--header',
          'Content-Type: application/json',
          '--data',
          '{"name": "Updated Name"}',
          '--profile',
          'prod',
          '--var',
          'userId=123',
          '--var',
          'version=2',
          '--config',
          '/custom/config.yaml',
          '--no-follow-redirects',
          '--max-redirects',
          '5',
          '--json',
        ],
        { timeout: 45000 }
      );
    });

    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      for (const method of methods) {
        const params: ExecuteRequestParams = {
          method: method as any,
          url: 'https://api.example.com/test',
        };

        mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

        await tool.execute(params);

        expect(mockHttpCraft.execute).toHaveBeenCalledWith(
          expect.arrayContaining(['--method', method]),
          expect.any(Object)
        );

        jest.clearAllMocks();
        mockParser.parseHttpCraftOutput.mockReturnValue({
          success: true,
          data: { statusCode: 200, headers: {}, data: {} },
        });
        mockParser.validateResponse.mockReturnValue({ valid: true, errors: [] });
      }
    });

    it('should handle HTTPCraft CLI execution failure', async () => {
      const cliError = {
        success: false,
        error: new Error('CLI execution failed'),
      };

      mockHttpCraft.execute.mockResolvedValue(cliError);

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.type).toBe('HttpCraftError');
    });

    it('should handle HTTPCraft command failure', async () => {
      const commandFailure = {
        success: true,
        data: {
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: 'Invalid URL format',
        },
      };

      mockHttpCraft.execute.mockResolvedValue(commandFailure);

      const result = await tool.execute({
        method: 'GET',
        url: 'https://invalid-domain-that-does-not-exist.com',
      });

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.type).toBe('HttpCraftError');
      expect(parsedContent.message).toContain('Invalid URL format');
    });

    it('should handle parsing errors', async () => {
      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);
      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: false,
        error: new Error('Invalid JSON in response'),
      });

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.message).toContain('Failed to parse HTTPCraft response');
    });

    it('should handle parsing exceptions', async () => {
      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);
      mockParser.parseHttpCraftOutput.mockImplementation(() => {
        throw new Error('Parser crashed');
      });

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Failed to parse HTTPCraft response: Parser crashed');
    });

    it('should use context timeout if provided', async () => {
      const context: ToolExecutionContext = {
        timestamp: new Date(),
        timeout: 60000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(validParams, context);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(expect.any(Array), { timeout: 60000 });
    });

    it('should use params timeout over context timeout', async () => {
      const context: ToolExecutionContext = {
        timestamp: new Date(),
        timeout: 60000,
      };

      const paramsWithTimeout = {
        ...validParams,
        timeout: 45000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(paramsWithTimeout, context);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(expect.any(Array), { timeout: 45000 });
    });

    it('should handle response validation warnings', async () => {
      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);
      mockParser.validateResponse.mockReturnValue({
        valid: false,
        errors: ['Missing required field: id'],
      });

      const result = await tool.execute(validParams);

      // Should still succeed but log warnings
      expect(result.isError).toBe(false);
      expect(mockParser.validateResponse).toHaveBeenCalled();
    });

    it('should handle empty headers and variables', async () => {
      const paramsWithEmptyObjects: ExecuteRequestParams = {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: {},
        variables: {},
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(paramsWithEmptyObjects);

      // Should not include --header or --var arguments for empty objects
      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        ['request', '--method', 'GET', 'https://api.example.com/users', '--json'],
        { timeout: 30000 }
      );
    });

    it('should handle followRedirects=true (default behavior)', async () => {
      const params: ExecuteRequestParams = {
        method: 'GET',
        url: 'https://api.example.com/users',
        followRedirects: true,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(params);

      // Should not include --no-follow-redirects when followRedirects is true
      const calledArgs = mockHttpCraft.execute.mock.calls[0][0];
      expect(calledArgs).not.toContain('--no-follow-redirects');
    });

    it('should handle maxRedirects=0', async () => {
      const params: ExecuteRequestParams = {
        method: 'GET',
        url: 'https://api.example.com/users',
        maxRedirects: 0,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(params);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        expect.arrayContaining(['--max-redirects', '0']),
        expect.any(Object)
      );
    });
  });

  describe('parameter validation', () => {
    it('should validate required parameters', async () => {
      const invalidParams = {
        method: 'GET',
        // missing url
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Parameter validation failed');
    });

    it('should validate HTTP method enum', async () => {
      const invalidParams = {
        method: 'INVALID_METHOD',
        url: 'https://api.example.com/users',
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Parameter validation failed');
    });

    it('should validate URL format', async () => {
      // Note: URL validation depends on the schema implementation
      const invalidParams = {
        method: 'GET',
        url: 'not-a-valid-url',
      };

      // This test depends on whether the schema validates URLs
      // If it doesn't, the HTTPCraft command will fail instead
      const result = await tool.execute(invalidParams);

      // Should either fail validation or be caught by HTTPCraft
      expect(result.isError).toBe(true);
    });

    it('should validate parameter types', async () => {
      const invalidParams = {
        method: 123, // should be string
        url: 'https://api.example.com/users',
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Parameter validation failed');
    });
  });

  describe('buildCommandArgs', () => {
    it('should build basic command arguments', () => {
      const params: ExecuteRequestParams = {
        method: 'GET',
        url: 'https://api.example.com/users',
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toEqual([
        'request',
        '--method',
        'GET',
        'https://api.example.com/users',
        '--json',
      ]);
    });

    it('should include all optional parameters', () => {
      const params: ExecuteRequestParams = {
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        },
        body: '{"test": true}',
        profile: 'dev',
        variables: { id: '123', type: 'test' },
        configPath: '/custom/config.yaml',
        followRedirects: false,
        maxRedirects: 3,
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toEqual([
        'request',
        '--method',
        'POST',
        'https://api.example.com/users',
        '--header',
        'Content-Type: application/json',
        '--header',
        'X-Custom: value',
        '--data',
        '{"test": true}',
        '--profile',
        'dev',
        '--var',
        'id=123',
        '--var',
        'type=test',
        '--config',
        '/custom/config.yaml',
        '--no-follow-redirects',
        '--max-redirects',
        '3',
        '--json',
      ]);
    });

    it('should handle complex variable values', () => {
      const params: ExecuteRequestParams = {
        method: 'GET',
        url: 'https://api.example.com/users',
        variables: {
          string: 'value',
          number: 42,
          boolean: true,
          array: [1, 2, 3],
          object: { nested: true },
        },
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toContain('--var');
      expect(args).toContain('string=value');
      expect(args).toContain('number=42');
      expect(args).toContain('boolean=true');
      expect(args).toContain('array=1,2,3');
      expect(args).toContain('object=[object Object]');
    });

    it('should not include arguments for undefined optional parameters', () => {
      const params: ExecuteRequestParams = {
        method: 'GET',
        url: 'https://api.example.com/users',
        // All optional parameters undefined
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).not.toContain('--header');
      expect(args).not.toContain('--data');
      expect(args).not.toContain('--profile');
      expect(args).not.toContain('--var');
      expect(args).not.toContain('--config');
      expect(args).not.toContain('--no-follow-redirects');
      expect(args).not.toContain('--max-redirects');
    });
  });
});
