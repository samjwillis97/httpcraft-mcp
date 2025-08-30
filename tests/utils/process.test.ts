/**
 * Process Utilities Tests
 * Comprehensive tests for process management functions
 */

import {
  executeCommand,
  checkExecutableExists,
  findExecutableInPath,
  ProcessResult,
} from '../../src/utils/process.js';
import { spawn } from 'child_process';
import { access } from 'fs/promises';
import which from 'which';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('which');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Process Utilities', () => {
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockAccess: jest.MockedFunction<typeof access>;
  let mockWhich: jest.MockedFunction<typeof which>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    mockAccess = access as jest.MockedFunction<typeof access>;
    mockWhich = which as jest.MockedFunction<typeof which>;
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
      };

      mockSpawn.mockReturnValue(mockChild as any);

      // Setup event handlers
      let closeHandler: (exitCode: number | null, signal: NodeJS.Signals | null) => void;
      mockChild.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
          // Simulate successful process completion
          setTimeout(() => closeHandler(0, null), 10);
        }
        return mockChild as any;
      });

      // Setup stdout data
      let stdoutHandler: (chunk: Buffer) => void;
      mockChild.stdout.on.mockImplementation((event, handler) => {
        if (event === 'data') {
          stdoutHandler = handler;
          // Simulate stdout data
          setTimeout(() => stdoutHandler(Buffer.from('Success output')), 5);
        }
        return mockChild.stdout;
      });

      // Setup stderr (empty)
      mockChild.stderr.on.mockImplementation((event, handler) => {
        return mockChild.stderr;
      });

      const result = await executeCommand('echo', ['hello']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stdout).toBe('Success output');
        expect(result.data.stderr).toBe('');
        expect(result.data.exitCode).toBe(0);
        expect(result.data.duration).toBeGreaterThan(0);
      }

      expect(mockSpawn).toHaveBeenCalledWith('echo', ['hello'], {
        cwd: process.cwd(),
        env: expect.any(Object),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should handle process errors', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
      };

      mockSpawn.mockReturnValue(mockChild as any);

      // Setup error handler
      let errorHandler: (error: Error) => void;
      mockChild.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          errorHandler = handler;
          // Simulate process error
          setTimeout(() => errorHandler(new Error('Command not found')), 10);
        }
        return mockChild as any;
      });

      mockChild.stdout.on.mockImplementation(() => mockChild.stdout);
      mockChild.stderr.on.mockImplementation(() => mockChild.stderr);

      const result = await executeCommand('nonexistent', ['command']);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Failed to execute command: Command not found');
    });

    it('should handle non-zero exit codes', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
      };

      mockSpawn.mockReturnValue(mockChild as any);

      // Setup event handlers
      let closeHandler: (exitCode: number | null, signal: NodeJS.Signals | null) => void;
      mockChild.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
          setTimeout(() => closeHandler(1, null), 10);
        }
        return mockChild as any;
      });

      // Setup stderr data
      let stderrHandler: (chunk: Buffer) => void;
      mockChild.stderr.on.mockImplementation((event, handler) => {
        if (event === 'data') {
          stderrHandler = handler;
          setTimeout(() => stderrHandler(Buffer.from('Error occurred')), 5);
        }
        return mockChild.stderr;
      });

      mockChild.stdout.on.mockImplementation(() => mockChild.stdout);

      const result = await executeCommand('failing-command', []);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Process exited with code 1');
      expect(result.error?.message).toContain('Error occurred');
    });

    it('should handle process timeout', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
      };

      mockSpawn.mockReturnValue(mockChild as any);

      // Capture the timeout callback and close handler
      let timeoutCallback: () => void;
      let closeHandler: (exitCode: number | null, signal: NodeJS.Signals | null) => void;

      // Mock setTimeout to capture the timeout callback
      const originalSetTimeout = global.setTimeout;
      const setTimeoutSpy = jest.fn((callback, delay) => {
        if (delay === 100) {
          // Our test timeout
          timeoutCallback = callback as () => void;
          // Don't actually set a timer, we'll call it manually
          return 999; // Mock timer id
        }
        return originalSetTimeout(callback, delay);
      });
      global.setTimeout = setTimeoutSpy as any;

      // Capture the close event handler
      mockChild.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
        }
        return mockChild as any;
      });

      mockChild.stdout.on.mockImplementation(() => mockChild.stdout);
      mockChild.stderr.on.mockImplementation(() => mockChild.stderr);

      // Start the command - this returns a promise
      const resultPromise = executeCommand('slow-command', [], { timeout: 100 });

      // Wait a tiny bit for the promise to be set up
      await new Promise(resolve => setImmediate(resolve));

      // Now trigger the timeout callback (this simulates the timeout occurring)
      timeoutCallback();

      // Simulate the close event that occurs after timeout
      closeHandler(null, 'SIGTERM');

      // Now await the result
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Process timed out after 100ms');
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');

      global.setTimeout = originalSetTimeout;
    });

    it('should handle large output buffers', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
      };

      mockSpawn.mockReturnValue(mockChild as any);

      // Setup stdout handler that will exceed buffer
      let stdoutHandler: (chunk: Buffer) => void;
      mockChild.stdout.on.mockImplementation((event, handler) => {
        if (event === 'data') {
          stdoutHandler = handler;
        }
        return mockChild.stdout;
      });

      mockChild.stderr.on.mockImplementation(() => mockChild.stderr);
      mockChild.on.mockImplementation(() => mockChild as any);

      // Start the command with a small buffer limit
      const resultPromise = executeCommand('large-output', [], { maxBuffer: 500 });

      // Wait for the promise setup
      await new Promise(resolve => setImmediate(resolve));

      // Trigger the large output that exceeds buffer
      if (stdoutHandler) {
        const largeOutput = 'x'.repeat(1000); // Exceeds 500 byte limit
        stdoutHandler(Buffer.from(largeOutput));
      }

      // Wait for the kill to be called
      await new Promise(resolve => setImmediate(resolve));

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle custom options', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
      };

      mockSpawn.mockReturnValue(mockChild as any);

      // Simple success setup
      let closeHandler: (exitCode: number | null, signal: NodeJS.Signals | null) => void;
      mockChild.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
          setTimeout(() => closeHandler(0, null), 10);
        }
        return mockChild as any;
      });

      mockChild.stdout.on.mockImplementation(() => mockChild.stdout);
      mockChild.stderr.on.mockImplementation(() => mockChild.stderr);

      const customOptions = {
        cwd: '/custom/directory',
        env: { CUSTOM_VAR: 'value' },
        timeout: 60000,
        maxBuffer: 5 * 1024 * 1024,
      };

      await executeCommand('test', ['arg'], customOptions);

      expect(mockSpawn).toHaveBeenCalledWith('test', ['arg'], {
        cwd: '/custom/directory',
        env: { ...process.env, CUSTOM_VAR: 'value' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should handle signals in exit code', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
      };

      mockSpawn.mockReturnValue(mockChild as any);

      let closeHandler: (exitCode: number | null, signal: NodeJS.Signals | null) => void;
      mockChild.on.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler;
          setTimeout(() => closeHandler(null, 'SIGTERM'), 10);
        }
        return mockChild as any;
      });

      mockChild.stdout.on.mockImplementation(() => mockChild.stdout);
      mockChild.stderr.on.mockImplementation(() => mockChild.stderr);

      const result = await executeCommand('killed-process', []);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('signal: SIGTERM');
    });
  });

  describe('checkExecutableExists', () => {
    it('should return true for existing executable', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await checkExecutableExists('/usr/bin/ls');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('/usr/bin/ls', expect.any(Number));
    });

    it('should return false for non-existing executable', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await checkExecutableExists('/nonexistent/path');

      expect(result).toBe(false);
    });

    it('should return false for non-executable file', async () => {
      mockAccess.mockRejectedValue(new Error('EACCES'));

      const result = await checkExecutableExists('/etc/passwd');

      expect(result).toBe(false);
    });
  });

  describe('findExecutableInPath', () => {
    it('should return path for executable in PATH', async () => {
      mockWhich.mockResolvedValue('/usr/bin/node');

      const result = await findExecutableInPath('node');

      expect(result).toBe('/usr/bin/node');
      expect(mockWhich).toHaveBeenCalledWith('node');
    });

    it('should return null for executable not in PATH', async () => {
      mockWhich.mockRejectedValue(new Error('not found'));

      const result = await findExecutableInPath('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle which throwing exception', async () => {
      mockWhich.mockRejectedValue(new Error('Permission denied'));

      const result = await findExecutableInPath('restricted');

      expect(result).toBeNull();
    });
  });
});
