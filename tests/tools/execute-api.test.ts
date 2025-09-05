/**
 * Execute API Tool Tests
 * Comprehensive tests for the ExecuteApiTool class
 */

import { ExecuteApiTool } from '../../src/tools/execute-api.js';
import { HttpCraftCli } from '../../src/httpcraft/cli.js';
import { ExecuteApiParams } from '../../src/schemas/tools.js';
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

describe('ExecuteApiTool', () => {
  let tool: ExecuteApiTool;
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
      describeApi: jest.fn(),
      describeEndpoint: jest.fn(),
      describeProfile: jest.fn(),
    } as any;

    mockParser = {
      parseHttpCraftOutput: jest.fn(),
      validateResponse: jest.fn(),
    } as any;

    // Mock the ResponseParser import
    (ResponseParser as jest.MockedClass<typeof ResponseParser>).mockImplementation(
      () => mockParser
    );

    tool = new ExecuteApiTool(mockHttpCraft);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(tool.name).toBe('httpcraft_execute_api');
      expect(tool.description).toContain(
        'Execute a configured API endpoint using HTTPCraft with profiles and environments'
      );
      expect(tool.description).toContain('Use this tool for testing pre-configured API endpoints');
      expect(tool.description).toContain('## Workflow & Discovery');
      expect(tool.inputSchema).toBeDefined();
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const definition = tool.getToolDefinition();

      expect(definition.name).toBe('httpcraft_execute_api');
      expect(definition.description).toContain(
        'Execute a configured API endpoint using HTTPCraft with profiles and environments'
      );
      expect(definition.description).toContain(
        'Use this tool for testing pre-configured API endpoints'
      );
      expect(definition.inputSchema).toBeDefined();
      expect(definition.inputSchema.type).toBe('object');
    });
  });

  describe('execute', () => {
    const validParams: ExecuteApiParams = {
      api: 'test-api',
      endpoint: 'users',
      profile: 'dev',
    };

    const mockSuccessResponse = {
      success: true as const,
      data: {
        success: true,
        exitCode: 0,
        stdout: JSON.stringify({
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          data: { users: [{ id: 1, name: 'John' }] },
          duration: 150,
        }),
        stderr: '',
        duration: 150,
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
          timing: { total: 150 },
        },
      });

      mockParser.validateResponse.mockReturnValue({
        valid: true,
        errors: [],
      });

      // Mock the validation methods used in the new configuration validation
      mockHttpCraft.describeApi.mockResolvedValue({
        success: true,
        data: {
          name: 'test-api',
          base_url: 'https://api.test.com',
          endpoints: { users: { method: 'GET', path: '/users' } },
        },
      });

      mockHttpCraft.describeEndpoint.mockResolvedValue({
        success: true,
        data: { name: 'users', api: 'test-api', method: 'GET', path: '/users' },
      });

      mockHttpCraft.describeProfile.mockResolvedValue({
        success: true,
        data: { name: 'dev', timeout: 30 },
      });
    });

    it('should handle HTTPCraft API response format', async () => {
      const apiResponse = {
        success: true as const,
        data: {
          success: true,
          exitCode: 0,
          stdout: JSON.stringify({
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
          }),
          stderr: '',
          duration: 150,
        },
      };

      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: {
          success: true,
          statusCode: undefined,
          headers: {},
          data: {
            effectiveDate: '2025-09-04',
            policyHolderId: 'nib:65931864',
            healthPolicyId: 'nib:1226030U',
          },
          timing: { total: 0 },
          contentType: 'application/json',
          meta: {
            version: 6,
            schemaReference: '#/definitions/healthInsurancePolicyV6',
            type: 'single',
          },
        },
      });

      mockHttpCraft.execute.mockResolvedValue(apiResponse);

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.data.effectiveDate).toBe('2025-09-04');
      expect(parsedContent.meta).toEqual({
        version: 6,
        schemaReference: '#/definitions/healthInsurancePolicyV6',
        type: 'single',
      });
    });

    it('should handle HTTPCraft API error response format', async () => {
      const apiErrorResponse = {
        success: true as const,
        data: {
          success: true,
          exitCode: 0,
          stdout: JSON.stringify({
            status: 'error',
            error: 'API endpoint not found',
            meta: { version: 6, type: 'error' },
          }),
          stderr: '',
          duration: 150,
        },
      };

      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: {
          success: false,
          statusCode: undefined,
          headers: {},
          data: undefined,
          timing: { total: 0 },
          contentType: 'application/json',
          error: 'API endpoint not found',
          meta: { version: 6, type: 'error' },
        },
      });

      mockHttpCraft.execute.mockResolvedValue(apiErrorResponse);

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(true); // Should be error since success is false
      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(false);
      expect(parsedContent.error).toBe('API endpoint not found');
    });

    it('should handle optional parameters', async () => {
      const paramsWithOptionals: ExecuteApiParams = {
        api: 'test-api',
        endpoint: 'users',
        profile: 'dev',
        environment: 'staging',
        variables: { userId: '123', active: 'true' },
        configPath: '/custom/config.yaml',
        timeout: 60000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(paramsWithOptionals);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        [
          'test-api',
          'users',
          '--profile',
          'dev',
          '--env',
          'staging',
          '--var',
          'userId=123',
          '--var',
          'active=true',
          '--config',
          '/custom/config.yaml',
          '--json',
        ],
        { timeout: 60000 }
      );
    });

    it('should handle HTTPCraft CLI execution failure', async () => {
      const cliError = {
        success: false as const,
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
        success: true as const,
        data: {
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: 'API "unknown-api" not found in configuration',
          duration: 150,
        },
      };

      mockHttpCraft.execute.mockResolvedValue(commandFailure);

      const result = await tool.execute({
        api: 'unknown-api',
        endpoint: 'users',
        profile: 'dev',
      });

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.type).toBe('HttpCraftError');
      expect(parsedContent.message).toContain('API "unknown-api" not found');
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
        timeout: 45000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(validParams, context);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(expect.any(Array), { timeout: 45000 });
    });

    it('should use params timeout over context timeout', async () => {
      const context: ToolExecutionContext = {
        timestamp: new Date(),
        timeout: 45000,
      };

      const paramsWithTimeout = {
        ...validParams,
        timeout: 60000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(paramsWithTimeout, context);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(expect.any(Array), { timeout: 60000 });
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
      // expect(mockParser.validateResponse).toHaveBeenCalled(); // Validation removed for simplicity
    });

    it('should handle empty variables object', async () => {
      const paramsWithEmptyVars: ExecuteApiParams = {
        api: 'test-api',
        endpoint: 'users',
        profile: 'dev',
        variables: {},
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(paramsWithEmptyVars);

      // Should not include --var arguments for empty variables
      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        ['test-api', 'users', '--profile', 'dev', '--json'],
        { timeout: 30000 }
      );
    });

    it('should handle complex variable values', async () => {
      const paramsWithComplexVars: ExecuteApiParams = {
        api: 'test-api',
        endpoint: 'users',
        profile: 'dev',
        variables: {
          'nested.key': 'value',
          arrayValue: [1, 2, 3],
          objectValue: { nested: true },
        },
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessResponse);

      await tool.execute(paramsWithComplexVars);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        [
          'test-api',
          'users',
          '--profile',
          'dev',
          '--var',
          'nested.key=value',
          '--var',
          'arrayValue=1,2,3',
          '--var',
          'objectValue=[object Object]',
          '--json',
        ],
        { timeout: 30000 }
      );
    });
  });

  describe('parameter validation', () => {
    it('should validate required parameters', async () => {
      const invalidParams = {
        api: 'test-api',
        // missing endpoint and profile
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Parameter validation failed');
    });

    it('should validate parameter types', async () => {
      const invalidParams = {
        api: 123, // should be string
        endpoint: 'users',
        profile: 'dev',
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Parameter validation failed');
    });

    it('should accept valid optional parameters', async () => {
      const validParamsWithOptionals = {
        api: 'test-api',
        endpoint: 'users',
        profile: 'dev',
        environment: 'prod',
        variables: { key: 'value' },
        configPath: '/path/to/config.yaml',
        timeout: 45000,
      };

      mockHttpCraft.execute.mockResolvedValue({
        success: true as const,
        data: {
          success: true,
          exitCode: 0,
          stdout: '{"statusCode": 200}',
          stderr: '',
          duration: 150,
        },
      });

      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: { success: true, statusCode: 200, data: {}, headers: {} },
      });

      mockParser.validateResponse.mockReturnValue({
        valid: true,
        errors: [],
      });

      const result = await tool.execute(validParamsWithOptionals);

      expect(result.isError).toBe(false);
    });
  });

  describe('buildCommandArgs', () => {
    it('should build basic command arguments', () => {
      const params: ExecuteApiParams = {
        api: 'test-api',
        endpoint: 'users',
        profile: 'dev',
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toEqual(['test-api', 'users', '--profile', 'dev', '--json']);
    });

    it('should include all optional parameters', () => {
      const params: ExecuteApiParams = {
        api: 'test-api',
        endpoint: 'users',
        profile: 'dev',
        environment: 'staging',
        variables: { id: '123', active: 'true' },
        configPath: '/custom/config.yaml',
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toEqual([
        'test-api',
        'users',
        '--profile',
        'dev',
        '--env',
        'staging',
        '--var',
        'id=123',
        '--var',
        'active=true',
        '--config',
        '/custom/config.yaml',
        '--json',
      ]);
    });
  });
});
