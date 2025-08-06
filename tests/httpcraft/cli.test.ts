/**
 * HTTPCraft CLI Tests
 * Comprehensive tests for the HttpCraftCli class
 */

import { HttpCraftCli, HttpCraftResult, HttpCraftOptions } from '../../src/httpcraft/cli.js';
import { ConfigDiscovery, HttpCraftConfig } from '../../src/httpcraft/config.js';
import { executeCommand, ProcessResult } from '../../src/utils/process.js';

// Mock dependencies
jest.mock('../../src/httpcraft/config.js');
jest.mock('../../src/utils/process.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('HttpCraftCli', () => {
  let cli: HttpCraftCli;
  let mockConfigDiscovery: jest.Mocked<ConfigDiscovery>;
  let mockExecuteCommand: jest.MockedFunction<typeof executeCommand>;

  const mockConfig: HttpCraftConfig = {
    executablePath: '/usr/local/bin/httpcraft',
    version: '1.0.0',
    isAvailable: true,
  };

  const mockSuccessProcessResult: ProcessResult = {
    stdout: 'Success output',
    stderr: '',
    exitCode: 0,
    duration: 150,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigDiscovery = {
      getConfig: jest.fn(),
      clearCache: jest.fn(),
      discoverExecutable: jest.fn(),
      validateExecutable: jest.fn(),
    } as any;

    mockExecuteCommand = executeCommand as jest.MockedFunction<typeof executeCommand>;

    // Mock the ConfigDiscovery constructor
    (ConfigDiscovery as jest.MockedClass<typeof ConfigDiscovery>).mockImplementation(() => mockConfigDiscovery);

    cli = new HttpCraftCli();
  });

  describe('constructor', () => {
    it('should initialize with ConfigDiscovery instance', () => {
      expect(ConfigDiscovery).toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: true,
        data: mockConfig,
      });
    });

    it('should execute HTTPCraft command successfully', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: mockSuccessProcessResult,
      });

      const result = await cli.execute(['--version']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        stdout: 'Success output',
        stderr: '',
        exitCode: 0,
        duration: 150,
        success: true,
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        '/usr/local/bin/httpcraft',
        ['--version'],
        {
          cwd: process.cwd(),
          timeout: 30000,
          env: undefined,
        }
      );
    });

    it('should handle config discovery failure', async () => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: false,
        error: new Error('HTTPCraft not found'),
      });

      const result = await cli.execute(['--version']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Failed to discover HTTPCraft: HTTPCraft not found');
    });

    it('should handle process execution failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: new Error('Process execution failed'),
      });

      const result = await cli.execute(['--version']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Process execution failed');
    });

    it('should use cached config on subsequent calls', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: mockSuccessProcessResult,
      });

      // First call
      await cli.execute(['--version']);
      expect(mockConfigDiscovery.getConfig).toHaveBeenCalledTimes(1);

      // Second call should use cached config
      await cli.execute(['--help']);
      expect(mockConfigDiscovery.getConfig).toHaveBeenCalledTimes(1);
    });

    it('should handle custom options', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: mockSuccessProcessResult,
      });

      const options: HttpCraftOptions = {
        cwd: '/custom/working/dir',
        timeout: 60000,
        env: { HTTP_PROXY: 'http://proxy:8080' },
      };

      await cli.execute(['api', 'list'], options);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        '/usr/local/bin/httpcraft',
        ['api', 'list'],
        {
          cwd: '/custom/working/dir',
          timeout: 60000,
          env: { HTTP_PROXY: 'http://proxy:8080' },
        }
      );
    });

    it('should handle non-zero exit codes', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: '',
          stderr: 'Command failed',
          exitCode: 1,
          duration: 100,
        },
      });

      const result = await cli.execute(['invalid', 'command']);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.exitCode).toBe(1);
      expect(result.data.stderr).toBe('Command failed');
    });

    it('should handle empty arguments array', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: mockSuccessProcessResult,
      });

      const result = await cli.execute([]);

      expect(result.success).toBe(true);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        mockConfig.executablePath,
        [],
        expect.any(Object)
      );
    });
  });

  describe('getVersion', () => {
    beforeEach(() => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: true,
        data: mockConfig,
      });
    });

    it('should get HTTPCraft version successfully', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: 'httpcraft 1.2.3\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        },
      });

      const result = await cli.getVersion();

      expect(result.success).toBe(true);
      expect(result.data).toBe('httpcraft 1.2.3');

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        mockConfig.executablePath,
        ['--version'],
        expect.any(Object)
      );
    });

    it('should handle version command failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: new Error('Command not found'),
      });

      const result = await cli.getVersion();

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Failed to get HTTPCraft version: Command not found');
    });

    it('should trim whitespace from version output', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: '  httpcraft 1.2.3  \n\n',
          stderr: '',
          exitCode: 0,
          duration: 50,
        },
      });

      const result = await cli.getVersion();

      expect(result.success).toBe(true);
      expect(result.data).toBe('httpcraft 1.2.3');
    });
  });

  describe('isAvailable', () => {
    beforeEach(() => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: true,
        data: mockConfig,
      });
    });

    it('should return true when HTTPCraft is available', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: 'httpcraft 1.2.3',
          stderr: '',
          exitCode: 0,
          duration: 50,
        },
      });

      const isAvailable = await cli.isAvailable();

      expect(isAvailable).toBe(true);
    });

    it('should return false when HTTPCraft is not available', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: new Error('Command not found'),
      });

      const isAvailable = await cli.isAvailable();

      expect(isAvailable).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      const isAvailable = await cli.isAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('executeWithJsonOutput', () => {
    beforeEach(() => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: true,
        data: mockConfig,
      });
    });

    it('should parse JSON output successfully', async () => {
      const jsonData = { status: 'success', data: { id: 1, name: 'test' } };
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: JSON.stringify(jsonData),
          stderr: '',
          exitCode: 0,
          duration: 200,
        },
      });

      const result = await cli.executeWithJsonOutput(['api', 'exec', 'test']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(jsonData);
    });

    it('should handle execution failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: new Error('Execution failed'),
      });

      const result = await cli.executeWithJsonOutput(['api', 'exec', 'test']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Execution failed');
    });

    it('should handle non-zero exit code', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: '',
          stderr: 'API not found',
          exitCode: 1,
          duration: 100,
        },
      });

      const result = await cli.executeWithJsonOutput(['api', 'exec', 'missing']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('HTTPCraft command failed: API not found');
    });

    it('should handle invalid JSON output', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: 'Invalid JSON {',
          stderr: '',
          exitCode: 0,
          duration: 100,
        },
      });

      const result = await cli.executeWithJsonOutput(['api', 'exec', 'test']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Failed to parse HTTPCraft JSON output');
    });

    it('should handle empty JSON output', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: '{}',
          stderr: '',
          exitCode: 0,
          duration: 100,
        },
      });

      const result = await cli.executeWithJsonOutput(['api', 'exec', 'test']);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should type the JSON output correctly', async () => {
      interface TestResponse {
        id: number;
        name: string;
      }

      const jsonData: TestResponse = { id: 1, name: 'test' };
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: JSON.stringify(jsonData),
          stderr: '',
          exitCode: 0,
          duration: 100,
        },
      });

      const result = await cli.executeWithJsonOutput<TestResponse>(['api', 'exec', 'test']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe('test');
      }
    });
  });

  describe('getConfig', () => {
    it('should return config from discovery service', async () => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: true,
        data: mockConfig,
      });

      const result = await cli.getConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(mockConfigDiscovery.getConfig).toHaveBeenCalled();
    });

    it('should handle config discovery failure', async () => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: false,
        error: new Error('Config not found'),
      });

      const result = await cli.getConfig();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Config not found');
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: true,
        data: mockConfig,
      });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: mockSuccessProcessResult,
      });
    });

    it('should clear cached configuration', async () => {
      // First call to populate cache
      await cli.execute(['--version']);
      expect(mockConfigDiscovery.getConfig).toHaveBeenCalledTimes(1);

      // Clear cache
      cli.clearCache();

      // Next call should re-fetch config
      await cli.execute(['--help']);
      expect(mockConfigDiscovery.getConfig).toHaveBeenCalledTimes(2);
    });

    it('should call clearCache on ConfigDiscovery', () => {
      cli.clearCache();

      expect(mockConfigDiscovery.clearCache).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      mockConfigDiscovery.getConfig.mockResolvedValue({
        success: true,
        data: mockConfig,
      });
    });

    it('should handle very long output', async () => {
      const longOutput = 'x'.repeat(1000000); // 1MB of output
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: longOutput,
          stderr: '',
          exitCode: 0,
          duration: 1000,
        },
      });

      const result = await cli.execute(['large', 'output']);

      expect(result.success).toBe(true);
      expect(result.data.stdout).toBe(longOutput);
      expect(result.data.stdout.length).toBe(1000000);
    });

    it('should handle binary output gracefully', async () => {
      const binaryOutput = Buffer.from([0x00, 0x01, 0x02, 0xFF]).toString();
      mockExecuteCommand.mockResolvedValue({
        success: true,
        data: {
          stdout: binaryOutput,
          stderr: '',
          exitCode: 0,
          duration: 100,
        },
      });

      const result = await cli.execute(['binary', 'command']);

      expect(result.success).toBe(true);
      expect(result.data.stdout).toBe(binaryOutput);
    });

    it('should handle timeout scenarios', async () => {
      const timeoutError = new Error('Process timeout');
      timeoutError.name = 'TimeoutError';
      
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: timeoutError,
      });

      const result = await cli.execute(['slow', 'command'], { timeout: 1000 });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Process timeout');
    });
  });
});