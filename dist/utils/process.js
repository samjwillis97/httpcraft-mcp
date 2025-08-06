/**
 * Process management utilities for HTTPCraft MCP
 */
import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import which from 'which';
import { logger } from './logger.js';
export async function executeCommand(command, args, options = {}) {
    const startTime = Date.now();
    const { cwd = process.cwd(), env = {}, timeout = 30000, maxBuffer = 10 * 1024 * 1024, // 10MB
     } = options;
    logger.debug('Executing command', {
        command,
        args: args.join(' '),
        cwd,
        timeout,
    });
    return new Promise(resolve => {
        let stdout = '';
        let stderr = '';
        let isTimedOut = false;
        const child = spawn(command, args, {
            cwd,
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        // Set up timeout
        const timeoutHandle = setTimeout(() => {
            if (!child.killed) {
                isTimedOut = true;
                logger.warn('Process timeout, sending SIGTERM', { command, timeout });
                child.kill('SIGTERM');
                // Force kill after 5 seconds
                setTimeout(() => {
                    if (!child.killed) {
                        logger.warn('Force killing process with SIGKILL', { command });
                        child.kill('SIGKILL');
                    }
                }, 5000);
            }
        }, timeout);
        // Handle stdout
        child.stdout?.on('data', chunk => {
            const data = chunk.toString();
            stdout += data;
            if (stdout.length > maxBuffer) {
                logger.warn('Output buffer exceeded, terminating process', {
                    command,
                    bufferSize: stdout.length,
                    maxBuffer,
                });
                child.kill('SIGTERM');
            }
        });
        // Handle stderr
        child.stderr?.on('data', chunk => {
            const data = chunk.toString();
            stderr += data;
            if (stderr.length > maxBuffer) {
                logger.warn('Error buffer exceeded, terminating process', {
                    command,
                    bufferSize: stderr.length,
                    maxBuffer,
                });
                child.kill('SIGTERM');
            }
        });
        // Handle process exit
        child.on('close', (exitCode, signal) => {
            clearTimeout(timeoutHandle);
            const duration = Date.now() - startTime;
            if (isTimedOut) {
                resolve({
                    success: false,
                    error: new Error(`Process timed out after ${timeout}ms`),
                });
                return;
            }
            const result = {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: exitCode ?? -1,
                signal: signal ?? undefined,
                duration,
            };
            logger.debug('Process completed', {
                command,
                exitCode,
                signal,
                duration,
                stdoutLength: stdout.length,
                stderrLength: stderr.length,
            });
            if (exitCode === 0) {
                resolve({ success: true, data: result });
            }
            else {
                resolve({
                    success: false,
                    error: new Error(`Process exited with code ${exitCode}${signal ? ` (signal: ${signal})` : ''}: ${stderr}`),
                });
            }
        });
        // Handle process errors
        child.on('error', error => {
            clearTimeout(timeoutHandle);
            const duration = Date.now() - startTime;
            logger.error('Process error', { command, duration }, error);
            resolve({
                success: false,
                error: new Error(`Failed to execute command: ${error.message}`),
            });
        });
    });
}
export async function checkExecutableExists(path) {
    try {
        await access(path, constants.F_OK | constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
export async function findExecutableInPath(name) {
    try {
        return await which(name);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=process.js.map