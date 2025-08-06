/**
 * Execute Chain Tool Tests
 * Comprehensive tests for the ExecuteChainTool class
 */

import { ExecuteChainTool } from '../../src/tools/execute-chain.js';
import { HttpCraftCli } from '../../src/httpcraft/cli.js';
import { ExecuteChainParams } from '../../src/schemas/tools.js';
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

describe('ExecuteChainTool', () => {
  let tool: ExecuteChainTool;
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
    (ResponseParser as jest.MockedClass<typeof ResponseParser>).mockImplementation(() => mockParser);

    tool = new ExecuteChainTool(mockHttpCraft);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(tool.name).toBe('httpcraft_execute_chain');
      expect(tool.description).toBe('Execute a request chain using HTTPCraft with variable passing between steps');
      expect(tool.inputSchema).toBeDefined();
    });
  });

  describe('getToolDefinition', () => {
    it('should return valid MCP tool definition', () => {
      const definition = tool.getToolDefinition();

      expect(definition.name).toBe('httpcraft_execute_chain');
      expect(definition.description).toBe('Execute a request chain using HTTPCraft with variable passing between steps');
      expect(definition.inputSchema).toBeDefined();
      expect(definition.inputSchema.type).toBe('object');
    });
  });

  describe('execute', () => {
    const validParams: ExecuteChainParams = {
      chain: 'auth-and-fetch',
    };

    const mockSuccessChainResponse = {
      success: true,
      data: {
        success: true,
        exitCode: 0,
        stdout: JSON.stringify({
          success: true,
          steps: [
            {
              name: 'auth',
              success: true,
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                data: { token: 'abc123' },
              },
            },
            {
              name: 'fetch-data',
              success: true,
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                data: { users: [{ id: 1, name: 'John' }] },
              },
            },
          ],
          totalDuration: 450,
        }),
        stderr: '',
      },
    };

    beforeEach(() => {
      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: {
          success: true,
          steps: [
            {
              name: 'auth',
              success: true,
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                data: { token: 'abc123' },
              },
            },
            {
              name: 'fetch-data',
              success: true,
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                data: { users: [{ id: 1, name: 'John' }] },
              },
            },
          ],
          totalDuration: 450,
        },
      });
    });

    it('should execute chain successfully', async () => {
      mockHttpCraft.execute.mockResolvedValue(mockSuccessChainResponse);

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].mimeType).toBe('application/json');

      // Verify HTTPCraft was called with correct arguments
      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        ['chain', 'exec', 'auth-and-fetch', '--json'],
        { timeout: 60000 }
      );

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.totalSteps).toBe(2);
      expect(parsedContent.successfulSteps).toBe(2);
    });

    it('should handle chain with optional parameters', async () => {
      const fullParams: ExecuteChainParams = {
        chain: 'complex-chain',
        profile: 'production',
        environment: 'staging',
        variables: { userId: '123', apiKey: 'secret' },
        configPath: '/custom/config.yaml',
        timeout: 120000,
        stopOnFailure: true,
        parallel: false,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessChainResponse);

      await tool.execute(fullParams);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        [
          'chain', 'exec', 'complex-chain',
          '--profile', 'production',
          '--env', 'staging',
          '--var', 'userId=123',
          '--var', 'apiKey=secret',
          '--config', '/custom/config.yaml',
          '--stop-on-failure',
          '--json'
        ],
        { timeout: 120000 }
      );
    });

    it('should handle chain with parallel execution', async () => {
      const parallelParams: ExecuteChainParams = {
        chain: 'parallel-chain',
        parallel: true,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessChainResponse);

      await tool.execute(parallelParams);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        ['chain', 'exec', 'parallel-chain', '--parallel', '--json'],
        { timeout: 60000 }
      );
    });

    it('should handle failed chain execution', async () => {
      const failedChainResponse = {
        success: true,
        data: {
          success: true,
          exitCode: 0,
          stdout: JSON.stringify({
            success: false,
            steps: [
              {
                name: 'auth',
                success: true,
                response: { statusCode: 200, data: { token: 'abc123' } },
              },
              {
                name: 'fetch-data',
                success: false,
                error: 'API rate limit exceeded',
              },
            ],
            failedStep: 1,
            totalDuration: 200,
          }),
          stderr: '',
        },
      };

      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: {
          success: false,
          steps: [
            {
              name: 'auth',
              success: true,
              response: { statusCode: 200, data: { token: 'abc123' } },
            },
            {
              name: 'fetch-data',
              success: false,
              error: 'API rate limit exceeded',
            },
          ],
          failedStep: 1,
          totalDuration: 200,
        },
      });

      mockHttpCraft.execute.mockResolvedValue(failedChainResponse);

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(true);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(false);
      expect(parsedContent.failedStep).toBe(1);
      expect(parsedContent.successfulSteps).toBe(1);
      expect(parsedContent.totalSteps).toBe(2);
    });

    it('should handle HTTPCraft CLI execution failure', async () => {
      const cliError = {
        success: false,
        error: new Error('Chain not found'),
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
          stderr: 'Chain "unknown-chain" not found in configuration',
        },
      };

      mockHttpCraft.execute.mockResolvedValue(commandFailure);

      const result = await tool.execute({
        chain: 'unknown-chain',
      });

      expect(result.isError).toBe(true);
      
      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.type).toBe('HttpCraftError');
      expect(parsedContent.message).toContain('HTTPCraft command failed');
    });

    it('should handle parsing errors', async () => {
      mockHttpCraft.execute.mockResolvedValue(mockSuccessChainResponse);
      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: false,
        error: new Error('Invalid JSON in chain response'),
      });

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(true);
      
      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.error).toBe(true);
      expect(parsedContent.message).toContain('Failed to parse HTTPCraft chain response');
    });

    it('should handle single step response format', async () => {
      const singleStepResponse = {
        success: true,
        data: {
          success: true,
          exitCode: 0,
          stdout: JSON.stringify({
            success: true,
            statusCode: 200,
            data: { message: 'success' },
          }),
          stderr: '',
        },
      };

      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: {
          success: true,
          statusCode: 200,
          data: { message: 'success' },
        },
      });

      mockHttpCraft.execute.mockResolvedValue(singleStepResponse);

      const result = await tool.execute(validParams);

      expect(result.isError).toBe(false);

      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.success).toBe(true);
      expect(parsedContent.totalSteps).toBe(1);
      expect(parsedContent.steps[0].name).toBe('single-request');
    });

    it('should use custom timeout from context', async () => {
      const context: ToolExecutionContext = {
        timestamp: new Date(),
        timeout: 90000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessChainResponse);

      await tool.execute(validParams, context);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        expect.any(Array),
        { timeout: 90000 }
      );
    });

    it('should use params timeout over context timeout', async () => {
      const context: ToolExecutionContext = {
        timestamp: new Date(),
        timeout: 90000,
      };

      const paramsWithTimeout = {
        ...validParams,
        timeout: 45000,
      };

      mockHttpCraft.execute.mockResolvedValue(mockSuccessChainResponse);

      await tool.execute(paramsWithTimeout, context);

      expect(mockHttpCraft.execute).toHaveBeenCalledWith(
        expect.any(Array),
        { timeout: 45000 }
      );
    });
  });

  describe('parameter validation', () => {
    it('should validate required parameters', async () => {
      const invalidParams = {
        // missing chain name
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);
      
      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Parameter validation failed');
    });

    it('should validate chain name', async () => {
      const invalidParams = {
        chain: '', // empty chain name
      };

      const result = await tool.execute(invalidParams);

      expect(result.isError).toBe(true);
      
      const parsedContent = JSON.parse(result.content[0].text!);
      expect(parsedContent.message).toContain('Parameter validation failed');
    });

    it('should accept valid optional parameters', async () => {
      const validParamsWithOptionals = {
        chain: 'test-chain',
        profile: 'dev',
        environment: 'staging',
        variables: { key: 'value' },
        configPath: '/path/to/config.yaml',
        timeout: 30000,
        stopOnFailure: true,
        parallel: false,
      };

      mockHttpCraft.execute.mockResolvedValue({
        success: true,
        data: {
          success: true,
          exitCode: 0,
          stdout: '{"success": true, "steps": []}',
          stderr: '',
        },
      });

      mockParser.parseHttpCraftOutput.mockReturnValue({
        success: true,
        data: { success: true, steps: [] },
      });

      const result = await tool.execute(validParamsWithOptionals);

      expect(result.isError).toBe(false);
    });
  });

  describe('buildCommandArgs', () => {
    it('should build basic command arguments', () => {
      const params: ExecuteChainParams = {
        chain: 'simple-chain',
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toEqual([
        'chain', 'exec', 'simple-chain',
        '--json'
      ]);
    });

    it('should include all optional parameters', () => {
      const params: ExecuteChainParams = {
        chain: 'complex-chain',
        profile: 'production',
        environment: 'staging',
        variables: { id: '123', type: 'test' },
        configPath: '/custom/config.yaml',
        stopOnFailure: true,
        parallel: false,
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toEqual([
        'chain', 'exec', 'complex-chain',
        '--profile', 'production',
        '--env', 'staging',
        '--var', 'id=123',
        '--var', 'type=test',
        '--config', '/custom/config.yaml',
        '--stop-on-failure',
        '--json'
      ]);
    });

    it('should not include parallel flag when parallel is false', () => {
      const params: ExecuteChainParams = {
        chain: 'sequential-chain',
        parallel: false,
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).not.toContain('--parallel');
    });

    it('should include parallel flag when parallel is true', () => {
      const params: ExecuteChainParams = {
        chain: 'parallel-chain',
        parallel: true,
      };

      const args = tool['buildCommandArgs'](params);

      expect(args).toContain('--parallel');
    });
  });

  describe('validateChainResponse', () => {
    it('should validate correct chain response', () => {
      const response = {
        success: true,
        steps: [
          { name: 'step1', success: true },
          { name: 'step2', success: true },
        ],
        totalDuration: 100,
      };

      const result = tool['validateChainResponse'](response);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid steps array', () => {
      const response = {
        success: true,
        steps: 'not-an-array' as any,
        totalDuration: 100,
      };

      const result = tool['validateChainResponse'](response);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Steps must be an array');
    });

    it('should detect missing step names', () => {
      const response = {
        success: true,
        steps: [
          { name: '', success: true }, // empty name
          { success: true }, // missing name
        ],
        totalDuration: 100,
      };

      const result = tool['validateChainResponse'](response);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing name'))).toBe(true);
    });

    it('should detect invalid total duration', () => {
      const response = {
        success: true,
        steps: [{ name: 'step1', success: true }],
        totalDuration: -100,
      };

      const result = tool['validateChainResponse'](response);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total duration must be a non-negative number');
    });

    it('should detect failed step without error message', () => {
      const response = {
        success: false,
        steps: [
          { name: 'step1', success: true },
          { name: 'step2', success: false }, // failed but no error
        ],
        totalDuration: 100,
      };

      const result = tool['validateChainResponse'](response);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('should have error message'))).toBe(true);
    });
  });
});